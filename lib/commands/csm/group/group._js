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
    .description($('Create a new resource group'))
    .option('-n --name <name>', $('The resource group name'))
    .option('-l --location <location>', $('Location to create group in'))
    .option('-d --deployment-name <deployment-name>', $('the name of the deployment it\'s going to create. Only valid when a template is used.'))
    .option('-y --gallery-template <gallery-template>', $('the name of the template in the gallery'))
    .option('-f --file-template <file-template>', $('the path to the template file, local or remote'))
    //TODO: comment out till CSM supports contentHash
    // .option('--template-hash <template-hash>', $('the content hash of the template'))
    // .option('--template-hash-algorithm <template-hash-algorithm>', $('the algorithm used to hash the template content'))
    .option('--template-version <template-version>', $('the content version of the template'))
    .option('-s --storage-account <storage-account>', $('the storage account where to upload the template file to'))
    .option('-m --mode <mode>', $('the mode of the template deployment. Valid values are Replace, New and Incremental'))
    .option('-p --parameters <parameters>', $('the string in JSON format which represents the parameters'))
    .option('-e --parameters-file <parametersFile>', $('the file with parameters'))
    //TODO: comment out till CSM supports contentHash
    // .option('--parameters-hash <parameters-hash>', $('the content hash of the parameters'))
    // .option('--parameters-hash-algorithm <parameters-hash-algorithm>', $('the algorithm used to hash the parameters content'))
    .option('--parameters-version <parameters-version>', $('the content version of the parameters'))
    .option('-q, --quiet', $('quiet mode, do not ask for update confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .option('--env [env]', $('Azure environment to run against'))
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

    if (options.galleryTemplate || options.fileTemplate || options.deploymentName) {
      groupUtils.createDeployment(cli, name, options.mode, options.deploymentName, options, _);
    }

    return group.resourceGroup;
  };

  group.command('delete [name]')
    .description($('Delete a resource group'))
    .option('-n --name <name>', $('The resource group name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
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
    .description($('List the resource groups for your subscription'))
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
    .description($('Shows a resource groups for your subscription'))
    .option('-n --name <name>', $('The resource group name'))
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
};
