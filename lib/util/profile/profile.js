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
var fs = require('fs');

var CountedDict = require('./countedDict');
var Environment = require('./environment');

//
// Profile object - this manages the serialization of environment
// and subscription data for the current user.
//

function Profile() {
  var self = this;
  this.environments = new CountedDict();
  Environment.publicEnvironments.forEach(function (env) {
    self.environments[env.name] = env;
  });
  this.environment = this.environments.AzureCloud;

  this.subscriptions = new CountedDict();
  this.subscription = null;
}

Profile.load = function loadProfile(fileNameOrData) {
  if (_.isUndefined(fileNameOrData)) {
    return loadProfileFromFile(getDefaultProfileFileName());
  }
  if (_.isString(fileNameOrData)) {
    return loadProfileFromFile(fileNameOrData);
  }
  return loadProfileFromObject(fileNameOrData);
};

function loadProfileFromFile(fileName) {

}

function loadProfileFromObject(data) {
  return new Profile();
}

module.exports = Profile;