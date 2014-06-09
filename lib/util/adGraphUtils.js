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

exports.getUserId = function getUserObjectId(user, subscription, callback) {
  var credentials = subscription._createCredentials();
  credentials.accessToken.getGraphAccessInfo(function (err, graphAccess) {
    if (err) {
      callback(new Error(err));
      return;
    }
    var authorization = graphAccess.tokenType + ' ' + graphAccess.token;
    getUser(user, authorization, graphAccess.tenantGuid, subscription.environment, function (err, response) {
      if (err) {
        callback(new Error(err));
        return;
      }
      var properties = JSON.parse(response);
      callback(null, properties['objectId']);
    });
  });
};

exports.getUsers = function getUsers(userIds, subscription, callback) {
  var credentials = subscription._createCredentials();
  credentials.accessToken.getGraphAccessInfo(function (err, graphAccess) {
    if (err) {
      callback(new Error(err));
      return;
    }
    var authorization = graphAccess.tokenType + ' ' + graphAccess.token;
    getUsersByUserIds(userIds, authorization, graphAccess.tenantGuid, subscription.environment, function (err, response) {
      if (err) {
        callback(new Error(err));
        return;
      }
      var users = JSON.parse(response);
      callback(null, users);
    });
  });
};


function getUser(principalName, authorization, tenantId, environment, callback) {
  var baseGraphUrl = environment.activeDirectoryGraphResourceId + tenantId + '/';
  var userSubQueryUrl;
  if (principalName) {
    userSubQueryUrl = 'users/' + principalName;
  } else {
    userSubQueryUrl = 'me';
  }
  var requestUrl = baseGraphUrl + userSubQueryUrl + '?api-version=' + environment.activeDirectoryGraphApiVersion;

  var options = {
    url: requestUrl,
    headers: {
      Authorization: authorization
    }
  };

  request(options, function (error, response, body) {
    if (error) {
      return callback(new Error(error));
    }
    return callback(null, body);
  });
}

function getUsersByUserIds(userIds, authorization, tenantId, environment, callback) {
  var requestUrl = environment.activeDirectoryGraphResourceId + tenantId +
    '/getObjectsByObjectIds?api-version=' + environment.activeDirectoryGraphApiVersion;

  var options = {
    url: requestUrl,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      objectIds: userIds,
      types: ['StubDirectoryObject']
    })
  };

  request.post(options, function (error, response, body) {
    if (error) {
      console.log(response);
      return callback(new Error(error));
    }
    return callback(null, body);
  });
}