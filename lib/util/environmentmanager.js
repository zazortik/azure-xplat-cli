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

var url = require('url');
var fs = require('fs');
var path = require('path');

var _ = require('underscore');

var constants = require('./constants');
var utils = require('./utils');

function EnvironmentManager(realm, environment) {
  this.realm = realm;
  this.environment = environment;

  this.environments = null;
}

_.extend(EnvironmentManager.prototype, {
  load: function () {
    var environments = {
      'AzureCloud': {
        'publishingProfile': constants.GLOBAL_PUBLISHINGPROFILE_URL,
        'portal': constants.GLOBAL_PORTAL_URL
      },
      'AzureChinaCloud': {
        'publishingProfile': constants.CHINA_PUBLISHINGPROFILE_URL,
        'portal': constants.CHINA_PORTAL_URL
      }
    };

    if (fs.existsSync(this.getEnvironmentPath())) {
      environments = JSON.parse(fs.readFileSync(this.getEnvironmentPath()).toString());
    }

    this.environments = environments;

    return environments;
  },

  save: function () {
    if (!this.environments) {
      this.load();
    }

    fs.writeFileSync(this.getEnvironmentPath(), JSON.stringify(this.environments));
  },

  getEnvironmentPath: function () {
    return path.join(utils.azureDir(), 'environment.json');
  },

  getEnvironmentUrls: function () {
    if (!this.environments) {
      this.load();
    }

    return this.environments;
  },

  getEnvironmentUrl: function (urlType, realm, environment) {
    var self = this;
    var targetUrl;

    if (environment) {
      var urls = self.getEnvironmentUrls();
      var e = Object.keys(urls).filter(function (e) {
        return utils.ignoreCaseEquals(e, environment);
      })[0];

      if (!e || !urls[e] || !urls[e][urlType]) {
        throw new Error('Invalid download environment');
      }

      targetUrl = urls[e][urlType];

      var urlObj;

      if (realm) {
        urlObj = url.parse(targetUrl, true);
        delete urlObj.search;
        urlObj.query.whr = realm;
        targetUrl = url.format(urlObj);
      }
    }

    return targetUrl;
  },

  getPortalUrl: function (realm, environment) {
    return process.env.AZURE_PORTAL_URL ||
      this.getEnvironmentUrl('portal', realm, environment) ||
      constants.DEFAULT_PORTAL_URL;
  },

  getPublishingProfileUrl: function (realm, environment) {
    return process.env.AZURE_PUBLISHINGPROFILE_URL ||
      this.getEnvironmentUrl('publishingProfile', realm, environment) ||
      constants.DEFAULT_PUBLISHINGPROFILE_URL;
  },

  getManagementEndpointUrl: function (accountManagementEndpointUrl) {
    return process.env.AZURE_MANAGEMENTENDPOINT_URL ||
      this.getEnvironmentUrl('serviceEndpoint') ||
      accountManagementEndpointUrl ||
      constants.DEFAULT_MANAGEMENTENDPOINT_URL;
  },

  getSqlManagementEndpointUrl: function () {
    return process.env.AZURE_SQL_MANAGEMENTENDPOINT_URL ||
      this.getEnvironmentUrl('sqlDatabaseEndpoint') ||
      constants.DEFAULT_SQL_MANAGEMENTENDPOINT_URL;
  },

  getHostNameSuffix: function () {
    return process.env.AZURE_HOSTNAME_SUFFIX ||
      constants.DEFAULT_HOSTNAME_SUFFIX;
  },

  getSqlServerHostnameSuffix: function () {
    return process.env.AZURE_SQL_SERVER_HOSTNAME_SUFFIX ||
      constants.DEFAULT_AZURE_SQL_SERVER_HOSTNAME_SUFFIX;
  }
});

module.exports = EnvironmentManager;