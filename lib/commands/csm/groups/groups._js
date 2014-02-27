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

var Constants = require('../../../util/constants');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var groupUtils = require('./groupUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group')
    .description($('Commands to manage your resource groups'));

  group.command('create <name> [location]')
    .description($('Create a new resource group'))
    .option('-l --location <location>', $('Location to create group in'))
    .option('--subscription <subscription>', $('Subscription to create group in'))
    .execute(function (name, location, options, _) {
      location = groupUtils.validateLocation(location, log, cli.interaction, _);

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Creating resource group %s'), name));
      try {
        client.resourceGroups.createOrUpdate(name, { location: location}, _);
      } finally {
        progress.end();
      }
    });

  group.command('delete <name>')
    .description($('Delete a resource group'))
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
    .usage('[options] <name>')
    .option('-n --name <name>', $('Name of resource group to get'))
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
