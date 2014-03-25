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
var azure = require('azure');
var url = require('url');

var adalAuth = require('../authentication/adalAuth');
var constants = require('../constants');
var Subscription = require('./subscription');

function propDescriptor(valueField, environmentVar) {
  return {
    enumerable: true,
    configurable: false,
    get: function () { return process.env[environmentVar] || this.values[valueField]; },
    set: function (value) { this.values[valueField] = value; }
  };
}

function Environment(envData) {
  this.name = envData.name;
  var values = envData;
  _.defaults(values, {
    portalUrl: constants.DEFAULT_PORTAL_URL,
    publishingProfileUrl: constants.DEFAULT_PUBLISHINGPROFILE_URL,
    managementEndpointUrl: constants.DEFAULT_MANAGEMENTENDPOINT_URL,
    resourceManagerEndpointUrl: constants.DEFAULT_RESOURCE_MANAGER_ENDPOINT_URL,
    sqlManagementEndpointUrl: constants.DEFAULT_SQL_MANAGEMENTENDPOINT_URL,
    hostNameSuffix: constants.DEFAULT_HOSTNAME_SUFFIX,
    sqlServerHostNameSuffix: constants.DEFAULT_SQL_SERVER_HOSTNAME_SUFFIX,
    activeDirectoryEndpointUrl: constants.DEFAULT_ACTIVEDIRECTORY_ENDPOINT_URL,
    commonTenantName: constants.DEFAULT_COMMON_ACTIVEDIRECTORY_TENANT_NAME,
    galleryEndpointUrl: constants.DEFAULT_GALLERY_ENDPOINT_URL
  });

  Object.defineProperties(this, {
    portalUrl: propDescriptor('portalUrl', 'AZURE_PORTAL_URL'),
    publishingProfileUrl: propDescriptor('publishingProfileUrl', 'AZURE_PUBLISHINGPROFILE_URL'),
    managementEndpointUrl: propDescriptor('managementEndpointUrl', 'AZURE_MANAGEMENTENDPOINT_URL'),
    resourceManagerEndpointUrl: propDescriptor('resourceManagerEndpointUrl', 'AZURE_RESOURCEMANAGERENDPOINT_URL'),
    sqlManagementEndpointUrl: propDescriptor('sqlManagementEndpointUrl', 'AZURE_SQL_MANAGEMENTENDPOINT_URL'),
    hostNameSuffix: propDescriptor('hostNameSuffix', 'AZURE_HOSTNAME_SUFFIX'),
    sqlServerHostnameSuffix: propDescriptor('sqlServerHostNameSuffix', 'AZURE_SQL_SERVER_HOSTNAME_SUFFIX'),
    activeDirectoryEndpointUrl: propDescriptor('activeDirectoryEndpointUrl', 'AZURE_ACTIVEDIRECTORY_ENDPOINT_URL'),
    commonTenantName: propDescriptor('commonTenantName', 'AZURE_ACTIVEDIRECTORY_COMMON_TENANT_NAME'),
    storageEndpoint: propDescriptor('storageEndpoint', 'AZURE_STORAGE_ENDPOINT'),
    galleryEndpointUrl: propDescriptor('galleryEndpointUrl', 'AZURE_GALLERY_ENDPOINT_URL'),
    isPublicEnvironment: {
      enumerable: true,
      configurable: false,
      get: function () {
        var self = this;
        return _.any(Environment.publicEnvironments.map(function (e) { return e.name; }),
          function (name) { return name === self.name; });
      }
    },
    values: {
      enumerable: false,
      configurable: false,
      get: function () { return values; }
    }
  });
}

function addRealm(targetUrl, realm) {
  if (realm) {
    var urlObj = url.parse(targetUrl, true);
    delete urlObj.search;
    urlObj.query.whr = realm;
    targetUrl = url.format(urlObj);
  }
  return targetUrl;
}


