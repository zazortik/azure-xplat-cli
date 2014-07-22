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

var pagingUtils = require('./pagingUtils._js');
var profile = require('../../../util/profile');
var policyClientWorkaround = require('../role/policyClientWorkaround');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var ad = cli.category('ad')
    .description($('Commands to display active directory objects'));
  var adGroup = ad.category('group')
    .description($('Commands to display active directory groups'));

  adGroup.command('list')
    .description($('Get all active directory groups in current subscription\' tenant'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing active directory groups'));
      var groups;
      try {
        groups = pagingUtils.getGraphObjects(client, 'group', _);
      } finally {
        progress.end();
      }

      displayGroups(groups, cli, log);
    });

  adGroup.command('get [name] [mail] [principal]')
    .description($('Get an active directory group'))
    .option('-n --name <name>', $('the group display name'))
    .option('-m --mail <mail>', $('the mail name'))
    .option('-p --principal <principal>', $('Name of principle whose groups to return. Accept the UPN or object id.'))
    .execute(function (name, mail, principal, options, _) {
      //TODO: validate arguments
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting group list'));
      var groupIds;
      try {
        groupIds = client.user.getMemberGroups({
          objectId: principal,
          securityEnabledOnly: false
        }, _).objectIds;
      } finally {
        progress.end();
      }
      
      var groups = [];
      if (groupIds && groupIds.length > 0) {
        progress = cli.interaction.progress($('Getting groups details'));
        try{
          for (var i = 0; i < groupIds.length; i++){
            var group = client.group.get(groupIds[i], _).group;
            groups.push(group);
          }
        } finally {
          progress.end();
        }

        displayGroups(groups, cli, log);
      } else {
        log.data($('No matching group was found'));
      }
    });
};

function displayGroups(groups, cli, log) {
  cli.interaction.formatOutput(groups, function (data) {
    if (data.length === 0) {
      log.info($('No groups'));
    } else {
      log.table(data, function (row, group) {
        row.cell($('Id'), group.objectId);
        row.cell($('Display Name'), group.displayName);
        row.cell($('Mail'), group.main);
      });
    }
  });
}