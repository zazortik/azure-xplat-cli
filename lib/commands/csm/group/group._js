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
    .option('-d --deployment-name <deployment-name>', $('the name of the deployment it\'s going to create. Only valid when a template is used. When a template is used'))
    .option('-y --gallery-template <gallery-template>', $('the name of the template in the gallery'))
    .option('-f --file-template <file-template>', $('the path to the template file, local or remote'))
    .option('--template-hash <template-hash>', $('the expect content hash of the template'))
    .option('--template-hash-algorithm <template-hash-algorithm>', $('the algorithm used to hash the template content'))
    .option('--template-version <template-version>', $('the expect content version of the template'))
    .option('-s --storage-account <storage-account>', $('the storage account where to upload the template file to'))
    .option('-m --mode <mode>', $('the mode of the template deployment. Valid values are Replace, New and Incremental'))
    .option('-p --parameters <parameters>', $('the string in JSON format which represents the parameters'))
    .option('-e --parameters-file <parametersFile>', $('the file with parameters'))
    .option('--parameters-hash <parameters-hash>', $('the expect content hash of the parameters'))
    .option('--parameters-hash-algorithm <parameters-hash-algorithm>', $('the algorithm used to hash the parameters content'))
    .option('--parameters-version <parameters-version>', $('the expect content version of the parameters'))
    .option('--subscription <subscription>', $('Subscription to create group in'))
    .execute(function (name, location, options, _) {
      location = groupUtils.validateLocation(location, log, cli.interaction, _);

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');

      cli.interaction.withProgress(util.format($('Creating resource group %s'), name),
        function (log, _) {
          if (groupUtils.groupExists(client, name, _)) {
            log.error(util.format($('The resource group %s already exists'), name));
          } else {
            client.resourceGroups.createOrUpdate(name, { location: location}, _);
            log.info(util.format($('Created resource group %s'), name));
          }
        }, _);

      if (options.galleryTemplate || options.fileTemplate || options.deploymentName) {
        if (!options.deploymentName) {
          return cli.missingArgument('options.deploymentName');
        }

        groupUtils.createDeployment(cli, name, options.deploymentName, name, options, _);
      }
    });

  group.command('delete [name]')
    .description($('Delete a resource group'))
    .option('-n --name <name>', $('The resource group name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
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
    .option('--subscription <subscription>', $('Subscription to list groups for'))
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
      cli.interaction.formatOutput(result.resourceGroups, function (data) {
        if (data.length === 0) {
          log.info($('No resource groups defined'));
        } else {
          log.table(data, function (row, group) {
            row.cell($('Name'), group.name);
            row.cell($('Location'), group.location);
          });
        }
      });
    });

  group.command('show [name]')
    .option('-n --name <name>', $('The resource group name'))
    .option('--subscription <subscription>', $('Subscription to list groups for'))
    .description($('Shows a resource groups for your subscription'))
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
        log.data($('Name:      '), outputData.name);

        if (outputData.resources && outputData.resources.length > 0) {
          log.data($('Resources:'));
          log.data($(''));

          log.table(outputData.resources, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Type'), item.type);
            row.cell($('Location'), item.location);
          });
        }
      });
    });
};
