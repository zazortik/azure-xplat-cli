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
var fs = require('fs');
var utils = require('../../../util/utils');
var VNetUtil = require('./../../../util/vnet.util');
var $ = utils.getLocaleString;

function NetworkConfig(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(NetworkConfig.prototype, {
  export: function (filePath, options, _) {
    var networkConfiguration = this.get(_);
    delete networkConfiguration['$'];
    fs.writeFileSync(filePath, JSON.stringify(networkConfiguration));
    this.cli.output.verbose(util.format($('Network Configuration exported to %s'), filePath));
  },

  import: function (filePath, options, _) {
    var configXml = fs.readFileSync(filePath, 'utf8');
    this.cli.output.verbose(util.format($('Importing Network Configuration from %s'), filePath));
    var networkConfiguration = JSON.parse(configXml);
    this.set(networkConfiguration, _);
  },

  get: function (_) {
    var vnetUtil = new VNetUtil();
    var progress = this.cli.interaction.progress($('Looking up network configuration'));
    try {
      var response = this.networkManagementClient.networks.getConfiguration(_);
      return vnetUtil.getNetworkConfigObj(response.configuration);
    } catch (e) {
      if (e.statusCode === 404) {
        return vnetUtil.getNewNetworkConfigObj();
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  set: function (networkConfiguration, _) {
    var vnetUtil = new VNetUtil();
    var configXml = vnetUtil.getNetworkConfigXml(networkConfiguration);

    var config = {
      configuration: configXml
    };

    var progress = this.cli.interaction.progress($('Setting network configuration'));
    try {
      this.networkManagementClient.networks.setConfiguration(config, _);
    } finally {
      progress.end();
    }
  }
});

module.exports = NetworkConfig;
