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
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function StaticIP(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(StaticIP.prototype, {
  check: function (vnet, ipAddress, options, _) {
    var interaction = this.cli.interaction;
    var output = this.cli.output;

    var progress = interaction.progress($('Checking static IP address'));
    var response;
    try {
      response = this.networkManagementClient.staticIPs.check(vnet, ipAddress, _);
    } finally {
      progress.end();
    }

    var checkResult = {
      isAvailable: response.isAvailable,
      availableAddresses: response.availableAddresses
    };

    interaction.formatOutput(checkResult, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No static IP addresses found'));
      } else {
        utils.logLineFormat(outputData, output.data);
      }
    });
  }
});

module.exports = StaticIP;
