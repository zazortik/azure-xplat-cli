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

var constants = require('../../../lib/util/constants');
var profile = require('../../../lib/util/profile');

describe('Environment', function () {
  var environment;

  function tokenProvider(authConfig, username, password, callback) {
    callback(null, {
      accessToken: 'a dummy token',
      expiresOn: new Date(Date.now() + 5 * 60 * 1000)
    });
  }

  before(function () {
    environment = new profile.Environment({ name: 'TestEnvironment' });
    environment.acquireToken = sinon.spy(tokenProvider);
  });

  describe('When creating account', function () {
    var subscription;

    beforeEach(function (done) {
      environment.addAccount('user@somedomain.org', 'sekretPa$$w0rd', function (err, newSubscription) {
        subscription = newSubscription;
        done();
      });
    });


    it('should have called the token provider', function () {
      environment.acquireToken.calledOnce.should.be.true;
    });

    it('should pass expected configuration to tokn provider', function () {
      var config = environment.acquireToken.firstCall.args[0];

      config.should.have.properties({
        authorityUrl: environment.activeDirectoryEndpointUrl,
        tenantId: 'somedomain.org',
        clientId: constants.XPLAT_CLI_CLIENT_ID,
        resourceId: constants.AZURE_MANAGEMENT_RESOURCE_ID
      });
    });

    it('should return a subscription with expected token', function () {
      should.exist(subscription.accessToken);
      subscription.accessToken.accessToken.should.equal('a dummy token');
    });
  });
});
