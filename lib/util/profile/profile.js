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
var util = require('util');

var Environment = require('./environment');
var Subscription = require('./subscription');
var publishSettings = require('./publishSettings');
var utils = require('../utils');
var $ = utils.getLocaleString;

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
}

Object.defineProperty(Profile.prototype, 'currentSubscription', {
  enumerable: true,
  get: function () {
    return _.chain(this.subscriptions)
      .values()
      .filter(function (s) { return s.isDefault; })
      .first()
      .value() || null;
  },

  set: function (value) {
    _.values(this.subscriptions)
      .forEach(function (s) { s.isDefault = false; });
    if (value) {
      value.isDefault = true;
    }
  }
});

_.extend(Profile.prototype, {
  addEnvironment: function (env) {
    this.environments[env.name] = env;
  },

  getEnvironment: function (envName) {
    var key = _.keys(this.environments)
      .filter(function (env) { return utils.ignoreCaseEquals(env, envName); })[0];
    return this.environments[key];
  },

  deleteEnvironment: function (environmentOrName) {
    if (_.isString(environmentOrName)) {
      delete this.environments[environmentOrName];
    } else {
      delete this.environments[environmentOrName.name];
    }
  },

  addSubscription: function (subscription) {
    if (subscription.isDefault) {
      this.currentSubscription = null;
    }
    this.subscriptions[subscription.name] = subscription;
  },

  deleteSubscription: function (subscriptionOrName) {
    var subscription = subscriptionOrName;
    if (_.isString(subscriptionOrName)) {
      subscription = this.subscriptions[subscriptionOrName];
    }

    if (subscription.isDefault) {
      var remainingSubscriptions = _.values(this.subscriptions)
        .filter(function (sub) { return sub.name !== subscription.name; });
      if (_.first(remainingSubscriptions)) {
        remainingSubscriptions[0].isDefault = true;
      }
    }

    delete this.subscriptions[subscription.name];
  },

  getSubscription: function (idOrName) {
    if (!idOrName) {
      return this.currentSubscription;
    }
    return this.subscriptions[idOrName] ||
    _.values(this.subscriptions)
    .filter(function (s) { return utils.ignoreCaseEquals(s.id, idOrName); })[0];
  },

  importPublishSettings: function (fileName) {
    var self = this;
    _.each(publishSettings.import(fileName), function (subData) {
      var newSubscription = new Subscription(subData, self._findEnvironment(subData));
      self.addSubscription(newSubscription);
      if (!self.currentSubscription) {
        newSubscription.isDefault = true;
      }
    });
  },

  saveToStream: function (stream) {
    stream.write(JSON.stringify(this._getSaveData(), null, 4), 'utf8');
    stream.end();
  },

  save: function (fileName) {
    if (!fileName) {
      fileName = defaultProfileFile;
    }

    fs.writeFileSync(fileName, JSON.stringify(this._getSaveData(), null, 4));
  },

  _getSaveData: function () {
    return {
      environments: _.values(this.environments).map(function (e) { return e.toJSON(); }),
      subscriptions: _.values(this.subscriptions).map(function (s) { return s.toJSON(); })
    };
  },

  /**
  * Find an environment with a matching management endpoint
  * @param {object} subscriptionData subscription data from publishsettings file
  *
  * @returns corresponding environment object or throws if not found.
  */
  _findEnvironment: function (subscriptionData) {
    var trimmedEndpoint = utils.stringTrimEnd(subscriptionData.managementEndpointUrl, '/');

    var found = _.values(this.environments).filter(function (e) {
      return utils.ignoreCaseEquals(trimmedEndpoint, utils.stringTrimEnd(e.managementEndpointUrl));
    });
    if (found.length === 0) {
      throw new Error(util.format(
        $('Could not find an environment with management endpoint %s. Create one and import this publishSettings file again.'),
        subscriptionData.managementEndpointUrl));
    }
    return found[0];
  }
});

function load(fileNameOrData) {
  var profile = new Profile();
  if (_.isUndefined(fileNameOrData)) {
    loadProfileFromFile(profile, defaultProfileFile);
  } else if (_.isString(fileNameOrData)) {
    loadProfileFromFile(profile, fileNameOrData);
  } else {
    loadProfileFromObject(profile, fileNameOrData);
  }
  return profile;
}

function loadProfileFromFile(profile, fileName) {
  profile.fileName = fileName;
  if (utils.pathExistsSync(defaultProfileFile)) {
    loadProfileFromObject(profile, JSON.parse(fs.readFileSync(fileName, { encoding: 'utf8', flag: 'r'})));
  }
  return profile;
}

function loadProfileFromObject(profile, data) {
  if (data.environments) {
    data.environments.forEach(function (envData) {
      var e = new Environment(envData);
      profile.addEnvironment(e);
    });
  }
  if (data.subscriptions) {
    data.subscriptions.forEach(function (subData) {
      profile.addSubscription(new Subscription(subData, profile.environments[subData.environmentName]));
    });
    if(!profile.currentSubscription && data.subscriptions.length > 0) {
      profile.getSubscription(data.subscriptions[0].id).isDefault = true;
    }
  }
  return profile;
}

var defaultProfileFile = path.join(utils.azureDir(), 'azureProfile.json');

var currentProfile = load(defaultProfileFile);

_.extend(module.exports, {
  load: load,
  defaultProfileFile: defaultProfileFile,
  Profile: Profile,
  Subscription: Subscription,
  Environment: Environment,
  current: currentProfile,
  getSubscription: function (subscription) {
    return currentProfile.getSubscription(subscription);
  }
});
