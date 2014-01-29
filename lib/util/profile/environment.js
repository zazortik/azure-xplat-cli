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

var constants = require('../constants');

function Environment(envData) {
  this.name = envData.name;
  this.realm = envData.realm || null;
  this.values = envData;
  _.defaults(this.values, {
    portalUrl: constants.DEFAULT_PORTAL_URL,
    publishingProfileUrl: constants.DEFAULT_PUBLISHINGPROFILE_URL,
    managementEndpointUrl: constants.DEFAULT_MANAGEMENTENDPOINT_URL,
    cloudServiceEndpointUrl: constants.DEFAULT_CLOUDSERVICE_ENDPOINT_URL,
    sqlManagementEndpointUrl: constants.DEFAULT_SQL_MANAGEMENTENDPOINT_URL,
    hostNameSuffix: constants.DEFAULT_HOSTNAME_SUFFIX,
    sqlServerHostNameSuffix: constants.DEFAULT_SQL_SERVER_HOSTNAME_SUFFIX,
    adTenantUrl: constants.DEFAULT_ACTIVEDIRECTORY_TENANT_URL,
    adCommonTenant: constants.COMMON_ACTIVEDIRECTORY_TENANT
  });
}

function getField(valueField, environmentVar)
{
  return function () {
    return process.env[environmentVar] || this.values[valueField];
  };
}

function getFieldWithRealm(valueField, environmentVar)
{
  function addRealm(targetUrl, realm) {
    if (realm) {
      var urlObj = url.parse(targetUrl, true);
      delete urlObj.search;
      urlObj.query.whr = realm;
      targetUrl = url.format(urlObj);
    }
    return targetUrl;
  }

  return function () {
    return process.env[environmentVar] || addRealm(this.values[valueField], this.realm);
  };
}

function propDescriptor(valueField, environmentVar, getter) {
  return {
    enumerable: true,
    configurable: false,
    get: getter(valueField, environmentVar),
    set: function (value) { this.values[valueField] = value; }
  };
}

Object.defineProperties(Environment.prototype, {
  portalUrl: propDescriptor('portalUrl', 'AZURE_PORTAL_URL', getFieldWithRealm),
  publishingProfileUrl: propDescriptor('publishingProfileUrl', 'AZURE_PUBLISHINGPROFILE_URL', getFieldWithRealm),
  managementEndpointUrl: propDescriptor('managementEndpointUrl', 'AZURE_MANAGEMENTENDPOINT_URL', getField),
  cloudServiceEndpointUrl: propDescriptor('cloudServiceEndpointUrl', 'AZURE_CLOUDSERVICEENDPOINT_URL', getField),
  sqlManagementEndpointUrl: propDescriptor('sqlManagementEndpointUrl', 'AZURE_SQL_MANAGEMENTENDPOINT_URL', getField),
  hostNameSuffix: propDescriptor('hostNameSuffix', 'AZURE_HOSTNAME_SUFFIX', getField),
  sqlServerHostnameSuffix: propDescriptor('sqlServerHostNameSuffix', 'AZURE_DQL_SERVER_HOSTNAME_SUFFIX', getField),
  adTenantUrl: propDescriptor('adTenantUrl', 'AZURE_ACTIVEDIRECTORY_TENANT_URL', getField),
  adCommonTenant: propDescriptor('adCommonTenant', 'AZURE_ACTIVEDIRECTORY_COMMON_TENANT', getField)
});

Environment.publicEnvironments = [
  new Environment({
    name: 'AzureCloud',
    publishingProfileUrl: constants.GLOBAL_PUBLISHINGPROFILE_URL,
    portalUrl: constants.GLOBAL_PORTAL_URL
  }),
  new Environment({
    name: 'AzureChinaCloud',
    publishingProfileUrl: constants.CHINA_PUBLISHINGPROFILE_URL,
    portalUrl: constants.CHINA_PORTAL_URL
  })
];

module.exports = Environment;