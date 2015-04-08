var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var VNetUtil = require('../../../util/vnet.util');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Nsg(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;

  this.DEFAULT_PROTOCOL = 'Tcp';
  this.DEFAULT_SOURCE_PORT = 80;
  this.DEFAULT_DESTINATION_PORT = 80;
  this.DEFAULT_SOURCE_ADDRESS_PREFIX = '*';
  this.DEFAULT_DESTINATION_ADDRESS_PREFIX = '*';
  this.DEFAULT_ACCESS = 'Allow';
  this.DEFAULT_DIRECTION = 'Inbound';
  this.DEFAULT_PRIORITY = 100;
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
      nsgProfile.tags = TagUtils.buildTagsParameter(null, options);
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
      nsg.networkSecurityGroup.tags = TagUtils.buildTagsParameter(null, options);
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
      var resourceInfo = ResourceUtils.getResourceInformation(nsg.networkSecurityGroup.id);
      interaction.formatOutput(nsg.networkSecurityGroup, function (nsg) {
        output.data($('Id:                  '), nsg.id);
        output.data($('Name:                '), nsg.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), nsg.location);

        for (var prop in nsg.tags) {
          if (nsg.tags.hasOwnProperty(prop)) {
            output.data($('Tags:                '), nsg.tags);
            break;
          }
        }

        output.data($('Provisioning state:  '), nsg.provisioningState);
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
    var rule = this.getRule(resourceGroup, nsgName, name, _);
    if (!rule) {
      throw new Error(util.format($('A network security rule with name "%s" not found in the network security group "%s"'), name, nsgName));
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
    var progress = this.cli.interaction.progress($('Getting rules within a network security group'));
    var rules = null;
    try {
      rules = this.networkResourceProviderClient.securityRules.list(resourceGroup, nsgName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(rules.securityRules, function (outputData) {
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
    var rule = this.getRule(resourceGroup, nsgName, name, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (rule) {
      var resourceInfo = ResourceUtils.getResourceInformation(rule.securityRule.id);
      interaction.formatOutput(rule.securityRule, function (rule) {
        output.data($('Id:                  '), rule.id);
        output.data($('Name:                '), rule.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Provisioning state:  '), rule.provisioningState);
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
    var rule = this.getRule(resourceGroup, nsgName, name, _);
    if (!rule) {
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
    var protocols = ['Tcp', 'Udp', '*'];
    var accessTypes = ['Allow', 'Deny'];
    var directions = ['InBound', 'Outbound'];
    var vNetUtil = new VNetUtil();

    if (params.description) {
      if (utils.stringIsNullOrEmpty(params.description)) {
        throw new Error($('description parameter must not be null or empty string'));
      }
      if (params.description.length > 140) {
        throw new Error($('description parameter restricted to 140 chars'));
      }
      nsgProfile.description = params.description;
    }

    if (params.protocol) {
      if (utils.stringIsNullOrEmpty(params.protocol)) {
        throw new Error($('protocol parameter must not be null or empty string'));
      }
      nsgProfile.protocol = utils.verifyParamExistsInCollection(protocols,
        params.protocol, 'protocol');
    } else if (useDefaults) {
      output.warn(util.format($('Using default protocol: %s'), self.DEFAULT_PROTOCOL));
      nsgProfile.protocol = self.DEFAULT_PROTOCOL;
    }

    if (params.sourcePortRange) {
      nsgProfile.sourcePortRange = self._parsePortRange(params.sourcePortRange, 'source');
    } else if (useDefaults) {
      output.warn(util.format($('Using default source port: %s'), self.DEFAULT_SOURCE_PORT));
      nsgProfile.sourcePortRange = self.DEFAULT_SOURCE_PORT;
    }

    if (params.destinationPortRange) {
      nsgProfile.destinationPortRange = self._parsePortRange(params.destinationPortRange, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination port: %s'), self.DEFAULT_DESTINATION_PORT));
      nsgProfile.destinationPortRange = self.DEFAULT_DESTINATION_PORT;
    }

    if (params.sourceAddressPrefix) {
      nsgProfile.sourceAddressPrefix = self._parseAddressPrefixes(params.sourceAddressPrefix, vNetUtil, 'source');
    }
    else if (useDefaults) {
      output.warn(util.format($('Using default source address prefix: %s'), self.DEFAULT_SOURCE_ADDRESS_PREFIX));
      nsgProfile.sourceAddressPrefix = self.DEFAULT_SOURCE_ADDRESS_PREFIX;
    }

    if (params.destinationAddressPrefix) {
      nsgProfile.destinationAddressPrefix = self._parseAddressPrefixes(params.destinationAddressPrefix, vNetUtil, 'destination');
    } else if (useDefaults) {
      output.warn(util.format($('Using default destination address prefix: %s'), self.DEFAULT_DESTINATION_ADDRESS_PREFIX));
      nsgProfile.destinationAddressPrefix = self.DEFAULT_DESTINATION_ADDRESS_PREFIX;
    }

    if (params.access) {
      if (utils.stringIsNullOrEmpty(params.access)) {
        throw new Error($('access parameter must not be null or empty string'));
      }
      nsgProfile.access = utils.verifyParamExistsInCollection(accessTypes,
        params.access, 'access');
    } else if (useDefaults) {
      output.warn(util.format($('Using default access: %s'), self.DEFAULT_ACCESS));
      nsgProfile.access = self.DEFAULT_ACCESS;
    }

    if (params.priority) {
      var priority = utils.parseInt(params.priority);
      if (isNaN(priority) || priority < 100 || priority > 4096) {
        throw new Error($('priority must be an integer between 100 and 4096'));
      }
      nsgProfile.priority = priority;
    } else if (useDefaults) {
      output.warn(util.format($('Using default priority: %s'), self.DEFAULT_PRIORITY));
      nsgProfile.priority = self.DEFAULT_PRIORITY;
    }

    if (params.direction) {
      if (utils.stringIsNullOrEmpty(params.direction)) {
        throw new Error($('direction parameter must not be null or empty string'));
      }
      nsgProfile.direction = utils.verifyParamExistsInCollection(directions,
        params.direction, 'direction');
    } else if (useDefaults) {
      output.warn(util.format($('Using default direction: %s'), self.DEFAULT_DIRECTION));
      nsgProfile.direction = self.DEFAULT_DIRECTION;
    }

    return nsgProfile;
  },

  _parsePortRange: function (port, portType) {
    if (port === '*') {
      return port;
    }

    port = utils.parseInt(port);
    if (isNaN(port) || port < 0 || port > 65535) {
      throw new Error(util.format($('%s port parameter must be an integer between 0 and 65535'), portType));
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
  }
});

module.exports = Nsg;
