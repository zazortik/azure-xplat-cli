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
var wrap = require('wordwrap').hard(0, 75);

var adalAuth = require('../util/authentication/adalAuth');
var tokenCache = adalAuth.tokenCache;
var profile = require('../util/profile');
var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  cli.command('login [username]')
    .description($('Log in to an Azure subscription using Active Directory. Currently, the user can login only via Microsoft organizational account'))
    .option('-u --username <username>', $('user name or service principal ID, will prompt if not given'))
    .option('-e --environment [environment]', $('Environment to authenticate against, must support active directory'))
    .option('-p --password <password>', $('user password or service principal key, will prompt if not given'))
    .option('--service-principal', $('If given, log in as a service principal rather than a user'))
    .option('--tenant <tenant>', $('Tenant domain or ID to log into. Used for login as service principal or parnter user'))
    .option('-q --quiet', $('do not prompt for confirmation of PII storage'))
    .execute(function(username, options, _) {

      var piiWarningText = wrap($('If you choose to continue, Azure command-line interface will cache your ' +
        'authentication information. Note that this sensitive information will be stored in ' +
        'plain text on the file system of your computer at %s. Ensure that you take suitable ' +
        'precautions to protect your computer from unauthorized access in order to minimize the ' +
        'risk of that information being disclosed.' +
        '\nDo you wish to continue: (y/n) '));

      var environmentName = options.environment || 'AzureCloud';
      var environment = profile.current.getEnvironment(environmentName);
      if (!environment) {
        throw new Error(util.format($('Unknown environment %s'), environmentName));
      }

      if (!options.hasOwnProperty('password')) {
        options.password = undefined;
      }

      var supportedLoginTypeText = $('Please note that currently you can login only via Microsoft organizational account or service principal. ' +
        'For instructions on how to set them up, please read http://aka.ms/Dhf67j.');
      log.warn(supportedLoginTypeText);

      username = cli.interaction.promptIfNotGiven('Username: ', username, _);

      var tenant = options.tenant;
      if (options.servicePrincipal) {
          tenant = cli.interaction.promptIfNotGiven('Tenant: ', options.tenant, _);
      }

      if (!tokenCache.isSecureCache) {
        var haveSeenBefore = __.values(profile.current.subscriptions).some(function (s) {
          return utils.ignoreCaseEquals(username, s.username);
        });

        if (!options.quiet && !haveSeenBefore) {
          if (!cli.interaction.confirm(util.format(piiWarningText, profile.defaultProfileFile), _)) {
            log.info($('Login cancelled'));
            return;
          }
        }
      }

      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);

      var progress = cli.interaction.progress($('Authenticating...'));
      try {
        adalAuth.logoutUser(username, _);
        var newSubscriptions = environment.addAccount(username, password, tenant, options.servicePrincipal, _);
        if (newSubscriptions.length > 0) {
          newSubscriptions.forEach(function (s) {
            profile.current.addOrUpdateSubscription(s);
            log.info(util.format($('Added subscription %s'), s.name));
          });

          var defaultSubscription = profile.current.currentSubscription;
          if (!defaultSubscription) {
            defaultSubscription  = newSubscriptions[0];
          }

          log.info(util.format($('Setting subscription "%s" as default'), defaultSubscription.name));
          defaultSubscription.isDefault = true;
          profile.current.save();
        } else {
          log.info(util.format($('No subscriptions found for this account')));
        }
      } catch (e) {
        progress.end();
        throw (e);
      }finally {
        progress.end();
      }
    });

  cli.command('logout [username]')
    .description($('Log out from Azure subscription using Active Directory. Currently, the user can log out only via Microsoft organizational account'))
    .option('-u --username <username>', $('Required. User name used to log out from Azure Active Directory.'))
    .execute(function (username, options, _) {
    if (!username){
      return cli.missingArgument('username');
    }
    if (profile.current.logoutUser(username, _)) {
      profile.current.save();
      log.info($('You have logged out.'));
    } else {
      log.info(util.format($('You are not logged in as \'%s\'.'), username));
    }
  });
};
