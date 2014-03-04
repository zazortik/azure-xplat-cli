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

      cli.interaction.withProgress(util.format($('Creating resource group %s'), name),
        function (log, _) {
          if (groupUtils.groupExists(client, name, _)) {
            log.error(util.format($('The resource group %s already exists'), name));
          } else {
            client.resourceGroups.createOrUpdate(name, { location: location}, _);
            log.info(util.format($('Created resource group %s'), name));
          }
        }, _);
    });

  group.command('delete <name>')
    .description($('Delete a resource group'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('Subscription containing group to delete'))
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

  group.command('show <name>')
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

  var groupTemplate = group.category('template')
    .description($('Commands to manage your local or gallery resource group template'));

  groupTemplate.command('list').
    description($('List gallery resource group templates'))
    .option('-c --category [category]', $('Category of the templates to list'))
    .option('-p --publisher [publisher]', $('Publisher of the templates to list'))
    .option('-u --country [country]', $('Country of the templates to list'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (options, _) {
      var client = azure.createGalleryClient(new azure.AnonymousCloudCredentials(),
        profile.current.getEnvironment(options.env).publicGalleryEndpointUrl);
      var progress = cli.interaction.progress($('Listing gallery resource group templates'));
      var result;
      try {
        var filters = [];
        if (options.publisher) {
          filters.push(util.format("Publisher eq '%s'", options.publisher));
        }
        if (options.country) {
          filters.push(util.format("Country eq '%s'", options.country));
        }
        if (options.category) {
          filters.push(util.format("CategoryIds/any(c: c eq '%s')", options.category));
        }
        result = client.items.list(filters.length === 0 ? null : { filter: filters.join(' and ') }, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.items, function (data) {
        if (data.length === 0) {
          log.info($('No gallery resource group templates'));
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

  groupTemplate.command('show <name>')
    .description($('Show a gallery resource group template'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (name, options, _) {
      var client = azure.createGalleryClient(new azure.AnonymousCloudCredentials(),
        profile.current.getEnvironment(options.env).publicGalleryEndpointUrl);
      var progress = cli.interaction.progress($('Showing a gallery resource group template'));
      var result;
      try {
        result = client.items.get(name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.item, function (data) {
        log.data($('Name:        '), data.identity);
        log.data($('Publisher:   '), data.publisher);
        log.data($('Version:     '), data.version);
        // guayan FIXME
        log.data($('Url:         '), data.definitionTemplates.deploymentTemplateFileUrls);
        log.data($('Summary:     '), data.summary);
        log.data($('Description: '), data.description);
      });
    });

  groupTemplate.command('download <name> [file]')
    .description($('Download a gallery resource group template'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (name, file, options, _) {
      var client = azure.createGalleryClient(new azure.AnonymousCloudCredentials(),
        profile.current.getEnvironment(options.env).publicGalleryEndpointUrl);
      var progress = cli.interaction.progress($('Downloading gallery resource group template %s'));
      var result;
      try {
        result = client.items.get(name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.item, function (data) {
        // guayan FIXME
      });
    });

  groupTemplate.command('validate')
    .description($('Validate a local or gallery resource group template'))
    .option('-g --resource-group <resourceGroup>', $('Resource group to validate the template against'))
    .option('-f --template-file <templateFile>', $('Template file to valdiate'))
    .option('-y --gallery-template <galleryTemplate>', $('Gallery template to validate'))
    .option('-p --parameters <parameters>', $('Parameters for the template'))
    .option('-m --mode [mode]', $('Validation mode.'))
    .option('--template-version [templateVersion]', $('Template version to match'))
    .option('--template-hash [templateHash]', $('Template hash to match'))
    .option('--template-hash-algorithm [templateHashAlgorithm]', $('Template hash algorithm'))
    .option('--subscription [subscription]', $('Subscription containing group to delete'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var resourceManagementclient = subscription.createResourceClient('createResourceManagementClient');
      var galleryClient = azure.createGalleryClient(new azure.AnonymousCloudCredentials(),
        profile.current.getEnvironment(options.env).publicGalleryEndpointUrl);
      });

};
