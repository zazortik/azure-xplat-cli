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
  create: function (resourceGroup, name, location, options, _) {
    var nsg = this.get(resourceGroup, name, _);

    if (nsg) {
      throw new Error(util.format($('A network security group with name "%s" already exists in the resource group "%s"'), name, resourceGroup));
    }

    var nsgProfile = {
      name: name,
      location: location
    };

    if (options.tags) {
      nsgProfile.tags = tagUtils.buildTagsParameter(null, options);
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security group "%s"'), name));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.createOrUpdate(resourceGroup, name, nsgProfile, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroup, name, options, _);
  },

  set: function (resourceGroup, name, options, _) {
    var nsg = this.get(resourceGroup, name, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    if (options.tags) {
      tagUtils.appendTags(nsg.networkSecurityGroup, tagUtils.buildTagsParameter(null, options));
    }
    if (options.tags === false) {
      nsg.networkSecurityGroup.tags = {};
    }

    var progress = this.cli.interaction.progress(util.format($('Setting a network security group "%s"'), name));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.createOrUpdate(resourceGroup, name, nsg.networkSecurityGroup, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroup, name, options, _);
  },

  list: function (resourceGroup, options, _) {
    var progress = this.cli.interaction.progress($('Getting the network security groups'));
    var groups = null;
    try {
      groups = this.networkResourceProviderClient.networkSecurityGroups.list(resourceGroup, _);
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

  show: function (resourceGroup, name, options, _) {
    var nsg = this.get(resourceGroup, name, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nsg) {
      var resourceInfo = resourceUtils.getResourceInformation(nsg.networkSecurityGroup.id);
      var rules = this._getAllRulesFromNsg(nsg);
      interaction.formatOutput(nsg.networkSecurityGroup, function (nsg) {
        output.data($('Id:                  '), nsg.id);
        output.data($('Name:                '), nsg.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), nsg.location);
        output.data($('Provisioning state:  '), nsg.provisioningState);

        for (var prop in nsg.tags) {
          if (nsg.tags.hasOwnProperty(prop)) {
            output.data($('Tags:                '), nsg.tags);
            break;
          }
        }

        if (rules && rules.length > 0) {
          output.data($('Security group rules:'));
          output.table(rules, function (row, item) {
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
        } else {
          output.data($('Security group rules:'), '');
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security group with name "%s" not found in the resource group "%s"'), name, resourceGroup));
      }
    }
  },

  delete: function (resourceGroup, name, options, _) {
    var nsg = this.get(resourceGroup, name, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security group "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security group "%s"'), name));
    try {
      this.networkResourceProviderClient.networkSecurityGroups.deleteMethod(resourceGroup, name, _);
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

  createRule: function (resourceGroup, nsgName, name, options, _) {
    var nsgProfile = this._parseAndValidateSecurityRule(options, true);
    var rule = this.getRule(resourceGroup, nsgName, name, _);
    if (rule) {
      throw new Error(util.format($('A network security rule with name "%s" already exists in the network security group "%s"'), name, nsgName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating a network security rule "%s"'), name));
    try {
      this.networkResourceProviderClient.securityRules.createOrUpdate(resourceGroup, nsgName, name, nsgProfile, _);
    } finally {
      progress.end();
    }
    this.showRule(resourceGroup, nsgName, name, options, _);
  },

  setRule: function (resourceGroup, nsgName, name, options, _) {
    var nsg = this.get(resourceGroup, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    var rule = this._getCustomRuleFromNsg(nsg, name);
    if (!rule) {
      rule = this._getDefaultRuleFromNsg(nsg, name);
      if (rule) {
        throw new Error(util.format($('Setting up for a network default security rule is not supported')));
      }
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), name, nsgName));
    }

    var nsgProfile = this._parseAndValidateSecurityRule(options, false);
    if (options.description) rule.securityRule.description = nsgProfile.description;
    if (options.protocol) rule.securityRule.protocol = nsgProfile.protocol;
    if (options.sourceAddressPrefix) rule.securityRule.sourceAddressPrefix = nsgProfile.sourceAddressPrefix;
    if (options.sourcePortRange) rule.securityRule.sourcePortRange = nsgProfile.sourcePortRange;
    if (options.destinationAddressPrefix) rule.securityRule.destinationAddressPrefix = nsgProfile.destinationAddressPrefix;
    if (options.destinationPortRange) rule.securityRule.destinationPortRange = nsgProfile.destinationPortRange;
    if (options.access) rule.securityRule.access = nsgProfile.access;
    if (options.priority) rule.securityRule.priority = nsgProfile.priority;
    if (options.direction) rule.securityRule.direction = nsgProfile.direction;

    var progress = this.cli.interaction.progress(util.format($('Setting a network security rule "%s"'), name));
    try {
      this.networkResourceProviderClient.securityRules.createOrUpdate(resourceGroup, nsgName, name, rule.securityRule, _);
    } finally {
      progress.end();
    }
    this.showRule(resourceGroup, nsgName, name, options, _);
  },

  listRules: function (resourceGroup, nsgName, options, _) {
    var nsg = this.get(resourceGroup, nsgName, _);
    var rules = this._getAllRulesFromNsg(nsg);

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

  showRule: function (resourceGroup, nsgName, name, options, _) {
    var self = this;
    var nsg = self.get(resourceGroup, nsgName, _);

    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroup));
    }

    var rule = self._getCustomRuleFromNsg(nsg, name);
    if (!rule) {
      rule = self._getDefaultRuleFromNsg(nsg, name);
    }

    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (rule) {
      var resourceInfo = resourceUtils.getResourceInformation(rule.securityRule.id);
      interaction.formatOutput(rule.securityRule, function (rule) {
        output.data($('Id:                  '), rule.id);
        output.data($('Name:                '), rule.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Provisioning state:  '), rule.provisioningState);
        if (rule.description) {
          output.data($('Description:         '), rule.description);
        }
        output.data($('Source IP:           '), rule.sourceAddressPrefix);
        output.data($('Source Port:         '), rule.sourcePortRange);
        output.data($('Destination IP:      '), rule.destinationAddressPrefix);
        output.data($('Destination Port:    '), rule.destinationPortRange);
        output.data($('Protocol:            '), rule.protocol);
        output.data($('Direction:           '), rule.direction);
        output.data($('Access:              '), rule.access);
        output.data($('Priority:            '), rule.priority);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security rule with name "%s" not found in the security group "%s"'), name, nsgName));
      }
    }
  },

  deleteRule: function (resourceGroup, nsgName, name, options, _) {
    var nsg = this.get(resourceGroup, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    var rule = this._getCustomRuleFromNsg(nsg, name);
    if (!rule) {
      rule = this._getDefaultRuleFromNsg(nsg, name);
      if (rule) {
        throw new Error(util.format($('A network default security rule with name "%s" cannot be deleted'), name));
      }
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), name, nsgName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete network security rule "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security rule "%s"'), name));
    try {
      this.networkResourceProviderClient.securityRules.deleteMethod(resourceGroup, nsgName, name, _);
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

  _parseAndValidateSecurityRule: function (params, useDefaults) {
    var self = this;
    var output = self.cli.output;
    var nsgProfile = {};

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
        nsgProfile.description = params.description;
      }
    }

    if (params.protocol) {
      if (utils.stringIsNullOrEmpty(params.protocol)) {
        throw new Error($('protocol parameter must not be null or empty string'));
      }
      nsgProfile.protocol = utils.verifyParamExistsInCollection(protocols,
        params.protocol, 'protocol');
    } else if (useDefaults) {
      output.warn(util.format($('Using default protocol: %s'), constants.NSG_DEFAULT_PROTOCOL));
      nsgProfile.protocol = constants.NSG_DEFAULT_PROTOCOL;
    }

    if (params.sourcePortRange) {
      nsgProfile.sourcePortRange = self._parsePortRange(params.sourcePortRange, 'source');
    } else if (useDefaults) {
      output.warn(util.format($('Using default source port: %s'), constants.NSG_DEFAULT_SOURCE_PORT));
      nsgProfile.sourcePortRange = constants.NSG_DEFAULT_SOURCE_PORT;
    }

    if (params.destinationPortRange) {
      nsgProfile.destinationPortRange = self._parsePortRange(params.destinationPortRange, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination port: %s'), constants.NSG_DEFAULT_DESTINATION_PORT));
      nsgProfile.destinationPortRange = constants.NSG_DEFAULT_DESTINATION_PORT;
    }

    if (params.sourceAddressPrefix) {
      nsgProfile.sourceAddressPrefix = self._parseAddressPrefixes(params.sourceAddressPrefix, vNetUtil, 'source');
    }
    else if (useDefaults) {
      output.warn(util.format($('Using default source address prefix: %s'), constants.NSG_DEFAULT_SOURCE_ADDRESS_PREFIX));
      nsgProfile.sourceAddressPrefix = constants.NSG_DEFAULT_SOURCE_ADDRESS_PREFIX;
    }

    if (params.destinationAddressPrefix) {
      nsgProfile.destinationAddressPrefix = self._parseAddressPrefixes(params.destinationAddressPrefix, vNetUtil, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination address prefix: %s'), constants.NSG_DEFAULT_DESTINATION_ADDRESS_PREFIX));
      nsgProfile.destinationAddressPrefix = constants.NSG_DEFAULT_DESTINATION_ADDRESS_PREFIX;
    }

    if (params.access) {
      if (utils.stringIsNullOrEmpty(params.access)) {
        throw new Error($('access parameter must not be null or empty string'));
      }
      nsgProfile.access = utils.verifyParamExistsInCollection(accessTypes,
        params.access, 'access');
    } else if (useDefaults) {
      output.warn(util.format($('Using default access: %s'), constants.NSG_DEFAULT_ACCESS));
      nsgProfile.access = constants.NSG_DEFAULT_ACCESS;
    }

    if (params.priority) {
      var priority = utils.parseInt(params.priority);
      if (isNaN(priority) || priority < priorityRange[0] || priority > priorityRange[1]) {
        throw new Error(util.format($('priority must be an integer between %s and %s'), priorityRange[0], priorityRange[1]));
      }
      nsgProfile.priority = priority;
    } else if (useDefaults) {
      output.warn(util.format($('Using default priority: %s'), constants.NSG_DEFAULT_PRIORITY));
      nsgProfile.priority = constants.NSG_DEFAULT_PRIORITY;
    }

    if (params.direction) {
      if (utils.stringIsNullOrEmpty(params.direction)) {
        throw new Error($('direction parameter must not be null or empty string'));
      }
      nsgProfile.direction = utils.verifyParamExistsInCollection(directions,
        params.direction, 'direction');
    } else if (useDefaults) {
      output.warn(util.format($('Using default direction: %s'), constants.NSG_DEFAULT_DIRECTION));
      nsgProfile.direction = constants.NSG_DEFAULT_DIRECTION;
    }

    return nsgProfile;
  },

  _parsePortRange: function (port, portType) {
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

  _parseAddressPrefixes: function (ipInCidrFormat, vNetUtil, addressPrefixType) {
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

  _getAllRulesFromNsg: function (nsg) {
    var rules = [];
    var customRules = nsg.networkSecurityGroup.securityRules;
    var defaultRules = nsg.networkSecurityGroup.defaultSecurityRules;

    if (defaultRules && defaultRules.length > 0) {
      rules = rules.concat(defaultRules);
    }
    if (customRules && customRules.length > 0) {
      rules = rules.concat(customRules);
    }

    return rules;
  },

  _getDefaultRuleFromNsg: function (nsg, name) {
    var rule = utils.findFirstCaseIgnore(nsg.networkSecurityGroup.defaultSecurityRules, {name: name});
    if (rule) {
      return {
        securityRule: rule
      };
    }
    return null;
  },

  _getCustomRuleFromNsg: function (nsg, name) {
    var rule = utils.findFirstCaseIgnore(nsg.networkSecurityGroup.securityRules, {name: name});
    if (rule) {
      return {
        securityRule: rule
      };
    }
    return null;
  }
});

module.exports = Nsg;