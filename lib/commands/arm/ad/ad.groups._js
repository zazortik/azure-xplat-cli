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

var adUtils = require('./adUtils._js');
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
      try {
        adUtils.listGraphObjects(client, 'group', log, _);
      } finally {
        progress.end();
      }
    });

  adGroup.command('get [name] [mail] [principal]')
    .description($('Get active directory groups'))
    .option('-n --name <name>', $('the group display name'))
    .option('-m --mail <mail>', $('the mail name'))
    .option('-p --principal <principal>', $('Name of principle whose groups to return. Accept the UPN or object id.'))
    .execute(function (name, mail, principal, options, _) {
      if (!name && !mail && !principal) {
        throw new Error($('Missing parameter value needed to retrieve matched groups'));
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting group list'));
      
      var groups;
      try {
        if (principal) {
          groups = getMemberGroups(client, principal, _);
        } else {
          groups = getSpecificGroups(client, mail, name, _);
        }
      } finally {
        progress.end();
      }

      if (groups.length > 0) {
        adUtils.displayGroups(groups, log);
      } else {
        log.data($('No matching group was found'));
      }
    });

  adGroup.command('members [name]')
    .description($('Get an active directory group'))
    .option('-n --name <name>', $('the group display name'))
    .execute(function (name, options, _) {
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = policyClientWorkaround.getADGraphClient(subscription);
      var groups;

      var progress = cli.interaction.progress($('Getting group informations'));
      try {
        groups = getSpecificGroups(client, '', name, _);
      } finally {
        progress.end();
      }

      if (groups.length === 0) {
        log.data($('No matching group was found'));
        return;
      }

      var group = groups[0];
      progress = cli.interaction.progress($('Getting group members'));
      try {
        adUtils.listGroupMembers(client, group.objectId, log, _);
      } finally {
        progress.end();
      }
  });
};

function getMemberGroups(client, principal, _) {
  var groupIds = client.user.getMemberGroups({
    objectId: principal,
    securityEnabledOnly: false
  }, _).objectIds;

  var graphQueryResult = client.objects.getObjectsByObjectIds({ ids: groupIds, types: ['group'] }, _);
  var groups = graphQueryResult.aADObject;
  return groups;
}

function getSpecificGroups(client, mail, displayName, _) {
  return client.group.list(mail, displayName, _).groups;
}