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
var url = require('url');
var util = require('util');

var adalAuth = require('../authentication/adalAuth');
var azureSubscription = require('azure-mgmt-subscription');
var constants = require('../constants');
var resourceClient = require('azure-mgmt-resource');
var Subscription = require('./subscription');
var subscriptionUtils = require('./subscriptionUtils');

var $ = require('../utils').getLocaleString;

function nulls(properties) {
  return properties.reduce(function (acc, prop) { acc[prop] = null; return acc; }, {});
}

function Environment(envData) {
  var self = this;

  self.name = envData.name;
  var values = envData;
  _.defaults(values, nulls(_.pluck(Environment.parameters, 'name')));

  Environment.parameters.forEach(function (param) {
    Object.defineProperty(self, param.name, param.propertyDescriptor(self));
  });

  Object.defineProperties(self, {
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
    },

    authConfig: {
      enumerable: false,
      configurable: false,
      get: function () {
        return this.getAuthConfig();
      }
    }
  });
}

function EnvironmentParameter(name, environmentVariable, description) {
  this.name = name;
  this.environmentVariable = environmentVariable;
  this.description = $(description);
}

_.extend(EnvironmentParameter.prototype, {
  propertyDescriptor: function (env) {
    var self = this;
    return {
      enumerable: true,
      configurable: false,
      get: function () {
        var val = process.env[self.environmentVariable] || env.values[self.name];
        if (val === null) {
          throw new Error(util.format(
            $('The endpoint field %s is not defined in this environment.' +
              ' Either this feature is not supported or the endpoint needs to be set using \'azure account env set\''),
            self.name));
        }
        return val;
      },
      set: function (value) { this.values[self.name] = value; }
    };
  },
});

Environment.parameters = [
  new EnvironmentParameter('portalUrl', 'AZURE_PORTAL_URL', 'the management portal URL'),
  new EnvironmentParameter('publishingProfileUrl', 'AZURE_PUBLISHINGPROFILE_URL', 'the publish settings file URL'),
  new EnvironmentParameter('managementEndpointUrl', 'AZURE_MANAGEMENTENDPOINT_URL', 'the management service endpoint'),
  new EnvironmentParameter('resourceManagerEndpointUrl', 'AZURE_RESOURCEMANAGERENDPOINT_URL', 'the resource management endpoint'),
  new EnvironmentParameter('sqlManagementEndpointUrl', 'AZURE_SQL_MANAGEMENTENDPOINT_URL', 'the sql server management endpoint for mobile commands'),
  new EnvironmentParameter('sqlServerHostnameSuffix', 'AZURE_SQL_SERVER_HOSTNAME_SUFFIX', 'the dns suffix for sql servers'),
  new EnvironmentParameter('activeDirectoryEndpointUrl', 'AZURE_ACTIVEDIRECTORY_ENDPOINT_URL', 'the Active Directory login endpoint'),
  new EnvironmentParameter('activeDirectoryResourceId', 'AZURE_ACTIVEDIRECTORY_RESOURCE_ID', 'The resource ID to obtain AD tokens for'),
  new EnvironmentParameter('commonTenantName', 'AZURE_ACTIVEDIRECTORY_COMMON_TENANT_NAME', 'the Active Directory common tenant name'),
  new EnvironmentParameter('galleryEndpointUrl', 'AZURE_GALLERY_ENDPOINT_URL', 'the template gallery endpoint'),
  new EnvironmentParameter('activeDirectoryGraphResourceId', 'AZURE_ACTIVEDIRECTORY_GRAPH_RESOURCE_ID', 'the Active Directory resource ID'),
  new EnvironmentParameter('activeDirectoryGraphApiVersion', 'AZURE_ACTIVEDIRECTORY_GRAPH_API_VERSION', 'the Active Directory api version')
];

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

  getAuthConfig: function (tenantId, resourceId) {
    if (!tenantId) {
      tenantId = this.commonTenantName;
    }
    if (!resourceId) {
      resourceId = this.activeDirectoryResourceId;
    }
    return {
      authorityUrl: this.activeDirectoryEndpointUrl,
      tenantId: tenantId,
      resourceId: resourceId,
      clientId: constants.XPLAT_CLI_CLIENT_ID
    };
  },

  addAccount: function (username, password, tenant, loginAsServicePrincipal, callback) {
    var self = this;
    
    username = adalAuth.normalizeUserName(username);
    var userType = 'user';

    if (loginAsServicePrincipal) {
      userType = 'servicePrincipal';
    }

    function processSubscriptions(err, subscriptions) {
      if (err) { return callback(err); }
      var subs = _.map(subscriptions, function (s) {
        return new Subscription({
          id: s.subscriptionId,
          name: s.displayName || s.subscriptionName,
          user: {
            name: username,
            tenant: tenant,
            type: userType
          },
          //'activeDirectoryTenantId' could be undefined when login as partner user, 
          //so fall back to the "tenant" field
          tenantId: s.activeDirectoryTenantId ? s.activeDirectoryTenantId : tenant
        }, self);
      });

      callback(null, subs);
    }

    if (!loginAsServicePrincipal) {
      subscriptionUtils.getSubscriptions(self, username, password, tenant, processSubscriptions);
    } else {
      adalAuth.acquireServicePrincipalToken(self.getAuthConfig(tenant), username, password, function (err, token) {
        if (err) { return callback(err); }
        var tenantInfo = {
          tenantId: tenant, 
          authContext: token
        };
        subscriptionUtils.getSubscriptionsFromTenants(self, username, [tenantInfo], processSubscriptions);
      });
    }
  },

  acquireToken : function (username, password, tenantId, callback) {
    adalAuth.acquireToken(this.getAuthConfig(tenantId), username, password, callback);
  },

  getAsmClient: function (credentials) {
    return azureSubscription.createSubscriptionClient(credentials, this.managementEndpointUrl);
  },

  getArmClient: function (credentials) {
    return resourceClient.createResourceSubscriptionClient(credentials, this.resourceManagerEndpointUrl);
  }
});

