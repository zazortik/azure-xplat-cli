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
var path = require('path');

if (_.isUndefined(fs.existsSync)) {
  fs.existsSync = path.existsSync;
}

var CountedDict = require('./countedDict');
var Environment = require('./environment');
var utils = require('../utils');
//
// Profile object - this manages the serialization of environment
// and subscription data for the current user.
//

function Profile() {
  var self = this;
  self.environments = new CountedDict();
  Environment.publicEnvironments.forEach(function (env) {
    self.addEnvironment(env);
  });
  self.subscriptions = new CountedDict();
  self.subscription = null;
}

_.extend(Profile.prototype, {
  addEnvironment: function (env) {
    this.environments[env.name] = env;
  }
});

Profile.load = function loadProfile(fileNameOrData) {
  if (_.isUndefined(fileNameOrData)) {
    return loadProfileFromFile(defaultProfileFile);
  }
  if (_.isString(fileNameOrData)) {
    return loadProfileFromFile(fileNameOrData);
  }
  return loadProfileFromObject(fileNameOrData);
};

function loadProfileFromFile(fileName) {
  if (fs.existsSync(defaultProfileFile)) {
    return loadProfileFromObject(JSON.parse(fs.readFileSync(fileName, { encoding: 'utf8', flag: 'r'})));
  }
  return new Profile();
}

function loadProfileFromObject(data) {
  var p = new Profile();
  if (data.environments) {
    data.environments.forEach(function (envData) {
      var e = new Environment(envData);
      p.addEnvironment(e);
    });
  }
  return p;
}

var defaultProfileFile = path.join(utils.azureDir(), 'azureProfile.json');

var defaultProfile = Profile.load(defaultProfileFile);
defaultProfile.load = Profile.load;
defaultProfile.defaultProfileFile = defaultProfileFile;

module.exports = defaultProfile;