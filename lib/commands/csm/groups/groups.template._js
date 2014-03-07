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

var azure = require('azure');

exports.init = function(cli) {
  var log = cli.output;
  var group = cli.category('group');

  var groupTemplate = group.category('template')
    .description($('Commands to manage your local or gallery resource group template'));

  groupTemplate.command('list').
    description($('List gallery resource group templates'))
    .option('-c --category [category]', $('Category of the templates to list'))
    .option('-p --publisher [publisher]', $('Publisher of the templates to list'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (options, _) {
      var client = createGalleryClient(options.env);

      var filters = [];
      if (options.publisher) {
        filters.push(util.format("Publisher eq '%s'", options.publisher));
      }

      if (options.category) {
        filters.push(util.format("CategoryIds/any(c: c eq '%s')", options.category));
      }

      var result = cli.interaction.withProgress($('Listing gallery resource group templates'),
        function (log, _) {
          return client.items.list(filters.length === 0 ? null : { filter: filters.join(' and ') }, _);
        }, _);

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

function createGalleryClient(environment) {
  return utils.createClient('createGalleryClient', new azure.AnonymousCloudCredentials(),
    profile.current.getEnvironment(environment).publicGalleryEndpointUrl);
}