Environment.publicEnvironments = [
  new Environment({
    name: 'AzureCloud',
    portalUrl: 'http://go.microsoft.com/fwlink/?LinkId=254433',
    publishingProfileUrl: 'http://go.microsoft.com/fwlink/?LinkId=254432',
    managementEndpointUrl: 'https://management.core.windows.net',
    resourceManagerEndpointUrl: 'https://management.azure.com/',
    sqlManagementEndpointUrl: 'https://management.core.windows.net:8443/',
    sqlServerHostnameSuffix: '.database.windows.net',
    galleryEndpointUrl: 'https://gallery.azure.com/',
    activeDirectoryEndpointUrl: 'https://login.windows.net',
    activeDirectoryResourceId: 'https://management.core.windows.net/',
    commonTenantName: 'common',
    activeDirectoryGraphResourceId: 'https://graph.windows.net/',
    activeDirectoryGraphApiVersion: '2013-04-05'
  }),
  new Environment({
    name: 'AzureChinaCloud',
    portalUrl: 'http://go.microsoft.com/fwlink/?LinkId=301902',
    publishingProfileUrl: 'http://go.microsoft.com/fwlink/?LinkID=301774',
    managementEndpointUrl: 'https://management.core.chinacloudapi.cn',
    resourceManagerEndpointUrl: 'https://management.chinacloudapi.cn',
    sqlManagementEndpointUrl: 'https://management.core.chinacloudapi.cn:8443/',
    sqlServerHostnameSuffix: '.database.chinacloudapi.cn',
    galleryEndpointUrl: 'https://gallery.chinacloudapi.cn/',
    activeDirectoryEndpointUrl: 'https://login.chinacloudapi.cn',
    activeDirectoryResourceId: 'https://management.core.chinacloudapi.cn/',
    commonTenantName: 'common',
    activeDirectoryGraphResourceId: 'https://graph.windows.net/',
    activeDirectoryGraphApiVersion: '2013-04-05'
  })
];

module.exports = Environment;
