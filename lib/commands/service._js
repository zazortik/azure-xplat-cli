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

var util = require('util');

var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var cloudService = cli.category('service')
    .description($('Commands to manage your Cloud Services'));

  cloudService.command('create [serviceName]')
    .description($('Create a cloud service'))
    .usage('[options] <serviceName>')
    .option('--serviceName <serviceName>', $('the cloud service name'))
    .option('--description <description>', $('the description. Defaults to \'Service host\''))
    .option('--location <location>', $('the location. Optional if affinitygroup is specified'))
    .option('--affinitygroup <affinitygroup>', $('the affinity group. Optional if location is specified'))
    .option('--label <label>', $('the label. Defaults to serviceName'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serviceName, options, _) {
      var serviceManagementService = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serviceName]
      });

      if (params.err) { throw params.err; }

      serviceName = cli.interaction.promptIfNotGiven($('New cloud service name: '), params.values.serviceName, _);
      var location = options.location;
      var affinitygroup = options.affinitygroup;

      if (!location && !affinitygroup) {
        // If nothing is specified, assume location
        location = cli.interaction.chooseIfNotGiven($('Location: '), $('Getting locations'), location,
            function (cb) {
              serviceManagementService.listLocations(function (err, result) {
                if (err) { return cb(err); }

                cb(null, result.body.map(function (location) { return location.Name; }));
              });
            }, _);
      }

      var createOptions = {};
      if (options._description) {
        createOptions.Description = options._description;
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

      var progress = cli.interaction.progress($('Creating cloud service'));
      try {
        serviceManagementService.createHostedService(serviceName, createOptions, _);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput({ Name: serviceName }, function(outputData) {
        log.data($('Cloud service name'), outputData.Name);
      });
    });

  cloudService.command('list')
    .description($('List Azure cloud services'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var service = createServiceManagementService(options.subscription);

      var progress = cli.interaction.progress($('Getting cloud services'));
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

      cli.interaction.formatOutput(cloudServices, function(outputData) {
        if(outputData.length === 0) {
          log.info($('No Cloud Services exist'));
        } else {
          log.table(outputData, function (row, item) {
            row.cell($('Name'), item.ServiceName);
            row.cell($('Location'), item.HostedServiceProperties.Location || '');
            row.cell($('Affinity Group'), item.HostedServiceProperties.AffinityGroup || '');
          });
        }
      });
    });

  cloudService.command('show [serviceName]')
    .description($('Show Azure cloud service'))
    .usage('[options] <serviceName>')
    .option('--serviceName <serviceName>', $('the cloud service name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serviceName]
      });

      if (params.err) { throw params.err; }

      serviceName = cli.interaction.promptIfNotGiven($('Cloud Service name: '), params.values.serviceName, _);

      var progress = cli.interaction.progress($('Getting cloud service'));
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

      cli.interaction.formatOutput(cloudService, function(outputData) {
        if(!outputData) {
          log.error($('Cloud service not found'));
        } else {
          cli.interaction.logEachData('Cloud Service', cloudService);
        }
      });
    });

  cloudService.command('delete [serviceName]')
    .description($('Delete a cloud service'))
    .usage('[options] <serviceName>')
    .option('--serviceName <serviceName>', $('the cloud service name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serviceName, options, _) {
      var service = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serviceName: [serviceName, options.serviceName]
      });

      if (params.err) { throw params.err; }

      serviceName = cli.interaction.promptIfNotGiven($('Cloud service name: '), params.values.serviceName, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete cloud service %s? [y/n] '), serviceName), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Deleting cloud service'));
      try {
        service.deleteHostedService(serviceName, _);
      } finally {
        progress.end();
      }
    });

  function createServiceManagementService(subscription) {
    return utils.createServiceManagementService(cli.category('account').getCurrentSubscription(subscription), log);
  }
};

