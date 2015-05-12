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
var Subnet = require('./subnet');
var LoadBalancer = require('./loadBalancer');
var Nsg = require('./nsg');
var Publicip = require('./publicip');
var VNetUtil = require('../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Nic(cli, serviceClients) {
  this.cli = cli;
  this.networkResourceProviderClient = serviceClients.networkResourceProviderClient;
  this.SubnetCrud = new Subnet(cli, this.networkResourceProviderClient);
  this.LoadBalancerCrud = new LoadBalancer(cli, serviceClients);
  this.NsgCrud = new Nsg(cli, this.networkResourceProviderClient);
  this.PublicipCrud = new Publicip(cli, this.networkResourceProviderClient);
}

__.extend(Nic.prototype, {
  create: function (resourceGroupName, nicName, params, _) {
    if (params.subnetId || (params.subnetName && params.subnetVnetName)) {
      var nic = this.get(resourceGroupName, nicName, _);
      if (nic) {
        throw new Error(util.format($('A network interface with name "%s" already exists in the resource group "%s"'), nicName, resourceGroupName));
      }

      var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);
      var progress = this.cli.interaction.progress(util.format($('Creating network interface "%s"'), nicName));
      try {
        this.networkResourceProviderClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nicProfile, _);
      } finally {
        progress.end();
      }
      this.show(resourceGroupName, nicName, params, _);
    } else {
      throw new Error($('--subnet-id or --subnet-name, --subnet-vnet-name parameters must be provided'));
    }
  },

  set: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);

    if (params.privateIpAddress) {
      nic.networkInterface.ipConfigurations[0].privateIpAddress = params.privateIpAddress;
      nic.networkInterface.ipConfigurations[0].privateIpAllocationMethod = 'Static';
    }

    if (params.subnetId || (params.subnetName && params.subnetVnetName)) {
      nic.networkInterface.ipConfigurations[0].subnet = nicProfile.ipConfigurations[0].subnet;
    }

    var optionalNsgId = utils.getOptionalArg(params.networkSecurityGroupId);
    if (optionalNsgId.hasValue) {
      if (optionalNsgId.value !== null) {
        nic.networkInterface.networkSecurityGroup = nicProfile.networkSecurityGroup;
      } else {
        delete nic.networkInterface.networkSecurityGroup;
      }
    } else if (params.networkSecurityGroupName) {
      nic.networkInterface.networkSecurityGroup = nicProfile.networkSecurityGroup;
    }

    var optionalPublicipId = utils.getOptionalArg(params.publicIpId);
    if (optionalPublicipId.hasValue) {
      if (optionalPublicipId.value !== null) {
        nic.networkInterface.ipConfigurations[0].publicIpAddress = nicProfile.ipConfigurations[0].publicIpAddress;
      } else {
        delete nic.networkInterface.ipConfigurations[0].publicIpAddress;
      }
    } else if (params.publicIpName) {
      nic.networkInterface.ipConfigurations[0].publicIpAddress = nicProfile.ipConfigurations[0].publicIpAddress;
    }

    if (nicProfile.ipConfigurations && nicProfile.ipConfigurations.length > 0) {
      var ipConfig = nicProfile.ipConfigurations[0];
      if (ipConfig.loadBalancerBackendAddressPools) {
        nic.networkInterface.ipConfigurations[0].loadBalancerBackendAddressPools = ipConfig.loadBalancerBackendAddressPools;
      }

      if (ipConfig.loadBalancerInboundNatRules) {
        nic.networkInterface.ipConfigurations[0].loadBalancerInboundNatRules = ipConfig.loadBalancerInboundNatRules;
      }
    }

    if (params.tags) {
      tagUtils.appendTags(nic.networkInterface, nicProfile.tags);
    }

    if (params.tags === false) {
      nic.networkInterface.tags = {};
    }

    this.update(resourceGroupName, nicName, nic.networkInterface, _);
    this.show(resourceGroupName, nicName, params, _);
  },

  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the network interfaces'));
    var nics = null;
    try {
      nics = this.networkResourceProviderClient.networkInterfaces.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(nics.networkInterfaces, function (outputData) {
      if (outputData.length === 0) {
        output.info($('No network interfaces found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('MAC Address'), item.macAddress || '');
        });
      }
    });
  },

  show: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nic) {
      var resourceInfo = resourceUtils.getResourceInformation(nic.networkInterface.id);
      interaction.formatOutput(nic.networkInterface, function (nic) {
        output.nameValue($('Id'), nic.id);
        output.nameValue($('Name'), nic.name);
        output.nameValue($('Type'), resourceInfo.resourceType);
        output.nameValue($('Location'), nic.location);
        output.nameValue($('Provisioning state'), nic.provisioningState);
        output.nameValue($('MAC address'), nic.macAddress);
        output.nameValue($('Tags'), tagUtils.getTagsInfo(nic.tags));
        if (nic.networkSecurityGroup) {
          output.nameValue($('Network security group'), nic.networkSecurityGroup.id);
        }
        if (nic.virtualMachine) {
          output.nameValue($('Virtual machine'), nic.virtualMachine.id);
        }

        output.header($('IP configurations'));
        nic.ipConfigurations.forEach(function (config) {
          output.nameValue($('Name'), config.name, 2);
          output.nameValue($('Provisioning state'), config.provisioningState, 2);
          if (config.publicIpAddress) {
            output.nameValue($('Public IP address'), config.publicIpAddress.id, 2);
          }
          output.nameValue($('Private IP address'), config.privateIpAddress, 2);
          output.nameValue($('Private IP Allocation Method'), config.privateIpAllocationMethod, 2);
          output.nameValue($('Subnet'), config.subnet.id, 2);

          if (config.loadBalancerBackendAddressPools.length > 0) {
            output.header($('Load balancer backend address pools'), 2);
            config.loadBalancerBackendAddressPools.forEach(function (pool) {
              output.nameValue($('Id'), pool.id, 4);
            });
          }

          if (config.loadBalancerInboundNatRules.length > 0) {
            output.header($('Load balancer inbound NAT rules'), 2);
            config.loadBalancerInboundNatRules.forEach(function (rule) {
              output.nameValue($('Id'), rule.id, 4);
            });
          }

          output.data($(''), '');
        });
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, nicName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the network interface "%s"'), nicName));
    try {
      var nic = this.networkResourceProviderClient.networkInterfaces.get(resourceGroupName, nicName, _);
      return nic;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete network interface "%s"? [y/n] '), nicName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network interface "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.deleteMethod(resourceGroupName, nicName, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, nicName, nicProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating network interface "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nicProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  addAddressPoolToNic: function (resourceGroupName, nicName, params, _) {
    this._handleNicsAddressPool(resourceGroupName, nicName, params, true, _);
  },

  removeAddressPoolFromNic: function (resourceGroupName, nicName, params, _) {
    this._handleNicsAddressPool(resourceGroupName, nicName, params, false, _);
  },

  addInboundRuleToNic: function (resourceGroupName, nicName, params, _) {
    this._handleNicsInboundRule(resourceGroupName, nicName, params, true, _);
  },

  removeInboundRuleFromNic: function (resourceGroupName, nicName, params, _) {
    this._handleNicsInboundRule(resourceGroupName, nicName, params, false, _);
  },

  _handleNicsAddressPool: function (resourceGroupName, nicName, params, isAdding, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var poolId = null;

    var ipConfiguration = nic.networkInterface.ipConfigurations[0];

    if (!ipConfiguration.loadBalancerBackendAddressPools) {
      ipConfiguration.loadBalancerBackendAddressPools = [];
    }

    if (params.lbAddressPoolId) {
      if (params.lbName) {
        this.cli.output.warn('--lb-name parameter will be ignored');
      }

      if (params.addressPoolName) {
        this.cli.output.warn('--address-pool-name parameter will be ignored');
      }

      poolId = params.lbAddressPoolId;
    } else if (params.lbName || params.addressPoolName) {
      if (!params.lbName) {
        throw new Error($('You must specify --lb-name parameter if --address-pool-name is specified'));
      }

      if (!params.addressPoolName) {
        throw new Error($('You must specify --address-pool-name parameter if --lb-name is specified'));
      }
      var lb = this.LoadBalancerCrud.get(resourceGroupName, params.lbName, _);
      if (!lb) {
        throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), params.lbName, resourceGroupName));
      }

      var addressPool = utils.findFirstCaseIgnore(lb.loadBalancer.backendAddressPools, {name: params.addressPoolName});

      if (!addressPool) {
        throw new Error(util.format($('A backend address pool with name "%s" not found in the load balancer "%s" resource group "%s"'), params.addressPoolName, params.lbName, resourceGroupName));
      } else {
        poolId = addressPool.id;
      }
    } else {
      throw new Error($('You must specify --lb-address-pool-id or (--lb-name and --address-pool-name) parameters'));
    }

    if (isAdding) {
      if (!utils.findFirstCaseIgnore(ipConfiguration.loadBalancerBackendAddressPools, {id: poolId})) {
        ipConfiguration.loadBalancerBackendAddressPools.push({id: poolId});
      } else {
        throw new Error(util.format($('Specified backend address pool already attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    } else {
      var index = utils.indexOfCaseIgnore(ipConfiguration.loadBalancerBackendAddressPools, {id: poolId});
      if (index !== null) {
        ipConfiguration.loadBalancerBackendAddressPools.splice(index, 1);
      } else {
        throw new Error(util.format($('Specified backend address pool is not attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    }

    this.update(resourceGroupName, nicName, nic.networkInterface, _);
  },

  _handleNicsInboundRule: function (resourceGroupName, nicName, params, isAdding, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var ruleId = null;

    var ipConfiguration = nic.networkInterface.ipConfigurations[0];

    if (!ipConfiguration.loadBalancerInboundNatRules) {
      ipConfiguration.loadBalancerInboundNatRules = [];
    }

    if (params.inboundNatRuleId) {
      if (params.lbName) {
        this.cli.output.warn('--lb-name parameter will be ignored');
      }

      if (params.inboundNatRuleName) {
        this.cli.output.warn('--inbound-nat-rule-name parameter will be ignored');
      }

      ruleId = params.inboundNatRuleId;
    } else if (params.lbName || params.inboundNatRuleName) {
      if (!params.lbName) {
        throw new Error($('You must specify --lb-name parameter if --inbound-nat-rule-name is specified'));
      }

      if (!params.inboundNatRuleName) {
        throw new Error($('You must specify --inbound-nat-rule-name parameter if --lb-name is specified'));
      }
      var lb = this.LoadBalancerCrud.get(resourceGroupName, params.lbName, _);
      if (!lb) {
        throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), params.lbName, resourceGroupName));
      }

      var inboundNatRule = utils.findFirstCaseIgnore(lb.loadBalancer.loadBalancerInboundNatRules, {name: params.inboundNatRuleName});

      if (!inboundNatRule) {
        throw new Error(util.format($('An inbound NAT rule with name "%s" not found in the load balancer "%s" resource group "%s"'), params.inboundNatRuleName, params.lbName, resourceGroupName));
      } else {
        ruleId = inboundNatRule.id;
      }
    } else {
      throw new Error($('You must specify --inbound-nat-rule-id or (--lb-name and --inbound-nat-rule-name) parameters'));
    }

    if (isAdding) {
      if (!utils.findFirstCaseIgnore(ipConfiguration.loadBalancerInboundNatRules, {id: ruleId})) {
        ipConfiguration.loadBalancerInboundNatRules.push({id: ruleId});
      } else {
        throw new Error(util.format($('Specified inbound NAT rule already attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    } else {
      var index = utils.indexOfCaseIgnore(ipConfiguration.loadBalancerInboundNatRules, {id: ruleId});
      if (index !== null) {
        ipConfiguration.loadBalancerInboundNatRules.splice(index, 1);
      } else {
        throw new Error(util.format($('Specified inbound NAT rule is not attached to NIC "%s" in the resource group "%s"'), nicName, resourceGroupName));
      }
    }

    this.update(resourceGroupName, nicName, nic.networkInterface, _);
  },

  _parseAndValidateNIC: function (resourceGroupName, nicName, params, _) {
    var self = this;
    var output = self.cli.output;
    var vNetUtil = new VNetUtil();

    var nicProfile = {
      ipConfigurations: [
        {
          name: 'NIC-config'
        }
      ]
    };

    if (params.privateIpAddress) {
      var ipValidationResult = vNetUtil.parseIPv4(params.privateIpAddress);
      if (ipValidationResult.error) {
        throw new Error($('public ip address parameter is in invalid format'));
      }
      nicProfile.ipConfigurations[0].privateIpAllocationMethod = 'Static';
      nicProfile.ipConfigurations[0].privateIpAddress = params.privateIpAddress;
    }

    if (params.subnetId) {
      if (params.subnetName || params.subnetVnetName) {
        output.warn($('--subnet-name, --subnet-vnet-name parameters will be ignored because --subnet-name, --subnet-vnet-name and --subnet-id are mutually exclusive'));
      }
      nicProfile.ipConfigurations[0].subnet = {
        id: params.subnetId
      };
    } else {
      if (params.subnetName && params.subnetVnetName) {
        var subnet = self.SubnetCrud.get(resourceGroupName, params.subnetVnetName, params.subnetName, _);
        if (!subnet) {
          throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.subnetName, resourceGroupName));
        }
        nicProfile.ipConfigurations[0].subnet = {
          id: subnet.subnet.id
        };
      }
    }

    if (params.networkSecurityGroupId) {
      if (params.networkSecurityGroupName) output.warn($('--network-security-group-name parameter will be ignored because --network-security-group-id and --network-security-group-name are mutually exclusive'));
      nicProfile.networkSecurityGroup = {
        id: params.networkSecurityGroupId
      };
    } else {
      if (params.networkSecurityGroupName) {
        var nsg = self.NsgCrud.get(resourceGroupName, params.networkSecurityGroupName, _);
        if (!nsg) {
          throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), params.networkSecurityGroupName, resourceGroupName));
        }
        nicProfile.networkSecurityGroup = {
          id: nsg.networkSecurityGroup.id
        };
      }
    }

    if (params.publicIpId) {
      if (params.publicIpName) output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      nicProfile.ipConfigurations[0].publicIpAddress = {
        id: params.publicIpId
      };
    } else {
      if (params.publicIpName) {
        var publicip = self.PublicipCrud.get(resourceGroupName, params.publicIpName, _);
        if (!publicip) {
          throw new Error(util.format($('A public ip address  with name "%s" not found in the resource group "%s"'), params.publicIpName, resourceGroupName));
        }
        nicProfile.ipConfigurations[0].publicIpAddress = {
          id: publicip.publicIpAddress.id
        };
      }
    }

    var lbAddressPoolIdsOpt = utils.getOptionalArg(params.lbAddressPoolIds);
    if (lbAddressPoolIdsOpt.hasValue) {
      // In create or set - reset the collection
      nicProfile.ipConfigurations[0].loadBalancerBackendAddressPools = [];
      if (lbAddressPoolIdsOpt.value) {
        var lbAddressPoolIds = lbAddressPoolIdsOpt.value.split(',');
        lbAddressPoolIds.forEach(function (lbAddressPoolId) {
          lbAddressPoolId = lbAddressPoolId.replace(/'|''$/gm, '');
          var loadBalancerBackendAddressPool = {
            id: lbAddressPoolId
          };

          if (!utils.findFirstCaseIgnore(nicProfile.ipConfigurations[0].loadBalancerBackendAddressPools, loadBalancerBackendAddressPool)) {
            nicProfile.ipConfigurations[0].loadBalancerBackendAddressPools.push(loadBalancerBackendAddressPool);
          }
        });
      }
    }

    var lbInboundNatRuleIdsOpt = utils.getOptionalArg(params.lbInboundNatRuleIds);
    if (lbInboundNatRuleIdsOpt.hasValue) {
      // In create or set - reset the collection
      nicProfile.ipConfigurations[0].loadBalancerInboundNatRules = [];
      if (lbInboundNatRuleIdsOpt.value) {
        var lbInboundNatRuleIds = lbInboundNatRuleIdsOpt.value.split(',');
        lbInboundNatRuleIds.forEach(function (lbInboundNatRuleId) {
          lbInboundNatRuleId = lbInboundNatRuleId.replace(/'|''$/gm, '');
          var loadBalancerInboundNatRule = {
            id: lbInboundNatRuleId
          };

          if (!utils.findFirstCaseIgnore(nicProfile.ipConfigurations[0].loadBalancerInboundNatRules, loadBalancerInboundNatRule)) {
            nicProfile.ipConfigurations[0].loadBalancerInboundNatRules.push(loadBalancerInboundNatRule);
          }
        });
      }
    }

    if (params.location) {
      nicProfile.location = params.location;
    }

    if (params.tags) {
      nicProfile.tags = tagUtils.buildTagsParameter(null, params);
    }

    return nicProfile;
  }
});

module.exports = Nic;