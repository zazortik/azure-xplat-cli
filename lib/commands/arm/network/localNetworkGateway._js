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
var VNetUtil = require('./../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');

function LocalNetworkGateway(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(LocalNetworkGateway.prototype, {
  /**
   * Public methods
   */
  create: function (resourceGroupName, gatewayName, options, _) {
    var self = this;

    var parameters = {
      location: options.location,
      localNetworkAddressSpace: {
        addressPrefixes: []
      }
    };

    parameters = self._parseGateway(parameters, options);

    var gateway = self.get(resourceGroupName, gatewayName, _);
    if (gateway) {
      throw new Error(util.format($('A local network gateway with name "%s" already exists in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating local network gateway "%s"'), gatewayName));
    try {
      gateway = self.networkManagementClient.localNetworkGateways.createOrUpdate(resourceGroupName, gatewayName, parameters, _);
    } finally {
      progress.end();
    }
    self._showGateway(gateway, resourceGroupName, gatewayName);
  },

  set: function (resourceGroupName, gatewayName, options, _) {
    var self = this;

    var gateway = self.get(resourceGroupName, gatewayName, _);
    if (!gateway) {
      throw new Error(util.format($('A local network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    gateway = self._parseGateway(gateway, options);

    var progress = self.interaction.progress(util.format($('Updating local network gateway "%s"'), gatewayName));
    try {
      gateway = self.networkManagementClient.localNetworkGateways.createOrUpdate(resourceGroupName, gatewayName, gateway, _);
    } finally {
      progress.end();
    }

    self._showGateway(gateway, resourceGroupName, gatewayName);
  },

  list: function (resourceGroupName, options, _) {
    var self = this;

    var gateways = null;
    var progress = self.interaction.progress($('Looking up local network gateways'));

    try {
      gateways = self.networkManagementClient.localNetworkGateways.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(gateways, function (gateways) {
      if (gateways.length === 0) {
        self.output.warn($('No local network gateways found'));
      } else {
        self.output.table(gateways, function (row, gateway) {
          row.cell($('Name'), gateway.name);
          row.cell($('Location'), gateway.location);
          var resInfo = resourceUtils.getResourceInformation(gateway.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), gateway.provisioningState);
          row.cell($('IP Address'), gateway.gatewayIpAddress);
          var addressPrefixes = gateway.localNetworkAddressSpace.addressPrefixes;
          var address = '';
          if (addressPrefixes.length > 0) address = addressPrefixes[0];
          if (addressPrefixes.length > 1) address += ', ...';
          row.cell($('Address prefixes'), address);
        });
      }
    });
  },

  show: function (resourceGroupName, gatewayName, options, _) {
    var self = this;
    var gateway = self.get(resourceGroupName, gatewayName, _);

    self._showGateway(gateway, resourceGroupName, gatewayName);
  },

  delete: function (resourceGroupName, gatewayName, options, _) {
    var self = this;
    var gateway = self.get(resourceGroupName, gatewayName, _);

    if (!gateway) {
      throw new Error(util.format($('A local network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete local network gateway "%s"? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting local network gateway "%s"'), gatewayName));
    try {
      self.networkManagementClient.localNetworkGateways.deleteMethod(resourceGroupName, gatewayName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, gatewayName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up local network gateway "%s"'), gatewayName));

    try {
      var gateway = self.networkManagementClient.localNetworkGateways.get(resourceGroupName, gatewayName, null, _);
      return gateway;
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
  _parseGateway: function (gateway, options) {
    var self = this;

    if (options.ipAddress) {
      var ipValidation = self.vnetUtil.parseIPv4(options.ipAddress, '--ip-address');
      if (ipValidation.error) {
        throw new Error(ipValidation.error);
      }
      gateway.gatewayIpAddress = options.ipAddress;
    }

    if (options.addressSpace) {
      if (utils.argHasValue(options.tags)) {
        options.addressSpace.split(',').forEach(function (addressPrefix) {
          var cidrValidation = self.vnetUtil.parseIPv4Cidr(addressPrefix, '--address-space');
          if (cidrValidation.error) {
            throw new Error(cidrValidation.error);
          }
          gateway.localNetworkAddressSpace.addressPrefixes.push(addressPrefix);
        });
      } else {
        gateway.localNetworkAddressSpace.addressPrefixes = [];
      }
    }

    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(gateway, options);
      } else {
        gateway.tags = {};
      }
    }

    return gateway;
  },

  _showGateway: function (gateway, resourceGroupName, gatewayName) {
    var self = this;

    self.interaction.formatOutput(gateway, function (gateway) {
      if (gateway === null) {
        self.output.warn(util.format($('A local network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
        return;
      }

      self.output.nameValue($('Id'), gateway.id);
      self.output.nameValue($('Name'), gateway.name);
      self.output.nameValue($('Type'), gateway.type);
      self.output.nameValue($('Location'), gateway.location);
      self.output.nameValue($('Provisioning state'), gateway.provisioningState);
      self.output.nameValue($('Tags'), tagUtils.getTagsInfo(gateway.tags));
      self.output.nameValue($('IP Address'), gateway.gatewayIpAddress);

      if (gateway.localNetworkAddressSpace.addressPrefixes.length > 0) {
        self.output.header('Address prefixes');
        gateway.localNetworkAddressSpace.addressPrefixes.forEach(function (address) {
          self.output.listItem(address, 2);
        });
      }
    });
  }
});

module.exports = LocalNetworkGateway;