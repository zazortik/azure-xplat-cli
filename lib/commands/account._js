//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
'use strict';

/* jshint unused: false */

var __ = require('underscore');
var util = require('util');

var profile = require('../util/profile');
var utils = require('../util/utils');

var $ = utils.getLocaleString;

var AccountClient = require('./account/accountclient');

exports.init = function (cli) {
  var log = cli.output;

  var account = cli.category('account')
    .description($('Commands to manage your account information and publish settings'));

  var accountClient = new AccountClient(cli);

  account.command('download')
    .description($('Launch a browser to download your publishsettings file'))
    .option('-e, --environment <environment>', $('the publish settings download environment'))
    .option('-r, --realm <realm>', $('the organization\'s realm'))
    .execute(function (options, _) {
      var url = profile.current.getEnvironment(options.environment).getPublishingProfileUrl(options.realm);
      cli.interaction.launchBrowser(url, _);
      log.help($('Save the downloaded file, then execute the command'));
      log.help($('  account import <file>'));
    });

  account.command('list')
    .description($('List the imported subscriptions'))
    .execute(function (options, _) {
      var subscriptions = __.values(profile.current.subscriptions);

      log.table(subscriptions, function (row, s) {
        row.cell($('Name'), s.name);
        row.cell($('Id'), s.id);
        row.cell($('Current'), s.isDefault);
      });
    });

  account.command('set <subscription>')
    .description($('Set the current subscription'))
    .execute(function (subscription, options, _) {
      var newSubscription = profile.current.getSubscription(subscription);
      if (!newSubscription) {
        throw new Error(util.format($('Invalid subscription "%s"'), subscription));
      }
      log.info(util.format($('Setting subscription to "%s"'), subscription));
      profile.current.currentSubscription = newSubscription;
      profile.current.save();
      log.info($('Changes saved'));
    });

  account.command('import <file>')
    .description($('Import a publishsettings file or certificate for your account'))
    .option('--skipregister', $('skip registering resources'))
    .execute(function (file, options, _) {
      profile.current.importPublishSettings(file);
      profile.current.save();
    });

  account.command('clear')
    .description($('Remove a subscription or environment, or clear all of the stored account and environment info'))
    .option('-s --subscription <subscriptionNameOrId>', $('Subscription name or id to remove'))
    .option('-e --environment <environmentName>', $('Environment name to remove'))
    .option('-q --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (options, _) {
      var matchSubscription = function () { return false; };
      var matchEnvironment = function () { return false; };
      var clearAll = false;

      if(!options.subscription && !options.environment) {
        clearAll = true;
        var shouldClear = options.quiet || cli.interaction.confirm($('This will clear all account information. Are you sure? '), _);
        if (!shouldClear) {
          return;
        }
        matchSubscription = function () { return true; };
        matchEnvironment = function () { return true; };
      } else {
        if (options.subscription) {
          matchSubscription = function (s) {
            return s.id === options.subscription || utils.ignoreCaseEquals(s.name, options.subscription);
          };
        }
        if (options.environment) {
          matchEnvironment = function (e) {
            return utils.ignoreCaseEquals(e.name, options.environment);
          };
        }
      }

      __.values(profile.current.subscriptions)
        .filter(matchSubscription)
        .forEach(function (subscription) {
          profile.current.deleteSubscription(subscription.name);
        });

      __.values(profile.current.environments)
        .filter(matchEnvironment)
        .forEach(function (env) {
          profile.current.deleteEnvironment(env.name);
        });

      profile.current.save();
      if (clearAll) {
        profile.clearAzureDir();
      }
    });

  cli.command('login')
    .description($('Log in to an Azure subscription using Active Directory'))
    .option('-e --environment [environment]', $('Environment to authenticate against, must support active directory'))
    .option('-u --user <username>', $('user name, will prompt if not given'))
    .option('-p --password <password>', $('user password, will prompt if not given'))
    .option('-q --quiet', $('do not prompt for confirmation of PII storage'))
    .execute(function(options, _) {

      var piiWarningText = $('If you choose to continue, Azure command-line interface will cache your ' +
        'authentication information. Note that this sensitive information will be stored in ' +
        'plain text on the file system of your computer at %s. Ensure that you take suitable ' +
        'precautions to protect your computer from unauthorized access in order minimize the ' +
        'risk of that information being disclosed.' +
        '\nDo you wish to continue: (y/n) ');

      var environmentName = options.environment || 'AzureCloud';
      var environment = profile.current.getEnvironment(environmentName);
      if (!environment) {
        throw new Error(util.format($('Unknown environment %s'), environmentName));
      }

      if (!options.hasOwnProperty('password')) {
        options.password = undefined;
      }

      var username = cli.interaction.promptIfNotGiven('Username: ', options.user, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);

      var haveSeenBefore = __.values(profile.current.subscriptions).some(function (s) {
        return utils.ignoreCaseEquals(username, s.username);
      });

      if (!options.quiet && !haveSeenBefore) {
        if (!cli.interaction.confirm(util.format(piiWarningText, profile.defaultProfileFile), _)) {
          log.info($('Login cancelled'));
          return;
        }
      }

      var progress = cli.interaction.progress($('Authenticating...'));
      try {
        var newSubscriptions = environment.addAccount(username, password, _);
        if (newSubscriptions.length > 0) {
          newSubscriptions[0].isDefault = true;

          newSubscriptions.forEach(function (s) {
            profile.current.addSubscription(s);
            log.info(util.format($('Added subscription %s'), s.name));
            if (s.isDefault) {
              log.info(util.format($('Setting subscription %s as default'), s.name));
            }
          });
          profile.current.save();
        } else {
          log.info(util.format($('No subscriptions found for this login')));
        }
      } finally {
        progress.end();
      }
    });

  cli.command('logout [username]')
    .description($('Log out from Azure subscription using Active Directory'))
    .option('-u --username <username>', $('Required. User name used to log out from Azure Active Directory.'))
    .execute(function (username, options, _) {
    if (!username){
      return cli.missingArgument('username');
    }
    if (profile.current.logoutUser(username)) {
      profile.current.save();
      log.info($('You have logged out.'));
    } else {
      log.info(util.format($('You are not logging in as \'%s\'. Quitting.'), username));
    }
  });

  account.registerResourceType = function (resourceName) {
    return accountClient.registerResourceType(resourceName);
  };

  account.knownResourceTypes = function () {
    return accountClient.knownResourceTypes();
  };
};
