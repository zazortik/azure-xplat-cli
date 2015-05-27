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
var vnetShowUtil = require('./vnetShowUtil');
var VNetUtil = require('../../../util/vnet.util');
var Nsg = require('./nsg');
var $ = utils.getLocaleString;

function Subnet(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.log = cli.output;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.NsgCrud = new Nsg(cli, networkResourceProviderClient);
}

__.extend(Subnet.prototype, {
  create: function (resourceGroup, vnetName, name, options, _) {
    var subnet = this.get(resourceGroup, vnetName, name, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), name, resourceGroup));
    }

    var parameters = this._getSubnetParams(resourceGroup, vnetName, options, true, _);
    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), name));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroup, vnetName, name, parameters, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroup, vnetName, name, options, _);
  },

  set: function (resourceGroup, vnetName, name, options, _) {
    var subnet = this.get(resourceGroup, vnetName, name, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    var subnetProfile = this._getSubnetParams(resourceGroup, vnetName, options, false, _);

    if (options.addressPrefix) {
      subnet.subnet.addressPrefix = subnetProfile.addressPrefix;
    }

    if (options.networkSecurityGroupId || options.networkSecurityGroupName) {
      subnet.subnet.networkSecurityGroup = subnetProfile.networkSecurityGroup;
    }

    var progress = this.cli.interaction.progress(util.format($('Setting subnet "%s"'), name));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroup, vnetName, name, subnet.subnet, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroup, vnetName, name, options, _);
  },

  list: function (resourceGroup, vnetName, options, _) {
    var progress = this.cli.interaction.progress($('Getting virtual network subnets '));
    var subnets = null;
    try {
      subnets = this.networkResourceProviderClient.subnets.list(resourceGroup, vnetName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(subnets.subnets, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No virtual subnet networks found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Address prefix'), item.addressPrefix);
        });
      }
    });
  },

  show: function (resourceGroup, vnetName, name, options, _) {
    var subnet = this.get(resourceGroup, vnetName, name, _);
    var output = this.cli.output;
    if (!subnet) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), name, resourceGroup));
      }
      return;
    }
    this.cli.interaction.formatOutput(subnet.subnet, function (subnet) {
      vnetShowUtil.showSubnet(subnet, output);
    });
  },

  get: function (resourceGroupName, vNetName, subnetName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var subnet = this.networkResourceProviderClient.subnets.get(resourceGroupName, vNetName, subnetName, _);
      return subnet;
    } catch (e) {
      if (e.code === 'NotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroup, vnetName, name, options, _) {
    var subnet = this.get(resourceGroup, vnetName, name, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting subnet "%s"'), name));
    try {
      this.networkResourceProviderClient.subnets.deleteMethod(resourceGroup, vnetName, name, _);
    } finally {
      progress.end();
    }
  },

  _getSubnetParams: function (resourceGroup, vnetName, options, useDefaultSubnetCidr, _) {
    var self = this;
    var output = self.log;
    var NsgCrud = self.NsgCrud;

    var vNetUtil = new VNetUtil();
    var vNet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroup, vnetName, _);
    if (!vNet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroup));
    }

    var addressSpace;
    if (options.addressPrefix) {
      this._validateAddressPrefix(options.addressPrefix);
      addressSpace = options.addressPrefix;
    }

    if (!addressSpace && useDefaultSubnetCidr) {
      var vnetAddressPrefix = vNet.virtualNetwork.addressSpace.addressPrefixes[0];
      if (!vnetAddressPrefix) {
        throw new Error(util.format($('Virtual network "%s" does not contain any address prefix'), vnetName));
      }
      addressSpace = vnetAddressPrefix.split('/')[0];
      addressSpace = addressSpace + '/' + vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(parseInt(vnetAddressPrefix.split('/')[1]));

      output.warn(util.format($('using default address space %s'), addressSpace));
    }

    var parameters = {
      addressPrefix: addressSpace
    };

    if (options.networkSecurityGroupId) {
      if (options.networkSecurityGroupName) {
        output.warn($('--network-security-group-name parameter will be ignored because --network-security-group-id and --network-security-group-name parameters are mutually exclusive'));
      }
      if (options.networkSecurityGroupId !== true && options.networkSecurityGroupId !== '\'\'') {
        parameters.networkSecurityGroup = {
          id: options.networkSecurityGroupId
        };
      }
    } else if (options.networkSecurityGroupName) {
      if (utils.stringIsNullOrEmpty(options.networkSecurityGroupName)) {
        throw new Error($('A network security group name must not be null or empty string'));
      }

      var nsg = NsgCrud.get(resourceGroup, options.networkSecurityGroupName, _);
      if (!nsg) {
        throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'),
          options.networkSecurityGroupName, resourceGroup));
      }

      parameters.networkSecurityGroup = {
        id: nsg.networkSecurityGroup.id
      };
    }

    return parameters;
  },

  _validateAddressPrefix: function (addressPrefix) {
    if (utils.stringIsNullOrEmpty(addressPrefix)) {
      throw new Error($('address prefix parameter must not be null or empty string'));
    }

    var vNetUtil = new VNetUtil();
    var ipValidationResult = vNetUtil.parseIPv4Cidr(addressPrefix);
    if (ipValidationResult.error) {
      throw new Error($(ipValidationResult.error));
    }
    if (ipValidationResult.cidr === null) {
      throw new Error($('The --address-prefix must be in cidr format (---.---.---.---/cidr)'));
    }
  }
});

module.exports = Subnet;
