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

var azure = require('azure');

var utils = require('../util/utils');
var cert = require('../util/cert');
var interaction = require('../util/interaction');

exports.init = function (cli) {
  var log = cli.output;

  var cloudService = cli.category('service')
    .description('Commands to manage your Azure cloud services');

  cloudService.command('create [serviceName]')
    .description('Create a new Azure cloud service')
    .usage('<serviceName> [options]')
    .option('--description <description>', 'The description. Defaults to \'Service host\'')
    .option('--location <location>', 'The location. Optional if affinitygroup is specified')
    .option('--affinitygroup <affinitygroup>', 'The affinity group. Optional if location is specified')
    .option('--label <label>', 'The label. Defaults to serviceName')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serviceName, options, _) {
      var serviceManagementService = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serviceName]
      });

      if (params.err) { throw params.err; }

      serviceName = interaction.promptIfNotGiven(cli, 'New Cloud Service name: ', params.values.serviceName, _);
      var location = options.location;
      var affinitygroup = options.affinitygroup;

      if (!location && !affinitygroup) {
        // If nothing is specified, assume location
        location = interaction.chooseIfNotGiven(cli, 'Location: ', 'Getting locations', location,
            function (cb) {
              serviceManagementService.listLocations(function (err, result) {
                if (err) { return cb(err); }

                cb(null, result.body.map(function (location) { return location.Name; }));
              });
            }, _);
      }

      var createOptions = {};
      if (options.description) {
        createOptions.Description = options.description;
      }

      if (location) {
        createOptions.Location = location;
      }

      if (affinitygroup) {
        createOptions.AffinityGroup = affinitygroup;
      }

      if (options.label) {
        createOptions.Label = options.label;
      }

      var progress = cli.progress('Creating Cloud Service');
      try {
        serviceManagementService.createHostedService(serviceName, createOptions, _);
      } finally {
        progress.end();
      }

      interaction.formatOutput(cli, { Name: serviceName }, function(outputData) {
        log.data('Cloud Service Name', outputData.Name);
      });
    });

  cloudService.command('list')
    .description('List Azure cloud services')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var service = createServiceManagementService(options.subscription);

      var progress = cli.progress('Listing cloud services');
      var cloudServices;
      try {
        cloudServices = service.listHostedServices(_);
      } finally {
        progress.end();
      }

      if (cloudServices.body) {
        cloudServices = cloudServices.body;
      } else {
        cloudServices = [];
      }

      interaction.formatOutput(cli, cloudServices, function(outputData) {
        if(outputData.length === 0) {
          log.info('No Cloud Services exist');
        } else {
          log.table(outputData, function (row, item) {
            row.cell('Name', item.ServiceName);
            row.cell('Location', item.HostedServiceProperties.Location || '');
            row.cell('Affinity Group', item.HostedServiceProperties.AffinityGroup || '');
          });
        }
      });
    });

  cloudService.command('show [serviceName]')
    .description('Show Azure cloud service')
    .usage('<serviceName> [options]')
    .option('--serviceName <serviceName>', 'The Cloud Service name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serviceName = interaction.promptIfNotGiven(cli, 'Cloud Service name: ', params.values.serviceName, _);

      var progress = cli.progress('Getting Cloud Service');
      var cloudService;
      try {
        cloudService = service.getHostedService(serviceName, _);
      } finally {
        progress.end();
      }

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
    .description('Delete Azure cloud service')
    .usage('<serviceName> [options]')
    .option('--serviceName <serviceName>', 'The Cloud Service name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serviceName = interaction.promptIfNotGiven(cli, 'Cloud Service name: ', params.values.serviceName, _);

      var progress = cli.progress('Removing Cloud Service');
      try {
        service.deleteHostedService(serviceName, _);
      } finally {
        progress.end();
      }
    });

  cloudService.command('portal [name]')
    .description('Opens the portal in a browser to manage your cloud services')
    .execute(function (name) {
      var url = utils.getPortalUrl() + '#Workspaces/CloudServicesExtension/';
      url += name ? 'CloudService/' + name + '/dashboard' : 'list';

      interaction.launchBrowser(url);
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

  cert.init(cli, cloudService);
};

