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
    var reservedIPs;
    var interaction = this.cli.interaction;
    var output = this.cli.output;

    var progress = interaction.progress($('Getting reserved IP addresses'));
    try {
      reservedIPs = this.getReservedIPs(options, _);
    } finally {
      progress.end();
    }

    interaction.formatOutput(reservedIPs, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No reserved IP addresses found'));
      } else {
        output.table(outputData, function (row, reservedIP) {
          row.cell($('Name'), reservedIP.name);
          row.cell($('Address'), reservedIP.address);
          row.cell($('Location'), reservedIP.location);
          row.cell($('Label'), reservedIP.label ? reservedIP.label : '');
        });
      }
    });
  },

  show: function (name, options, _) {
    var reservedIPs;
    var interaction = this.cli.interaction;
    var output = this.cli.output;

    var progress = interaction.progress($('Getting reserved IP addresses'));
    try {
      reservedIPs = this.getReservedIPs(options, _);
    } finally {
      progress.end();
    }

    if (reservedIPs) {
      var reservedIP = null;
      for (var i = 0; i < reservedIPs.length; i++) {
        if (utils.ignoreCaseEquals(reservedIPs[i].name, name)) {
          reservedIP = reservedIPs[i];
          break;
        }
      }

      interaction.formatOutput(reservedIP, function (outputData) {
        if (outputData) {
          utils.logLineFormat(outputData, output.data);
        } else {
          output.warn(util.format($('Reserved IP address with name %s not found'), name));
        }
      });
    } else {
      interaction.formatOutput(null, function () {
        output.warn(util.format($('Reserved IP address with name %s not found'), name));
      });
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

  getReservedIPs: function (options, callback) {
    this.networkManagementClient.reservedIPs.list(function (error, response) {
      if (error) {
        return callback(error, response);
      } else {
        return callback(null, response.reservedIPs);
      }
    });
  }

});

module.exports = ReservedIP;
