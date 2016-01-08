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
var constants = require('./constants');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
var EndPointUtil = require('../../../util/endpointUtil');
var VNetUtil = require('../../../util/vnet.util');
var PublicIp = require('./publicIp');
var Subnet = require('./subnet');

function LoadBalancer(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.publicIpCrud = new PublicIp(cli, networkManagementClient);
  this.subnetCrud = new Subnet(cli, networkManagementClient);
  this.endpointUtil = new EndPointUtil();
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(LoadBalancer.prototype, {

  /**
   * Load Balancer methods
   */
  create: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var parameters = {
      location: options.location
    };

    parameters = self._parseLoadBalancer(parameters, options);

    var lb = self.get(resourceGroupName, lbName, _);
    if (lb) {
      throw new Error(util.format($('A load balancer with name "%s" already exists in the resource group "%s"'), lbName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating load balancer "%s"'), lbName));
    try {
      lb = self.networkManagementClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, parameters, _);
    } finally {
      progress.end();
    }
    self._showLoadBalancer(lb);
  },

  set: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = self._parseLoadBalancer(lb, options);

    lb = self.update(resourceGroupName, lbName, lb, _);
    self._showLoadBalancer(lb);
  },

  list: function (options, _) {
    var self = this;

    var progress = self.interaction.progress($('Looking up load balancers'));
    var lbs = null;

    try {
      if (options.resourceGroup) {
        lbs = self.networkManagementClient.loadBalancers.list(options.resourceGroup, _);
      } else {
        lbs = self.networkManagementClient.loadBalancers.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(lbs, function (lbs) {
      if (lbs.length === 0) {
        self.output.warn($('No load balancers found'));
      } else {
        self.output.table(lbs, function (row, lb) {
          row.cell($('Name'), lb.name);
          row.cell($('Location'), lb.location);
          var resInfo = resourceUtils.getResourceInformation(lb.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), lb.provisioningState);
          row.cell($('Probe'), lb.probes.length);
          row.cell($('FIP'), lb.frontendIPConfigurations.length);
          row.cell($('Backend pool'), lb.backendAddressPools.length);
          row.cell($('Rule'), lb.loadBalancingRules.length);
          row.cell($('Inbound NAT rule'), lb.inboundNatRules.length);
          row.cell($('Inbound NAT pool'), lb.inboundNatPools.length);
          row.cell($('Outbound NAT rule'), lb.outboundNatRules.length);
        });
      }
    });
  },

  show: function (resourceGroupName, lbName, options, _) {
    var self = this;
    var lb = self.get(resourceGroupName, lbName, _);

    self.interaction.formatOutput(lb, function (lb) {
      if (lb === null) {
        self.output.warn(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
      } else {
        self._showLoadBalancer(lb);
      }
    });
  },

  get: function (resourceGroupName, lbName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the load balancer "%s"'), lbName));
    try {
      var lb = self.networkManagementClient.loadBalancers.get(resourceGroupName, lbName, _);
      return lb;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete load balancer "%s"? [y/n] '), lbName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting load balancer "%s"'), lbName));
    try {
      self.networkManagementClient.loadBalancers.deleteMethod(resourceGroupName, lbName, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, lbName, parameters, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Updating load balancer "%s"'), lbName));
    try {
      var lb = self.networkManagementClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, parameters, _);
      return lb;
    } finally {
      progress.end();
    }
  },

  /**
   * Frontend IP Configuration methods
   */
  createFrontendIP: function (resourceGroupName, lbName, fipName, options, _) {
    var self = this;

    if (!options.publicIpName && !options.publicIpId && !options.subnetId && !options.subnetName && !options.subnetVnetName) {
      throw new Error($('You must specify --public-ip-id, --public-ip-name or --subnet-id, --subnet-name, --subnet-vnet-name'), lbName, resourceGroupName);
    }

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var fip = {
      name: fipName,
      privateIPAllocationMethod: 'Dynamic'
    };

    fip = self._parseFrontendIP(resourceGroupName, fip, options, _);

    if (utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: fipName})) {
      throw new Error(util.format($('Frontend IP configuration with name "%s" already exists in the load balancer "%s"'), fipName, lbName));
    }

    lb.frontendIPConfigurations.push(fip);

    lb = self.update(resourceGroupName, lbName, lb, _);

    fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: fipName});
    self._showFrontendIP(fip);
  },

  setFrontendIP: function (resourceGroupName, lbName, fipName, options, _) {
    var self = this;
    var lb = self.get(resourceGroupName, lbName, _);

    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: fipName});
    if (!fip) {
      throw new Error(util.format($('Frontend IP configuration with name "%s" not found in the load balancer "%s"'), fipName, lbName));
    }

    self._parseFrontendIP(resourceGroupName, fip, options, _);

    lb = self.update(resourceGroupName, lbName, lb, _);

    fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: fipName});
    self._showFrontendIP(fip);
  },

  listFrontendIPs: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.frontendIPConfigurations, function (fips) {
      if (fips.length === 0) {
        self.output.warn($('No frontend IP configurations found'));
      } else {
        self._listFrontendIP(fips);
      }
    });
  },

  deleteFrontendIP: function (resourceGroupName, lbName, fipName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var index = utils.indexOfCaseIgnore(lb.frontendIPConfigurations, {name: fipName});
    if (index === -1) {
      throw new Error(util.format($('Frontend IP configuration with name "%s" not found in the load balancer "%s"'), fipName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete frontend IP configuration "%s" ? [y/n] '), fipName), _)) {
      return;
    }

    lb.frontendIPConfigurations.splice(index, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Probe methods
   */
  createProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var self = this;

    var probe = {
      name: probeName
    };

    probe = self._parseProbe(probe, options, true);

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    if (utils.findFirstCaseIgnore(lb.probes, {name: probeName})) {
      throw new Error(util.format($('A probe with name "%s" already exists in the load balancer "%s"'), probeName, lbName));
    }

    lb.probes.push(probe);
    lb = self.update(resourceGroupName, lbName, lb, _);

    probe = utils.findFirstCaseIgnore(lb.probes, {name: probeName});
    self._showProbe(probe);
  },

  setProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var probe = utils.findFirstCaseIgnore(lb.probes, {
      name: probeName
    });
    if (!probe) {
      throw new Error(util.format($('A probe with name "%s" not found in the load balancer "%s"'), probeName, lbName));
    }

    self._parseProbe(probe, options, false);
    lb = self.update(resourceGroupName, lbName, lb, _);

    probe = utils.findFirstCaseIgnore(lb.probes, {name: probeName});
    self._showProbe(probe);
  },

  listProbes: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.probes, function (probes) {
      if (probes.length === 0) {
        self.output.warn($('No probes found'));
      } else {
        self._listProbes(probes);
      }
    });
  },

  deleteProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var index = utils.indexOfCaseIgnore(lb.probes, {name: probeName});
    if (index === -1) {
      throw new Error(util.format($('A probe with name with name "%s" not found in the load balancer "%s"'), probeName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete probe "%s" ? [y/n] '), probeName), _)) {
      return;
    }

    lb.probes.splice(index, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Backend Address Pool methods
   */
  createBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var self = this;

    var pool = {
      name: poolName,
      properties: {}
    };

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    if (utils.findFirstCaseIgnore(lb.backendAddressPools, {name: poolName})) {
      throw new Error(util.format($('A backend address pool with name "%s" already exists in the load balancer "%s"'), poolName, lbName));
    }

    lb.backendAddressPools.push(pool);
    lb = self.update(resourceGroupName, lbName, lb, _);

    pool = utils.findFirstCaseIgnore(lb.backendAddressPools, {name: poolName});
    self._showBackendAddressPool(pool);
  },

  listBackendAddressPools: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.backendAddressPools, function (pools) {
      if (pools.length === 0) {
        self.output.warn($('No backend address pools found'));
      } else {
        self._listBackendAddressPools(pools);
      }
    });
  },

  deleteBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var index = utils.indexOfCaseIgnore(lb.backendAddressPools, {name: poolName});
    if (index === -1) {
      throw new Error(util.format($('A backend address pool with name with name "%s" not found in the load balancer "%s"'), poolName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete backend address pool "%s" ? [y/n] '), poolName), _)) {
      return;
    }

    lb.backendAddressPools.splice(index, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Rules methods
   */
  createBalancingRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;

    var rule = {
      name: ruleName
    };

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    rule = self._parseBalancingRule(lb, rule, options, true);

    if (utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName})) {
      throw new Error(util.format($('Load balancing rule with name "%s" already exists in the load balancer "%s"'), ruleName, lbName));
    }

    lb.loadBalancingRules.push(rule);
    lb = self.update(resourceGroupName, lbName, lb, _);

    rule = utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    self._showBalancingRule(rule);
  },

  setBalancingRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var rule = utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    if (!rule) {
      throw new Error(util.format($('Load balancing rule with the name "%s" not found in load balancer "%s"'), ruleName, lbName));
    }

    self._parseBalancingRule(lb, rule, options, false);
    lb = self.update(resourceGroupName, lbName, lb, _);

    rule = utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    self._showBalancingRule(rule);
  },

  listBalancingRules: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.loadBalancingRules, function (rules) {
      if (rules.length === 0) {
        self.output.warn($('No load balancing rules found'));
      } else {
        self._listBalancingRules(rules);
      }
    });
  },

  deleteBalancingRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var index = utils.indexOfCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    if (index === -1) {
      throw new Error(util.format($('A load balancing rule with name "%s" not found in the load balancer "%s"'), ruleName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete load balancing rule "%s" ? [y/n] '), ruleName), _)) {
      return;
    }

    lb.loadBalancingRules.splice(index, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Inbound NAT Rules methods
   */
  createInboundNatRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var rule = {
      name: ruleName
    };

    rule = self._parseInboundNatRule(lb, rule, options, true);

    if (utils.findFirstCaseIgnore(lb.inboundNatRules, {name: ruleName})) {
      throw new Error(util.format($('An inbound NAT rule with name "%s" already exists in the load balancer "%s"'), ruleName, lbName));
    }

    lb.inboundNatRules.push(rule);
    lb = self.update(resourceGroupName, lbName, lb, _);

    rule = utils.findFirstCaseIgnore(lb.inboundNatRules, {name: ruleName});
    self._showInboundNatRule(rule);
  },

  setInboundNatRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var rule = utils.findFirstCaseIgnore(lb.inboundNatRules, {name: ruleName});
    if (!rule) {
      throw new Error(util.format($('An inbound NAT rule with name "%s" not found in the load balancer "%s"'), ruleName, lbName));
    }

    self._parseInboundNatRule(lb, rule, options, false);
    lb = self.update(resourceGroupName, lbName, lb, _);

    rule = utils.findFirstCaseIgnore(lb.inboundNatRules, {name: ruleName});
    self._showInboundNatRule(rule);
  },

  listInboundNatRules: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.inboundNatRules, function (inboundNatRules) {
      if (inboundNatRules.length === 0) {
        self.output.warn($('No inbound NAT rules found'));
      } else {
        self._listInboundNatRules(inboundNatRules);
      }
    });
  },

  deleteInboundNatRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var self = this;
    var lb = self.get(resourceGroupName, lbName, _);

    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var ruleIndex = utils.indexOfCaseIgnore(lb.inboundNatRules, {name: ruleName});
    if (ruleIndex === -1) {
      throw new Error(util.format($('An inbound NAT rule with name "%s" not found in the load balancer "%s"'), ruleName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete inbound NAT rule "%s" ? [y/n] '), ruleName), _)) {
      return;
    }

    lb.inboundNatRules.splice(ruleIndex, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Inbound NAT Pools methods
   */
  createInboundNatPool: function (resourceGroupName, lbName, poolName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var pool = {
      name: poolName
    };
    pool = self._parseInboundNatPool(lb, pool, options, true);

    if (utils.findFirstCaseIgnore(lb.inboundNatPools, {name: poolName})) {
      throw new Error(util.format($('An inbound NAT pool with name "%s" already exists in the load balancer "%s"'), poolName, lbName));
    }

    lb.inboundNatPools.push(pool);

    lb = self.update(resourceGroupName, lbName, lb, _);

    pool = utils.findFirstCaseIgnore(lb.inboundNatPools, {name: poolName});
    self._showInboundNatPool(pool);
  },

  setInboundNatPool: function (resourceGroupName, lbName, poolName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var pool = utils.findFirstCaseIgnore(lb.inboundNatPools, {name: poolName});
    if (!pool) {
      throw new Error(util.format($('An inbound NAT pool with name "%s" not found in the load balancer "%s"'), poolName, lbName));
    }

    self._parseInboundNatPool(lb, pool, options, false);
    lb = self.update(resourceGroupName, lbName, lb, _);

    pool = utils.findFirstCaseIgnore(lb.inboundNatPools, {name: poolName});
    self._showInboundNatPool(pool);
  },

  listInboundNatPools: function (resourceGroupName, lbName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    self.interaction.formatOutput(lb.inboundNatPools, function (inboundNatPools) {
      if (inboundNatPools.length === 0) {
        self.output.warn($('No inbound NAT pools found'));
      } else {
        self._listInboundNatPools(inboundNatPools);
      }
    });
  },

  deleteInboundNatPool: function (resourceGroupName, lbName, poolName, options, _) {
    var self = this;

    var lb = self.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var index = utils.indexOfCaseIgnore(lb.inboundNatPools, {name: poolName});
    if (index === -1) {
      throw new Error(util.format($('An inbound NAT pool with name "%s" not found in the load balancer "%s"'), poolName, lbName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete inbound NAT pool "%s" ? [y/n] '), poolName), _)) {
      return;
    }

    lb.inboundNatPools.splice(index, 1);
    self.update(resourceGroupName, lbName, lb, _);
  },

  /**
   * Private methods
   */
  _parseLoadBalancer: function (lb, options) {
    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(lb, options);
      } else {
        lb.tags = {};
      }
    }

    return lb;
  },

  _parseFrontendIP: function (resourceGroupName, fip, options, _) {
    var self = this;

    if (options.privateIpAddress) {
      if (utils.argHasValue(options.privateIpAddress)) {
        var ipValidation = self.vnetUtil.parseIPv4(options.privateIpAddress);
        if (ipValidation.error) throw new Error(ipValidation.error);
        fip.privateIPAddress = options.privateIpAddress;
        fip.privateIPAllocationMethod = 'Static';
      } else {
        delete fip.privateIPAddress;
        fip.privateIPAllocationMethod = 'Dynamic';
      }
    }

    if (options.publicIpId) {
      if (options.publicIpName) self.output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      fip.publicIPAddress = {
        id: options.publicIpId
      };
      delete fip.subnet;
    } else if (options.publicIpName) {
      var publicip = self.publicIpCrud.get(resourceGroupName, options.publicIpName, _);
      if (!publicip) {
        throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), options.publicIpName, resourceGroupName));
      }
      fip.publicIPAddress = {
        id: publicip.id
      };
      delete fip.subnet;
    }

    if (options.subnetId) {
      if (options.subnetName || options.subnetVnetName) self.output.warn($('--subnet-name, --subnet-vnet-name parameter will be ignored because --subnet-name, --subnet-vnet-name and --subnet-id are mutually exclusive'));
      fip.subnet = {
        id: options.subnetId
      };
      delete fip.publicIPAddress;
    } else if (options.subnetName && options.subnetVnetName) {
      var subnet = self.subnetCrud.get(resourceGroupName, options.subnetVnetName, options.subnetName, _);
      if (!subnet) {
        throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.subnetName, resourceGroupName));
      }
      fip.subnet = {
        id: subnet.id
      };
      delete fip.publicIPAddress;
    }

    return fip;
  },

  _parseProbe: function (probe, options, useDefaults) {
    var self = this;

    if (options.path) {
      if (utils.stringIsNullOrEmpty(options.path)) {
        throw new Error($('--path must not be null or empty string'));
      }
      probe.requestPath = options.path;
    }

    if (options.protocol) {
      var protocolValidation = self.endpointUtil.validateProbProtocol(options.protocol, '--protocol');
      if (protocolValidation.error) {
        throw new Error(protocolValidation.error);
      }

      if (utils.ignoreCaseEquals(options.protocol, self.endpointUtil.protocols.TCP) && options.path) {
        self.output.warn($('--path will be ignored when probe protocol is TCP'));
        delete probe.requestPath;
      }

      if (utils.ignoreCaseEquals(options.protocol, self.endpointUtil.protocols.HTTP) && !options.path) {
        throw new Error($('--path is required when probe protocol is HTTP'));
      }

      probe.protocol = protocolValidation.protocol;
    } else if (useDefaults) {
      self.output.warn(util.format($('Using default probe protocol: %s'), constants.lb.defProtocol));
      probe.protocol = constants.lb.defProtocol;
    }

    if (options.port) {
      var portValidation = self.endpointUtil.validatePort(options.port, '--port');
      if (portValidation.error) throw new Error(portValidation.error);
      probe.port = portValidation.port;
    } else if (useDefaults) {
      self.output.warn(util.format($('Using default probe port: %s'), constants.lb.defPort));
      probe.port = constants.lb.defPort;
    }

    if (options.interval) {
      var intervalValidation = self.endpointUtil.validateProbInterval(options.interval, '--interval');
      if (intervalValidation.error) throw new Error(intervalValidation.error);
      probe.intervalInSeconds = intervalValidation.interval;
    }

    if (options.count) {
      var countAsInt = utils.parseInt(options.count);
      if (isNaN(countAsInt)) {
        throw new Error(util.format($('Count parameter must be an integer'), countAsInt));
      }
      probe.numberOfProbes = countAsInt;
    }

    return probe;
  },

  _parseBalancingRule: function (lb, rule, options, useDefaults) {
    var self = this;

    if (options.protocol) {
      rule.protocol = utils.verifyParamExistsInCollection(constants.lb.protocols, options.protocol, '--protocol');
    } else if (useDefaults) {
      var defProtocol = constants.lb.defProtocol;
      self.output.warn(util.format($('Using default protocol: %s'), defProtocol));
      rule.protocol = defProtocol;
    }

    if (options.frontendPort) {
      var frontendPortValidation = self.endpointUtil.validatePort(options.frontendPort, '--frontend-port');
      if (frontendPortValidation.error) {
        throw new Error(frontendPortValidation.error);
      }
      rule.frontendPort = frontendPortValidation.port;
    } else if (useDefaults) {
      var defFrontendPort = constants.lb.defPort;
      self.output.warn(util.format($('Using default frontend port: %s'), defFrontendPort));
      rule.frontendPort = defFrontendPort;
    }

    if (options.backendPort) {
      var backendPortValidation = self.endpointUtil.validatePort(options.backendPort, '--backend-port');
      if (backendPortValidation.error) {
        throw new Error(backendPortValidation.error);
      }
      rule.backendPort = backendPortValidation.port;
    } else if (useDefaults) {
      var defBackendPort = constants.lb.defPort;
      self.output.warn(util.format($('Using default backend port: %s'), defBackendPort));
      rule.backendPort = defBackendPort;
    }

    if (options.idleTimeout) {
      var timeoutAsInt = utils.parseInt(options.idleTimeout);
      if (isNaN(timeoutAsInt)) {
        throw new Error($('--idle-timeout must be posivite integer'));
      }
      rule.idleTimeoutInMinutes = timeoutAsInt;
    } else if (useDefaults) {
      var defTimeout = constants.lb.defTimeout;
      self.output.warn(util.format($('Using default idle timeout: %s'), defTimeout));
      rule.idleTimeoutInMinutes = defTimeout;
    }

    if (options.enableFloatingIp) {
      rule.enableFloatingIP = utils.parseBool(options.enableFloatingIp, '--enable-floating-ip');
    } else if (useDefaults) {
      var defFloatingIp = constants.lb.defFloatingIp;
      self.output.warn(util.format($('Using default enable floating ip: %s'), defFloatingIp));
      rule.enableFloatingIP = defFloatingIp;
    }

    if (options.backendAddressPoolName) {
      var pool = utils.findFirstCaseIgnore(lb.backendAddressPools, {
        name: options.backendAddressPoolName
      });
      if (!pool) {
        throw new Error(util.format($('Backend address pool with name "%s" not found in the load balancer "%s"'), options.backendAddressPoolName, lb.name));
      }
      rule.backendAddressPool = {
        id: pool.id
      };
    } else if (useDefaults) {
      if (lb.backendAddressPools.length === 0) {
        throw new Error($('Load balancer must have at least one backend address pool if --backend-address-pool--name parameter is not specified.'));
      }
      var defPool = lb.backendAddressPools[0];
      self.output.warn(util.format($('Using backend address pool: %s'), defPool.name));
      rule.backendAddressPool = {
        id: defPool.id
      };
    }

    if (options.frontendIpName) {
      var fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {
        name: options.frontendIpName
      });
      if (!fip) {
        throw new Error(util.format($('Frontend IP configuration with name "%s" not found in the load balancer "%s"'), options.frontendIpName, lb.name));
      }
      rule.frontendIPConfiguration = {
        id: fip.id
      };
    } else if (useDefaults) {
      if (lb.frontendIPConfigurations.length === 0) {
        throw new Error($('Load balancer must have at least one frontend IP configuration if --frontend-ip-name parameter is not specified.'));
      }
      var defFip = lb.frontendIPConfigurations[0];
      self.output.warn(util.format($('Using frontend IP configuration: %s'), defFip.name));
      rule.frontendIPConfiguration = {
        id: defFip.id
      };
    }

    if (options.loadDistribution) {
      rule.loadDistribution = utils.verifyParamExistsInCollection(constants.lb.distribution, options.loadDistribution, '--load-distribution');
    } else if (useDefaults) {
      var defLoadDistr = constants.lb.distribution[0];
      self.output.warn(util.format($('Using default load distribution: %s'), defLoadDistr));
      rule.loadDistribution = defLoadDistr;
    }

    if (options.probeName) {
      if (utils.argHasValue(options.probeName)) {
        if (lb.probes.length === 0) {
          throw new Error(util.format($('No probes found for the load balancer "%s"'), lb.name));
        }
        var probe = utils.findFirstCaseIgnore(lb.probes, {
          name: options.probeName
        });
        if (!probe) {
          throw new Error(util.format($('Probe with name "%s" not found in the load balancer "%s"'), options.probeName, lb.name));
        }
        rule.probe = {
          id: probe.id
        };
      } else {
        delete rule.probe;
      }
    }

    return rule;
  },

  _parseInboundNatRule: function (lb, rule, options, useDefaults) {
    var self = this;

    if (options.protocol) {
      rule.protocol = utils.verifyParamExistsInCollection(constants.lb.protocols, options.protocol, '--protocol');
    } else if (useDefaults) {
      var defProtocol = constants.lb.defProtocol;
      self.output.warn(util.format($('Using default protocol: %s'), defProtocol));
      rule.protocol = defProtocol;
    }

    if (options.frontendPort) {
      var frontendPortValidation = self.endpointUtil.validatePort(options.frontendPort, '--frontend-port');
      if (frontendPortValidation.error) {
        throw new Error(frontendPortValidation.error);
      }
      rule.frontendPort = frontendPortValidation.port;
    } else if (useDefaults) {
      var defFrontendPort = constants.lb.defPort;
      self.output.warn(util.format($('Using default frontend port: %s'), defFrontendPort));
      rule.frontendPort = defFrontendPort;
    }

    if (options.backendPort) {
      var backendPortValidation = self.endpointUtil.validatePort(options.backendPort, '--backend-port');
      if (backendPortValidation.error) {
        throw new Error(backendPortValidation.error);
      }
      rule.backendPort = backendPortValidation.port;
    } else if (useDefaults) {
      var defBackendPort = constants.lb.defPort;
      self.output.warn(util.format($('Using default backend port: %s'), defBackendPort));
      rule.backendPort = defBackendPort;
    }

    if (options.enableFloatingIp) {
      rule.enableFloatingIP = utils.parseBool(options.enableFloatingIp, '--enable-floating-ip');
    } else if (useDefaults) {
      var defFloatingIp = constants.lb.defFloatingIp;
      self.output.warn(util.format($('Using default enable floating ip: %s'), defFloatingIp));
      rule.enableFloatingIP = defFloatingIp;
    }

    if (options.idleTimeout) {
      var timeoutAsInt = utils.parseInt(options.idleTimeout);
      if (isNaN(timeoutAsInt)) {
        throw new Error($('--idle-timeout must be posivite integer'));
      }
      rule.idleTimeoutInMinutes = timeoutAsInt;
    } else if (useDefaults) {
      var defTimeout = constants.lb.defTimeout;
      self.output.warn(util.format($('Using default idle timeout: %s'), defTimeout));
      rule.idleTimeoutInMinutes = defTimeout;
    }

    if (options.frontendIpName) {
      var fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {
        name: options.frontendIpName
      });
      if (!fip) {
        throw new Error(util.format($('Frontend IP configuration with name "%s" not found in the load balancer "%s"'), options.frontendIpName, lb.name));
      }
      rule.frontendIPConfiguration = {
        id: fip.id
      };
    } else if (useDefaults) {
      if (lb.frontendIPConfigurations.length === 0) {
        throw new Error(util.format($('Load balancer "%s" has no frontend IP configurations defined'), lb.name));
      }
      var defFip = lb.frontendIPConfigurations[0];
      self.output.warn(util.format($('Using default frontend IP configuration "%s"'), defFip.name));
      rule.frontendIPConfiguration = {
        id: defFip.id
      };
    }

    return rule;
  },

  _parseInboundNatPool: function (lb, pool, options, useDefaults) {
    var self = this;

    if (options.protocol) {
      pool.protocol = utils.verifyParamExistsInCollection(constants.lb.protocols, options.protocol, '--protocol');
    } else if (useDefaults) {
      var defProtocol = constants.lb.defProtocol;
      self.output.warn(util.format($('Using default protocol: %s'), defProtocol));
      pool.protocol = defProtocol;
    }

    if (options.frontendPortRangeStart) {
      var portStartValidation = self.endpointUtil.validatePort(options.frontendPortRangeStart, '--frontend-port-range-start');
      if (portStartValidation.error) {
        throw new Error(portStartValidation.error);
      }
      pool.frontendPortRangeStart = portStartValidation.port;
    } else if (useDefaults) {
      var defPortRangeStart = constants.portBounds[0];
      self.output.warn(util.format($('Using default frontend port range start: %s'), defPortRangeStart));
      pool.frontendPortRangeStart = defPortRangeStart;
    }

    if (options.frontendPortRangeEnd) {
      var portEndValidation = self.endpointUtil.validatePort(options.frontendPortRangeEnd, '--frontend-port-range-end');
      if (portEndValidation.error) {
        throw new Error(portEndValidation.error);
      }
      pool.frontendPortRangeEnd = portEndValidation.port;
    } else if (useDefaults) {
      var defPortRangeEnd = constants.portBounds[1];
      self.output.warn(util.format($('Using default frontend port range end: %s'), defPortRangeEnd));
      pool.frontendPortRangeEnd = defPortRangeEnd;
    }

    if (options.frontendPortRangeStart && options.frontendPortRangeEnd) {
      if (options.frontendPortRangeStart > options.frontendPortRangeEnd) {
        throw new Error($('The --frontend-port-range-start should be less or equal to --frontend-port-range-end'));
      }
    }

    if (options.backendPort) {
      var backendPortValidation = self.endpointUtil.validatePort(options.backendPort, '--backend-port');
      if (backendPortValidation.error) {
        throw new Error(backendPortValidation.error);
      }
      pool.backendPort = backendPortValidation.port;
    } else if (useDefaults) {
      var defBackendPort = constants.lb.defPort;
      self.output.warn(util.format($('Using default backend port: %s'), defBackendPort));
      pool.backendPort = defBackendPort;
    }

    if (options.frontendIpName) {
      var fip = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: options.frontendIpName});
      if (!fip) {
        throw new Error(util.format($('Frontend IP configuration with name "%s" not found in load balancer "%s"'), options.frontendIpName, lb.name));
      }
      pool.frontendIPConfiguration = {
        id: fip.id
      };
    } else if (useDefaults) {
      if (lb.frontendIPConfigurations.length === 0) {
        throw new Error(util.format($('Load balancer with name "%s" has no frontend IP configurations defined'), lb.name));
      }
      var defFip = lb.frontendIPConfigurations[0];
      self.output.warn(util.format($('Using default frontend IP configuration "%s"'), defFip.name));
      pool.frontendIPConfiguration = {
        id: defFip.id
      };
    }

    return pool;
  },

  _showLoadBalancer: function (lb) {
    var self = this;
    self.output.nameValue($('Id'), lb.id);
    self.output.nameValue($('Name'), lb.name);
    self.output.nameValue($('Type'), lb.type);
    self.output.nameValue($('Location'), lb.location);
    self.output.nameValue($('Provisioning state'), lb.provisioningState);
    self.output.nameValue($('Tags'), tagUtils.getTagsInfo(lb.tags));
    if (lb.frontendIPConfigurations.length > 0) {
      self.output.data('');
      self.output.header($('Frontend IP configurations'));
      self._listFrontendIP(lb.frontendIPConfigurations);
    }
    if (lb.probes.length > 0) {
      self.output.data('');
      self.output.header($('Probes'));
      self._listProbes(lb.probes);
    }
    if (lb.backendAddressPools.length > 0) {
      self.output.data('');
      self.output.header($('Backend Address Pools'));
      self._listBackendAddressPools(lb.backendAddressPools);
    }
    if (lb.loadBalancingRules.length > 0) {
      self.output.data('');
      self.output.header($('Load Balancing Rules'));
      self._listBalancingRules(lb.loadBalancingRules);
    }
    if (lb.inboundNatRules.length > 0) {
      self.output.data('');
      self.output.header($('Inbound NAT Rules'));
      self._listInboundNatRules(lb.inboundNatRules);
    }
    if (lb.inboundNatPools.length > 0) {
      self.output.data('');
      self.output.header($('Inbound NAT Pools'));
      self._listInboundNatPools(lb.inboundNatPools);
    }
  },

  _showFrontendIP: function (fip) {
    var self = this;
    self.interaction.formatOutput(fip, function (fip) {
      self.output.nameValue('Name', fip.name);
      self.output.nameValue('Provisioning state', fip.provisioningState);
      self.output.nameValue('Private IP allocation method', fip.privateIPAllocationMethod);
      self.output.nameValue('Private IP address', fip.privateIPAddress);
      if (fip.publicIPAddress) {
        self.output.nameValue('Public IP address id', fip.publicIPAddress.id);
      }
      if (fip.subnet) {
        self.output.nameValue($('Subnet id'), fip.subnet.id);
      }
    });
  },

  _showProbe: function (probe) {
    var self = this;
    self.interaction.formatOutput(probe, function (probe) {
      self.output.nameValue($('Name'), probe.name);
      self.output.nameValue($('Provisioning state'), probe.provisioningState);
      self.output.nameValue($('Protocol'), probe.protocol);
      self.output.nameValue($('Port'), probe.port);
      self.output.nameValue($('Interval in seconds'), probe.intervalInSeconds);
      self.output.nameValue($('Number of probes'), probe.numberOfProbes);
      if (!__.isEmpty(probe.loadBalancingRules)) {
        self.output.header($('Load balancing rules'));
        probe.loadBalancingRules.forEach(function (rule) {
          self.output.listItem(rule.id);
        });
      }
    });
  },

  _showBackendAddressPool: function (pool) {
    var self = this;

    self.interaction.formatOutput(pool, function (pool) {
      self.output.nameValue($('Name'), pool.name);
      self.output.nameValue($('Provisioning state'), pool.provisioningState);
      if (!__.isEmpty(pool.backendIPConfigurations)) {
        self.output.header($('Backend IP configurations'));
        pool.backendIPConfigurations.forEach(function (ipConfig) {
          self.output.listItem(ipConfig.id);
        });
      }
    });
  },

  _showBalancingRule: function (rule) {
    var self = this;
    self.interaction.formatOutput(rule, function (rule) {
      self.output.nameValue($('Name'), rule.name);
      self.output.nameValue($('Provisioning state'), rule.provisioningState);
      self.output.nameValue($('Protocol'), rule.protocol);
      self.output.nameValue($('Frontend port'), rule.frontendPort);
      self.output.nameValue($('Backend port'), rule.backendPort);
      self.output.nameValue($('Enable floating IP'), rule.enableFloatingIP.toString());
      self.output.nameValue($('Load distribution'), rule.loadDistribution);
      self.output.nameValue($('Idle timeout in minutes'), rule.idleTimeoutInMinutes);
      if (rule.frontendIPConfiguration) {
        self.output.nameValue($('Frontend IP configuration id'), rule.frontendIPConfiguration.id);
      }
      if (rule.backendAddressPool) {
        self.output.nameValue($('Backend address pool id'), rule.backendAddressPool.id);
      }
      if (rule.probe) {
        self.output.nameValue($('Probe id'), rule.probe.id);
      }
    });
  },

  _showInboundNatRule: function (rule) {
    var self = this;
    self.interaction.formatOutput(rule, function (rule) {
      self.output.nameValue($('Name'), rule.name);
      self.output.nameValue($('Provisioning state'), rule.provisioningState);
      self.output.nameValue($('Protocol'), rule.protocol);
      self.output.nameValue($('Frontend port'), rule.frontendPort);
      self.output.nameValue($('Backend port'), rule.backendPort);
      self.output.nameValue($('Enable floating IP'), rule.enableFloatingIP.toString());
      self.output.nameValue($('Idle timeout in minutes'), rule.idleTimeoutInMinutes);
      if (rule.frontendIPConfiguration) {
        self.output.nameValue($('Frontend IP configuration id'), rule.frontendIPConfiguration.id);
      }
      if (rule.backendIPConfiguration) {
        self.output.nameValue($('Backend IP Configuration id'), rule.backendIPConfiguration.id);
      }
    });
  },

  _showInboundNatPool: function (pool) {
    var self = this;
    self.interaction.formatOutput(pool, function (pool) {
      self.output.nameValue($('Name'), pool.name);
      self.output.nameValue($('Provisioning state'), pool.provisioningState);
      self.output.nameValue($('Protocol'), pool.protocol);
      self.output.nameValue($('Frontend port range start'), pool.frontendPortRangeStart);
      self.output.nameValue($('Frontend port range end'), pool.frontendPortRangeEnd);
      self.output.nameValue($('Backend port'), pool.backendPort);
      self.output.nameValue($('Frontend IP configuration id'), pool.frontendIPConfiguration.id);
    });
  },

  _listFrontendIP: function (fips) {
    var self = this;
    self.output.table(fips, function (row, fip) {
      row.cell($('Name'), fip.name);
      row.cell($('Provisioning state'), fip.provisioningState);
      row.cell($('Private IP allocation'), fip.privateIPAllocationMethod);
      row.cell($('Private IP '), fip.privateIPAddress || '');
      var subnetName = '';
      if (fip.subnet) {
        subnetName = resourceUtils.getResourceInformation(fip.subnet.id).resourceName;
      }
      row.cell($('Subnet'), subnetName);
      var publicipName = '';
      if (fip.publicIPAddress) {
        publicipName = resourceUtils.getResourceInformation(fip.publicIPAddress.id).resourceName;
      }
      row.cell($('Public IP'), publicipName);
    });
  },

  _listProbes: function (probes) {
    var self = this;
    self.output.table(probes, function (row, probe) {
      row.cell($('Name'), probe.name);
      row.cell($('Provisioning state'), probe.provisioningState);
      row.cell($('Protocol'), probe.protocol);
      row.cell($('Port'), probe.port);
      row.cell($('Path'), probe.requestPath || '');
      row.cell($('Interval'), probe.intervalInSeconds);
      row.cell($('Count'), probe.numberOfProbes);
    });
  },

  _listBackendAddressPools: function (pools) {
    var self = this;
    self.output.table(pools, function (row, pool) {
      row.cell($('Name'), pool.name);
      row.cell($('Provisioning state'), pool.provisioningState);
    });
  },

  _listBalancingRules: function (rules) {
    var self = this;
    self.output.table(rules, function (row, rule) {
      row.cell($('Name'), rule.name);
      row.cell($('Provisioning state'), rule.provisioningState);
      row.cell($('Load distribution'), rule.loadDistribution);
      row.cell($('Protocol'), rule.protocol);
      row.cell($('Frontend port'), rule.frontendPort);
      row.cell($('Backend port'), rule.backendPort);
      row.cell($('Enable floating IP'), rule.enableFloatingIP);
      row.cell($('Idle timeout in minutes'), rule.idleTimeoutInMinutes);
    });
  },

  _listInboundNatRules: function (rules) {
    var self = this;
    self.output.table(rules, function (row, rule) {
      row.cell($('Name'), rule.name);
      row.cell($('Provisioning state'), rule.provisioningState);
      row.cell($('Protocol'), rule.protocol);
      row.cell($('Frontend port'), rule.frontendPort);
      row.cell($('Backend port'), rule.backendPort);
      row.cell($('Enable floating IP'), rule.enableFloatingIP);
      row.cell($('Idle timeout in minutes'), rule.idleTimeoutInMinutes);
    });
  },

  _listInboundNatPools: function (pools) {
    var self = this;
    self.output.table(pools, function (row, pool) {
      row.cell($('Name'), pool.name);
      row.cell($('Provisioning state'), pool.provisioningState);
      row.cell($('Protocol'), pool.protocol);
      row.cell($('Port range start'), pool.frontendPortRangeStart);
      row.cell($('Port range end'), pool.frontendPortRangeEnd);
      row.cell($('Backend port'), pool.backendPort);
    });
  }

});

module.exports = LoadBalancer;
