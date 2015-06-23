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

function ReservedIP(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(ReservedIP.prototype, {
  create: function (name, location, options, _) {
    var progress = this.cli.interaction.progress($('Creating reserved IP address'));
    var params = {
      name: name,
      location: location
    };

    if (options.label)
      params.label = options.label;

    try {
      this.networkManagementClient.reservedIPs.create(params, _);
    } finally {
      progress.end();
    }
  },

  list: function (options, _) {
    var progress = this.cli.interaction.progress($('Getting reserved IP addresses'));
    var reservedIPs;
    try {
      reservedIPs = this.networkManagementClient.reservedIPs.list(_);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(reservedIPs.reservedIPs, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No reserved IP addresses found'));
      } else {
        output.table(outputData, function (row, ip) {
          row.cell($('Name'), ip.name);
          row.cell($('Location'), ip.location);
          row.cell($('Address'), ip.address);
          row.cell($('Label'), ip.label || '');
          row.cell($('State'), ip.state);
        });
      }
    });
  },

  show: function (name, options, _) {
    var reservedIP = this.get(name, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (reservedIP) {
      interaction.formatOutput(reservedIP, function (ip) {
        output.nameValue($('Name'), ip.name);
        output.nameValue($('Location'), ip.location);
        output.nameValue($('Address'), ip.address);
        output.nameValue($('Label'), ip.label || '');
        output.nameValue($('State'), ip.state);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A reserved ip address with name "%s" not found'), name));
      }
    }
  },

  delete: function (name, options, _) {
    var progress;
    var interaction = this.cli.interaction;

    try {
      if (!options.quiet) {
        // Ensure the reserved IP address exists before prompting for confirmation
        progress = interaction.progress($('Looking up reserved IP address'));
        this.networkManagementClient.reservedIPs.get(name, _);
        if (!interaction.confirm(util.format($('Delete reserved IP address %s? [y/n] '), name), _))
          return;
      }

      progress = interaction.progress($('Deleting reserved IP address'));
      this.networkManagementClient.reservedIPs.deleteMethod(name, _);
    } finally {
      progress.end();
    }
  },

  get: function (name, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the reserved ip "%s"'), name));
    try {
      var reservedIP = this.networkManagementClient.reservedIPs.get(name, _);
      return reservedIP;
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

module.exports = ReservedIP;
