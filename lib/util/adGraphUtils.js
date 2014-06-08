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

var request = require('request');

exports.getUserIdByPrincipalName = function getUserObjectId(user, subscription, callback) {
  var credentials = subscription._createCredentials();
  credentials.accessToken.getGraphAccessInfo(function (graphAccess) {
    getUserProfile(graphAccess.tokenType + ' ' + graphAccess.token, graphAccess.tenantGuid, user, function (response) {
      var properties = JSON.parse(response);
      callback(null, properties['objectId']);
    });
  });
};

function getUserProfile(token, tenantId, principalName, callback) {
  var baseGraphUrl = 'https://graph.windows.net/' + tenantId + '/';
  var userSubQueryUrl;
  if (principalName) {
    userSubQueryUrl = 'users/' + principalName;
  } else {
    userSubQueryUrl = 'me';
  }
  var graphProfileUrl = baseGraphUrl + userSubQueryUrl + '?api-version=2013-11-08';

  var options = {
    url: graphProfileUrl,
    headers: {
      Authorization: 'Bearer ' + token
    }
  };

  request(options, function (error, response, body) {
    if (error) {
      console.log(response);
      return callback(new Error(error));
    }
    return callback(null, body);
  });
}