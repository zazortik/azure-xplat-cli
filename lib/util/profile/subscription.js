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

var log = require('../logging');
var utils = require('../utils');

function Subscription(subscriptionData) {
  _.extend(this, subscriptionData);
  this.isDefault = this.isDefault || false;
}

_.extend(Subscription.prototype, {
  /**
  * Create old-style service object
  * @param factory factory function to create service object
  */
  createService: function (factory) {
    return factory(this._createCredentials(), this.managementEndpointUrl);
  },

  /**
  * Create new-style rest client object
  *
  * @param factory factory function to create client object
  */
  createClient: function (factory) {
    var service = factory(this._createCredentials(),
      utils.stringTrimEnd(this.managementEndpointUrl, '/'))
      .withFilter(log.createLogFilter())
      .withFilter(azure.userAgentFilter.create(utils.getUserAgent()))
      //.withFilter(createPostBodyFilter())
      //.withFilter(createFollowRedirectFilter())
      //.withFilter(createFollowRedirectFilter());
      ;
    return service;
  },

  _createCredentials: function () {
    if (this.managementCertificate) {
      return new azure.CertificateCloudCredentials({
        subscriptionId: this.id,
        cert: this.managementCertificate.cert,
        key: this.managementCertificate.key
      });
    }

    throw new Error('No management certificate, cannot create credentials');
  }
});

module.exports = Subscription;
