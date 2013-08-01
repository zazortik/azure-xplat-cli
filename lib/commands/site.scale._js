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
var interaction = require('../util/interaction');

exports.init = function (cli) {

  var log = cli.output;
  var site = cli.category('site');
  var siteScale = site.category('scale')
    .description('Commands to manage your Web Site scaling');

  siteScale.command('mode [mode] [name]')
    .description('Sets the web site mode')
    .usage('[options] <mode> [name]')
    .option('--mode <mode>', 'The mode of the site (available are: free, shared and standard)')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (mode, name, options, _) {
      if (options.mode) {
        name = mode;
        mode = undefined;
      }

      var params = utils.normalizeParameters({
        mode: [mode, options.mode]
      });

      if (params.err) { throw params.err; }

      mode = interaction.chooseIfNotGiven(cli, 'Mode: ', 'Getting modes', params.values.region,
          function (cb) {
            cb(null, [ 'Free', 'Shared', 'Standard' ]);
          }, _);

      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = {};

      var service = createWebsiteManagementService(context.subscription);

      switch(mode.toLowerCase()) {
      case 'free':
        siteConfigurations.ComputeMode = 'Shared';
        siteConfigurations.SiteMode = 'Limited';
        break;
      case 'shared':
        siteConfigurations.ComputeMode = 'Shared';
        siteConfigurations.SiteMode = 'Basic';
        break;
      case 'standard':
        try {
          service.getServerFarm(context.site.webspace, 'DefaultServerFarm', _);
        } catch (err) {
          if (err && err.code === 'NotFound') {
            service.createServerFarm(context.site.webspace,
              'DefaultServerFarm',
              1,
              'Small',
              _);
          } else {
            throw err;
          }
        }

        siteConfigurations.ComputeMode = 'Dedicated';
        siteConfigurations.ServerFarm = 'DefaultServerFarm';
        siteConfigurations.SiteMode = 'Basic';
        break;
      default:
        throw new Error('Valid modes are: \'free\', \'shared\' and \'standard\'');
      }

      var progress = cli.progress('Updating a site configuration');
      try {
        service.updateSite(context.site.webspace, context.site.name, siteConfigurations, _);
      } finally {
        progress.end();
      }
    });

  siteScale.command('instances [instances] [name]')
    .description('Sets the web site number of instances')
    .usage('[options] <instances> [size] [name]')
    .option('--instances <instances>', 'The number of instances')
    .option('--size <size>', 'The size of the instances (available are: small, medium and large)')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (instances, name, options, _) {
      if (options.instances) {
        name = instances;
        instances = undefined;
      }

      var params = utils.normalizeParameters({
        instances: [instances, options.instances]
      });

      if (params.err) { throw params.err; }

      instances = interaction.promptIfNotGiven(cli, 'Number of instances: ', params.values.instances, _);

      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      var service = createWebsiteManagementService(context.subscription);

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteGet(context, _);

      if (siteConfigurations.ComputeMode !== 'Dedicated') {
        throw new Error('Instances can only be changed for sites in standard mode');
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
          throw new Error('Available instance sizes are: Small, Medium or Large');
        }
      }

      var progress = cli.progress('Updating a server farm');
      try {
        service.updateServerFarm(context.site.webspace,
          siteConfigurations.ServerFarm,
          instances,
          options.size !== undefined ? options.size : 'Small',
          _);
      } finally {
        progress.end();
      }
    });

  function createWebsiteManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    return utils.createWebsiteManagementService(subscriptionId, account, log);
  }
};