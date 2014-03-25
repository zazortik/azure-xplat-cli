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

var fs = require('fs');
var request = require('request');
var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var groupUtils = require('./groupUtils');

var $ = utils.getLocaleString;

var azure = require('azure');

exports.init = function(cli) {
  profile.addKnownResourceNamespace('successbricks.cleardb', 'microsoft.insights');
  profile.addKnownProvider('website', 'visualstudio.account', 'sqlserver');

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
        filters.push(util.format('Publisher eq \'%s\'', options.publisher));
      }

      if (options.category) {
        filters.push(util.format('CategoryIds/any(c: c eq \'%s\')', options.category));
      }

      var result = cli.interaction.withProgress($('Listing gallery resource group templates'),
        function (log, _) {
          return client.items.list(filters.length === 0 ? null : { filter: filters.join(' and ') }, _);
        }, _);

      cli.interaction.formatOutput(result.items, function (data) {
        if (data.length === 0) {
          log.info($('No gallery resource group templates'));
        } else {
          var validItems = data.filter(function (c) {
            return !utils.stringEndsWith(c.version, '-placeholder', true);
          });
          var sortedItems = validItems.sort(function (left, right) {
            return left.publisher.localeCompare(right.publisher);
          });
          log.table(sortedItems, function (row, item) {
            row.cell($('Publisher'), item.publisher);
            row.cell($('Name'), item.identity);
          });
        }
      });
    });

  groupTemplate.command('show [name]')
    .description($('Show a gallery resource group template'))
    .option('-n --name <name>', $('Name of template to show'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (name, options, _) {

      if (!name) {
        return cli.missingArgument('name');
      }

      var client = createGalleryClient(options.env);

      var result = cli.interaction.withProgress($('Showing a gallery resource group template'),
        function (log, _) {
          return client.items.get(name, _);
        }, _);

      cli.interaction.formatOutput(result.item, function (data) {
        log.data($('Name:        '), data.identity);
        log.data($('Publisher:   '), data.publisher);
        log.data($('Version:     '), data.version);
        log.data($('Url:         '), groupUtils.getTemplateDownloadUrl(data));
        log.data($('Summary:     '), data.summary);
        log.data($('Description: '), data.description);
      });
    });

  groupTemplate.command('download [name] [file]')
    .description($('Download a gallery resource group template'))
    .usage('[options] [name] [file]')
    .option('-n --name <name>', $('Name of template to download'))
    .option('-f --file <file>', $('Name of destination directory or file'))
    .option('-q --quiet', $('Do not prompt for overwrite if output file exists'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (name, file, options, _) {

      if (!name) {
        return cli.missingArgument('name');
      }
      var confirm = cli.interaction.confirm.bind(cli.interaction);

      var downloadFileName = groupUtils.normalizeDownloadFileName(name, file, options.quiet, confirm, _);
      if (!downloadFileName) {
        // overwrite not confirmed, stop
        return;
      }

      var client = createGalleryClient(options.env);
      var result = cli.interaction.withProgress(
        util.format($('Getting gallery resource group template %s'), name),
        function (log, _) {
          return client.items.get(name, _);
        }, _);

      var downloadUrl = groupUtils.getTemplateDownloadUrl(result.item);
      var waitForDownloadEnd = function (stream, callback) {
        stream.on('close', function () {
          callback(null);
        });
        stream.on('error', function (ex) {
          callback(ex);
        });
      };

      return waitForDownloadEnd(request(downloadUrl).pipe(fs.createWriteStream(downloadFileName)), _);
    });

  groupTemplate.command('validate [resource-group]')
    .description($('Validate a template to see whether it\'s using the right syntax, resource providers, resource types, etc'))
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-y --gallery-template <gallery-template>', $('the name of the template in the gallery'))
    .option('-f --template-file <template-file>', $('the path to the template file in file system'))
    .option('--template-uri <template-uri>', $('the uri to the remote template file'))
    //TODO: comment out till ARM supports contentHash
    //.option('--template-hash <template-hash>', $('the content hash of the template'))
    //.option('--template-hash-algorithm <template-hash-algorithm>', $('the algorithm used to hash the template content'))
    .option('--template-version <template-version>', $('the content version of the template'))
    .option('-s --storage-account <storage-account>', $('the storage account where to upload the template file to'))
    //TODO: comment out till ARM supports validation mode
    //.option('-m --mode <mode>', $('the mode of the template deployment. Valid values are Replace, New and Incremental'))
    .option('-p --parameters <parameters>', $('the string in JSON format which represents the parameters'))
    .option('-e --parameters-file <parametersFile>', $('the file with parameters'))
    //TODO: comment out till ARM supports contentHash
    //.option('--parameters-hash <parameters-hash>', $('the content hash of the parameters'))
    //.option('--parameters-hash-algorithm <parameters-hash-algorithm>', $('the algorithm used to hash the parameters content'))
    .option('--parameters-version <parameters-version>', $('the expect content version of the parameters'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .option('--env [env]', $('Azure environment to run against'))
    .execute(function (resourceGroup, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      groupUtils.validateTemplate(cli, resourceGroup, options, _);
    });
};

function createGalleryClient(environment) {
  var galleryEndpointUrl;

  if (!environment && profile.current.currentSubscription) {
    galleryEndpointUrl = profile.current.currentSubscription.galleryEndpointUrl;
  } else {
    galleryEndpointUrl = profile.current.getEnvironment(environment).galleryEndpointUrl;
  }
  return utils.createClient('createGalleryClient', new azure.AnonymousCloudCredentials(),
    galleryEndpointUrl);
}
