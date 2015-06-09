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
var subscriptionUtils = require('../../../lib/util/profile/subscriptionUtils');

var expectedUserName = 'user@somedomain.example';
var expectedPassword = 'sekretPa$$w0rd';

var testTenantIds = ['2d006e8c-61e7-4cd2-8804-b4177a4341a1'];

var expectedSubscriptions =
[
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    displayName: 'Account',
    username: expectedUserName,
    activeDirectoryTenantId: testTenantIds[0]
  },
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
    displayName: 'Other',
    username: expectedUserName,
    activeDirectoryTenantId: testTenantIds[0]
  },
];

var expectedASMSubscriptions =
[
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    subscriptionName: 'Mooncake Account',
    username: expectedUserName
  },
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
    subscriptionName: 'Mooncake Other',
    username: expectedUserName
  },
];

var testSubscriptionsFromTenant = [
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    displayName: 'Account'
  },
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
    displayName: 'Other'
  }
];

var testSubscriptionsFromASM = [
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
    subscriptionName: 'Mooncake Account'
  },
  {
    subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
    subscriptionName: 'Mooncake Other'
  }
];


var expectedToken = {
  accessToken: 'a dummy token',
  expiresOn: new Date(Date.now() + 2 * 60 * 60 * 1000),
  userId: expectedUserName,
  authenticateRequest: function () { }
};


var testArmSubscriptionClient = {
  subscriptions: {
    list: function (callback) {
      callback(null, {subscriptions: testSubscriptionsFromTenant });
    }
  },
  tenants: {
    list: function (callback) {
      callback(null, {
        tenantIds: testTenantIds.map(function (id) {
          return { tenantId: id };})
        }
      );
    }
  }
};

var testAsmSubscriptionClient = {
  subscriptions: {
    list: function (callback) {
      console.log('ASM list subscriptions invoked');
      callback(null, {subscriptions: testSubscriptionsFromASM });
    }
  }
};

describe('Environment', function () {
  var environment;

  before(function () {
    environment = new profile.Environment({
      name: 'TestEnvironment',
      activeDirectoryEndpointUrl: 'http://notreal.example',
      commonTenantName: 'common',
      resourceManagerEndpointUrl: 'https://login.notreal.example/',
      activeDirectoryResourceId: 'http://login.notreal.example'
    });

    sinon.stub(environment, 'acquireToken').callsArgWith(3/*4th parameter of 'acquireToken' is the callback*/,
      null/*no error*/, expectedToken/*the access token*/);
    sinon.stub(environment, 'getArmClient').returns(testArmSubscriptionClient);
  });

  describe('When creating account', function () {
    var subscriptions;

    beforeEach(function (done) {
      environment.addAccount(expectedUserName, expectedPassword, '', false, function (err, newSubscriptions) {
        subscriptions = newSubscriptions;
        done();
      });
    });

    it('should have called the token provider', function () {
      environment.acquireToken.called.should.be.true;
    });

    it('should have call to get arm client', function () {
      environment.getArmClient.called.should.be.true;
    });

    it('should pass expected configuration to token provider', function () {
      var username = environment.acquireToken.firstCall.args[0];
      username.should.equal(expectedUserName);

      var password = environment.acquireToken.firstCall.args[1];
      password.should.equal(expectedPassword);

      var tenantId1 = environment.acquireToken.firstCall.args[2];
      tenantId1.should.equal(''); // null or '' mean using the common tenant

      var tenantId2 = environment.acquireToken.secondCall.args[2];
      tenantId2.should.equal(testTenantIds[0]);
    });

    it('should return a subscription with expected username', function () {
      should.exist(subscriptions[0].user);
      subscriptions[0].user.name.should.equal(expectedUserName);
    });

    it('should return listed subscriptions', function () {
      subscriptions.should.have.length(expectedSubscriptions.length);
      for(var i = 0, len = subscriptions.length; i < len; ++i) {
        subscriptions[i].id.should.equal(expectedSubscriptions[i].subscriptionId);
        subscriptions[i].name.should.equal(expectedSubscriptions[i].displayName);
      }
    });

    it('should have same username for all subscription', function () {
      subscriptions.forEach(function (s) {
        s.user.name.should.equal(expectedUserName);
      });
    });

    it('should have same tenant id for all subscription', function () {
      subscriptions.forEach(function (s) {
        s.tenantId.should.equal(testTenantIds[0]);
      });
    });
  });
});

describe('Environment', function () {
  var environment;
  
  before(function () {
    environment = new profile.Environment({
      name: 'TestEnvironment',
      resourceManagerEndpointUrl: 'https://login.notreal.example/'
    });
    
    sinon.stub(environment, 'acquireToken').callsArgWith(3/*4th parameter of 'acquireToken' is the callback*/,
      null/*no error*/, expectedToken/*the access token*/);
    sinon.stub(environment, 'getArmClient').returns(testArmSubscriptionClient);
  });
  
  describe('When creating account with tenant specified', function () {
    var subscriptions;
    
    beforeEach(function (done) {
      environment.addAccount(expectedUserName, expectedPassword, 'niceTenant', false, function (err, newSubscriptions) {
        subscriptions = newSubscriptions;
        done();
      });
    });
    
    it('should pass expected configuration to token provider', function () {
      //we should only invoke acquireToken Once because the tenant is provided.
      var tenantId = environment.acquireToken.firstCall.args[2];
      tenantId.should.equal('niceTenant');
      (!!environment.acquireToken.secondCall).should.be.false;
    });
  });
});