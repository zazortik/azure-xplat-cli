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
    .execute(function () {
      var subscriptions = __.values(profile.current.subscriptions);

      log.table(subscriptions, function (row, s) {
        row.cell($('Name'), s.name);
        row.cell($('Id'), s.id);
        row.cell($('Current'), s.isDefault);
      });
    });

  account.command('set <subscription>')
    .description($('Set the current subscription'))
    .execute(function (subscription) {
      var subscriptions = accountClient.getSubscriptions();

      // Try to match based on name first
      var importByName = true;
      var filtered = subscriptions.filter(function (s) { return utils.ignoreCaseEquals(s.Name, subscription); });
      if (!filtered.length) {
        // If nothing was found try matching on Id
        importByName = false;
        filtered = subscriptions.filter(function (s) { return utils.ignoreCaseEquals(s.Id, subscription); });

        if (!filtered.length) {
          // if still nothing found, just throw
          throw new Error(util.format($('Invalid subscription "%s"'), subscription));
        }
      }

      var subscriptionObject = filtered[0];
      var subscriptionTag = importByName ? subscriptionObject.Name : subscriptionObject.Id;
      log.info(util.format($('Setting subscription to "%s"'), subscriptionTag));

      accountClient.setSubscription(subscriptionObject.Id);

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

  // TODO: eventually get rid of these two last methods
  account.getCurrentSubscription = function (subscription) {
    if (!subscription) {
      return profile.current.currentSubscription;
    }
    return profile.current.subscriptions[subscription] ||
      __.values(profile.current.subscriptions)
      .filter(function (s) { return s.id === subscription; })[0];
  };

  account.registerResourceType = function (resourceName) {
    return accountClient.registerResourceType(resourceName);
  };

  account.knownResourceTypes = function () {
    return accountClient.knownResourceTypes();
  };
};