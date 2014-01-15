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

var util = require('util');
var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var log = cli.output;
  var site = cli.category('site');

  var repository = site.category('repository')
    .description($('Commands to manage your Web Site repositories'));

  repository.command('branch <branch> [name]>')
    .usage('[options] <branch> [name]')
    .description($('Set your repository branch'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(branch, name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        settingKey: 'branch',
        settingValue: branch,
        site: { name: name }
      };

      var repositoryUri = site.ensureRepositoryUri(context, _);
      if (repositoryUri) {
        doSettingsSet(context, _);
      } else {
        log.error($('Repository is not setup'));
      }
    });

  repository.command('delete [name]')
    .usage('[options] [name]')
    .description($('Delete your repository'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      var repositoryUri = site.ensureRepositoryUri(context, _);
      if (repositoryUri) {
        if (!options.quiet && !site.confirm($('Delete repository? [y/n] '), _)) {
          return;
        }

        doDeleteRepository(context, _);
        site.doRepositoryDelete(context, _);
      } else {
        log.error($('Repository is not setup'));
      }
    });

  repository.command('sync [name]')
    .usage('[options] [name]')
    .description($('Sync your repository'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      var repositoryUri = site.ensureRepositoryUri(context, _);
      if (repositoryUri) {
        site.doRepositorySync(context, _);
      } else {
        log.error($('Repository is not setup'));
      }
    });


  function doSettingsGet(context, _) {
    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, log);
    var progress = cli.interaction.progress($('Getting repository settings'));
    try {
      if (context.settingKey !== undefined) {
        return service.getSetting(context.settingKey, _);
      } else {
        return service.listSettings(_);
      }
    } finally {
      progress.end();
    }
  }

  repository.doSettingsGet = doSettingsGet;

  function doSettingsSet(context, _) {
    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, log);
    var progress = cli.interaction.progress(util.format($('Setting %s to %s'), context.settingKey, context.settingValue));
    try {
      return service.setSetting(context.settingKey, context.settingValue, _);
    } finally {
      progress.end();
    }
  }

  function doDeleteRepository(context, _) {
    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, log);
    var progress = cli.interaction.progress($('Deleting repository files'));
    try {
      return service.deleteRepository(_);
    } finally {
      progress.end();
    }
  }
};
