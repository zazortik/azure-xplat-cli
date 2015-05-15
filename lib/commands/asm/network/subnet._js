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
var constants = require('../../arm/network/constants');
var network = require('../network');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function Subnet(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(Subnet.prototype, {
  create: function (vNetName, subnetName, options, _) {
    var networkConfiguration = network.getNetworkConfig(options, _);
    var vNetList = networkConfiguration.VirtualNetworkConfiguration.VirtualNetworkSites;
    var vNet = this._getVnetByName(vNetList, vNetName);
    if (!vNet) {
      throw new Error(util.format($('A virtual network with name "%s" doesn\'t exist'), vNetName));
    }
    if (!vNet.Subnets) {
      vNet.Subnets = [];
    }

    var subnetsConfig = vNet.Subnets;
    subnetsConfig.forEach(function (subnet) {
      if (utils.ignoreCaseEquals(subnet.Name, subnetName)) {
        throw new Error(util.format($('A subnet with name "%s" already exists in the virtual network"%s"'), subnetName, vNetName));
      }
    });

    var subnetInput = {
      'Name': subnetName,
      'AddressPrefix': options.addressPrefix
    };

    subnetsConfig.push(subnetInput);

    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), subnetName));
    try {
      network.setNetworkConfig(options, networkConfiguration, _);
      if (options.networkSecurityGroupName) {
        this.addNsgToSubnet(options.networkSecurityGroupName, vNetName, subnetName, options, _);
      }
    } finally {
      progress.end();
    }
    this.show(vNetName, subnetName, options, _);
  },

  set: function (vNetName, subnetName, options, _) {
    var networkConfiguration = network.getNetworkConfig(options, _);
    var vNetList = networkConfiguration.VirtualNetworkConfiguration.VirtualNetworkSites;
    var vNet = this._getVnetByName(vNetList, vNetName);
    if (!vNet) {
      throw new Error(util.format($('A virtual network with name "%s" doesn\'t exist'), vNetName));
    }
    if (!vNet.Subnets) {
      throw new Error(util.format($('No subnets was found in virtual network with name "%s"'), vNetName));
    }

    var subnetsConfig = vNet.Subnets;
    var subnet;
    for (var i = 0; i < subnetsConfig.length; i++) {
      if (utils.ignoreCaseEquals(subnetsConfig[i].Name, subnetName)) {
        subnet = subnetsConfig[i];
        break;
      }
    }

    if (options.addressPrefix) {
      subnet.AddressPrefix = options.addressPrefix;
    }

    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), subnetName));
    try {
      network.setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
    this.show(vNetName, subnetName, options, _);
  },

  list: function (vNetName, options, _) {
    var config = this._getVnetList(options, _);
    var vNet = this._getVnetByName(config, vNetName);

    var output = this.cli.output;
    if (vNet) {
      this.cli.interaction.formatOutput(vNet.Subnets, function (outputData) {
        if (!outputData || outputData.length === 0) {
          output.warn($('No virtual network subnets found'));
        } else {
          output.table(outputData, function (row, item) {
            row.cell($('Name'), item.Name);
            row.cell($('Address prefix'), item.AddressPrefix);
          });
        }
      });
    } else {
      output.warn(util.format($('Virtual network with name %s not found'), vNetName));
    }
  },

  get: function (vNetName, subnetName, options, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var vNetList = this._getVnetList(options, _);
      var vNet = this._getVnetByName(vNetList, vNetName);
      var output = this.cli.output;
      if (!vNet) {
        output.warn(util.format($('Virtual network with name %s not found'), vNetName));
        return;
      }

      var subnets = vNet.Subnets;
      if (!subnets || subnets.length === 0) {
        output.warn($('Virtual network has no subnets'));
      }

      for (var i = 0; i < subnets.length; i++) {
        if (utils.ignoreCaseEquals(subnets[i].Name, subnetName)) {
          return subnets[i];
        }
      }
    } catch (e) {
      if (e.code === 'NotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  show: function (vNetName, subnetName, options, _) {
    var subnet = this.get(vNetName, subnetName, options, _);
    var output = this.cli.output;

    if (subnet) {
      output.nameValue($('Name'), subnet.Name);
      output.nameValue($('Address prefix'), subnet.AddressPrefix);
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A virtual network subnet with name "%s" not found'), subnetName));
      }
    }
  },

  delete: function (vNetName, subnetName, options, _) {
    var networkConfiguration = network.getNetworkConfig(options, _);
    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }
    var vNetList = networkConfiguration.VirtualNetworkConfiguration.VirtualNetworkSites;
    var vNet = this._getVnetByName(vNetList, vNetName);
    if (!vNet) {
      throw new Error(util.format($('A virtual network with name "%s" doesn\'t exist'), vNetName));
    }

    var subnetsConfig = vNet.Subnets;

    if (subnetsConfig && subnetsConfig.length > 0) {
      var index = -1;
      for (var i = 0; i < subnetsConfig.length; i++) {
        if (utils.ignoreCaseEquals(subnetsConfig[i].Name, subnetName)) {
          index = i;
          break;
        }
      }

      if (index !== -1) {
        if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete the virtual network subnet %s ? [y/n] '), subnetName), _)) {
          return;
        }

        subnetsConfig.splice(index, 1);
        var progress = this.cli.interaction.progress(util.format($('Deleting the virtual network subnet %s'), subnetName));
        try {
          network.setNetworkConfig(options, networkConfiguration, _);
        } finally {
          progress.end();
        }
      } else {
        this.cli.output.warn(util.format($('Virtual network subnet with name %s not found'), subnetName));
      }
    } else {
      this.cli.output.warn(util.format($('Virtual network subnet with name %s not found'), subnetName));
    }
  },

  addNsgToSubnet: function (nsgName, vNetName, subnetName, options, _) {
    var nsg = this._getNsgForSubnet(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), nsgName));
    }

    var subnet = this.get(vNetName, subnetName, options, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" was not found in virtual network "%s"'), subnetName, vNetName));
    }

    var parameters = {
      name: nsgName
    };

    var progress = this.cli.interaction.progress(util.format($('Creating a network security group "%s"'), nsgName));
    try {
      this.networkManagementClient.networkSecurityGroups.addToSubnet(vNetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
  },

  removeNsgFromSubnet: function (nsgName, vNetName, subnetName, options, _) {
    var nsg = this._getNsgForSubnet(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), nsgName));
    }

    var subnet = this.get(vNetName, subnetName, options, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" was not found in virtual network "%s"'), subnetName, vNetName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security group "%s"'), nsgName));
    try {
      this.networkManagementClient.networkSecurityGroups.removeFromSubnet(vNetName, subnetName, nsgName, _);
    } finally {
      progress.end();
    }
  },

  _getNsgForSubnet: function (nsgName, withRules, _) {
    var detailLevel = null;
    if (withRules) detailLevel = 'Full';
    var progress = this.cli.interaction.progress(util.format($('Looking up the network security group "%s"'), nsgName));
    try {
      var nsg = this.networkManagementClient.networkSecurityGroups.get(nsgName, detailLevel, _);
      return nsg;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  _getVnetList: function (options, _) {
    var networkConfiguration = network.getNetworkConfig(options, _);
    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }
    return networkConfiguration.VirtualNetworkConfiguration.VirtualNetworkSites;
  },

  _getVnetByName: function (vnetList, vNetName) {
    var progress = this.cli.interaction.progress($('Getting virtual network with name ') + vNetName);
    try {
      if (vnetList) {
        for (var i = 0; i < vnetList.length; i++) {
          if (utils.ignoreCaseEquals(vnetList[i].Name, vNetName)) {
            return vnetList[i];
          }
        }
      }
    } finally {
      progress.end();
    }
  }
});

module.exports = Subnet;
