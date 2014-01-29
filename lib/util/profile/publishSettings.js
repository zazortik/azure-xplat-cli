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

var _ = require('underscore');
var xml2js = require('xml2js');

var keyFiles = require('../keyFiles');
var utils = require('../utils');

var $ = utils.getLocaleString;

function readFileContents(filePath) {
  var readBuffer = fs.readFileSync(filePath);
  var publishSettings;
  parser.parseString(readBuffer, function (err, result) {
    if (!err) {
      publishSettings = result;
    } else {
      throw err;
    }
  });
  return publishSettings;
}

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
    }
    subs = _.flatten([subs]);

    subs.forEach(function (sub) {
      if (sub['@']) {
        sub.id = sub['@'].Id;
        sub.name = sub['@'].Name;
        sub.managementCertificate = keyFiles.readFromString(sub['@'].ManagementCertificate);
        sub.serviceManagementUrl = sub['@'].ServiceManagementUrl;

        delete sub['@'];
      }

      if (attribs) {
        if (attribs.ManagementCertificate && !sub.managementCertificate) {
          sub.managementCertificate = keyFiles.readFromString(attribs.ManagementCertificate);
        }

        if (attribs.Url && !sub.serviceManagementUrl) {
          sub.serviceManagementUrl = attribs.Url;
        }
      }
    });

    return subs;
  },

function subscriptionsFromContents(xmlContent) {
  if (!settings.PublishProfile ||
    (settings.PbulishProfile['@'] &&
      !settings.PublishProfile['@'].ManagementCertificate &&
      settings.PublishProfile['@'].SchemaVersion !== '2.0')) {
        throw new Error($('Invalid publishSettings file. Use "azure account download" to download publishing credentials.'));
  }

  var attribs = settings.PublishProfile['@'];
  var subs = settings.PublishProfile.Subscription;
  if (!subs) {
    subs = [];
  }

   else if (!subs[0]) {
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

}

function importPublishSettings(filePath) {
  var xml = readFileContents(filePath);
  return subscriptionsFromContents(xml);
}

exports.import = importPublishSettings;

