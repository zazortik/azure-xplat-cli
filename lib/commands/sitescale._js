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

var url = require('url');
var Channel = require('../channel');

var utils = require('../utils');
var interaction = require('../util/interaction');

var js2xml = require('../util/js2xml');

exports.init = function (cli) {

  var log = cli.output;
  var site = cli.category('site');
  var siteScale = site.category('scale')
    .description('Commands to manage the scale of your site');

  function getChannel() {
    var account = cli.category('account');
    var managementEndpoint = url.parse(utils.getManagementEndpointUrl(account.managementEndpointUrl()));
    var pem = account.managementCertificate();
    var host = managementEndpoint.hostname;
    var port = managementEndpoint.port;

    var channel = new Channel({
      host: host,
      port: port,
      key: pem.key,
      cert: pem.cert
    }).header('x-ms-version', '2011-02-25');

    var proxyString =
            process.env.HTTPS_PROXY ||
            process.env.https_proxy ||
            process.env.ALL_PROXY ||
            process.env.all_proxy;

    if (proxyString !== undefined) {
      var proxyUrl = url.parse(proxyString);
      if (proxyUrl.protocol !== 'http:' &&
                proxyUrl.protocol !== 'https:') {
        // fall-back parsing support XXX_PROXY=host:port environment variable values
        proxyUrl = url.parse('http://' + proxyString);
      }

      channel = channel.add({ proxy: proxyUrl });
    }

    return channel;
  }

  siteScale.command('mode [name] <siteMode>')
    .description('Sets the web site mode')
    .usage('[name] <mode>')
    .option('--mode <siteMode>', 'The mode of the site (available are: free, shared and reserved)')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, siteMode, options, _) {
      var params = utils.normalizeParameters({
        siteMode: [siteMode, options.siteMode]
      });

      if (params.err) { throw params.err; }

      siteMode = interaction.promptPasswordIfNotGiven(cli, "Site mode", params.values.siteMode, _);

      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: {
          name: name
        }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = { '@': {
          'xmlns': 'http://schemas.microsoft.com/windowsazure',
          'xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'
        }
      };

      switch(siteMode.toLowerCase()) {
      case 'free':
        siteConfigurations.ComputeMode = 'Shared';
        siteConfigurations.SiteMode = 'Limited';
        break;
      case 'shared':
        siteConfigurations.ComputeMode = 'Shared';
        siteConfigurations.SiteMode = 'Basic';
        break;
      case 'reserved':
        serverFarm = siteScale.doServerFarmGet('DefaultServerFarm', context, _);
        if (!serverFarm) {
          // Start by creating server farm
          var serverFarm = {
            '@': {
              'xmlns': 'http://schemas.microsoft.com/windowsazure',
              'xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'
            },
            Name: 'DefaultServerFarm',
            NumberOfWorkers: 1,
            WorkerSize: 'Small'
          };

          siteScale.doServerFarmPost(serverFarm, context, _);
        }

        siteConfigurations.ComputeMode = 'Dedicated';
        siteConfigurations.ServerFarm = 'DefaultServerFarm';
        siteConfigurations.SiteMode = 'Basic';
        break;
      default:
        throw new Error('Valid modes are: \'free\', \'shared\' and \'reserved\'');
      }

      site.doSitePUT(siteConfigurations, context, _);
    });

  siteScale.command('instances [name] <instances> [size]')
    .description('Sets the web site number of instances')
    .usage('[name] <instances> [size]')
    .option('--instances <instances>', 'The number of instances')
    .option('--size <size>', 'The size of the instances (available are: small, medium and large)')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, instances, size, options, _) {
      var params = utils.normalizeParameters({
        instances: [instances, options.instances],
        size: [size, options.size]
      });

      if (params.err) { throw params.err; }

      instances = interaction.promptPasswordIfNotGiven(cli, "Number of instances", params.values.instances, _);

      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: {
          name: name
        }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteGet(context, _);

      if (siteConfigurations.ComputeMode !== 'Dedicated') {
        throw new Error('Instances can only be changed for sites in reserved mode');
      }

      if (size !== undefined) {
        switch (size.toLowerCase()) {
        case 'small':
          size = 'Small';
          break;
        case 'medium':
          size = 'Medium';
          break;
        case 'large':
          size = 'Large';
          break;
        default:
          throw new Error('Available instance sizes are: Small, Medium or Large');
        }
      }

      var serverFarm = {
        '@': {
          'xmlns': 'http://schemas.microsoft.com/windowsazure',
          'xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'
        },
        Name: siteConfigurations.ServerFarm,
        NumberOfWorkers: instances,
        WorkerSize: size != undefined ? size : 'Small'
      };

      siteScale.doServerFarmPut(serverFarm, context, _);
    });

  siteScale.doServerFarmPost = function (serverFarm, options, _) {
    var progress = cli.progress('Creating a server farm');

    if (!serverFarm.ServerFarm) {
      serverFarm = { ServerFarm: serverFarm };
    }

    var xmlConfig = js2xml.serialize(serverFarm);

    try {
      getChannel()
        .path(options.subscription)
        .path('services')
        .path('webspaces')
        .path(options.site.webspace)
        .path('serverfarms')
        .header('Content-Type', 'application/xml')
        .POST(function (req) {
          req.write(xmlConfig);
          req.end();
        }, _);
    } finally {
      progress.end();
    }
  };

  siteScale.doServerFarmPut = function (serverFarm, options, _) {
    var progress = cli.progress('Updating a server farm');

    if (!serverFarm.ServerFarm) {
      serverFarm = { ServerFarm: serverFarm };
    }

    var xmlConfig = js2xml.serialize(serverFarm);

    try {
      getChannel()
        .path(options.subscription)
        .path('services')
        .path('webspaces')
        .path(options.site.webspace)
        .path('serverfarms')
        .path(serverFarm.ServerFarm.Name)
        .PUT(function (req) {
          req.write(xmlConfig);
          req.end();
        }, _);
    } finally {
      progress.end();
    }
  };

  siteScale.doServerFarmGet = function (serverFarmName, options, _) {
    var progress = cli.progress('Locating a server farm');

    try {
      return getChannel()
        .path(options.subscription)
        .path('services')
        .path('webspaces')
        .path(options.site.webspace)
        .path('serverfarms')
        .path(serverFarmName)
        .GET(_);
    } catch (e) {
      return null;
    } finally {
      progress.end();
    }
  };
};
