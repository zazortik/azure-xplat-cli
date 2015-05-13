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
var constants = require('../../arm/network/constants');
var VNetUtil = require('../../../util/vnet.util');
var $ = utils.getLocaleString;

function Nsg(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(Nsg.prototype, {
  create: function (nsgName, location, options, _) {
    var nsg = this.get(nsgName, false, _);
    if (nsg) {
      throw new Error(util.format($('A network security group with name "%s" already exists'), nsgName));
    }

    var nsgProfile = {
      name: nsgName,
      location: location
    };

    if (options.label) nsgProfile.label = options.label;

    var progress = this.cli.interaction.progress(util.format($('Creating a network security group "%s"'), nsgName));
    try {
      this.networkManagementClient.networkSecurityGroups.create(nsgProfile, _);
    } finally {
      progress.end();
    }
    this.show(nsgName, options, _);
  },

  list: function (options, _) {
    var progress = this.cli.interaction.progress($('Getting the network security groups'));
    var groups = null;
    try {
      groups = this.networkManagementClient.networkSecurityGroups.list(_);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(groups.networkSecurityGroups, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No network security groups found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Label'), item.label || '');
        });
      }
    });
  },

  show: function (nsgName, options, _) {
    var nsg = this.get(nsgName, true, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nsg) {
      interaction.formatOutput(nsg, function (nsg) {
        output.nameValue($('Name'), nsg.name);
        output.nameValue($('Location'), nsg.location);
        output.nameValue($('Label'), nsg.label);

        if (nsg.rules.length > 0) {
          output.header($('Security group rules'));
          output.table(nsg.rules, function (row, rule) {
            row.cell($('Name'), rule.name);
            row.cell($('Source IP'), rule.sourceAddressPrefix);
            row.cell($('Source Port'), rule.sourcePortRange);
            row.cell($('Destination IP'), rule.destinationAddressPrefix);
            row.cell($('Destination Port'), rule.destinationPortRange);
            row.cell($('Protocol'), rule.protocol);
            row.cell($('Type'), rule.type);
            row.cell($('Action'), rule.action);
            row.cell($('Priority'), rule.priority);
            row.cell($('Default'), rule.isDefault || 'false');
          });
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security group with name "%s" not found'), nsgName));
      }
    }
  },

  delete: function (nsgName, options, _) {
    var nsg = this.get(nsgName, false, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), nsgName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security group "%s"? [y/n] '), nsgName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security group "%s"'), nsgName));
    try {
      this.networkManagementClient.networkSecurityGroups.deleteMethod(nsgName, _);
    } finally {
      progress.end();
    }
  },

  get: function (nsgName, withRules, _) {
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

  createNsgRule: function (nsgName, ruleName, options, _) {
    var nsgProfile = this._parseSecurityRule(options, true);
    var nsg = this.get(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    var rule = utils.findFirstCaseIgnore(nsg.rules, {name: ruleName});
    if (rule) {
      throw new Error(util.format($('A network security rule with name "%s" already exists in the network security group "%s"'), ruleName, nsgName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security rule "%s"'), ruleName));
    try {
      this.networkManagementClient.networkSecurityGroups.setRule(nsgName, ruleName, nsgProfile, _);
    } finally {
      progress.end();
    }
    this.showNsgRule(nsgName, ruleName, options, _);
  },

  setNsgRule: function (nsgName, ruleName, options, _) {
    var nsg = this.get(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), ruleName));
    }

    var rule = this._findSecurityRule(nsg, ruleName);
    if (!rule) {
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
    }

    var ruleProfile = this._parseSecurityRule(options, false);
    if (options.description) rule.description = ruleProfile.description;
    if (options.protocol) rule.protocol = ruleProfile.protocol;
    if (options.sourceAddressPrefix) rule.sourceAddressPrefix = ruleProfile.sourceAddressPrefix;
    if (options.sourcePortRange) rule.sourcePortRange = ruleProfile.sourcePortRange;
    if (options.destinationAddressPrefix) rule.destinationAddressPrefix = ruleProfile.destinationAddressPrefix;
    if (options.destinationPortRange) rule.destinationPortRange = ruleProfile.destinationPortRange;
    if (options.action) rule.action = ruleProfile.action;
    if (options.priority) rule.priority = ruleProfile.priority;
    if (options.type) rule.type = ruleProfile.type;

    var progress = this.cli.interaction.progress(util.format($('Setting a network security rule "%s"'), ruleName));
    try {
      this.networkManagementClient.networkSecurityGroups.setRule(nsgName, ruleName, rule, _);
    } finally {
      progress.end();
    }
    this.showNsgRule(nsgName, ruleName, options, _);
  },

  listNsgRules: function (nsgName, options, _) {
    var nsg = this.get(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    var rules = nsg.rules;

    var output = this.cli.output;
    this.cli.interaction.formatOutput(rules, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No rules found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Source address prefix'), item.sourceAddressPrefix);
          row.cell($('Source Port'), item.sourcePortRange);
          row.cell($('Destination address prefix'), item.destinationAddressPrefix);
          row.cell($('Destination Port'), item.destinationPortRange);
          row.cell($('Protocol'), item.protocol);
          row.cell($('Type'), item.type);
          row.cell($('Action'), item.action);
          row.cell($('Priority'), item.priority);
        });
      }
    });
  },

  showNsgRule: function (nsgName, ruleName, options, _) {
    var self = this;
    var nsg = self.get(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), nsgName));
    }

    var rule = self._findSecurityRule(nsg, ruleName);
    if (!rule) {
      throw new Error($('Rule not found'));
    }

    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (rule) {
      interaction.formatOutput(rule, function (rule) {
        output.nameValue($('Id'), rule.id);
        output.nameValue($('Name'), rule.name);
        output.nameValue($('Type'), rule.resourceType);
        output.nameValue($('Provisioning state'), rule.provisioningState);
        output.nameValue($('Description'), rule.description);
        output.nameValue($('Source address prefix'), rule.sourceAddressPrefix);
        output.nameValue($('Source Port'), rule.sourcePortRange);
        output.nameValue($('Destination address prefix'), rule.destinationAddressPrefix);
        output.nameValue($('Destination Port'), rule.destinationPortRange);
        output.nameValue($('Protocol'), rule.protocol);
        output.nameValue($('Type'), rule.type);
        output.nameValue($('Action'), rule.action);
        output.nameValue($('Priority'), rule.priority);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
      }
    }
  },

  deleteNsgRule: function (nsgName, ruleName, options, _) {
    var nsg = this.get(nsgName, constants.NSG_DEFAULT_DETAIL_LEVEL, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found'), nsgName));
    }

    var rule = this._findSecurityRule(nsg, ruleName);
    if (!rule) {
      throw new Error(util.format($('A network security group rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security rule "%s"'), ruleName));
    try {
      this.networkManagementClient.networkSecurityGroups.deleteRule(nsgName, ruleName, _);
    } finally {
      progress.end();
    }
  },

  _validateAddressPrefix: function (ipInCidrFormat, vNetUtil, addressPrefixType) {
    if (utils.stringIsNullOrEmpty(ipInCidrFormat)) {
      throw new Error(util.format($('IPv4 %s address prefix must not be null or empty string'), addressPrefixType));
    }

    if (ipInCidrFormat === '*' || ipInCidrFormat === 'Internet' || ipInCidrFormat === 'VirtualNetwork' || ipInCidrFormat === 'AzureLoadBalancer') {
      return ipInCidrFormat;
    }

    var ipValidationResult = vNetUtil.parseIPv4Cidr(ipInCidrFormat);
    if (ipValidationResult.error || ipValidationResult.cidr === null) {
      throw new Error(util.format($('IPv4 %s address prefix must be in CIDR format. Asterix can also be used'), addressPrefixType));
    }
    return ipValidationResult.ipv4Cidr;
  },

  _validatePortRange: function (port, portType) {
    if (port === '*') {
      return port;
    }

    port = utils.parseInt(port);
    var portRange = constants.portBounds;
    if (isNaN(port) || port < portRange[0] || port > portRange[1]) {
      throw new Error(util.format($('%s port parameter must be an integer between %s and %s'), portType, portRange[0], portRange[1]));
    }

    return port;
  },

  _parseSecurityRule: function (params, useDefaults) {
    var self = this;
    var output = self.cli.output;
    var ruleProfile = {};

    var protocols = constants.protocols;
    var accessTypes = constants.accessModes;
    var directions = constants.directionModes;
    var priorityRange = constants.priorityBounds;
    var vNetUtil = new VNetUtil();

    if (params.description) {
      if (params.description !== true && params.description !== '\'\'') {
        if (params.description.length > 140) {
          throw new Error($('description parameter restricted to 140 chars'));
        }
        ruleProfile.description = params.description;
      }
    }

    if (params.protocol) {
      if (utils.stringIsNullOrEmpty(params.protocol)) {
        throw new Error($('protocol parameter must not be null or empty string'));
      }
      ruleProfile.protocol = utils.verifyParamExistsInCollection(protocols,
        params.protocol, 'protocol');
    } else if (useDefaults) {
      output.warn(util.format($('Using default protocol: %s'), constants.NSG_DEFAULT_PROTOCOL));
      ruleProfile.protocol = constants.NSG_DEFAULT_PROTOCOL;
    }

    if (params.sourcePortRange) {
      ruleProfile.sourcePortRange = self._validatePortRange(params.sourcePortRange, 'source');
    } else if (useDefaults) {
      output.warn(util.format($('Using default source port: %s'), constants.NSG_DEFAULT_SOURCE_PORT));
      ruleProfile.sourcePortRange = constants.NSG_DEFAULT_SOURCE_PORT;
    }

    if (params.destinationPortRange) {
      ruleProfile.destinationPortRange = self._validatePortRange(params.destinationPortRange, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination port: %s'), constants.NSG_DEFAULT_DESTINATION_PORT));
      ruleProfile.destinationPortRange = constants.NSG_DEFAULT_DESTINATION_PORT;
    }

    if (params.sourceAddressPrefix) {
      ruleProfile.sourceAddressPrefix = self._validateAddressPrefix(params.sourceAddressPrefix, vNetUtil, 'source');
    }
    else if (useDefaults) {
      output.warn(util.format($('Using default source address prefix: %s'), constants.NSG_DEFAULT_SOURCE_ADDRESS_PREFIX));
      ruleProfile.sourceAddressPrefix = constants.NSG_DEFAULT_SOURCE_ADDRESS_PREFIX;
    }

    if (params.destinationAddressPrefix) {
      ruleProfile.destinationAddressPrefix = self._validateAddressPrefix(params.destinationAddressPrefix, vNetUtil, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination address prefix: %s'), constants.NSG_DEFAULT_DESTINATION_ADDRESS_PREFIX));
      ruleProfile.destinationAddressPrefix = constants.NSG_DEFAULT_DESTINATION_ADDRESS_PREFIX;
    }

    if (params.action) {
      if (utils.stringIsNullOrEmpty(params.action)) {
        throw new Error($('action parameter must not be null or empty string'));
      }
      ruleProfile.action = utils.verifyParamExistsInCollection(accessTypes,
        params.action, 'action');
    } else if (useDefaults) {
      output.warn(util.format($('Using default action: %s'), constants.NSG_DEFAULT_ACCESS));
      ruleProfile.action = constants.NSG_DEFAULT_ACCESS;
    }

    if (params.priority) {
      var priority = utils.parseInt(params.priority);
      if (isNaN(priority) || priority < priorityRange[0] || priority > priorityRange[1]) {
        throw new Error(util.format($('priority must be an integer between %s and %s'), priorityRange[0], priorityRange[1]));
      }
      ruleProfile.priority = priority;
    } else if (useDefaults) {
      output.warn(util.format($('Using default priority: %s'), constants.NSG_DEFAULT_PRIORITY));
      ruleProfile.priority = constants.NSG_DEFAULT_PRIORITY;
    }

    if (params.type) {
      if (utils.stringIsNullOrEmpty(params.type)) {
        throw new Error($('type parameter must not be null or empty string'));
      }
      ruleProfile.type = utils.verifyParamExistsInCollection(directions,
        params.type, 'type');
    } else if (useDefaults) {
      output.warn(util.format($('Using default type: %s'), constants.NSG_DEFAULT_DIRECTION));
      ruleProfile.type = constants.NSG_DEFAULT_DIRECTION;
    }

    return ruleProfile;
  },

  _findSecurityRule: function (nsg, ruleName) {
    return utils.findFirstCaseIgnore(nsg.rules, {name: ruleName});
  }
});

module.exports = Nsg;