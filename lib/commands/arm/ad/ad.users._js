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
var adUtils = require('./adUtils');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var util = require('util');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  var ad = cli.category('ad')
    .description($('Commands to display Active Directory objects'));
  var adUser = ad.category('user')
    .description($('Commands to display Active Directory users'));

  adUser.command('list')
    .description($('Get all Active Directory users in current subscription\'s tenant'))
    .option('| more', $('Provides paging support. Press \'Enter\' for more information.'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing Active Directory users'));
      try {
        adUtils.listGraphObjects(client, 'user', cli.interaction, log, _);
      } finally {
        progress.end();
      }
    });

  adUser.command('show')
    .description($('Get an Active Directory user'))
    .option('--upn <upn>', $('the principal name of the user to return'))
    .option('--objectId <objectId>', $('the object id of the user to return'))
    .option('--search <search>', $('search users with display name starting with the provided value'))
    .execute(function (options, _) {
      var upn = options.upn,
          objectId = options.objectId,
          search = options.search;

      adUtils.validateParameters({
        upn: upn,
        objectId: objectId,
        search: search
      });
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting Active Directory user'));
      var users = [];
      var parameters = null;
      try {
        if (upn) {
          parameters = { filter: 'userPrincipalName eq \'' + upn + '\'' };
          users = client.userOperations.list(parameters, _);
        } else if (objectId) {
          var user = client.userOperations.get(objectId, _);
          if (user) {
            users.push(user);
          }
        } else {
          parameters = { filter: 'startswith(displayName,\'' + search + '\')' };
          users = client.userOperations.list(parameters, _);
        }
      } finally {
        progress.end();
      }

      if (users.length > 0) {
        adUtils.displayUsers(users, cli.interaction, log);
      } else {
        log.error($('No matching user was found'));
      }
    });

  adUser.command('delete [upn]')
    .description($('Deletes Active Directory user'))
    .usage('[options] <upn>')
    .option('--upn <upn>', $('the principal name of the user'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (upn, options, _) {
      if (!upn) {
        return cli.missingArgument('upn');
      }

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete user %s? [y/n] '), upn), _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress(util.format($('Deleting user: %s'), upn));
      try {
        client.userOperations.deleteMethod(upn, _);
      } finally {
        progress.end();
      }
    });

  adUser.command('create [upn] [display-name] [mail-nickname] [password]')
    .description($('Create Active Directory user (work or school account. Also known as org-id).'))
    .usage('[options] <upn> <display-name> <mail-nickname> <password>')
    .option('-u --upn <upn>', $('the user principal name. example - \'someuser@contoso.com\''))
    .option('-d --display-name <display-name>', $('the name to display in the address book for the user. example \'Alex Wu\''))
    .option('-m --mail-nickname <mail-nickname>', $('the mail alias for the user. example: \'Alexw\''))
    .option('-p --password <password>', $('The password for the user. It must meet the tenant\'s password complexity requirements. It is recommended to set a strong password.'))
    .option('-f --force-change-password-next-login <force-change-password-next-login>', $('true if the user must change his/her password on the next login; otherwise false. Default: false.'))
    .execute(function (upn, displayName, mailNickname, password, options, _) {
      if (!upn) {
        return cli.missingArgument('upn');
      }

      if (!displayName) {
        return cli.missingArgument('display-name');
      }

      if (!mailNickname) {
        return cli.missingArgument('mail-nickname');
      }

      if (!password) {
        return cli.missingArgument('password');
      }
      var forceChangePasswordNextLogin = false;
      if (options.forceChangePasswordNextLogin && options.forceChangePasswordNextLogin.toLowerCase() === 'true') {
        forceChangePasswordNextLogin = true;
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);

      var userParams = {
        accountEnabled: true,
        userPrincipalName: upn,
        displayName: displayName,
        mailNickname: mailNickname,
        passwordProfile: {
          password: password,
          forceChangePasswordNextLogin: forceChangePasswordNextLogin
        }
      };
      var user = withProgress(util.format($('Creating Active Directory user: \'%s\'.'), upn),
      function (log, _) {
        return client.userOperations.create(userParams, _);
      }, _);
      cli.interaction.formatOutput(user, function (data) {
        if (data) {
          adUtils.displayAUser(data, log, true);
        }
      });
    });

  var adMemberGroups = adUser.category('memberGroups')
    .description($('Commands to display member groups of the Active Directory user.'));

  adMemberGroups.command('list [objectId]')
    .description($('Provides a lit of Object IDs of the groups of which the user is a member.'))
    .usage('[options] <objectId>')
    .option('--objectId <objectId>', $('the objectId of the user'))
    .option('-e --securityEnabledOnly <securityEnabledOnly>', $('If true, only membership in security enabled groups will be checked. Otherwise membership in all groups will be checked. Default: false'))
    .execute(function (objectId, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      if (!objectId) {
        return cli.missingArgument('mail-nickname');
      }
      var securityEnabledOnly = false;
      if (options.securityEnabledOnly && options.securityEnabledOnly.toLowerCase() === 'true') {
        securityEnabledOnly = true;
      }

      var groups = withProgress($('Getting member Group objectIds for the user: ' + objectId),
      function (log, _) {
        return client.userOperations.getMemberGroups (objectId, securityEnabledOnly, _);
      }, _);
      cli.interaction.formatOutput(groups, function (data) {
        if (data.length === 0) {
          log.info($('No member groups found.'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Group-ObjectId'), item);
          });
        }
      });
    });
};