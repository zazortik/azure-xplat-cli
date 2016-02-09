/**
 * Copyright (c) Microsoft.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
var VNetUtil = require('../../../util/vnet.util');

function VirtualNetwork(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(VirtualNetwork.prototype, {
  /**
   * Public methods
   */
  create: function (resourceGroupName, vnetName, options, _) {
    var self = this;

    var parameters = {
      location: options.location,
      addressSpace: {
        addressPrefixes: []
      },
      dhcpOptions: {
        dnsServers: []
      }
    };

    parameters = self._parseVNet(parameters, options, true);

    var vnet = self.get(resourceGroupName, vnetName, _);
    if (vnet) {
      throw new Error(util.format($('Virtual network "%s" already exists in resource group "%s"'), vnetName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating virtual network "%s"'), vnetName));
    try {
      vnet = self.networkManagementClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, parameters, _);
    } finally {
      progress.end();
    }
    self._showVNet(vnet, resourceGroupName, vnetName);
  },

  set: function (resourceGroupName, vnetName, options, _) {
    var self = this;

    var vnet = self.get(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    vnet = self._parseVNet(vnet, options, false);

    var progress = self.interaction.progress(util.format($('Updating virtual network "%s"'), vnetName));
    try {
      vnet = self.networkManagementClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnet, _);
    } finally {
      progress.end();
    }
    self._showVNet(vnet, resourceGroupName, vnetName);
  },

  list: function (options, _) {
    var self = this;
    var progress = self.interaction.progress('Looking up virtual networks');

    var vnets = null;
    try {
      if (options.resourceGroup) {
        vnets = self.networkManagementClient.virtualNetworks.list(options.resourceGroup, _);
      } else {
        vnets = self.networkManagementClient.virtualNetworks.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(vnets, function (vnets) {
      if (vnets.length === 0) {
        self.output.warn($('No virtual networks found'));
      } else {
        self.output.table(vnets, function (row, vnet) {
          row.cell($('Name'), vnet.name);
          row.cell($('Location'), vnet.location);
          var resInfo = resourceUtils.getResourceInformation(vnet.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), vnet.provisioningState);
          row.cell($('Address prefixes'), vnet.addressSpace.addressPrefixes);
          var dnsServers = '';
          if (vnet.dhcpOptions) {
            dnsServers = vnet.dhcpOptions.dnsServers;
          }
          row.cell($('DNS servers'), dnsServers);
          row.cell($('Subnets number'), vnet.subnets.length || '');
        });
      }
    });
  },

  show: function (resourceGroupName, vnetName, options, _) {
    var self = this;
    var vnet = self.get(resourceGroupName, vnetName, _);

    self._showVNet(vnet, resourceGroupName, vnetName);
  },

  delete: function (resourceGroupName, vnetName, options, _) {
    var self = this;

    var vnet = self.get(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete virtual network %s? [y/n] '), vnetName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting virtual network "%s"'), vnetName));
    try {
      self.networkManagementClient.virtualNetworks.deleteMethod(resourceGroupName, vnetName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, vnetName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the virtual network "%s"'), vnetName));
    try {
      var vnet = self.networkManagementClient.virtualNetworks.get(resourceGroupName, vnetName, null, _);
      return vnet;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  /**
   * Private methods
   */
  _parseVNet: function (vnet, options, useDefaults) {
    var self = this;

    if (options.addressPrefixes) {
      var addressPrefixes = options.addressPrefixes.split(',');
      addressPrefixes.forEach(function (address) {
        if (vnet.addressSpace.addressPrefixes.indexOf(address) === -1) {
          var addrValidation = self.vnetUtil.parseIPv4Cidr(address);
          if (addrValidation.error) throw new Error(addrValidation.error);
          vnet.addressSpace.addressPrefixes.push(address);
        }
      });
    } else if (useDefaults) {
      var defaultAddressPrefix = self.vnetUtil.defaultAddressSpaceInfo().ipv4Cidr;
      self.output.warn(util.format($('Using default address prefix: %s'), defaultAddressPrefix));
      vnet.addressSpace.addressPrefixes.push(defaultAddressPrefix);
    }

    if (options.dnsServers) {
      if (utils.argHasValue(options.dnsServers)) {
        var dnsServers = options.dnsServers.split(',');
        dnsServers.forEach(function (dns) {
          if (vnet.dhcpOptions.dnsServers.indexOf(dns) === -1) {
            var ipValidation = self.vnetUtil.parseIPv4(dns);
            if (ipValidation.error) throw new Error(ipValidation.error);
            vnet.dhcpOptions.dnsServers.push(dns);
          }
        });
      } else {
        vnet.dhcpOptions.dnsServers = [];
      }
    }

    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(vnet, options);
      } else {
        vnet.tags = {};
      }
    }

    return vnet;
  },

  _showVNet: function (vnet, resourceGroupName, vnetName) {
    var self = this;

    self.interaction.formatOutput(vnet, function (vnet) {
      if (vnet === null) {
        self.output.warn(util.format($('Virtual network "%s" not found in resource group "%s" '), vnetName, resourceGroupName));
        return;
      }

      self.output.nameValue($('Id'), vnet.id);
      self.output.nameValue($('Name'), vnet.name);
      self.output.nameValue($('Type'), vnet.type);
      self.output.nameValue($('Location'), vnet.location);
      self.output.nameValue($('Provisioning state'), vnet.provisioningState);
      self.output.nameValue($('Tags'), tagUtils.getTagsInfo(vnet.tags));
      if (vnet.addressSpace.addressPrefixes.length > 0) {
        self.output.header($('Address prefixes'));
        self.output.list(vnet.addressSpace.addressPrefixes, 2);
      }
      if (vnet.dhcpOptions.dnsServers.length > 0) {
        self.output.header($('DNS servers'));
        self.output.list(vnet.dhcpOptions.dnsServers, 2);
      }
      if (vnet.subnets.length > 0) {
        self.output.header($('Subnets'));
        vnet.subnets.forEach(function (subnet) {
          self.output.nameValue($('Id'), subnet.id, 2);
          self.output.nameValue($('Name'), subnet.name, 2);
          self.output.nameValue($('Provisioning state'), subnet.provisioningState, 2);
          self.output.nameValue($('Address prefix'), subnet.addressPrefix, 2);
          if (subnet.networkSecurityGroup) {
            self.output.nameValue($('Network Security Group id'), subnet.networkSecurityGroup.id, 2);
          }
          if (subnet.routeTable) {
            self.output.nameValue($('Route Table id'), subnet.routeTable.id, 2);
          }
          self.output.data($(''), '');
        });
      }
    });
  }
});

module.exports = VirtualNetwork;