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
  this.managementCertificate = subscriptionData.managementCertificate;

  this.values = {};

  _.extend(this, _.omit(subscriptionData, 'environmentName'));

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
    'resourceManagementEndpointUrl',
    'sqlManagementEndpointUrl',
    'hostNameSuffix',
    'sqlServerHostNameSuffix',
    'activeDirectoryEndpointUrl',
    'storageEndpoint'
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
  *                            to RDFE management endpoint.
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
      if(_.isString(factory)) {
        factory = azure[factory];
      }
      var client = factory(this._createCredentials(),
        utils.stringTrimEnd(endpoint, '/'))
        .withFilter(log.createLogFilter())
        .withFilter(azure.UserAgentFilter.create(utils.getUserAgent()))
        .withFilter(utils.createPostBodyFilter())
        .withFilter(utils.createFollowRedirectFilter())
        .withFilter(utils.createFollowRedirectFilter());
      return client;
    }
  ),

  /**
  * Create rest client object that uses resource management endpoint
  * instead of the management endpoint.
  *
  * @param factory factory function to create client object
  */
  createResourceClient: function (factory) {
    return this.createClient(factory, this.resourceManagementEndpointUrl);
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
      managementCertificate: this.managementCertificate,
      accessToken: this.accessToken,
      isDefault: this.isDefault,
      environmentName: this.environment.name,
    };
    return _.extend(json, this.values);
  }
});

module.exports = Subscription;
