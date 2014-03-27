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
var url = require('url');
var util = require('util');

var adalAuth = require('../authentication/adalAuth');
var AccessTokenCloudCredentials = require('../authentication/accessTokenCloudCredentials');
var log = require('../logging');
var providerRegistrationFilter = require('./providerRegistrationFilter');
var utils = require('../utils');
var $ = utils.getLocaleString;

function Subscription(subscriptionData, environment) {
  var self = this;
  if (subscriptionData.accessToken) {
    subscriptionData.accessToken = new adalAuth.AdalAccessToken(
      subscriptionData.accessToken.authConfig,
      subscriptionData.accessToken.accessToken,
      subscriptionData.accessToken.refreshToken,
      subscriptionData.accessToken.expiresAt);

    subscriptionData.accessToken.on('updated', function () {
      self.emit('updated');
    });
  }

  this.id = subscriptionData.id;
  if (subscriptionData.managementCertificate) {
    this.managementCertificate = subscriptionData.managementCertificate;
  }

  this.values = {};

  _.extend(this, _.omit(subscriptionData, 'environmentName'));
  _.defaults(this, { registeredResourceNamespaces: [], registeredProviders: []});

  this.isDefault = this.isDefault || false;
  this.environment = environment;
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
    'sqlServerHostNameSuffix',
    'activeDirectoryEndpointUrl',
    'storageEndpoint',
    'galleryEndpointUrl'
    )
  );

_.extend(Subscription.prototype, {
  /**
  * Create new-style rest client object
  *
  * @param {function|string} factory factory function to create client object
  * @param {object} credential credentials object. Optional. If not specified defaults
  *                            to default credentials for this subscription.
  *
  * @param {string} endpoint   endpoint - optional. If not specified defaults
  *                            to ASM management endpoint.
  *
  * @returns {object} The created client object
  */
  createClient: utils.overload(
    function (factory) {
      return this.createClient(factory, this._createCredentials(), this.managementEndpointUrl);
    },

    function (factory, endpoint) {
      return this.createClient(factory, this._createCredentials(), endpoint);
    },

    function (factory, credentials, endpoint) {
      return utils.createClient(factory, credentials, endpoint).withFilter(providerRegistrationFilter(this));
    }
  ),

  /**
  * Create rest client object that uses resource management endpoint
  * instead of the management endpoint.
  *
  * @param factory factory function to create client object
  */
  createResourceClient: function (factory) {
    return this.createClient(factory, this.resourceManagerEndpointUrl);
  },

  /**
  * Create old-style service object
  * @param {string} serviceFactoryName name of factory function off azure module
  */
  createService: function (serviceFactoryName) {
    var managementEndpoint = url.parse(this.managementEndpointUrl);
    var service = azure[serviceFactoryName](this.id, {
      keyvalue: this.managementCertificate.key,
      certvalue: this.managementCertificate.cert,
    },
    {
      host: managementEndpoint.hostname,
      port: managementEndpoint.port,
      serializetype: 'XML'
    }).withFilter(new utils.RequestLogFilter(log));
    return service;
  },

  exportManagementCertificate: function (outputFile) {
    if (!this.managementCertificate) {
      throw new Error($('This subscription does not use a management certificate'));
    }
    var pemData = this.managementCertificate.key + this.managementCertificate.cert;
    utils.writeFileSyncMode(outputFile, pemData, 'utf8');
  },

  _createCredentials: function () {
    if (this.accessToken) {
      return new AccessTokenCloudCredentials(this.accessToken, this.id);
    }

    if (this.managementCertificate) {
      return new azure.CertificateCloudCredentials({
        subscriptionId: this.id,
        cert: this.managementCertificate.cert,
        key: this.managementCertificate.key
      });
    }

    throw new Error($('No token or management certificate, cannot create credentials'));
  },

  toJSON: function () {
    var json = {
      id: this.id,
      name: this.name,
      username: this.username,
      managementCertificate: this.managementCertificate,
      accessToken: this.accessToken,
      isDefault: this.isDefault,
      environmentName: this.environment.name,
      registeredProviders: this.registeredProviders,
      registeredResourceNamespaces: this.registeredResourceNamespaces
    };
    return _.extend(json, this.values);
  },

  // ASM and ARM provider registration, called from registrationFilter
  registerProvider: function (providerName, callback) {
    var self = this;
    var client = utils.createClient('createManagementClient', self._createCredentials(), self.managementEndpointUrl);
    log.verbose(util.format($('Registering resource %s with subscription %s'), providerName, self.id));
    client.subscriptions.registerResource(providerName, function (err) {
      if (err) {
        // 409 - conflict means the resource is already registered. Not an error
        if (err.statusCode === 409) {
          log.silly(util.format($('Resource %s is already registered'), providerName));
        } else {
          callback(err);
        }
      }
      self.registeredProviders.push(providerName);
      self.emit('updated');
      callback();
    });
  },

  registerResourceNamespace: function (namespace, callback) {
    var self = this;
    var client = utils.createClient('createResourceManagementClient', self._createCredentials(), self.resourceManagerEndpointUrl);
    var numRetries = 5;
    var pollIntervalInMS = 10 * 1000;

    function waitForRegistrationComplete(retriesLeft, cb) {
      if (retriesLeft === 0) {
        // If code gets here, it's most likely a resource provider
        // issue server side. Log but don't raise error so code doesn't
        // repeat trying to register the broken provider.
        log.verbose(util.format($('Namespace %s registration took too long to complete'), namespace));
        return cb();
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
        // We explicitly ignore registration failure, since it's usually because it's already
        // registered.
        log.verbose(util.format($('Registration of resource namespace %s failed'), namespace));
        return callback();
      }

      waitForRegistrationComplete(numRetries, function (err) {
        if (!err) {
          self.registeredResourceNamespaces.push(namespace);
          self.emit('updated');
        }
        callback();
      });
    });
  }
});

module.exports = Subscription;
