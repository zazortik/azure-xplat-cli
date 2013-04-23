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

var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');
var crypto = require('crypto');
var __ = require('underscore');
var async = require('async');
var child_process = require('child_process');
var azure = require('azure');

var interaction = require('../util/interaction');
var pfx2pem = require('../util/certificates/pkcs').pfx2pem;
var Channel = require('../util/channel');
var utils = require('../util/utils');
var cacheUtils = require('../util/cacheUtils');
var js2xml = require('../util/js2xml');
var Constants = require('../util/constants');
var generator = require('./scriptgenerator/generator');

var linkedRevisionControl = require('../util/git/linkedrevisioncontrol');

exports.init = function (cli) {

  var log = cli.output;

  var cloudService = cli.category('cloudservice')
        .description('Commands to manage your cloud services');

  cloudService.command('list')
    .description('Get the list of cloud services')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var service = createServiceManagementService(options.subscription);
      var progress = cli.progress('Listing cloud services');
      var cloudServices = service.listHostedServices(_);
      progress.end();

      if (cloudServices.body) {
        cloudServices = cloudServices.body;
      } else {
        cloudServices = [];
      }

      interaction.formatOutput(cli, cloudServices, function(outputData) {
        if(outputData.length === 0) {
          log.info('No Cloud Services exist');
        } else {
          log.table(cloudServices, function (row, item) {
            row.cell('Name', item.ServiceName);
            row.cell('Location', item.HostedServiceProperties.Location || '');
            row.cell('Affinity Group', item.HostedServiceProperties.AffinityGroup || '');
          });
        }
      });
    });

  cloudService.command('show [serviceName]')
    .description('Display cloud service details')
    .usage('<serviceName> [options]')
    .option('--serviceName <serviceName>', 'The Cloud Service name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serviceName = interaction.promptIfNotGiven(cli, "Cloud Service name: ", params.values.serviceName, _);

      var progress = cli.progress('Getting Cloud Service');
      var cloudService = service.getHostedService(serviceName, _);
      progress.end();

      if (cloudService.body) {
        cloudService = cloudService.body;
        delete cloudService['$'];

        if (cloudService.HostedServiceProperties) {
          Object.keys(cloudService.HostedServiceProperties).forEach(function (property) {
            cloudService[property] = cloudService.HostedServiceProperties[property];
          });

          delete cloudService.HostedServiceProperties;
        }
      } else {
        cloudService = null;
      }

      interaction.formatOutput(cli, cloudService, function(outputData) {
        if(!outputData) {
          log.error('Cloud service not found');
        } else {
          interaction.logEachData(cli, 'Cloud Service', cloudService);
        }
      });
    });

  cloudService.command('delete [serviceName]')
    .description('Delete a cloud service')
    .usage('<serviceName> [options]')
    .option('--serviceName <serviceName>', 'The Cloud Service name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serviceName = interaction.promptIfNotGiven(cli, "Cloud Service name: ", params.values.serviceName, _);

      var progress = cli.progress('Removing Cloud Service');
      service.deleteHostedService(serviceName, _);
      progress.end();
    });

  function createServiceManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return azure.createServiceManagementService(subscriptionId, auth);
  }
};
