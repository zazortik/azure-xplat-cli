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

var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var site = cli.category('site');
  var siteScale = site.category('scale')
    .description($('Commands to manage your Web Site scaling'));

  siteScale.command('mode [mode] [name]')
    .description($('Set the web site mode'))
    .usage('[options] <mode> [name]')
    .option('--mode <mode>', $('the mode of the site (available are: free, shared and standard)'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (mode, name, options, _) {
      if (options.mode) {
        name = mode;
        mode = undefined;
      }

      var params = utils.normalizeParameters({
        mode: [mode, options.mode]
      });

      if (params.err) { throw params.err; }

      mode = cli.interaction.chooseIfNotGiven($('Mode: '), $('Getting modes'), params.values.mode,
          function (cb) {
            cb(null, [ 'Free', 'Shared', 'Standard' ]);
          }, _);

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = {};

      var service = createWebsiteManagementService(context.subscription);

      switch(mode.toLowerCase()) {
      case 'free':
        siteConfigurations.computeMode = 'Shared';
        siteConfigurations.siteMode = 'Limited';
        break;
      case 'shared':
        siteConfigurations.computeMode = 'Shared';
        siteConfigurations.siteMode = 'Basic';
        break;
      case 'standard':
        try {
          service.serverFarms.get(context.site.webspace, 'DefaultServerFarm', _);
        } catch (err) {
          if (err && err.code === 'NotFound') {
            service.serverFarms.create(context.site.webspace,
              {
                numberOfWorkers: 1,
                workerSize: 'Small'
              }, _);
          } else {
            throw err;
          }
        }

        siteConfigurations.computeMode = 'Dedicated';
        siteConfigurations.serverFarm = 'DefaultServerFarm';
        siteConfigurations.siteMode = 'Basic';
        break;
      default:
        throw new Error($('Valid modes are: \'free\', \'shared\' and \'standard\''));
      }

      var progress = cli.interaction.progress($('Updating a site configuration'));
      try {
        service.webSites.update(context.site.webspace, context.site.name, siteConfigurations, _);
      } finally {
        progress.end();
      }
    });

  siteScale.command('instances [instances] [name]')
    .description($('Set the web site number of instances'))
    .usage('[options] <instances> [name]')
    .option('--instances <instances>', $('the number of instances'))
    .option('--size <size>', $('the size of the instances (available are: small, medium and large)'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (instances, name, options, _) {
      if (options.instances) {
        name = instances;
        instances = undefined;
      }

      var params = utils.normalizeParameters({
        instances: [instances, options.instances]
      });

      if (params.err) { throw params.err; }

      instances = cli.interaction.promptIfNotGiven($('Number of instances: '), params.values.instances, _);

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      var service = createWebsiteManagementService(context.subscription);

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteGet(context, _);

      if (siteConfigurations.computeMode !== 'Dedicated') {
        throw new Error($('Instances can only be changed for sites in standard mode'));
      }

      if (options.size !== undefined) {
        switch (options.size.toLowerCase()) {
        case 'small':
          options.size = 'Small';
          break;
        case 'medium':
          options.size = 'Medium';
          break;
        case 'large':
          options.size = 'Large';
          break;
        default:
          throw new Error($('Available instance sizes are: Small, Medium or Large'));
        }
      }

      var progress = cli.interaction.progress($('Updating a server farm'));
      try {
        service.serverFarms.update(context.site.webspace, {
            numberOfWorkers: instances,
            workerSize: options.size !== undefined ? options.size : 'Small'
          }, _);
      } finally {
        progress.end();
      }
    });

  function createWebsiteManagementService(subscription) {
    return utils._createWebsiteClient(cli.category('account').getCurrentSubscription(subscription), log);
  }
};