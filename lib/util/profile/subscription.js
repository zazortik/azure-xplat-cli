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
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var adalAuth = require('../authentication/adalAuth');
var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');
var log = require('../logging');
var utils = require('../utils');
var $ = utils.getLocaleString;

function Subscription(subscriptionData, environment) {
  this.id = subscriptionData.id;
  if (subscriptionData.managementCertificate) {
    this.managementCertificate = subscriptionData.managementCertificate;
  }

  this.values = {};

  _.extend(this, _.omit(subscriptionData, 'environmentName', 'username'));

  this.isDefault = this.isDefault || false;
  this.environment = environment;

  if (_.isUndefined(subscriptionData.user)) {
    if (subscriptionData.username) {
      this.user = {
        name: subscriptionData.username,
        tenant: null,
        type: 'user'
      };
    }
  }

  this.registeredProviders = subscriptionData.registeredProviders || [];
}

util.inherits(Subscription, EventEmitter);

function getField(fieldName) {
  /*jshint validthis: true */
  return this.values[fieldName] || this.environment[fieldName];
}

function setField(fieldName, value) {
  /*jshint validthis: true */
  this.values[fieldName] = value;
}

function descriptorForField(fieldName) {
  return {
    enumerable: true,
    configurable: false,
    get: function () { return getField.call(this, fieldName); },
    set: function (value) { return setField.call(this, fieldName, value); }
  };
}

function descriptorsFor() {
  return _.object(arguments, _.map(arguments, descriptorForField));
}

Object.defineProperties(Subscription.prototype,
  descriptorsFor(
    'managementEndpointUrl',
    'resourceManagerEndpointUrl',
    'sqlManagementEndpointUrl',
    'hostNameSuffix',
    'sqlServerHostnameSuffix',
    'activeDirectoryEndpointUrl',
    'storageEndpoint',
    'galleryEndpointUrl',
    'activeDirectoryGraphResourceId'
    )
  );

_.extend(Subscription.prototype, {
  /**
  * Update this subscription object with values from the
  * given subscription.
  *
  * @param {object} subscription Other subscription object to pull values from.
  *
  * @returns {object} this
  */
  updateFrom: function (subscription) {
    _.extend(this.values, subscription.values);

    if (subscription.user) {
      this.user = subscription.user;
    }

    if (subscription.managementCertificate) {
      this.managementCertificate = subscription.managementCertificate;
    }
    return this;
  },

  exportManagementCertificate: function (outputFile) {
    if (!this.managementCertificate) {
      throw new Error($('This subscription does not use a management certificate'));
    }
    var pemData = this.managementCertificate.key + this.managementCertificate.cert;
    utils.writeFileSyncMode(outputFile, pemData, 'utf8');
  },

  _createCredentials: function () {
    var token;
    var authConfig = this.environment.getAuthConfig();
    if (this.user) {
      switch (this.user.type) {
        case 'user':
          token = new adalAuth.AdalAccessToken(authConfig, this.user.name);
          break;

        case 'servicePrincipal':
          authConfig.tenantId = this.user.tenant;
          token = new adalAuth.ServicePrincipalAccessToken(authConfig, this.user.name);
          break;

        default:
          throw new Error($('Unknown user type, cannot create credentials'));
      }
      return new AccessTokenCloudCredentials(token, this.id);
    } else if (this.managementCertificate) {
      return new azure.CertificateCloudCredentials({
        subscriptionId: this.id,
        cert: this.managementCertificate.cert,
        key: this.managementCertificate.key
      });
    }

    throw new Error($('No token or management certificate, cannot create credentials'));
  },

  toJSON: function () {
    return _.extend(
      _.pick(this,
        'id', 'name', 'user', 'managementCertificate', 'accessToken', 'tenantId',
        'isDefault', 'registeredProviders'),
      { environmentName: this.environment.name },
      this.values);
  },

  isAsmProviderRegistered: function (providerName) {
    var result = false;
    if (this.registeredProviders.some(function (item) {
      return utils.ignoreCaseEquals(item, providerName);
    })) {
      result = true;
    }
    return result;
  },

  registerAsmProvider: function (providerName, callback) {
    var self = this;
    if (!self.isAsmProviderRegistered(providerName)) {
      var client = utils.createManagementClient(self);
      log.verbose(util.format($('Registering resource %s with subscription %s'), providerName, self.id));
      client.subscriptions.registerResource(providerName, function (err) {
        if (err) {
          // 409 - conflict means the resource is already registered. Not an error
          if (err.statusCode === 409) {
            log.silly(util.format($('Resource %s is already registered'), providerName));
          } else {
            return callback(err);
          }
        }
        self.registeredProviders.push(providerName);
        self.emit('updated');
        callback();
      });
    } else {
      callback();
    }
  },

  registerArmProvider: function (namespace, callback) {
    var self = this;
    var client = utils.createResourceClient(self);
    var numRetries = 5;
    var pollIntervalInMS = 10 * 1000;

    function waitForRegistrationComplete(retriesLeft, cb) {
      if (retriesLeft === 0) {
        return cb(util.format($('Namespace %s registration took too long to complete'), namespace));
      }

      client.providers.get(namespace, function (err, result) {
        if (!err) {
          if (utils.ignoreCaseEquals(result.provider.registrationState,'Registered')) {
            log.verbose(util.format($('Registration of resource provider %s completed'), namespace));
            return cb();
          }
        }
        setTimeout(function () { waitForRegistrationComplete(retriesLeft - 1, cb); }, pollIntervalInMS);
      });
    }

    log.verbose(util.format($('Registering resource namespace %s with subscription %s'), namespace, self.id));
    client.providers.register(namespace, function (err) {
      if (err) {
        return callback(err);
      }
      waitForRegistrationComplete(numRetries, function (err) {
        return callback(err);
      });
    });
  },

  unRegisterArmProvider: function (namespace, callback) {
    var self = this;
    var client = utils.createResourceClient(self);

    log.verbose(util.format($('Un-registering resource namespace %s with subscription %s'), namespace, self.id));
    client.providers.unregister(namespace, function (err) {
      if (err) {
        log.error(util.format($('Un-registering resource namespace %s failed'), namespace));
        return callback(err);
      }
      callback();
    });
  }
});

module.exports = Subscription;
