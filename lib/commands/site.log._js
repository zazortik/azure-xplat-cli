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

var fs = require('fs');
var path = require('path');
var interaction = require('../util/interaction');

var utils = require('../util/utils');

var WebsitesClient = require('./websites/websitesclient');

exports.init = function (cli) {

  var log = cli.output;
  var site = cli.category('site');
  var scm = site.category('deployment');
  var diagnostic = site.category('log')
    .description('Commands to manage your Web Site diagnostics');

  diagnostic.command('download [name]')
    .description('Download diagnostic log')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('-o, --output <path>', 'output path, default is local folder')
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        path: options.output || '',
        site: {
          name: name
        }
      };

      if (!(/[.]zip$/i.test(context.path))) {
        context.path = path.join(context.path, 'diagnostics.zip');
      }

      if (utils.pathExistsSync(context.path)) {
        if (!site.confirm('Replace existing ' + context.path + '?  (y/n) ', _)) {
          return;
        }
      }

      var repositoryUri = site.ensureRepositoryUri(context, _);
      if (repositoryUri) {
        var buf = doDownloadDiagnostic(context, _);
        log.info('Writing to ' + context.path);
        fs.writeFile(context.path, buf, _);
      } else {
        log.error('Repository is not setup');
      }
    });

  diagnostic.command('tail [name]')
    .description('Live diagnostic log')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('-p, --path <path>', 'the log path under LogFiles folder')
    .option('-f, --filter <filter>', 'filter matching line')
    .option('--log', 'Write output as log data')
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        path: options.path || '',
        filter: options.filter || '',
        site: {
          name: name
        }
      };

      var repositoryUri = site.ensureRepositoryUri(context, _);
      if (repositoryUri) {
        var buf = doLogStream(context, _, function (err, line) {
          if (options.log) {
            log.data('data: ', line);
          } else {
            process.stdout.write(line);
          }
        });
        log.info(buf);
      } else {
        log.error('Repository is not setup');
      }
    });

  diagnostic.command('config [name]')
    .description('Live diagnostic log')
    .option('-a, --application <application>', 'Use this flag to enable application diagnostics. True or false are accepted.')
    .option('-o, --output <output>', 'Takes file or storage. When -a is specified, use this parameter to specify the output of the log.')
    .option('-l, --level <level>', 'Takes error, warning, verbose or info. When -a is specified, use this parameter to specify the log level. But default is error.')
    .option('-sa, --storageAccount <storageAccount>', 'Use this parameter to specify the storage account where the log will be stored.')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, _) {
      var serviceManagement = createServiceManagementService(options.subscription);

      if (options.application !== undefined) {
        options.application = options.application.toLowerCase();
        if (options.application !== 'true' &&
          options.application !== 'false') {

          throw new Error('Invalid application status');
        }

        options.output = interaction.chooseIfNotGiven(cli, 'Output: ', 'Getting output options', options.output,
            function (cb) {
              return cb(null, [ 'file', 'storage' ]);
            }, _);

        if (options.output === 'storage') {
          options.storageAccount = interaction.chooseIfNotGiven(cli, 'Storage account: ', 'Getting storage accounts', options.storageAccount,
              function (cb) {
                utils.doServiceManagementOperation(serviceManagement, 'listStorageAccounts', function (err, accounts) {
                  if (err) { return cb(err); }

                  cb(null, accounts.body.map(function (a) {
                    return a.ServiceName;
                  }));
                });
              }, _);
        }

        if (options.level) {
          options.level = options.level.toLowerCase();
          if (options.level !== 'error' &&
            options.level !== 'warning' &&
            options.level !== 'verbose' &&
            options.level !== 'info') {

            throw new Error('Invalid error level');
          }
        } else {
          // Default is error
          options.level = 'error';
        }

        var websitesClient = new WebsitesClient(cli, options.subscription);
        if (options.application === 'true') {
          websitesClient.enableApplicationDiagnostic(name, options.output, { level: options.level, storageAccount: options.storageAccount }, _);
        } else if (options.application === 'false') {
          websitesClient.disableApplicationDiagnostic(name, options.output, { level: options.level, storageAccount: options.storageAccount }, _);
        }
      }
    });

  function createServiceManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    return utils.createServiceManagementService(subscriptionId, account, log);
  }

  function doDownloadDiagnostic(context, _) {
    var channel = scm.getScmChannel(context)
                    .path('dump');
    var progress = cli.progress('Downloading diagnostic log');
    try {
      return channel.GET(_);
    } finally {
      progress.end();
    }
  }

  function doLogStream(context, _, chunkcb) {
    var channel = scm.getScmChannel(context)
                        .path('logstream');
    if (context.path) {
      channel = channel.path(context.path);
    }
    if (context.filter) {
      channel = channel.query('filter', context.filter);
    }

    return channel.GET(_, chunkcb);
  }
};
