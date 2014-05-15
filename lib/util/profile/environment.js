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
var util = require('util');

var adalAuth = require('../authentication/adalAuth');
var constants = require('../constants');
var Subscription = require('./subscription');
var $ = require('../utils').getLocaleString;

function propDescriptor(valueField, environmentVar) {
  return {
    enumerable: true,
    configurable: false,
    get: function () {
      var val = process.env[environmentVar] || this.values[valueField];
      if (val === null) {
        throw new Error(util.format(
          $('The endpoint field %s is not defined in this environment.' +
            ' Either this feature is not supported or the endpoint needs to be set using \'azure account env set\''),
          valueField));
      }
      return val;
    },
    set: function (value) { this.values[valueField] = value; }
  };
}

function nulls(properties) {
  return properties.reduce(function (acc, prop) { acc[prop] = null; return acc; }, {});
}

function Environment(envData) {
  this.name = envData.name;
  var values = envData;
  _.defaults(values, nulls([ 'portalUrl',
    'publishingProfileUrl',
    'managementEndpointUrl',
    'resourceManagerEndpointUrl',
    'sqlManagementEndpointUrl',
    'hostNameSuffix',
    'sqlServerHostNameSuffix',
    'activeDirectoryEndpointUrl',
    'commonTenantName',
    'galleryEndpointUrl'
  ]));

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
        return _.chain(Environment.publicEnvironments).pluck('name').contains(this.name).value();
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
    portalUrl: 'http://go.microsoft.com/fwink/?LinkId=254433',
    publishingProfileUrl: 'http://go.microsoft.com/fwlink/?LinkId=254432',
    managementEndpointUrl: 'https://management.core.windows.net',
    resourceManagerEndpointUrl: 'https://management.azure.com/',
    hostNameSuffix: 'azurewebsites.net',
    sqlManagementEndpointUrl: 'https://management.core.windows.net:8443/',
    sqlServerHostNameSuffix: '.database.windows.net',
    galleryEndpointUrl: 'https://gallery.azure.com/',
    activeDirectoryEndpointUrl: 'https://login.windows.net',
    commonTenantName: 'common'
  }),
  new Environment({
    name: 'AzureChinaCloud',
    publishingProfileUrl: 'http://go.microsoft.com/fwlink/?LinkID=301774',
    portalUrl: 'http://go.microsoft.com/fwlink/?LinkId=301902',
    managementEndpointUrl: 'https://management.core.chinacloudapi.cn',
    hostNameSuffix: 'chinacloudsites.cn',
    sqlServerHostnameSuffix: '.database.chinacloudapi.cn',
  })
];

module.exports = Environment;