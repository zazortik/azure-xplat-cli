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
var tagUtils = require('../tag/tagUtils');
var resourceUtils = require('../resource/resourceUtils');
var VNetUtil = require('../../../util/vnet.util');

function Nsg(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(Nsg.prototype, {
  /**
   * Security Group methods
   */
  create: function (resourceGroupName, nsgName, location, options, _) {
    var self = this;
    var nsg = self.get(resourceGroupName, nsgName, _);

    if (nsg) {
      throw new Error(util.format($('A network security group with name "%s" already exists in the resource group "%s"'), nsgName, resourceGroupName));
    }

    nsg = {
      name: nsgName,
      location: location
    };

    nsg = self._parseSecurityGroup(nsg, options);

    var progress = self.interaction.progress(util.format($('Creating a network security group "%s"'), nsgName));
    try {
      nsg = self.networkManagementClient.networkSecurityGroups.createOrUpdate(resourceGroupName, nsgName, nsg, _);
    } finally {
      progress.end();
    }
    self._showSecurityGroup(nsg);
  },

  set: function (resourceGroupName, nsgName, options, _) {
    var self = this;
    var nsg = self.get(resourceGroupName, nsgName, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    nsg = self._parseSecurityGroup(nsg, options);

    var progress = self.interaction.progress(util.format($('Setting a network security group "%s"'), nsgName));
    try {
      nsg = self.networkManagementClient.networkSecurityGroups.createOrUpdate(resourceGroupName, nsgName, nsg, _);
    } finally {
      progress.end();
    }
    self._showSecurityGroup(nsg);
  },

  list: function (options, _) {
    var self = this;

    var groups = null;
    var progress = self.interaction.progress($('Getting the network security groups'));

    try {
      if (options.resourceGroup) {
        groups = self.networkManagementClient.networkSecurityGroups.list(options.resourceGroup, _);
      } else {
        groups = self.networkManagementClient.networkSecurityGroups.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(groups, function (groups) {
      if (groups.length === 0) {
        self.output.warn($('No network security groups found'));
      } else {
        self.output.table(groups, function (row, nsg) {
          row.cell($('Name'), nsg.name);
          row.cell($('Location'), nsg.location);
          var resInfo = resourceUtils.getResourceInformation(nsg.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), nsg.provisioningState);
          row.cell($('Rules number'), nsg.defaultSecurityRules.length + nsg.securityRules.length);
        });
      }
    });
  },

  show: function (resourceGroupName, nsgName, options, _) {
    var self = this;
    var nsg = self.get(resourceGroupName, nsgName, _);

    self.interaction.formatOutput(nsg, function (nsg) {
      if (nsg === null) {
        self.output.warn(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
      } else {
        self._showSecurityGroup(nsg);
      }
    });
  },

  delete: function (resourceGroupName, nsgName, options, _) {
    var self = this;
    var nsg = self.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete network security group "%s"? [y/n] '), nsgName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting network security group "%s"'), nsgName));
    try {
      self.networkManagementClient.networkSecurityGroups.deleteMethod(resourceGroupName, nsgName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, nsgName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the network security group "%s"'), nsgName));
    try {
      var nsg = self.networkManagementClient.networkSecurityGroups.get(resourceGroupName, nsgName, null, _);
      return nsg;
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
   * Security Rule methods
   */
  createRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var self = this;

    var parameters = {};
    parameters = self._parseSecurityRule(parameters, options, true);

    var nsg = self.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), ruleName, resourceGroupName));
    }

    var rule = self.getRule(resourceGroupName, nsgName, ruleName, _);
    if (rule) {
      throw new Error(util.format($('A network security rule with name "%s" already exists in the network security group "%s"'), ruleName, nsgName));
    }

    var progress = self.interaction.progress(util.format($('Creating a network security rule "%s"'), ruleName));
    try {
      rule = self.networkManagementClient.securityRules.createOrUpdate(resourceGroupName, nsgName, ruleName, parameters, _);
    } finally {
      progress.end();
    }
    self._showSecurityRule(rule);
  },

  setRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var self = this;

    var nsg = self.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), ruleName, resourceGroupName));
    }

    var rule = self.getRule(resourceGroupName, nsgName, ruleName, _);
    if (!rule) {
      throw new Error(util.format($('A network security rule with name "%s" not found in the network security group "%s"'), ruleName, nsgName));
    }

    rule = self._parseSecurityRule(rule, options, false);

    var progress = self.interaction.progress(util.format($('Updating network security rule "%s"'), ruleName));
    try {
      rule = self.networkManagementClient.securityRules.createOrUpdate(resourceGroupName, nsgName, ruleName, rule, _);
    } finally {
      progress.end();
    }
    self._showSecurityRule(rule);
  },

  listRules: function (resourceGroupName, nsgName, options, _) {
    var self = this;

    var nsg = self.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    var rules = self._getAllRules(nsg);
    self.interaction.formatOutput(rules, function (rules) {
      if (rules.length === 0) {
        self.output.warn($('No rules found'));
      } else {
        self._listRules(rules);
      }
    });
  },

  showRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var self = this;
    var nsg = self.get(resourceGroupName, nsgName, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    var rule = self._findSecurityRule(nsg, ruleName);
    if (!rule) {
      rule = self._findDefaultRule(nsg, ruleName);
    }

    self.interaction.formatOutput(rule, function (rule) {
      if (rule === null) {
        self.output.warn(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
      } else {
        self._showSecurityRule(rule);
      }
    });
  },

  deleteRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var self = this;

    var nsg = self.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), ruleName, resourceGroupName));
    }

    var rule = self.getRule(resourceGroupName, nsgName, ruleName, _);
    if (!rule) {
      throw new Error(util.format($('A network security rule with name "%s" not found in the network security group "%s"'), ruleName, nsgName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete network security rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting network security rule "%s"'), ruleName));
    try {
      self.networkManagementClient.securityRules.deleteMethod(resourceGroupName, nsgName, ruleName, _);
    } finally {
      progress.end();
    }
  },

  getRule: function (resourceGroupName, nsgName, ruleName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the network security rule "%s"'), ruleName));
    try {
      var rule = self.networkManagementClient.securityRules.get(resourceGroupName, nsgName, ruleName, _);
      return rule;
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
   * Internal methods
   */
  _parseSecurityGroup: function (nsg, options) {
    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(nsg, options);
      } else {
        nsg.tags = {};
      }
    }

    return nsg;
  },

  _parseSecurityRule: function (rule, options, useDefaults) {
    var self = this;

    if (options.description) {
      if (options.description.length > 140) {
        throw new Error($('--description parameter restricted to 140 chars'));
      }
      rule.description = options.description;
    }

    if (options.protocol) {
      rule.protocol = utils.verifyParamExistsInCollection(constants.nsg.protocols, options.protocol, '--protocol');
    } else if (useDefaults) {
      var defProtocol = constants.nsg.protocols[0];
      self.output.warn(util.format($('Using default protocol: %s'), defProtocol));
      rule.protocol = defProtocol;
    }

    if (options.sourcePortRange) {
      rule.sourcePortRange = self._validatePortRange(options.sourcePortRange, '--source-port-range');
    } else if (useDefaults) {
      var defSourcePort = constants.nsg.portDef.toString();
      self.output.warn(util.format($('Using default source port: %s'), defSourcePort));
      rule.sourcePortRange = defSourcePort;
    }

    if (options.destinationPortRange) {
      rule.destinationPortRange = self._validatePortRange(options.destinationPortRange, '--destination-port-range');
    } else if (useDefaults) {
      var defDestPort = constants.nsg.portDef.toString();
      self.output.warn(util.format($('Using default destination port: %s'), defDestPort));
      rule.destinationPortRange = defDestPort;
    }

    if (options.sourceAddressPrefix) {
      rule.sourceAddressPrefix = self._validateAddressPrefix(options.sourceAddressPrefix, '--source-address-prefix');
    } else if (useDefaults) {
      var defSourcePrefix = constants.nsg.prefixDef;
      self.output.warn(util.format($('Using default source address prefix: %s'), defSourcePrefix));
      rule.sourceAddressPrefix = defSourcePrefix;
    }

    if (options.destinationAddressPrefix) {
      rule.destinationAddressPrefix = self._validateAddressPrefix(options.destinationAddressPrefix, '--destination-address-prefix');
    } else if (useDefaults) {
      var defDestPrefix = constants.nsg.prefixDef;
      self.output.warn(util.format($('Using default destination address prefix: %s'), defDestPrefix));
      rule.destinationAddressPrefix = defDestPrefix;
    }

    if (options.access) {
      rule.access = utils.verifyParamExistsInCollection(constants.nsg.access, options.access, '--access');
    } else if (useDefaults) {
      var defAccess = constants.nsg.access[0];
      self.output.warn(util.format($('Using default access: %s'), defAccess));
      rule.access = defAccess;
    }

    if (options.priority) {
      var priority = utils.parseInt(options.priority);
      if (isNaN(priority) || priority < constants.nsg.priorityMin || priority > constants.nsg.priorityMax) {
        throw new Error(util.format($('--priority must be an integer between %s and %s'), constants.nsg.priorityMin, constants.nsg.priorityMax));
      }
      rule.priority = priority;
    } else if (useDefaults) {
      var defPriority = constants.nsg.priorityMin;
      self.output.warn(util.format($('Using default priority: %s'), defPriority));
      rule.priority = defPriority;
    }

    if (options.direction) {
      rule.direction = utils.verifyParamExistsInCollection(constants.nsg.direction, options.direction, '--direction');
    } else if (useDefaults) {
      var defDirection = constants.nsg.direction[0];
      self.output.warn(util.format($('Using default direction: %s'), defDirection));
      rule.direction = defDirection;
    }

    return rule;
  },

  _showSecurityGroup: function (nsg) {
    var self = this;
    self.output.nameValue($('Id'), nsg.id);
    self.output.nameValue($('Name'), nsg.name);
    self.output.nameValue($('Type'), nsg.type);
    self.output.nameValue($('Location'), nsg.location);
    self.output.nameValue($('Provisioning state'), nsg.provisioningState);
    self.output.nameValue($('Tags'), tagUtils.getTagsInfo(nsg.tags));

    var rules = self._getAllRules(nsg);
    self._listRules(rules);
  },

  _showSecurityRule: function (rule) {
    var self = this;
    self.interaction.formatOutput(rule, function (rule) {
      self.output.nameValue($('Id'), rule.id);
      self.output.nameValue($('Name'), rule.name);
      var resInfo = resourceUtils.getResourceInformation(rule.id);
      self.output.nameValue($('Type'), resInfo.resourceType);
      self.output.nameValue($('Provisioning state'), rule.provisioningState);
      self.output.nameValue($('Description'), rule.description);
      self.output.nameValue($('Source IP'), rule.sourceAddressPrefix);
      self.output.nameValue($('Source Port'), rule.sourcePortRange);
      self.output.nameValue($('Destination IP'), rule.destinationAddressPrefix);
      self.output.nameValue($('Destination Port'), rule.destinationPortRange);
      self.output.nameValue($('Protocol'), rule.protocol);
      self.output.nameValue($('Direction'), rule.direction);
      self.output.nameValue($('Access'), rule.access);
      self.output.nameValue($('Priority'), rule.priority);
    });
  },

  _validatePortRange: function (port, paramName) {
    if (port === '*' || port === '"*"' || !isNaN(port)) {
      return port;
    }
    var rangePattern = /^[\d]+\s*-\s*[\d]+$/;
    var match = rangePattern.test(port);
    if (!match) {
      throw new Error(util.format($('%s parameter must be a valid port or port range between %s and %s. Asterisk can be used also. Example: 80, 80-81, *'),
        paramName, constants.nsg.portMin, constants.nsg.portMax));
    }
    return port.toString();
  },

  _validateAddressPrefix: function (prefix, paramName) {
    var self = this;
    if (prefix === '*' || prefix === '"*"') {
      return prefix;
    }
    try {
      var res = utils.verifyParamExistsInCollection(constants.nsg.prefix, prefix, paramName);
      return res;
    } catch (e) {
      var ipValidationResult = self.vnetUtil.parseIPv4Cidr(prefix);
      if (ipValidationResult.error) {
        throw new Error(util.format($('%s parameter must be in CIDR format. Asterisk, Internet, VirtualNetwork, AzureLoadBalancer can be used also.'), paramName));
      }
      return ipValidationResult.ipv4Cidr;
    }
  },

  _getAllRules: function (nsg) {
    var rules = nsg.defaultSecurityRules.concat(nsg.securityRules);
    var groups = __.groupBy(rules, function (o) {
      return o.direction;
    });
    groups.Inbound = __.sortBy(groups.Inbound, function (o) {
      return o.priority;
    });
    groups.Outbound = __.sortBy(groups.Outbound, function (o) {
      return o.priority;
    });
    rules = groups.Inbound.concat(groups.Outbound);
    return rules;
  },

  _listRules: function (rules) {
    var self = this;
    if (rules.length > 0) {
      self.output.header($('Security rules'));
      self.output.table(rules, function (row, rule) {
        row.cell($('Name'), rule.name);
        // row.cell($('Type'), rule.id.indexOf('/defaultSecurityRules/') > -1 ? 'default' : '');
        row.cell($('Source IP'), rule.sourceAddressPrefix);
        row.cell($('Source Port'), rule.sourcePortRange);
        row.cell($('Destination IP'), rule.destinationAddressPrefix);
        row.cell($('Destination Port'), rule.destinationPortRange);
        row.cell($('Protocol'), rule.protocol);
        row.cell($('Direction'), rule.direction);
        row.cell($('Access'), rule.access);
        row.cell($('Priority'), rule.priority);
      });
    }
  },

  _findDefaultRule: function (nsg, ruleName) {
    return utils.findFirstCaseIgnore(nsg.defaultSecurityRules, {name: ruleName});
  },

  _findSecurityRule: function (nsg, ruleName) {
    return utils.findFirstCaseIgnore(nsg.securityRules, {name: ruleName});
  }
});

module.exports = Nsg;