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
var xml2js = require('xml2js');

var __ = require('underscore');

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
    return self.parsePublishSettings(settings).subscriptions;
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

  parsePublishSettings: function(settings) {
    if (!settings.PublishProfile ||
        !settings.PublishProfile['@'] ||
        (!settings.PublishProfile['@'].ManagementCertificate &&
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
      sub.Id = sub['@'].Id;
      sub.Name = sub['@'].Name;

      if (attribs.ManagementCertificate) {
        sub.ManagementCertificate = attribs.ManagementCertificate;
      }

      delete sub['@'];
    });

    return {
      url: attribs.Url,
      subscriptions: subs
    };
  },

  readPublishSettings: function (filePath) {
    var self = this;
    var publishSettings;

    if (!filePath) {
      filePath = self.publishSettingsFilePath;
    }

    var parser = new xml2js.Parser();
    parser.on('end', function (settings) { publishSettings = settings; });
    self.cli.output.silly(util.format($('Reading publish settings %s'), filePath));
    var readBuffer = fs.readFileSync(filePath);
    parser.parseString(readBuffer);

    return publishSettings;
  },

  managementCertificate: function () {
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