var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var $ = utils.getLocaleString;

function Nsg(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Nsg.prototype, {
  list: function (resourceGroupName, params, _) {
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

  show: function (resourceGroupName, nsgName, params, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nsg) {
      var resourceInfo = ResourceUtils.getResourceInformation(nsg.networkSecurityGroup.id);
      interaction.formatOutput(nsg.networkSecurityGroup, function (nsg) {
        output.data($('Id:                  '), nsg.id);
        output.data($('Name:                '), nsg.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), nsg.location);
        output.data($('Provisioning state:  '), nsg.provisioningState);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
      }
    }
  },

  delete: function (resourceGroupName, nsgName, params, _) {
    var nsg = this.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), nsgName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete security group "%s"? [y/n] '), nsgName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting security group "%s"'), nsgName));
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

  listRules: function (resourceGroupName, nsgName, params, _) {
    var progress = this.cli.interaction.progress($('Getting rules within a network security group'));
    var rules = null;
    try {
      rules = this.networkResourceProviderClient.securityRules.list(resourceGroupName, nsgName, _);
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

  showRule: function (resourceGroupName, nsgName, ruleName, params, _) {
    var rule = this.getRule(resourceGroupName, nsgName, ruleName, _);
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
        output.warn(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
      }
    }
  },

  deleteRule: function (resourceGroupName, nsgName, ruleName, params, _) {
    var rule = this.getRule(resourceGroupName, nsgName, ruleName, _);
    if (!rule) {
      throw new Error(util.format($('A network security rule with name "%s" not found in the security group "%s"'), ruleName, nsgName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete network security rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network security rule "%s"'), ruleName));
    try {
      this.networkResourceProviderClient.networkSecurityRules.deleteMethod(resourceGroupName, nsgName, ruleName, _);
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
  }

});

module.exports = Nsg;
