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

exports.init = function (cli) {
  var log = cli.output;

  var account = cli.category('account');
  var affinityGroup = account.category('affinity-group')
    .description($('Commands to manage your Affinity Groups'));

  affinityGroup.command('list')
    .description($('List affinity groups available for your account'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, callback) {
      account.listLAG('AffinityGroups', options, callback);
    });

  affinityGroup.command('create <name>')
    .description($('Create an affinity group'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .option('-l, --location <name>', $('the data center location'))
    .option('-e, --label <label>', $('the affinity group label'))
    .option('-d, --description <description>', $('the affinity group description'))
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var affinityGroupOptions = {
        Label: options.label,
        Description: (typeof options.description === 'string' ? options.description : undefined),
        Location: options.location
      };

      var progress = cli.interaction.progress($('Creating affinity group'));
      utils.doServiceManagementOperation(channel, 'createAffinityGroup', name, affinityGroupOptions, function (error) {
        progress.end();

        callback(error);
      });
    });

  affinityGroup.command('show <name>')
    .description($('Show details about an affinity group'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var progress = cli.interaction.progress($('Getting affinity groups'));
      utils.doServiceManagementOperation(channel, 'getAffinityGroup', name, function(error, response) {
        progress.end();
        if (!error) {
          delete response.body['@']; // skip @ xmlns and @ xmlns:i
          if (log.format().json) {
            log.json(response.body);
          } else {
            utils.logLineFormat(response.body, log.data);
          }
        }
        callback(error);
      });
    });

  affinityGroup.command('delete <name>')
    .description($('Delete an affinity group'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete affinity group %s? [y/n] '), name), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Deleting affinity group'));
      try {
        utils.doServiceManagementOperation(channel, 'deleteAffinityGroup', name, _);
      } finally {
        progress.end();
      }
    });
};