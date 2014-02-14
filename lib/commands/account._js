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
      var url = cli.environmentManager.getPublishingProfileUrl(options.realm, options.environment);
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
    .description($('Remove any of the stored account info stored by import or config set'))
    .execute(function (options, _) {
      __.keys(profile.current.subscriptions).forEach(function (subName) {
        profile.current.deleteSubscription(subName);
      });

      __.keys(profile.current.environments).forEach(function (envName) {
        profile.current.deleteEnvironment(envName);
      });

      profile.current.save();
      accountClient.clearAzureDir(_);
    });

  account.command('add')
    .description($('Add a subscription and authenticate against Active Directory'))
    .option('-e --environment [environment]', $('Environment to authenticate against, must support active directory'))
    .option('-s --subscription [subscription]', $('Subscription id that will be used - temporary!'))
    .option('-n --subscriptionName [name]', $('Name of new subscription to create - temporary!'))
    .option('-u --user <username>', $('user name, will prompt if not given'))
    .option('-p --password <password>', $('user password, will prompt if not given'))
    .option('-t --tenantId <tenantId>', $('Active directory tenant name to authenticate against, derived from user name if not given'))
    .execute(function(options, _) {
      var undefined;
      var environmentName = options.environment || 'AzureCloud';
      var subscription = options.subscription;
      if (!subscription) {
        throw new Error($('required parameter --subscription not provided.'));
      }

      var subscriptionName = options.subscriptionName || 'NewSubscription';

      if (!options.hasOwnProperty('password')) {
        options.password = undefined;
      }

      var username = cli.interaction.promptIfNotGiven('Username: ', options.user, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);

      var environment = profile.current.getEnvironment(environmentName);
      if (!environment) {
        throw new Error(util.format($('Unknown environment %s'), environmentName));
      }

      var progress = cli.interaction.progress($('Authenticating...'));
      try {
        var newSubscription = environment.addAccount(username, password, options.tenantId, _);

      // TODO: Remove these lines when common tenant and list subscriptions API is working
        newSubscription.id = subscription;
        newSubscription.name = subscriptionName;

        newSubscription.isDefault = true;
        profile.current.addSubscription(newSubscription);
        profile.current.save();
        log.info(util.format($('Added subscription %s'), newSubscription.name));
      } finally {
        progress.end();
      }
    });

  account.registerResourceType = function (resourceName) {
    return accountClient.registerResourceType(resourceName);
  };

  account.knownResourceTypes = function () {
    return accountClient.knownResourceTypes();
  };
};
