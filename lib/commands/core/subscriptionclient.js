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
var url = require('url');
var path = require('path');
var util = require('util');
var xml2js = require('xml2js');

var __ = require('underscore');

var js2xml = require('../../../node_modules/azure/lib/util/js2xml');

var cacheUtils = require('../../util/cacheUtils');
var keyFiles = require('../../util/keyFiles');
var utils = require('../../util/utils');
var pfx2pem = require('../../util/certificates/pkcs').pfx2pem;

var $ = utils.getLocaleString;

function SubscriptionClient(cli) {
  this.cli = cli;
  this.environmentManager = cli.environmentManager;

  this.azureDirectory = utils.azureDir();
  this.pemPath = path.join(this.azureDirectory, 'managementCertificate.pem');
  this.publishSettingsFilePath = path.join(this.azureDirectory, 'publishSettings.xml');
}

__.extend(SubscriptionClient.prototype, {
  getCurrentSubscription: function (subscription) {
    var subscriptionId = this.getCurrentSubscriptionId(subscription);

    return {
      Id: subscriptionId,
      managementCertificate: this.managementCertificate(),
      managementEndpointUrl: this.cli.environmentManager.getManagementEndpointUrl(this.managementEndpointUrl())
    };
  },

  getCurrentSubscriptionId: function (subscription) {
    var self = this;

    // use default subscription if not passed as an argument
    if (!subscription) {
      subscription = utils.readConfig().subscription;
    }

    // load and normalize publish settings
    try {
      var publishSettings = self.readPublishSettings();
      if (publishSettings && publishSettings.PublishProfile) {
        var subs = publishSettings.PublishProfile.Subscription;
        if (!subs) {
          subs = [];
        } else if (!subs[0]) {
          subs = [subs];
        }

        // use subscription id when the subscription name matches
        for (var index in subs) {
          if (subs[index]['@'].Name === subscription) {
            return subs[index]['@'].Id;
          }
        }
      }
    } catch (e) {
      // Publish settings is not expected for all scenarios
    }

    return subscription;
  },

  getSubscriptions: function() {
    var self = this;

    if (!utils.pathExistsSync(self.publishSettingsFilePath)) {
      throw new Error($('No publish settings file found. Please use "azure account import" first'));
    }

    var settings = self.readPublishSettings();
    return self.parsePublishSettings(settings);
  },

  setSubscription: function (id) {
    var self = this;

    var subscriptions = self.getSubscriptions();
    var subscription = subscriptions.filter(function (subscription) {
      return subscription.Id === id;
    })[0];

    if (!subscription) {
      throw new Error(util.format($('Invalid subscription %s'), id));
    } else {
      var config = utils.readConfig();

      if (subscription.ServiceManagementUrl && subscription.ServiceManagementUrl !== config.endpoint) {
        var endpointInfo = utils.validateEndpoint(subscription.ServiceManagementUrl);
        config.endpoint = endpointInfo;
        self.cli.output.info(util.format($('Setting service endpoint to: %s'), config.endpoint));
      }

      if (subscription.ManagementCertificate) {
        self.cli.output.verbose($('Parsing management certificate'));
        var pfx = new Buffer(subscription.ManagementCertificate, 'base64');
        self.convertPfx(pfx, self.pemPath);
      }

      config.subscription = id;
      utils.writeConfig(config);
    }
  },

  parsePublishSettings: function (settings) {
    if (!settings.PublishProfile ||
        (settings.PublishProfile['@'] &&
         !settings.PublishProfile['@'].ManagementCertificate &&
         settings.PublishProfile['@'].SchemaVersion !== '2.0')) {
      throw new Error($('Invalid publishSettings file. Use "azure account download" to download publishing credentials.'));
    }

    var attribs = settings.PublishProfile['@'];
    var subs = settings.PublishProfile.Subscription;
    if (!subs) {
      subs = [];
    } else if (!subs[0]) {
      subs = [ subs ];
    }

    subs.forEach(function (sub) {
      if (sub['@']) {
        sub.Id = sub['@'].Id;
        sub.Name = sub['@'].Name;
        sub.ManagementCertificate = sub['@'].ManagementCertificate;
        sub.ServiceManagementUrl = sub['@'].ServiceManagementUrl;

        delete sub['@'];
      }

      if (attribs) {
        if (attribs.ManagementCertificate && !sub.ManagementCertificate) {
          sub.ManagementCertificate = attribs.ManagementCertificate;
        }

        if (attribs.Url && !sub.ServiceManagementUrl) {
          sub.ServiceManagementUrl = attribs.Url;
        }
      }
    });

    return subs;
  },

  readPublishSettings: function (filePath) {
    var self = this;
    var publishSettings;

    if (!filePath) {
      filePath = self.publishSettingsFilePath;
    }

    try {
      var parser = new xml2js.Parser();
      parser.on('end', function (settings) { publishSettings = settings; });
      self.cli.output.silly(util.format($('Reading publish settings %s'), filePath));
      var readBuffer = fs.readFileSync(filePath);
      parser.parseString(readBuffer);
    } catch (e) {
      throw new Error($('No valid publish settings file found. Please use "azure account import" first'));
    }

    return publishSettings;
  },

  defaultSubscriptionId: function () {
    return utils.readConfig().subscription;
  },

  clearAzureDir: function (callback) {
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
      deleteIfExists(self.azureDirectory, true);
    } catch (err) {
      self.cli.output.warn(util.format($('Couldn\'t remove %s'), self.azureDirectory));
    }

    self.cli.output.info(isDeleted ? $('Account settings cleared successfully')
        : $('Account settings are already clear'));

    return callback();
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

      var settings = self.readPublishSettings(file);
      processSettings(file, settings);
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
      var subscriptions = self.parsePublishSettings(settings);

      if (subscriptions.length === 0) {
        self.cli.output.warning($('Imported profile with no subscriptions'));
      } else {
        for (var index in subscriptions) {
          self.cli.output.info(util.format($('Found subscription: %s'), subscriptions[index].Name));
          self.cli.output.verbose($('  Id:'), subscriptions[index].Id);
        }
      }

      self.cli.output.verbose(util.format($('Storing account information at %s'), self.publishSettingsFilePath));

      var existingSubscriptions;
      if (utils.pathExistsSync(self.publishSettingsFilePath)) {
        existingSubscriptions = self.parsePublishSettings(self.readPublishSettings(self.publishSettingsFilePath));
        existingSubscriptions.forEach(function (subscription) {
          if (!subscriptions.some(function (s) {
            return s.Id === subscription.Id;
          })) {
            subscriptions.push(subscription);
          }
        });
      }

      utils.writeFileSyncMode(self.publishSettingsFilePath, self.generatePublishSettings(subscriptions)); // folder already created by convertPfx()

      if (!existingSubscriptions && subscriptions.length > 0) {
        self.cli.output.info(util.format($('Setting default subscription to: %s'), subscriptions[0].Name));
        self.cli.output.info($('Use "azure account set" to change to a different one'));

        self.setSubscription(subscriptions[0].Id);
      }

      self.cli.output.warn(util.format($('The "%s" file contains sensitive information'), file));
      self.cli.output.warn($('Remember to delete it now that it has been imported'));
      self.cli.output.info($('Account publish settings imported successfully'));
    }
  },

  generatePublishSettings: function (subscriptions) {
    var result = js2xml.serialize({
      PublishData: {
        PublishProfile: {
          SchemaVersion: '2.0',
          PublishMethod: 'AzureServiceManagementAPI',
          Subscription: subscriptions
        }
      }
    });

    return result;
  },

  export: function (options, callback) {
    var self = this;

    if (options.publishsettings) {
      self.publishSettingsFilePath = options.publishsettings;
    }

    if (!fs.existsSync(self.publishSettingsFilePath)) {
      callback(new Error($('To export a certificate a valid publish settings file needs to be either specified or imported')));
    }

    var settings = self.readPublishSettings(self.publishSettingsFilePath);
    var subscriptions = self.parsePublishSettings(settings);

    var subscription = options.subscription;
    self.cli.interaction.chooseIfNotGiven($('Subscription: '), $('Getting subscriptions'), subscription,
      function(cb) {
        cb(null, subscriptions.map(function(s) { return s.Name; }));
      }, function (err, subscriptionName) {
        if (err) { return callback(err); }

        subscription = subscriptions.filter(function (s) {
          return utils.ignoreCaseEquals(s.Name, subscriptionName) || utils.ignoreCaseEquals(s.Id, subscriptionName);
        })[0];

        if (!subscription) {
          throw new Error(util.format('Invalid subscription %s', subscriptionName));
        }

        var outputFile = options.file ? options.file : util.format('%s.pem', subscription.Name);
        var pfx = new Buffer(subscription.ManagementCertificate, 'base64');
        self.convertPfx(pfx, outputFile);
        callback();
      });
  },

  managementCertificate: function () {
    var self = this;

    var pemFile = path.join(utils.azureDir(), 'managementCertificate.pem');
    self.cli.output.silly(util.format($('Reading pem %s'), pemFile));
    return keyFiles.readFromFile(pemFile);
  },

  managementEndpointUrl: function () {
    var cfg = utils.readConfig();

    var changes = false;

    // check if it is the configuration format used 
    // by version <= 0.6.0 and if so fix-up
    if (cfg.port) {
      cfg.endpoint = url.format({
        protocol: 'https',
        hostname: cfg.endpoint,
        port: cfg.port
      });

      delete cfg.port;

      changes = true;
    }

    // Check if there is a value for Subscription (caps) and
    // if so fix-up by deleting it
    if (cfg.Subscription) {
      delete cfg.Subscription;

      changes = true;
    }

    if (changes) {
      // Save fixed-up configuration
      utils.writeConfig(cfg);
    }

    return cfg.endpoint;
  },

  convertPfx: function(pfx, pemOutputFile) {
    var self = this;

    var pem = pfx2pem(pfx);
    utils.writeFileSyncMode(pemOutputFile, pem.toString(), 'utf8');
    self.cli.output.verbose(util.format($('Converted PFX data to %s'), pemOutputFile));
  }
});

module.exports = SubscriptionClient;