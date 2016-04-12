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
var tagUtils = require('../tag/tagUtils');
var resourceUtils = require('../resource/resourceUtils');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadBalancer');
var Nsg = require('./nsg');
var PublicIp = require('./publicIp');
var VNetUtil = require('../../../util/vnet.util');

function Nic(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.subnetCrud = new Subnet(cli, networkManagementClient);
  this.loadBalancerCrud = new LoadBalancer(cli, networkManagementClient);
  this.nsgCrud = new Nsg(cli, networkManagementClient);
  this.publicIpCrud = new PublicIp(cli, networkManagementClient);
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(Nic.prototype, {
  /**
   * NIC methods
   */
  create: function (resourceGroupName, nicName, options, _) {
    var self = this;

    if (!options.subnetId && !options.subnetName && !options.subnetVnetName) {
      throw new Error($('--subnet-id or --subnet-name, --subnet-vnet-name parameters must be provided'));
    }

    var parameters = {
      location: options.location,
      ipConfigurations: [{
        name: 'Nic-IP-config'
      }]
    };

    parameters = self._parseNic(resourceGroupName, parameters, options, _);

    var nic = self.get(resourceGroupName, nicName, _);
    if (nic) {
      throw new Error(util.format($('A network interface with name "%s" already exists in the resource group "%s"'), nicName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating network interface "%s"'), nicName));
    try {
      nic = self.networkManagementClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, parameters, _);
    } finally {
      progress.end();
    }

    self._showNic(nic, resourceGroupName, nicName);
  },

  set: function (resourceGroupName, nicName, options, _) {
    var self = this;

    var nic = self.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    nic = self._parseNic(resourceGroupName, nic, options, _);

    var progress = self.interaction.progress(util.format($('Updating network interface "%s"'), nicName));
    try {
      nic = self.networkManagementClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nic, _);
    } finally {
      progress.end();
    }

    self._showNic(nic, resourceGroupName, nicName);
  },

  list: function (options, _) {
    var self = this;

    var nics = null;
    var progress = self.interaction.progress($('Getting the network interfaces'));

    try {
      if (options.resourceGroup) {
        if (options.virtualMachineScaleSetName) {
          if (options.virtualMachineIndex) {
            nics = self.networkManagementClient.networkInterfaces.listVirtualMachineScaleSetVMNetworkInterfaces(options.resourceGroup, options.virtualMachineScaleSetName, options.virtualMachineIndex, _);
          } else {
            nics = self.networkManagementClient.networkInterfaces.listVirtualMachineScaleSetNetworkInterfaces(options.resourceGroup, options.virtualMachineScaleSetName, _);
          }
        } else {
          nics = self.networkManagementClient.networkInterfaces.list(options.resourceGroup, _);
        }
      } else {
        nics = self.networkManagementClient.networkInterfaces.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(nics, function (nics) {
      if (nics.length === 0) {
        self.output.warn($('No network interfaces found'));
      } else {
        self.output.table(nics, function (row, nic) {
          row.cell($('Name'), nic.name);
          row.cell($('Location'), nic.location || '');
          var resInfo = resourceUtils.getResourceInformation(nic.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), nic.provisioningState);
          row.cell($('MAC Address'), nic.macAddress || '');
          row.cell($('IP forwarding'), nic.enableIPForwarding);
          row.cell($('Internal DNS name'), nic.dnsSettings.internalDnsNameLabel || '');
          row.cell($('Internal FQDN'), nic.dnsSettings.internalFqdn || '');
        });
      }
    });
  },

  show: function (resourceGroupName, nicName, options, _) {
    var self = this;
    var nic = null;

    if (options.virtualMachineScaleSetName || options.virtualMachineIndex) {
      if (!(options.virtualMachineScaleSetName && options.virtualMachineIndex)) {
        throw new Error(util.format($('--virtual-machine-scale-set-name and --virtual-machine-index must be specified')));
      }
      nic = self.getFromScaleSet(resourceGroupName, options.virtualMachineScaleSetName, options.virtualMachineIndex, nicName, _);
    } else {
      nic = self.get(resourceGroupName, nicName, _);
    }

    self._showNic(nic, resourceGroupName, nicName);
  },

  get: function (resourceGroupName, nicName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the network interface "%s"'), nicName));
    try {
      var nic = self.networkManagementClient.networkInterfaces.get(resourceGroupName, nicName, null, _);
      return nic;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  getFromScaleSet: function (resourceGroupName, virtualMachineScaleSetName, virtualMachineIndex, nicName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the network interface "%s" in scale set "%s"'), nicName, virtualMachineScaleSetName));
    try {
      var nic = self.networkManagementClient.networkInterfaces.getVirtualMachineScaleSetNetworkInterface(resourceGroupName, virtualMachineScaleSetName, virtualMachineIndex, nicName, null, _);
      return nic;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, nicName, options, _) {
    var self = this;
    var nic = self.get(resourceGroupName, nicName, _);

    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete network interface "%s"? [y/n] '), nicName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting network interface "%s"'), nicName));
    try {
      self.networkManagementClient.networkInterfaces.deleteMethod(resourceGroupName, nicName, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, nicName, nic, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Updating network interface "%s"'), nicName));
    try {
      nic = self.networkManagementClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nic, _);
      return nic;
    } finally {
      progress.end();
    }
  },

  /**
   * NIC Backend Address Pool methods
   */
  createBackendAddressPool: function (resourceGroupName, nicName, options, _) {
    this._updateBackendAddressPool(resourceGroupName, nicName, options, true, _);
  },

  deleteBackendAddressPool: function (resourceGroupName, nicName, options, _) {
    this._updateBackendAddressPool(resourceGroupName, nicName, options, false, _);
  },

  /**
   * NIC Inbound NAT Rule methods
   */
  createInboundNatRule: function (resourceGroupName, nicName, options, _) {
    this._updateInboundNatRule(resourceGroupName, nicName, options, true, _);
  },

  deleteInboundNatRule: function (resourceGroupName, nicName, options, _) {
    this._updateInboundNatRule(resourceGroupName, nicName, options, false, _);
  },

  /**
   * Internal methods
   */
  _parseNic: function (resourceGroupName, nic, options, _) {
    var self = this;

    if (options.privateIpAddress) {
      var ipValidationResult = self.vnetUtil.parseIPv4(options.privateIpAddress);
      if (ipValidationResult.error) {
        throw new Error($('--private-ip-address parameter must be valid IPv4'));
      }
      nic.ipConfigurations[0].privateIPAllocationMethod = 'Static';
      nic.ipConfigurations[0].privateIPAddress = options.privateIpAddress;
    }

    if (options.internalDnsNameLabel) {
      if (utils.argHasValue(options.internalDnsNameLabel)) {
        if (!nic.dnsSettings) nic.dnsSettings = {};
        nic.dnsSettings.internalDnsNameLabel = options.internalDnsNameLabel;
      } else {
        delete nic.dnsSettings;
      }
    }

    if (options.enableIpForwarding) {
      nic.enableIPForwarding = utils.parseBool(options.enableIpForwarding, '--enable-ip-forwarding');
    }

    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(nic, options);
      } else {
        nic.tags = {};
      }
    }

    if (options.subnetId) {
      if (options.subnetName || options.subnetVnetName) {
        self.output.warn($('--subnet-name, --subnet-vnet-name parameters will be ignored because --subnet-name, --subnet-vnet-name and --subnet-id are mutually exclusive'));
      }
      nic.ipConfigurations[0].subnet = {
        id: options.subnetId
      };
    } else if (options.subnetName && options.subnetVnetName) {
      var subnet = self.subnetCrud.get(resourceGroupName, options.subnetVnetName, options.subnetName, _);
      if (!subnet) {
        throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.subnetName, resourceGroupName));
      }
      nic.ipConfigurations[0].subnet = {
        id: subnet.id
      };
    }

    if (options.publicIpId) {
      if (options.publicIpName) self.output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      if (utils.argHasValue(options.publicIpId)) {
        nic.ipConfigurations[0].publicIPAddress = {
          id: options.publicIpId
        };
      } else {
        delete nic.ipConfigurations[0].publicIPAddress;
      }
    } else if (options.publicIpName) {
      if (utils.argHasValue(options.publicIpName)) {
        var publicip = self.publicIpCrud.get(resourceGroupName, options.publicIpName, _);
        if (!publicip) {
          throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), options.publicIpName, resourceGroupName));
        }
        nic.ipConfigurations[0].publicIPAddress = {
          id: publicip.id
        };
      } else {
        delete nic.ipConfigurations[0].publicIPAddress;
      }
    }

    if (options.networkSecurityGroupId) {
      if (options.networkSecurityGroupName) self.output.warn($('--network-security-group-name parameter will be ignored because --network-security-group-id and --network-security-group-name are mutually exclusive'));
      if (utils.argHasValue(options.networkSecurityGroupId)) {
        nic.networkSecurityGroup = {
          id: options.networkSecurityGroupId
        };
      } else {
        delete nic.networkSecurityGroup;
      }
    } else if (options.networkSecurityGroupName) {
      if (utils.argHasValue(options.networkSecurityGroupName)) {
        var nsg = self.nsgCrud.get(resourceGroupName, options.networkSecurityGroupName, _);
        if (!nsg) {
          throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), options.networkSecurityGroupName, resourceGroupName));
        }
        nic.networkSecurityGroup = {
          id: nsg.id
        };
      } else {
        delete nic.networkSecurityGroup;
      }
    }

    if (options.lbAddressPoolIds) {
      if (utils.argHasValue(options.lbAddressPoolIds)) {
        nic.ipConfigurations[0].loadBalancerBackendAddressPools = [];
        var poolIds = options.lbAddressPoolIds.split(',');
        poolIds.forEach(function (poolId) {
          poolId = poolId.replace(/'|''$/gm, ''); // removing quotes
          var pool = {
            id: poolId
          };
          nic.ipConfigurations[0].loadBalancerBackendAddressPools.push(pool);
        });
      } else {
        nic.ipConfigurations[0].loadBalancerBackendAddressPools = [];
      }
    }

    if (options.lbInboundNatRuleIds) {
      if (utils.argHasValue(options.lbInboundNatRuleIds)) {
        nic.ipConfigurations[0].loadBalancerInboundNatRules = [];
        var natIds = options.lbInboundNatRuleIds.split(',');
        natIds.forEach(function (natId) {
          natId = natId.replace(/'|''$/gm, ''); // removing quotes
          var nat = {
            id: natId
          };
          nic.ipConfigurations[0].loadBalancerInboundNatRules.push(nat);
        });
      } else {
        nic.ipConfigurations[0].loadBalancerInboundNatRules = [];
      }
    }

    return nic;
  },

  _showNic: function (nic, resourceGroupName, nicName) {
    var self = this;

    self.interaction.formatOutput(nic, function (nic) {
      if (nic === null) {
        self.output.warn(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
        return;
      }

      self.output.nameValue($('Id'), nic.id);
      self.output.nameValue($('Name'), nic.name);
      self.output.nameValue($('Type'), nic.type);
      self.output.nameValue($('Location'), nic.location);
      self.output.nameValue($('Provisioning state'), nic.provisioningState);
      self.output.nameValue($('Tags'), tagUtils.getTagsInfo(nic.tags));
      self.output.nameValue($('MAC address'), nic.macAddress);
      self.output.nameValue($('Internal DNS name label'), nic.dnsSettings.internalDnsNameLabel);
      self.output.nameValue($('Internal FQDN'), nic.dnsSettings.internalFqdn);
      self.output.nameValue($('Enable IP forwarding'), nic.enableIPForwarding);

      if (nic.networkSecurityGroup) {
        self.output.nameValue($('Network security group'), nic.networkSecurityGroup.id);
      }
      if (nic.virtualMachine) {
        self.output.nameValue($('Virtual machine'), nic.virtualMachine.id);
      }

      self.output.header($('IP configurations'));
      nic.ipConfigurations.forEach(function (config) {
        self.output.nameValue($('Name'), config.name, 2);
        self.output.nameValue($('Provisioning state'), config.provisioningState, 2);
        if (config.publicIPAddress) {
          self.output.nameValue($('Public IP address'), config.publicIPAddress.id, 2);
        }
        self.output.nameValue($('Private IP address'), config.privateIPAddress, 2);
        self.output.nameValue($('Private IP allocation method'), config.privateIPAllocationMethod, 2);
        self.output.nameValue($('Subnet'), config.subnet.id, 2);

        if (config.loadBalancerBackendAddressPools && config.loadBalancerBackendAddressPools.length > 0) {
          self.output.header($('Load balancer backend address pools'), 2);
          config.loadBalancerBackendAddressPools.forEach(function (pool) {
            self.output.nameValue($('Id'), pool.id, 4);
          });
        }

        if (config.loadBalancerInboundNatRules && config.loadBalancerInboundNatRules.length > 0) {
          self.output.header($('Load balancer inbound NAT rules'), 2);
          config.loadBalancerInboundNatRules.forEach(function (rule) {
            self.output.nameValue($('Id'), rule.id, 4);
          });
        }

        self.output.data($(''), '');
      });
    });
  },

  _updateBackendAddressPool: function (resourceGroupName, nicName, options, isAdding, _) {
    var self = this;

    var nic = self.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var poolId = null;
    var ipConfiguration = nic.ipConfigurations[0];

    if (!ipConfiguration.loadBalancerBackendAddressPools) {
      ipConfiguration.loadBalancerBackendAddressPools = [];
    }

    if (!options.lbAddressPoolId && !options.lbName && !options.lbAddressPoolName) {
      throw new Error($('You must specify --lb-address-pool-id or --lb-name, --lb-address-pool-name'));
    }

    if (options.lbAddressPoolId) {
      if (options.lbName || options.lbAddressPoolName) {
        self.output.warn('--lb-name parameter, --lb-address-pool-name will be ignored');
      }
      poolId = options.lbAddressPoolId;
    } else if (options.lbName || options.lbAddressPoolName) {
      if (!options.lbName) {
        throw new Error($('You must specify --lb-name parameter if --lb-address-pool-name is specified'));
      }
      if (!options.lbAddressPoolName) {
        throw new Error($('You must specify --lb-address-pool-name parameter if --lb-name is specified'));
      }

      var lb = self.loadBalancerCrud.get(resourceGroupName, options.lbName, _);
      if (!lb) {
        throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), options.lbName, resourceGroupName));
      }

      var pool = utils.findFirstCaseIgnore(lb.backendAddressPools, {name: options.lbAddressPoolName});
      if (!pool) {
        throw new Error(util.format($('A backend address pool with name "%s" not found in the load balancer "%s" resource group "%s"'), options.lbAddressPoolName, options.lbName, resourceGroupName));
      }
      poolId = pool.id;
    }

    if (isAdding) {
      if (utils.findFirstCaseIgnore(ipConfiguration.loadBalancerBackendAddressPools, {id: poolId})) {
        throw new Error(util.format($('Specified backend address pool already attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
      ipConfiguration.loadBalancerBackendAddressPools.push({id: poolId});
    } else {
      var index = utils.indexOfCaseIgnore(ipConfiguration.loadBalancerBackendAddressPools, {id: poolId});
      if (index === -1) {
        throw new Error(util.format($('Backend address pool is not attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
      ipConfiguration.loadBalancerBackendAddressPools.splice(index, 1);
    }

    nic = self.update(resourceGroupName, nicName, nic, _);
    self._showNic(nic);
  },

  _updateInboundNatRule: function (resourceGroupName, nicName, options, isAdding, _) {
    var self = this;

    var nic = self.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var ruleId = null;
    var ipConfiguration = nic.ipConfigurations[0];

    if (!ipConfiguration.loadBalancerInboundNatRules) {
      ipConfiguration.loadBalancerInboundNatRules = [];
    }

    if (!options.lbInboundNatRuleId && !options.lbName && !options.lbInboundNatRuleName) {
      throw new Error($('You must specify --lb-inbound-nat-rule-id or --lb-name, --lb-inbound-nat-rule-name'));
    }

    if (options.lbInboundNatRuleId) {
      if (options.lbName || options.lbInboundNatRuleName) {
        self.output.warn('--lb-name, --lb-inbound-nat-rule-name will be ignored');
      }
      ruleId = options.lbInboundNatRuleId;
    } else if (options.lbName || options.lbInboundNatRuleName) {
      if (!options.lbName) {
        throw new Error($('You must specify --lb-name parameter if --lb-inbound-nat-rule-name is specified'));
      }
      if (!options.lbInboundNatRuleName) {
        throw new Error($('You must specify --lb-inbound-nat-rule-name parameter if --lb-name is specified'));
      }

      var lb = self.loadBalancerCrud.get(resourceGroupName, options.lbName, _);
      if (!lb) {
        throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), options.lbName, resourceGroupName));
      }

      var rule = utils.findFirstCaseIgnore(lb.inboundNatRules, {name: options.lbInboundNatRuleName});
      if (!rule) {
        throw new Error(util.format($('An inbound NAT rule with name "%s" not found in the load balancer "%s"'), options.lbInboundNatRuleName, options.lbName));
      } else {
        ruleId = rule.id;
      }
    }

    if (isAdding) {
      if (!utils.findFirstCaseIgnore(ipConfiguration.loadBalancerInboundNatRules, {id: ruleId})) {
        ipConfiguration.loadBalancerInboundNatRules.push({id: ruleId});
      } else {
        throw new Error(util.format($('Inbound NAT rule already attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    } else {
      var index = utils.indexOfCaseIgnore(ipConfiguration.loadBalancerInboundNatRules, {id: ruleId});
      if (index !== -1) {
        ipConfiguration.loadBalancerInboundNatRules.splice(index, 1);
      } else {
        throw new Error(util.format($('Inbound NAT rule is not attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    }

    nic = self.update(resourceGroupName, nicName, nic, _);
    self._showNic(nic);
  }
});

module.exports = Nic;