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
var adUtils = require('./adUtils');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var ad = cli.category('ad')
    .description($('Commands to display Active Directory objects'));
  var adGroup = ad.category('group')
    .description($('Commands to display Active Directory groups'));

  adGroup.command('list')
    .description($('Get Active Directory groups in current subscription\'s tenant'))
    .option('| more', $('Provides paging support. Press \'Enter\' for more information.'))
    .execute(function (objectId, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing Active Directory groups'));
      try {
        adUtils.listGraphObjects(client, 'group', cli.interaction, log, _);
      } finally {
        progress.end();
      }
    });

  adGroup.command('show')
    .description($('Get Active Directory groups'))
    .option('-o --objectId <objectId>', $('the object Id of the group to return'))
    .option('-c --search <search>', $('Search by display name which starts with the provided value'))
    .execute(function (options, _) {
      var objectId = options.objectId,
          search = options.search;

      adUtils.validateParameters({
        objectId: objectId,
        search: search
      });

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting group list'));
      
      var groups;
      try {
        groups = getSpecificGroups(client, objectId, search, _);
      } finally {
        progress.end();
      }

      if (groups.length > 0) {
        adUtils.displayGroups(groups, cli.interaction, log);
      } else {
        log.data($('No matching group was found'));
      }
    });

  adGroup.command('create [display-name] [mail-nickname]')
    .description($('Creates an Active Directory group in the tenant.'))
    .usage('[options] <display-name> <mail-nickname>')
    .option('-d --display-name <display-name>', $('The name to display in the address book for the group.'))
    .option('-m --mail-nickname <mail-nickname>', $('The mail alias for the group.'))
    .execute(function (displayName, mailNickname, options, _) {
      if (!displayName) {
        return cli.missingArgument('display-name');
      }

      if (!mailNickname) {
        return cli.missingArgument('mail-nickname');
      }
      
      // We are hardcoding mailEnabled to false and securityEnabled to true. This is because,
      // the doc https://msdn.microsoft.com/en-us/library/azure/ad/graph/api/groups-operations#CreateGroup
      // says so. It makes no sense to expose them to the users if they always need to have those values.
      var parameters = {
        displayName: displayName,
        mailNickname: mailNickname,
        mailEnabled: false,
        securityEnabled: true
      };

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Creating group.'));
      var group;
      try {
        group = client.groups.create(parameters, _);
      } finally {
        progress.end();
      }

      if (group) {
        adUtils.displayAGroup(group, log, false);
      }
    });

  adGroup.command('delete [objectId]')
    .description($('Deletes an Active Directory group.'))
    .usage('[options] <objectId>')
    .option('-o --objectId <objectId>', $('the object Id of the group to delete'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (objectId, options, _) {

      adUtils.validateParameters({
        objectId: objectId
      });

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete group \'%s\' ? [y/n] '), objectId), _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Deleting group with objectId: ' + objectId));
      
      try {
        client.groups.deleteMethod(objectId, _);
      } finally {
        progress.end();
      }
    });

  var adGroupMember = adGroup.category('member')
    .description($('Commands to provide an Active Directory sub group or member info'));

  adGroupMember.command('list [objectId]')
    .description($('Provides an Active Directory sub group or member info'))
    .option('-o --objectId <objectId>', $('Object id of group whose members to return.'))
    .execute(function (objectId, options, _) {
      if (!objectId) {
        return cli.missingArgument('objectId');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);

      var progress = cli.interaction.progress($('Getting group members'));
      try {
        adUtils.listGroupMembers(client, objectId, cli.interaction, log, _);
      } finally {
        progress.end();
      }
  });
};

function getSpecificGroups(client, objectId, search, _) {
  if (search) {
    var parameters = { filter: 'startswith(displayName,\'' + search + '\')' };
    return client.groups.list(parameters, _);
  } else {
    var group = client.groups.get(objectId, _);
    return group ? [group] : [];
  }
}