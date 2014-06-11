//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var azureCommon = require('azure-common');
var WebResource = azureCommon.WebResource;
var util = require('util');

var Service = azureCommon.Service;

function ADGraphUtils(credentials, baseUrl, tenantGuid, apiVersion) {
  if (!credentials ) {
    throw new Error('credentials cannot be null.');
  }
  if (!baseUrl) {
    throw new Error('baseUrl cannot be null.');
  }
  if (!tenantGuid) {
    throw new Error('tenantGuid cannot be null.');
  }
  if (!apiVersion) {
    throw new Error('apiVersion cannot be null.');
  }

  ADGraphUtils['super_'].call(this, credentials);

  this.credentials = credentials;

  if (baseUrl[baseUrl.length - 1] !== '/') {
    baseUrl = baseUrl + '/';
  }
  this.baseUrl = baseUrl;

  this.tenantGuid = tenantGuid;
  this.apiVersion = apiVersion;
}

util.inherits(ADGraphUtils, Service);

ADGraphUtils.prototype.getUserId = function getUserObjectId(user, callback) {
  var url = this.baseUrl;

  var queryExp;
  if (user) {
    queryExp = 'users/' + user;
  } else {
    queryExp = 'me';
  }

  url = url + this.tenantGuid + '/' + queryExp + '?api-version=' + this.apiVersion;

  var httpRequest = new WebResource();
  httpRequest.method = 'GET';
  httpRequest.headers = {};
  httpRequest.url = url;

  // Set Headers
  httpRequest.headers['Content-Type'] = 'application/json';

  // Send Request
  return this.pipeline(httpRequest, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    if (response.statusCode !== 200) {
      var error = new Error(body);
      error.statusCode = response.statusCode;
      return callback(error);
    }

    var properties = JSON.parse(body);
    callback(null, properties['objectId']);
  });
};

ADGraphUtils.prototype.getUsers = function getUsers(userIds, callback) {
  var url = this.baseUrl + '/' + this.tenantGuid + '/getObjectsByObjectIds?api-version=' + this.apiVersion;

  var httpRequest = new WebResource();
  httpRequest.method = 'POST';
  httpRequest.headers = {};
  httpRequest.url = url;

  // Set Headers
  httpRequest.headers['Content-Type'] = 'application/json';

  // Set Body
  httpRequest.body = JSON.stringify({
    objectIds: userIds,
    types: ['StubDirectoryObject']
  });

  // Send Request
  return this.pipeline(httpRequest, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    if (response.statusCode !== 200) {
      var error = new Error(body);
      error.statusCode = response.statusCode;
      return callback(error);
    }

    var payload = JSON.parse(body);
    var users = payload['value'];
    callback(null, users);
  });
};

function adGraphUtilsFactory(subscription) {
  var credentials = subscription._createCredentials();
  var graphUtils = new ADGraphUtils(credentials,
      subscription.environment.activeDirectoryGraphResourceId,
      subscription.tenantId,
      subscription.environment.activeDirectoryGraphApiVersion);
  return graphUtils;
}

exports.adGraphUtilsFactory = adGraphUtilsFactory;