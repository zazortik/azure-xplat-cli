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
var _ = require('underscore');

var utils = require('../../util/utils');
var interaction = require('../../util/interaction');

var pfx2pem = require('../../util/certificates/pkcs').pfx2pem;

var $ = utils.getLocaleString;

function AccountClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
}

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

    self.parsePublishSettings(publishSettingsFilePath, function (err, settings) {
      if (err) { return callback(err); }

      var publishSettings = self.processSettings(settings);

      var subscription = options.subscription;
      interaction.chooseIfNotGiven(self.cli, $('Subscription: '), $('Getting subscriptions'), subscription,
        function(cb) {
          cb(null, publishSettings.subscriptions.map(function(s) { return s.Name; }));
        }, function (err, subscription) {
          if (err) { return callback(err); }

          subscription = publishSettings.subscriptions.filter(function (s) {
            return utils.ignoreCaseEquals(s.Name, subscription) || utils.ignoreCaseEquals(s.Id, subscription);
          })[0];

          var outputFile = options.file ? options.file : util.format('%s.pem', subscription.Name);
          var pfx = new Buffer(subscription.ManagementCertificate, 'base64');
          self.convertPfx(pfx, outputFile);
          callback();
        });
    });
  },

  parsePublishSettings: function (filePath, callback) {
    var publishSettings;

    var parser = new xml2js.Parser();
    parser.on('end', function (settings) { publishSettings = settings; });
    var readBuffer = fs.readFileSync(filePath);
    try {
      parser.parseString(readBuffer);
      callback(null, publishSettings);
    } catch (err) {
      return callback(err);
    }
  },

  processSettings: function(settings) {
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

  convertPfx: function(pfx, pemOutputFile) {
    var self = this;

    var pem = pfx2pem(pfx);
    utils.writeFileSyncMode(pemOutputFile, pem.toString(), 'utf8');
    self.cli.output.verbose(util.format($('Converted PFX data to %s'), pemOutputFile));
  }
});

module.exports = AccountClient;