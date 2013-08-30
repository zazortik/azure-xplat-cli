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

var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('underscore');

var utils = require('../../util/utils');

var keyFiles = require('../../util/keyFiles');
var cacheUtils = require('../../util/cacheUtils');

var SubscriptionClient = require('../core/subscriptionclient');

var $ = utils.getLocaleString;

function AccountClient(cli) {
  this.cli = cli;

  AccountClient['super_'].call(this, cli);
}

util.inherits(AccountClient, SubscriptionClient);

// Dealing with registering resource providers on subscriptions

var knownResourceTypes = [];
var REQUIRED_API_VERSION = '2012-08-01';

_.extend(AccountClient.prototype, {
  export: function (options, callback) {
    var self = this;

    var azureDirectory = utils.azureDir();
    var publishSettingsFilePath = path.join(azureDirectory, 'publishSettings.xml');

    if (options.publishsettings) {
      publishSettingsFilePath = options.publishsettings;
    }

    if (!fs.existsSync(publishSettingsFilePath)) {
      callback(new Error($('To export a certificate a valid publish settings file needs to be either specified or imported')));
    }

    var settings = self.readPublishSettings(publishSettingsFilePath);
    var publishSettings = self.parsePublishSettings(settings);

    var subscription = options.subscription;
    self.cli.interaction.chooseIfNotGiven($('Subscription: '), $('Getting subscriptions'), subscription,
      function(cb) {
        cb(null, publishSettings.subscriptions.map(function(s) { return s.Name; }));
      }, function (err, subscriptionName) {
        if (err) { return callback(err); }

        subscription = publishSettings.subscriptions.filter(function (s) {
          return utils.ignoreCaseEquals(s.Name, subscriptionName) || utils.ignoreCaseEquals(s.Id, subscriptionName);
        })[0];

        if (!subscription) {
          throw new Error(util.format($('Invalid subscription %s'), subscriptionName));
        }

        var outputFile = options.file ? options.file : util.format('%s.pem', subscription.Name);
        var pfx = new Buffer(subscription.ManagementCertificate, 'base64');
        self.convertPfx(pfx, outputFile);
        callback();
      });
  },

  defaultSubscriptionId: function () {
    return utils.readConfig().subscription;
  },

  clearPublishSettings: function () {
    var self = this;

    function deleteIfExists(file, isDir) {
      if (utils.pathExistsSync(file)) {
        self.cli.output.silly(util.format($('Removing %s'), file));
        (isDir ? fs.rmdirSync : fs.unlinkSync)(file);
        return true;
      } else {
        self.cli.output.silly(util.format($('%s does not exist'), file));
      }
    }

    var isDeleted = deleteIfExists(self.pemPath);
    isDeleted = deleteIfExists(self.publishSettingsFilePath) || isDeleted; // in this order only
    isDeleted = utils.clearConfig() || isDeleted;
    isDeleted = cacheUtils.clear() || isDeleted;

    try {
      deleteIfExists(azureDirectory, true);
    } catch (err) {
      self.cli.output.warn(util.format($('Couldn\'t remove %s'), azureDirectory));
    }

    self.cli.output.info(isDeleted ? $('Account settings cleared successfully')
        : $('Account settings are already clear'));
  },

  importPublishSettings: function (file, options, callback) {
    var self = this;

    self.cli.output.verbose(util.format($('Importing file %s'), file));

    // Is it a .pem file?
    var keyCertValues = keyFiles.readFromFile(file);
    var keyPresent = !!keyCertValues.key;
    var certPresent = !!keyCertValues.cert;
    var publishSettings = null;
    if (keyPresent + certPresent === 1) {
      // Exactly one of them present.  Tell the user about the error.
      // Do not try this file as xml or pfx
      callback(util.format($('File %s needs to contain both private key and cert, but only %s was found'), file,
              (keyCertValues.key ? 'key' : 'certificate')));
    } else if (keyCertValues.key && keyCertValues.cert) {
      // Both key and cert are present.
      keyFiles.writeToFile(self.pemPath, keyCertValues);
      self.cli.output.verbose(util.format($('Key and cert have been written to %s'), self.pemPath));
    } else {
      // Try to open as publishsettings or pfx.
      self.cli.output.silly(util.format($('%s does not appear to be a PEM file. Reading as publish settings file'), file));

      try {
        var settings = self.readPublishSettings(file);
        processSettings(file, settings);
      } catch (e) {
        self.convertPfx(fs.readFileSync(file));
      }
    }

    cacheUtils.clear();
    if (!options.skipregister && publishSettings && publishSettings.PublishProfile.Subscription) {
      var progress = self.cli.interaction.progress($('Verifying account'));
      return self.registerKnownResourceTypes(self.defaultSubscriptionId(), function (error) {
        progress.end();
        callback(error);
      });
    }

    return callback();

    function processSettings(file, settings) {
      var publishSettings = self.parsePublishSettings(settings);

      if (publishSettings.subscriptions.length === 0) {
        self.cli.output.warning($('Imported profile with no subscriptions'));
      } else {
        for (var index in publishSettings.subscriptions) {
          self.cli.output.info(util.format($('Found subscription: %s'), publishSettings.subscriptions[index].Name));
          self.cli.output.verbose($('  Id:'), publishSettings.subscriptions[index].Id);
        }
      }

      if (publishSettings.url) {
        var endpointInfo = utils.validateEndpoint(publishSettings.url);
        var config = utils.readConfig();
        config.endpoint = endpointInfo;
        utils.writeConfig(config);
        self.cli.output.info(util.format($('Setting service endpoint to: %s'), config.endpoint));
      }

      var azureDirectory = utils.azureDir();
      var publishSettingsFilePath = path.join(azureDirectory, 'publishSettings.xml');

      self.cli.output.verbose(util.format($('Storing account information at %s'), publishSettingsFilePath));
      utils.writeFileSyncMode(publishSettingsFilePath, fs.readFileSync(file)); // folder already created by convertPfx()

      if (publishSettings.subscriptions.length !== 0) {
        self.cli.output.info(util.format($('Setting default subscription to: %s'), publishSettings.subscriptions[0].Name));
        self.cli.output.info($('Use "azure account set" to change to a different one'));

        self.setSubscription(publishSettings.subscriptions[0].Id);
      }

      self.cli.output.warn(util.format($('The "%s" file contains sensitive information'), file));
      self.cli.output.warn($('Remember to delete it now that it has been imported'));
      self.cli.output.info($('Account publish settings imported successfully'));
    }
  },

  registerResourceType: function (resourceName) {
    self.cli.output.silly(util.format($('Registering resource type %s'), resourceName));
    knownResourceTypes.push(resourceName);
  },

  knownResourceTypes: function () {
    return knownResourceTypes.slice(0);
  },

  registerKnownResourceTypes: function (subscriptionId, callback) {
    var self = this;
    var service = utils.createServiceManagementService(self.getCurrentSubscription(subscriptionId), self.cli.output, REQUIRED_API_VERSION);

    function registerNextResource(resourceNames, errors, cb) {
      var errorString;
      if (resourceNames.length === 0) {
        self.cli.output.verbose($('Resource registration on account complete'));
        if (errors.length > 0) {
          errorString = 'The following resources failed to register: ' + errors.join(',');
          // Ignore failing registrations for now, resource provider may not
          // exist. Update when we have a reliable way to detect this case.
          cb();
        } else {
          cb();
        }
      } else {
        self.cli.output.verbose(util.format($('Registering resource type %s'), resourceNames[0]));
        service.registerResourceProvider(resourceNames[0], function (err) {
          if (err) {
            log.verbose(util.format($('Registration of resource type %s failed'), resourceNames[0]));
            errors.push(resourceNames[0]);
          }
          registerNextResource(resourceNames.slice(1), errors, cb);
        });
      }
    }

    function listResourceTypes(typesToList, validTypes, callback) {
      if (typesToList.length === 0) {
        return callback(null, validTypes);
      }

      service.listResourceTypes([typesToList[0]], function (err, resources) {
        if (err) {
          if (err.code === 'BadRequest' && err.message.search(/Service type\s+\S+\s+is invalid./) !== -1) {
            // Unknown resource type, just go on to the next one
            self.cli.output.silly(util.format($('Listing resource type error: %s'), err.message));
            listResourceTypes(typesToList.slice(1), validTypes, callback);
          } else {
            // It's a real error, bail
            callback(err);
          }
        } else {
          validTypes.push(resources[0]);
          listResourceTypes(typesToList.slice(1), validTypes, callback);
        }
      });
    }

    listResourceTypes(knownResourceTypes, [], function (err, resources) {
      if (err) {
        return callback(err);
      }
      self.cli.output.silly('Registered resource types = ', util.inspect(resources, false, null));
      var resourcesToRegister = resources
        .filter(function (r) { return r.state.toUpperCase() === 'UNREGISTERED'; })
        .map(function (r) { return r.type; });

      registerNextResource(resourcesToRegister, [], callback);

    });
  }
});

module.exports = AccountClient;