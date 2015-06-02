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
var path = require('path');
var fs = require('fs');
var util = require('util');
var utils = require('../../../util/utils');
var constants = require('./constants');
var $ = utils.getLocaleString;

function AppGateway(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(AppGateway.prototype, {
  create: function (appGatewayName, vnetName, options, _) {
    var appGateway = this.get(appGatewayName, _);
    if (appGateway) {
      throw new Error(util.format($('Application gateway "%s" already exists'), appGatewayName));
    }

    this._validateAppGatewayOptions(appGatewayName, vnetName, options, true);

    var progress = this.cli.interaction.progress(util.format($('Creating an application gateway "%s" for virtual network "%s"'), appGatewayName, vnetName));
    try {
      this.networkManagementClient.applicationGateways.create(options, _);
    } finally {
      progress.end();
    }
  },

  set: function (appGatewayName, vnetName, options, _) {
    this._validateAppGatewayOptions(appGatewayName, vnetName, options, false);

    var progress = this.cli.interaction.progress(util.format($('Updating an application gateway "%s" for virtual network "%s"'), appGatewayName, vnetName));
    try {
      this.networkManagementClient.applicationGateways.update(appGatewayName, options, _);
    } finally {
      progress.end();
    }
  },

  get: function (appGatewayName, _) {
    var appGateway;
    var progress = this.cli.interaction.progress(util.format($('Looking up an application gateway "%s"'), appGatewayName));
    try {
      appGateway = this.networkManagementClient.applicationGateways.get(appGatewayName, _);
    } catch (error) {
      if (error.code === 'ResourceNotFound' || error.code === 'NotFound') {
        appGateway = null;
      }
    } finally {
      progress.end();
    }

    return appGateway;
  },

  show: function (appGatewayName, options, _) {
    var appGateway = this.get(appGatewayName, _);

    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (appGateway) {
      interaction.formatOutput(appGateway, function (appGateway) {
        output.nameValue($('Name'), appGateway.name);
        output.nameValue($('State'), appGateway.state);
        output.nameValue($('Virtual network name'), appGateway.vnetName);
        output.nameValue($('Instance count'), appGateway.instanceCount);
        output.nameValue($('Gateway size'), appGateway.gatewaySize);
        output.header($('Subnets'));
        appGateway.subnets.forEach(function (subnet) {
          output.nameValue($('Name'), subnet, 2);
        });
        if (appGateway.virtualIPs.length > 0) {
          output.header($('Virtual IP\'s'));
          appGateway.virtualIPs.forEach(function (ip) {
            output.nameValue($('Name'), ip, 2);
          });
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('An application gateway with name "%s" not found'), appGatewayName));
      }
    }
  },

  list: function(options, _) {
    var progress = this.cli.interaction.progress($('Looking up application gateways'));
    var appGateways;
    try {
      appGateways = this.networkManagementClient.applicationGateways.list(_);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(appGateways.applicationGateways, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No application gateways found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('State'), item.state);
          row.cell($('Virtual network name'), item.vnetName);
          row.cell($('Gateway size'), item.gatewaySize);
          row.cell($('Instance count'), item.instanceCount);
          row.cell($('Virtual IP\'s count'), item.virtualIPs.length);
          row.cell($('Subnets count'), item.subnets.length);
        });
      }
    });
  },

  delete: function (appGatewayName, options, _) {
    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete application gateway "%s"? [y/n] '), appGatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.deleteMethod(appGatewayName, _);
    } finally {
      progress.end();
    }
  },

  start: function (appGatewayName, options, _) {
    options.operationType = constants.applicationGatewayStartOperation;
    var progress = this.cli.interaction.progress(util.format($('Starting an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.executeOperation(appGatewayName, options, _);
    } finally {
      progress.end();
    }
  },

  stop: function (appGatewayName, options, _) {
    options.operationType = constants.applicationGatewayStopOperation;
    var progress = this.cli.interaction.progress(util.format($('Stopping an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.executeOperation(appGatewayName, options, _);
    } finally {
      progress.end();
    }
  },

  addSsl: function (appGatewayName, certName, options, _) {
    if (utils.stringIsNullOrEmpty(options.certFile)) {
      throw new Error($('--cert-file parameter must not be empty'));
    }

    if (utils.stringIsNullOrEmpty(options.password)) {
      throw new Error($('--password parameter must not be empty'));
    }

    var certificateObject = {password: options.password};

    var certFormat = path.extname(options.certFile).split('.')[1];
    certificateObject.certificateFormat = certFormat;

    var data = fs.readFileSync(options.certFile);
    certificateObject.data = data.toString('base64');

    var progress = this.cli.interaction.progress(util.format($('Adding SSL certificate "%s" to application gateway "%s"'), certName, appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.addCertificate(appGatewayName, certName, certificateObject, options, _);
    } finally {
      progress.end();
    }
  },

  removeSsl: function (appGatewayName, certName, options, _) {
    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Remove certificate "%s" from application gateway "%s"? [y/n] '), certName, appGatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Removing SSL certificate "%s" to application gateway "%s"'), certName, appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.deleteCertificate(appGatewayName, certName, _);
    } finally {
      progress.end();
    }
  },

  _validateGatewaySize: function (gatewaySize) {
    if (!__.contains(constants.applicationGatewaySizes, gatewaySize)) {
      throw new Error($('--gateway-size must be one of the followings [Small, Medium, Large, ExrtaLarge, A8]'));
    }
  },

  _validateAppGatewayOptions: function (appGatewayName, vnetName, options, useDefaults) {
    var output = this.cli.output;
    if (!options.subnetNames) {
      throw new Error($('--subnet-names parameter must be set'));
    }

    options.name = appGatewayName;
    options.subnets = this._parseSubnets(options.subnetNames);
    options.vnetName = vnetName;

    if (options.instanceCount) {
      var instanceCount = utils.parseInt(options.instanceCount);

      if (isNaN(instanceCount) || (instanceCount < 0)) {
        throw new Error($('--instance-count value must be positive integer'));
      }
    } else if (useDefaults) {
      output.warn('--instance-count parameter is not specified, using default - ' + constants.defaultApplicationGatewayInstanceCount);
      options.instanceCount = constants.defaultApplicationGatewayInstanceCount;
    }

    if (!options.gatewaySize && useDefaults) {
      output.warn('--gateway-size parameter is not specified, using default - ' + constants.defaultApplicationGatewaySize);
      options.gatewaySize = constants.defaultApplicationGatewaySize;
    } else {
      this._validateGatewaySize(options.gatewaySize);
    }
  },

  _parseSubnets: function (subnets) {
    var subnetsArray = subnets.split(',');
    for (var i = 0; i < subnetsArray.length; i++) {
      subnetsArray[i] = subnetsArray[i].trim();
    }

    return subnetsArray;
  }
});

module.exports = AppGateway;