_.extend(Environment.prototype, {
  getPortalUrl: function (realm) {
    return addRealm(this.portalUrl, realm);
  },

  getPublishingProfileUrl: function (realm) {
    return addRealm(this.publishingProfileUrl, realm);
  },

  toJSON: function () {
    return _.extend({ name: this.name }, this.values);
  },

  addAccount: function (username, password, callback) {
    var self = this;

    username = adalAuth.normalizeUserName(username);
    var authConfig = {
      authorityUrl: self.activeDirectoryEndpointUrl,
      tenantId: self.commonTenantName,
      resourceId: constants.AZURE_MANAGEMENT_RESOURCE_ID,
      clientId: constants.XPLAT_CLI_CLIENT_ID
    };

    self.acquireToken(authConfig, username, password, function (err, accessToken) {
      if (err) { return callback(err); }

      self.getAccountSubscriptions(accessToken.accessToken, function (err, subscriptions) {
        if (err) { return callback(err); }

        var subs = _.map(subscriptions, function (s) {
          return new Subscription({
            id: s.subscriptionId,
            name: s.subscriptionName,
            accessToken: accessToken,
            username: username
          }, self);
        });

        callback(null, subs);
      });
    });
  },

  acquireToken: adalAuth.acquireToken,

  getAccountSubscriptions: function (token, callback) {
    var credentials = new azure.TokenCloudCredentials({subscriptionId: 'notUsed', token: token });
    var subClient = azure.createSubscriptionClient(credentials, this.managementEndpointUrl);
    subClient.subscriptions.list(function (err, subscriptions) {
      if (err) { return callback(err); }
      callback(null, subscriptions.subscriptions);
    });
  }
});

Environment.publicEnvironments = [
  new Environment({
    name: 'AzureCloud',
    publishingProfileUrl: constants.GLOBAL_PUBLISHINGPROFILE_URL,
    portalUrl: constants.GLOBAL_PORTAL_URL,
    activeDirectoryEndpointUrl: constants.GLOBAL_ACTIVEDIRECTORY_ENDPOINT_URL
  }),
  new Environment({
    name: 'AzureChinaCloud',
    publishingProfileUrl: constants.CHINA_PUBLISHINGPROFILE_URL,
    portalUrl: constants.CHINA_PORTAL_URL,
    resourceManagerEndpointUrl: null,
    galleryEndpointUrl: null
  }),
  new Environment({
    name: 'rdfenext',
    portalUrl: 'https://auxnext.windows.azure-test.net',
    publishingProfileUrl: 'https://auxnext.windows.azure-test.net/publishsettings/index',
    managementEndpointUrl: 'https://managementnext.rdfetest.dnsdemo4.com',
    resourceManagerEndpointUrl: 'https://api-next.resources.windows-int.net',
    activeDirectoryEndpointUrl: 'https://login.windows-ppe.net',
    galleryEndpointUrl: 'https://next.gallery.azure-test.net'
  }),
  new Environment({
    name: 'rdfecurrent',
    portalUrl: 'https://auxcurrent.windows.azure-test.net',
    publishingProfileUrl: 'https://auxcurrent.windows.azure-test.net/publishsettings/index',
    managementEndpointUrl: 'https://management.rdfetest.dnsdemo4.com',
    resourceManagerEndpointUrl: 'https://api-current.resources.windows-int.net',
    activeDirectoryEndpointUrl: 'https://login.windows-ppe.net',
    sqlManagementEndpointUrl: 'https://management.core.windows.net:8443/',
    galleryEndpointUrl: 'https://current.gallery.azure-test.net'
  }),
  new Environment({
    name: 'dogfood',
    portalUrl: 'https://windows.azure-test.net',
    publishingProfileUrl: 'https://windows.azure-test.net/publishsettings/index',
    managementEndpointUrl: 'https://management-preview.core.windows-int.net',
    resourceManagerEndpointUrl: 'https://api-dogfood.resources.windows-int.net',
    activeDirectoryEndpointUrl: 'https://login.windows-ppe.net',
    galleryEndpointUrl: 'https://df.gallery.azure-test.net'
  })
];

module.exports = Environment;