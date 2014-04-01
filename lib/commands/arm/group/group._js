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

'use strict';

var streams = require('streamline/lib/streams/streams');
var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var groupUtils = require('./groupUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group')
    .description($('Commands to manage your resource groups'));

  group.command('create [name] [location]')
    .description($('Creates a new resource group'))
    .usage('[options] <name> <location>')
    .option('-n --name <name>', $('the resource group name'))
    .option('-l --location <location>', $('the location where we will create the group'))
    .option('-d --deployment-name <deployment-name>', $('the name of the deployment we will create (only valid when a template is used)'))
    .option('-y --gallery-template <gallery-template>', $('the name of the template in the gallery'))
    .option('-f --template-file <template-file>', $('the path to the template file in the file system'))
    .option('--template-uri <template-uri>', $('the uri to the remote template file'))
    //TODO: comment out till ARM supports contentHash
    // .option('--template-hash <template-hash>', $('the content hash of the template'))
    // .option('--template-hash-algorithm <template-hash-algorithm>', $('the algorithm used to hash the template content'))
    .option('--template-version <template-version>', $('the content version of the template'))
    .option('-s --storage-account <storage-account>', $('the storage account where we will upload the template file'))
    //TODO: comment out till ARM supports different modes
    //.option('-m --mode <mode>', $('the mode of the template deployment (valid values are Replace, New, and Incremental)'))
    .option('-p --parameters <parameters>', $('a JSON-formatted string containing parameters'))
    .option('-e --parameters-file <parametersFile>', $('a file containing parameters'))
    //TODO: comment out till ARM supports contentHash
    // .option('--parameters-hash <parameters-hash>', $('the content hash of the parameters'))
    // .option('--parameters-hash-algorithm <parameters-hash-algorithm>', $('the algorithm used to hash the parameters content'))
    // .option('--parameters-version <parameters-version>', $('the content version of the parameters'))
    .option('-q, --quiet', $('quiet mode (do not ask for create confirmation)'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, location, options, _) {
      group.createResourceGroup(name, location, options, _);
    });

  group.createResourceGroup = function (name, location, options, _) {
    var subscription = profile.current.getSubscription(options.subscription);
    var client = subscription.createResourceClient('createResourceManagementClient');

    var existingGroup;
    cli.interaction.withProgress(util.format($('Getting resource group %s'), name),
      function (log, _) {
        existingGroup = groupUtils.getGroup(client, name, _);
      }, _);

    if (existingGroup) {
      if (!options.quiet && !cli.interaction.confirm(util.format($('The resource group %s already exists. Update ? [y/n] '), name), _)) {
        return;
      }

      if (!location) {
        location = existingGroup.location;
      }
    } else {
      location = groupUtils.validateLocation(location, log, cli.interaction, _);
    }

    var message = util.format($('Creating resource group %s'), name);
    var doneMessage = util.format($('Created resource group %s'), name);
    if (existingGroup) {
      message = util.format($('Updating resource group %s'), name);
      doneMessage = util.format($('Updated resource group %s'), name);
    }

    var group;
    cli.interaction.withProgress(message,
      function (log, _) {
        group = client.resourceGroups.createOrUpdate(name, { location: location}, _);
      }, _);

    log.info(doneMessage);

    if (options.galleryTemplate || options.templateFile || options.templateUri || options.deploymentName) {
      groupUtils.createDeployment(cli, name, options.deploymentName, options, _);
    }

    return group.resourceGroup;
  };

  group.command('delete [name]')
    .description($('Deletes a resource group'))
    .usage('[options] <name>')
    .option('-n --name <name>', $('the resource group name'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete resource group %s? [y/n] '), name), _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Deleting resource group %s'), name));
      try {
        client.resourceGroups.delete(name, _);
      } finally {
        progress.end();
      }
    });

  group.command('list')
    .description($('Lists the resource groups for your subscription'))
    .option('-d, --details', $('show additional resource group details'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('Listing resource groups'));
      var result;
      try {
        result = client.resourceGroups.list({}, _);
      } finally {
        progress.end();
      }

      if (options.details) {
        progress = cli.interaction.progress($('Listing resources for the groups'));
        try {
          for (var i in result.resourceGroups) {
            var resourceGroup = result.resourceGroups[i];
            resourceGroup.resources = client.resources.list({ resourceGroupName: resourceGroup.name }, _).resources;
          }
        } finally {
          progress.end();
        }
      }

      cli.interaction.formatOutput(result.resourceGroups, function (data) {
        if (data.length === 0) {
          log.info($('No resource groups defined'));
        } else {
          if (options.details) {
            for (var i in data) {
              showDetailedResourceGroup(data[i]);
              log.data($(''));
            }
          } else {
            log.table(data, function (row, group) {
              row.cell($('Name'), group.name);
              row.cell($('Location'), group.location);
              row.cell($('Provisioning State'), group.provisioningState);
            });
          }
        }
      });
    });

  group.command('show [name]')
    .description($('Shows a resource group for your subscription'))
    .usage('[options] <name>')
    .option('-n --name <name>', $('the resource group name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('Listing resource groups'));
      var resourceGroup;
      try {
        resourceGroup = client.resourceGroups.get(name, _).resourceGroup;
      } finally {
        progress.end();
      }

      // Get resources for the resource group
      progress = cli.interaction.progress($('Listing resources for the group'));
      try {
        resourceGroup.resources = client.resources.list({ resourceGroupName: name }, _).resources;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(resourceGroup, function (outputData) {
        showDetailedResourceGroup(outputData);
      });
    });

  function showDetailedResourceGroup (resourceGroup) {
    log.data($('Name:               '), resourceGroup.name);
    log.data($('Provisioning State: '), resourceGroup.provisioningState);

    if (resourceGroup.resources && resourceGroup.resources.length > 0) {
      log.data($('Resources:'));
      log.data($(''));

      log.table(resourceGroup.resources, function (row, item) {
        row.cell($('Name'), item.name);
        row.cell($('Type'), item.type);
        row.cell($('Location'), item.location);
      });
    } else {
      log.data($('Resources:  []'));
      log.data($(''));
    }
  }

  var grouplog = group.category('log')
    .description($('Commands to manage resource group logs'));

  var logReport = [
    [$('EventId'), 'eventDataId'],
    [
      $('Authorization'), 'authorization',
      [
        ['action', 'action'],
        ['role', 'role'],
        ['scope', 'scope']
      ]
    ],
    [$('ResourceUri'), 'resourceUri'],
    [$('SubscriptionId'), 'subscriptionId'],
    [$('EventTimestamp (UTC)'), 'eventTimestamp', log.report.asDate],
    [$('OperationName'), 'operationName.localizedValue'],
    [$('OperationId'), 'operationId'],
    [$('Status'), 'status.localizedValue'],
    [$('SubStatus'), 'subStatus.localizedValue'],
    [$('Caller'), 'caller'],
    [$('CorrelationId'), 'correlationId'],
    [$('Description'), 'description'],
    [$('HttpRequest'), 'httpRequest', log.report.allProperties],
    [$('Level'), 'level'],
    [$('ResourceGroup'), 'resourceGroupName'],
    [$('ResourceProvider'), 'resourceProviderName.localizedValue'],
    [$('EventSource'), 'eventSource.localizedValue'],
    [$('Properties'), 'properties', log.report.allProperties]
  ];

  grouplog.command('show [name]')
    .description($('Retrieves and shows logs for resource group operations'))
    .option('-n --name <name>', $('the resource group name'))
    .option('-a --all', $('returns logs for all operations (including CRUD and deployment)'))
    .option('-l --last-deployment', $('returns logs for the last deployment'))
    .option('-d --deployment <name>', $('the name of the deployment whose logs you want to see'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      if (!name) {
        return cli.missingArgument('name');
      }

      if ([options.all, options.lastDeployment, options.deployment].filter(function (opt) { return opt; }).length > 1) {
        throw new Error($('Must specify only one of --all, --last-deployment, or --deployment switches'));
      }

      var subscription = profile.current.getSubscription(options.subscription);

      var progress = cli.interaction.progress($('Getting group logs'));
      function endProgress() {
        if (progress) {
          progress.end();
          progress = null;
        }
      }

      var logStream;

      if (options.all) {
        logStream = groupUtils.getAllEvents(subscription, name);
      } else if (options.deployment) {
        logStream = groupUtils.getDeploymentLog(subscription, name, options.deployment);
      } else {
        logStream = groupUtils.getLastDeploymentLog(subscription, name);
      }

      logStream = new streams.ReadableStream(logStream);

      var logEntry = logStream.read(_);
      endProgress();

      while (logEntry !== null) {
        /* jshint loopfunc: true */
        cli.interaction.formatOutput(logEntry, function (eventData) {
          log.data('----------');
          log.report(logReport, eventData);
        });
        logEntry = logStream.read(_);
      }
    });
};


