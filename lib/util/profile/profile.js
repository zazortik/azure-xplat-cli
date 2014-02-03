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

var Environment = require('./environment');
var Subscription = require('./subscription');

var utils = require('../utils');
//
// Profile object - this manages the serialization of environment
// and subscription data for the current user.
//

function Profile() {
  var self = this;
  self.environments = {};
  Environment.publicEnvironments.forEach(function (env) {
    self.addEnvironment(env);
  });
  self.subscriptions = {};
  self.subscription = null;
}

_.extend(Profile.prototype, {
  addEnvironment: function (env) {
    this.environments[env.name] = env;
  },

  addSubscription: function (subscription) {
    if (subscription.isDefault) {
      _.values(this.subscriptions).forEach(function (s) { s.isDefault = false; });
      this.subscription = subscription;
    }
    this.subscriptions[subscription.name] = subscription;
  },

  saveToStream: function (stream) {
    stream.write(JSON.stringify(this._getSaveData()), 'utf8');
    stream.end();
  },

  save: function (fileName) {
    if (!fileName) {
      fileName = defaultProfileFile;
    }

    fs.writeFileSync(fileName, JSON.stringify(this._getSaveData()));
  },

  _getSaveData: function () {
    return {
      environments: _.values(this.environments),
      subscriptions: _.values(this.subscriptions)
    };
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
  if (utils.pathExistsSync(defaultProfileFile)) {
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
  if (data.subscriptions) {
    data.subscriptions.forEach(function (subData) {
      p.addSubscription(new Subscription(subData));
    });
  }
  return p;
}

var defaultProfileFile = path.join(utils.azureDir(), 'azureProfile.json');

var defaultProfile = Profile.load(defaultProfileFile);
defaultProfile.load = Profile.load;
defaultProfile.defaultProfileFile = defaultProfileFile;

module.exports = defaultProfile;