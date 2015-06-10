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
var VNetUtil = require('../../../util/vnet.util');
var tagUtils = require('../tag/tagUtils');
var resourceUtils = require('../resource/resourceUtils');
var constants = require('./constants');
var $ = utils.getLocaleString;

function Nsg(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Nsg.prototype, {
  create: function (resourceGroupName, nsgName, location, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);

    if (nsg) {
      throw new Error(util.format($('A network security group with name "%s" already exists in the resource group "%s"'), nsgName, resourceGroupName));
    }

    var nsgProfile = {
      name: nsgName,
      location: location
    };

    if (options.tags) {
      nsgProfile.tags = tagUtils.buildTagsParameter(null, options);
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security group "%s"'), nsgName));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.createOrUpdate(resourceGroupName, nsgName, nsgProfile, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, nsgName, options, _);
  },

  set: function (resourceGroupName, nsgName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    if (options.tags) {
      tagUtils.appendTags(nsg.networkSecurityGroup, tagUtils.buildTagsParameter(null, options));
    }
    if (options.tags === false) {
      nsg.networkSecurityGroup.tags = {};
    }

    var progress = this.cli.interaction.progress(util.format($('Setting a network security group "%s"'), nsgName));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.createOrUpdate(resourceGroupName, nsgName, nsg.networkSecurityGroup, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, nsgName, options, _);
  },

  list: function (resourceGroupName, options, _) {
    var progress = this.cli.interaction.progress($('Getting the network security groups'));
    var groups = null;
    try {
      groups = this.networkResourceProviderClient.networkSecurityGroups.list(resourceGroupName, _);
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
        });
      }
    });
  },

  show: function (resourceGroupName, nsgName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nsg) {
      var resourceInfo = resourceUtils.getResourceInformation(nsg.networkSecurityGroup.id);
      var rules = this._getAllRules(nsg);
      interaction.formatOutput(nsg.networkSecurityGroup, function (nsg) {
        output.nameValue($('Id'), nsg.id);
        output.nameValue($('Name'), nsg.name);
        output.nameValue($('Type'), resourceInfo.resourceType);
        output.nameValue($('Location'), nsg.location);
        output.nameValue($('Provisioning state'), nsg.provisioningState);
        output.nameValue($('Tags'), tagUtils.getTagsInfo(nsg.tags));

        if (rules.length > 0) {
          output.header($('Security group rules'));
          output.table(rules, function (row, rule) {
            row.cell($('Name'), rule.name);
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
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
      }
    }
  },

  delete: function (resourceGroupName, nsgName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security group "%s"? [y/n] '), nsgName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security group "%s"'), nsgName));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.deleteMethod(resourceGroupName, nsgName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, nsgName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the network security group "%s"'), nsgName));
    try {
      var nsg = this.networkResourceProviderClient.networkSecurityGroups.get(resourceGroupName, nsgName, _);
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

  createRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var nsgProfile = this._parseSecurityRule(options, true);
    var rule = this.getRule(resourceGroupName, nsgName, ruleName, _);
    if (rule) {
      throw new Error(util.format($('A network security rule with name "%s" already exists in the network security group "%s"'), ruleName, nsgName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security rule "%s"'), ruleName));
    try {
      this.networkResourceProviderClient.securityRules.createOrUpdate(resourceGroupName, nsgName, ruleName, nsgProfile, _);
    } finally {
      progress.end();
    }
    this.showRule(resourceGroupName, nsgName, ruleName, options, _);
  },

  setRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), ruleName, resourceGroupName));
    }

    var rule = this._findSecurityRule(nsg, ruleName);
    if (!rule) {
      rule = this._findDefaultRule(nsg, ruleName);
      if (rule) {
        throw new Error(util.format($('Setting up for a network default security rule is not supported')));
      }
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
    }

    var ruleProfile = this._parseSecurityRule(options, false);
    if (options.description) rule.description = ruleProfile.description;
    if (options.protocol) rule.protocol = ruleProfile.protocol;
    if (options.sourceAddressPrefix) rule.sourceAddressPrefix = ruleProfile.sourceAddressPrefix;
    if (options.sourcePortRange) rule.sourcePortRange = ruleProfile.sourcePortRange;
    if (options.destinationAddressPrefix) rule.destinationAddressPrefix = ruleProfile.destinationAddressPrefix;
    if (options.destinationPortRange) rule.destinationPortRange = ruleProfile.destinationPortRange;
    if (options.access) rule.access = ruleProfile.access;
    if (options.priority) rule.priority = ruleProfile.priority;
    if (options.direction) rule.direction = ruleProfile.direction;

    var progress = this.cli.interaction.progress(util.format($('Setting a network security rule "%s"'), ruleName));
    try {
      this.networkResourceProviderClient.securityRules.createOrUpdate(resourceGroupName, nsgName, ruleName, rule, _);
    } finally {
      progress.end();
    }
    this.showRule(resourceGroupName, nsgName, ruleName, options, _);
  },

  listRules: function (resourceGroupName, nsgName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    var rules = this._getAllRules(nsg);

    var output = this.cli.output;
    this.cli.interaction.formatOutput(rules, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No rules found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Source IP'), item.sourceAddressPrefix);
          row.cell($('Source Port'), item.sourcePortRange);
          row.cell($('Destination IP'), item.destinationAddressPrefix);
          row.cell($('Destination Port'), item.destinationPortRange);
          row.cell($('Protocol'), item.protocol);
          row.cell($('Direction'), item.direction);
          row.cell($('Access'), item.access);
          row.cell($('Priority'), item.priority);
        });
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

    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (rule) {
      var resourceInfo = resourceUtils.getResourceInformation(rule.id);
      interaction.formatOutput(rule, function (rule) {
        output.nameValue($('Id'), rule.id);
        output.nameValue($('Name'), rule.name);
        output.nameValue($('Type'), resourceInfo.resourceType);
        output.nameValue($('Provisioning state'), rule.provisioningState);
        output.nameValue($('Description'), rule.description);
        output.nameValue($('Source IP'), rule.sourceAddressPrefix);
        output.nameValue($('Source Port'), rule.sourcePortRange);
        output.nameValue($('Destination IP'), rule.destinationAddressPrefix);
        output.nameValue($('Destination Port'), rule.destinationPortRange);
        output.nameValue($('Protocol'), rule.protocol);
        output.nameValue($('Direction'), rule.direction);
        output.nameValue($('Access'), rule.access);
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

  deleteRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), ruleName, resourceGroupName));
    }

    var rule = this._findSecurityRule(nsg, ruleName);
    if (!rule) {
      rule = this._findDefaultRule(nsg, ruleName);
      if (rule) {
        throw new Error(util.format($('A network default security rule with name "%s" cannot be deleted'), ruleName));
      }
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security rule "%s"'), ruleName));
    try {
      this.networkResourceProviderClient.securityRules.deleteMethod(resourceGroupName, nsgName, ruleName, _);
    } finally {
      progress.end();
    }
  },

  getRule: function (resourceGroupName, nsgName, ruleName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the network security rule "%s"'), ruleName));
    try {
      var rule = this.networkResourceProviderClient.securityRules.get(resourceGroupName, nsgName, ruleName, _);
      return rule;
    } catch (e) {
      if (e.code === 'NotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
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

    if (params.access) {
      if (utils.stringIsNullOrEmpty(params.access)) {
        throw new Error($('access parameter must not be null or empty string'));
      }
      ruleProfile.access = utils.verifyParamExistsInCollection(accessTypes,
        params.access, 'access');
    } else if (useDefaults) {
      output.warn(util.format($('Using default access: %s'), constants.NSG_DEFAULT_ACCESS));
      ruleProfile.access = constants.NSG_DEFAULT_ACCESS;
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

    if (params.direction) {
      if (utils.stringIsNullOrEmpty(params.direction)) {
        throw new Error($('direction parameter must not be null or empty string'));
      }
      ruleProfile.direction = utils.verifyParamExistsInCollection(directions,
        params.direction, 'direction');
    } else if (useDefaults) {
      output.warn(util.format($('Using default direction: %s'), constants.NSG_DEFAULT_DIRECTION));
      ruleProfile.direction = constants.NSG_DEFAULT_DIRECTION;
    }

    return ruleProfile;
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

  _getAllRules: function (nsg) {
    var rules = nsg.networkSecurityGroup.securityRules.concat(nsg.networkSecurityGroup.defaultSecurityRules);
    return rules;
  },

  _findDefaultRule: function (nsg, ruleName) {
    return utils.findFirstCaseIgnore(nsg.networkSecurityGroup.defaultSecurityRules, {name: ruleName});
  },

  _findSecurityRule: function (nsg, ruleName) {
    return utils.findFirstCaseIgnore(nsg.networkSecurityGroup.securityRules, {name: ruleName});
  }
});

module.exports = Nsg;