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
var should = require('should');
var sinon = require('sinon');
var util = require('util');

var constants = require('../../../lib/util/constants');
var profile = require('../../../lib/util/profile');

var expectedSubscriptions = [
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    subscriptionName: 'Account'
  },
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
    subscriptionName: 'Other'
  }
];

var expectedToken = {
  accessToken: 'a dummy token',
  expiresOn: new Date(Date.now() + 2 * 60 * 60 * 1000)
};

describe('Environment', function () {
  var environment;

  before(function () {
    environment = new profile.Environment({ name: 'TestEnvironment' });
    sinon.stub(environment, 'acquireToken').callsArgWith(3, null, expectedToken);
    sinon.stub(environment, 'getAccountSubscriptions').callsArgWith(1, null, expectedSubscriptions);
  });

  describe('When creating account', function () {
    var subscriptions;

    beforeEach(function (done) {
      environment.addAccount('user@somedomain.org', 'sekretPa$$w0rd', function (err, newSubscriptions) {
        subscriptions = newSubscriptions;
        done();
      });
    });


    it('should have called the token provider', function () {
      environment.acquireToken.called.should.be.true;
    });

    it('should have listed subscriptions', function () {
      environment.getAccountSubscriptions.called.should.be.true;
    });

    it('should pass expected configuration to token provider', function () {
      var config = environment.acquireToken.firstCall.args[0];

      config.should.have.properties({
        authorityUrl: environment.activeDirectoryEndpointUrl,
        tenantId: constants.DEFAULT_COMMON_ACTIVEDIRECTORY_TENANT_NAME,
        clientId: constants.XPLAT_CLI_CLIENT_ID,
        resourceId: constants.AZURE_MANAGEMENT_RESOURCE_ID
      });
    });

    it('should pass token to get subscriptions', function() {
      var token = environment.getAccountSubscriptions.firstCall.args[0];
      token.should.equal(expectedToken.accessToken);
    });

    it('should return a subscription with expected token', function () {
      should.exist(subscriptions[0].accessToken);
      subscriptions[0].accessToken.accessToken.should.equal('a dummy token');
    });

    it('should return listed subscriptions', function () {
      subscriptions.should.have.length(expectedSubscriptions.length);
      for(var i = 0, len = subscriptions.length; i < len; ++i) {
        subscriptions[i].id.should.equal(expectedSubscriptions[i].subscriptionId);
        subscriptions[i].name.should.equal(expectedSubscriptions[i].subscriptionName);
      }
    });

    it('should have same token for all subscription', function () {
      subscriptions.forEach(function (s) {
        s.accessToken.accessToken.should.equal(expectedToken.accessToken);
      });
    });
  });
});
