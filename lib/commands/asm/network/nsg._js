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
  }
});

module.exports = Nsg;