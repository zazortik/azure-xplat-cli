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
var VNetUtil = require('../../../util/vnet.util');
var Nsg = require('./nsg');
var RouteTable = require('./routeTable');

function Subnet(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.nsgCrud = new Nsg(cli, networkManagementClient);
  this.routeTableCrud = new RouteTable(cli, networkManagementClient);
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(Subnet.prototype, {
  /**
   * Public methods
   */
  create: function (resourceGroupName, vnetName, subnetName, options, _) {
    var self = this;

    var parameters = {};
    parameters = self._parseSubnet(resourceGroupName, parameters, options, _);

    var vnet = self._getVNet(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    var subnet = self.get(resourceGroupName, vnetName, subnetName, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), subnetName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating subnet "%s"'), subnetName));
    try {
      subnet = self.networkManagementClient.subnets.createOrUpdate(resourceGroupName, vnetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
    self._showSubnet(subnet, resourceGroupName, subnetName);
  },

  set: function (resourceGroupName, vnetName, subnetName, options, _) {
    var self = this;

    var vnet = self._getVNet(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    var subnet = self.get(resourceGroupName, vnetName, subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), subnetName, resourceGroupName));
    }

    subnet = self._parseSubnet(resourceGroupName, subnet, options, _);

    var progress = self.interaction.progress(util.format($('Updating subnet "%s"'), subnetName));
    try {
      subnet = self.networkManagementClient.subnets.createOrUpdate(resourceGroupName, vnetName, subnetName, subnet, _);
    } finally {
      progress.end();
    }
    self._showSubnet(subnet, resourceGroupName, subnetName);
  },

  list: function (resourceGroupName, vnetName, options, _) {
    var self = this;

    var vnet = self._getVNet(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    var progress = self.interaction.progress($('Getting virtual network subnets '));
    var subnets = null;
    try {
      subnets = self.networkManagementClient.subnets.list(resourceGroupName, vnetName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(subnets, function (subnets) {
      if (subnets.length === 0) {
        self.output.warn($('No subnets found'));
      } else {
        self.output.table(subnets, function (row, subnet) {
          row.cell($('Name'), subnet.name);
          row.cell($('Provisioning state'), subnet.provisioningState);
          row.cell($('Address prefix'), subnet.addressPrefix);
        });
      }
    });
  },

  show: function (resourceGroupName, vnetName, subnetName, options, _) {
    var self = this;

    var vnet = self._getVNet(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    var subnet = self.get(resourceGroupName, vnetName, subnetName, _);
    self._showSubnet(subnet, resourceGroupName, subnetName);
  },

  get: function (resourceGroupName, vnetName, subnetName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var subnet = self.networkManagementClient.subnets.get(resourceGroupName, vnetName, subnetName, null, _);
      return subnet;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, vnetName, subnetName, options, _) {
    var self = this;

    var vnet = self._getVNet(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vnetName, resourceGroupName));
    }

    var subnet = self.get(resourceGroupName, vnetName, subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), subnetName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), subnetName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting subnet "%s"'), subnetName));
    try {
      self.networkManagementClient.subnets.deleteMethod(resourceGroupName, vnetName, subnetName, _);
    } finally {
      progress.end();
    }
  },

  /**
   * Private methods
   */
  _parseSubnet: function (resourceGroupName, subnet, options, _) {
    var self = this;

    if (options.addressPrefix) {
      var cidrValidation = self.vnetUtil.parseIPv4Cidr(options.addressPrefix, '--address-prefix');
      if (cidrValidation.error) {
        throw new Error(cidrValidation.error);
      }
      subnet.addressPrefix = options.addressPrefix;
    }

    if (options.networkSecurityGroupId) {
      if (options.networkSecurityGroupName) self.output.warn($('--network-security-group-name parameter will be ignored because --network-security-group-id and --network-security-group-name parameters are mutually exclusive'));
      if (utils.argHasValue(options.networkSecurityGroupId)) {
        subnet.networkSecurityGroup = {
          id: options.networkSecurityGroupId
        };
      } else {
        delete subnet.networkSecurityGroup;
      }
    } else if (options.networkSecurityGroupName) {
      if (utils.argHasValue(options.networkSecurityGroupName)) {
        var nsg = self.nsgCrud.get(resourceGroupName, options.networkSecurityGroupName, _);
        if (!nsg) {
          throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), options.networkSecurityGroupName, resourceGroupName));
        }
        subnet.networkSecurityGroup = {
          id: nsg.id
        };
      } else {
        delete subnet.networkSecurityGroup;
      }
    }

    if (options.routeTableId) {
      if (options.routeTableName) self.output.warn($('--route-table-name parameter will be ignored because --route-table-id and --route-table-name parameters are mutually exclusive'));
      if (utils.argHasValue(options.routeTableId)) {
        subnet.routeTable = {
          id: options.routeTableId
        };
      } else {
        delete subnet.routeTable;
      }
    } else if (options.routeTableName) {
      if (utils.argHasValue(options.routeTableName)) {
        var routeTable = self.routeTableCrud.get(resourceGroupName, options.routeTableName, _);
        if (!routeTable) {
          throw new Error(util.format($('A route table with name "%s" not found in the resource group "%s"'), options.routeTableName, resourceGroupName));
        }
        subnet.routeTable = {
          id: routeTable.id
        };
      } else {
        delete subnet.routeTable;
      }
    }

    return subnet;
  },

  _showSubnet: function (subnet, resourceGroupName, subnetName) {
    var self = this;

    self.interaction.formatOutput(subnet, function (subnet) {
      if (subnet === null) {
        self.output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), subnetName, resourceGroupName));
        return;
      }

      self.output.nameValue($('Id'), subnet.id);
      self.output.nameValue($('Name'), subnet.name);
      self.output.nameValue($('Type'), subnet.type);
      self.output.nameValue($('Provisioning state'), subnet.provisioningState);
      self.output.nameValue($('Address prefix'), subnet.addressPrefix);
      if (subnet.networkSecurityGroup) {
        self.output.nameValue($('Network Security Group id'), subnet.networkSecurityGroup.id);
      }
      if (subnet.routeTable) {
        self.output.nameValue($('Route Table id'), subnet.routeTable.id);
      }
    });
  },

  _getVNet: function (resourceGroupName, vnetName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up virtual network "%s"'), vnetName));
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
  }
});

module.exports = Subnet;
