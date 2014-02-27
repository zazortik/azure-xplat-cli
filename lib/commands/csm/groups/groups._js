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

var azure = require('azure');

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
        var response = client.resourceGroups.createOrUpdate(name, { location: location}, _);
      } finally {
        progress.end();
      }
    });

  group.command('delete <name>')
    .description($('Delete a resource group'))
    .option('--subscription <subscription>', $('Subscription containing group to delete'))
    .execute(function (name, options, _) {
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

  var groupTemplate = group.category('template')
    .description($('Commands to manage your resource groups template locally and in the gallery'));

  groupTemplate.command('list').
    description($('List the resource group templates from gallery'))
    .option('-c --category [category]', $('Category of the templates to list'))
    .option('-p --publisher [publisher]', $('Publisher of the templates to list'))
    .option('-u --country [country]', $('Country of the templates to list'))
    .option('--env [env]', $('Country of the templates to list'))
    .execute(function (options, _) {
      var client = azure.createGalleryClient(new azure.AnonymousCloudCredentials(), profile.current.getEnvironment(options.env).publicGalleryEndpointUrl);
      var progress = cli.interaction.progress($('Listing resource group templates in gallery'));
      var result;
      try {
        result = client.items.list({
          category: options.category,
          publisher: options.publisher,
          country: options.country
        }, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.items, function (data) {
        if (data.length === 0) {
          log.info($('No resource group templates found in gallery'));
        } else {
          var sortedItems = data.sort(function (left, right) {
            return left.publisher.localeCompare(right.publisher);
          });
          log.table(sortedItems, function (row, item) {
            row.cell($('Publisher'), item.publisher);
            row.cell($('Name'), item.identity);
          });
        }
      });
    });
};
