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

var should = require('should');

var Account = require('../../../lib/util/profile/account');

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

var testArmSubscriptionClient = {
  subscriptions: {
    list: function (callback) {
      callback(null, { subscriptions: testSubscriptionsFromTenant });
    }
  },
  tenants: {
    list: function (callback) {
      callback(null, {
        tenantIds: testTenantIds.map(function (id) {
          return { tenantId: id };
        })
      }
      );
    }
  }
};

var sampleAuthContext = {
  userId: expectedUserName,
  authConfig: { tenantId: testTenantIds[0] },
  retrieveTokenFromCache: function () { }
};

var environment = {
  activeDirectoryEndpointUrl: 'http://login.notreal.example',
  activeDirectoryResourceId: 'http://management.core.notreal.example',
  resourceManagerEndpointUrl: 'https://arm.notreal.example/',
  name: 'Azure',
  getAuthConfig: function (tenantId) {
    return {
      authorityUrl: 'http://login.notreal.example',
      tenantId: tenantId,
      resourceId: 'http://management.core.notreal.example'
    };
  }
};

var log = {
  info: function () { },
  verbose: function () { }
}

describe('account', function () {
  var dataPassedToAcquireToken, data2PassedToAcquireToken;
  var dataPassedToAcquireUserCode, dataPassedToAcquireTokenWithDeviceCode;
  
  var userCodeResponse = { foo: 'bar' };
  var adalAuth = {
    authenticateWithUsernamePassword: function (authConfig, username, password, callback) {
      var data = {
        authConfig: authConfig,
        username: username,
        password: password
      };
      if (dataPassedToAcquireToken) {
        data2PassedToAcquireToken = data;
      } else {
        dataPassedToAcquireToken = data;
      }
      return callback(null, sampleAuthContext);
    },
    
    acquireUserCode: function (authConfig, callback) {
      dataPassedToAcquireUserCode = { authConfig: authConfig };
      return callback(null, userCodeResponse);
    },
    
    authenticateWithDeviceCode: function (authConfig, userCodeResponse, callback) {
      dataPassedToAcquireTokenWithDeviceCode = {
        authConfig : authConfig,
        userCodeResponse: userCodeResponse,
      };
      return callback(null, sampleAuthContext);
    },
    
    normalizeUserName: function (name) { return name; },

    UserTokenCredentials: function UserTokenCredentials() { }
  };
  
  var resourceClient = {
    createResourceSubscriptionClient: function (cred, armEndpoint) {
      return testArmSubscriptionClient;
    }
  };
  var account = new Account(environment, adalAuth, resourceClient, log);
  
  describe('When load using non multifactor authentication', function () {
    var subscriptions;
    
    beforeEach(function (done) {
      account.load(expectedUserName, expectedPassword, '', {}, function (err, result) {
        subscriptions = result.subscriptions;
        done();
      });
    });
    
    it('should pass correct parameters to to acquire token', function () {
      dataPassedToAcquireToken.username.should.equal(expectedUserName);
      dataPassedToAcquireToken.password.should.equal(expectedPassword);     
      dataPassedToAcquireToken.authConfig.tenantId.should.equal('common');
      dataPassedToAcquireToken.authConfig.authorityUrl.should.equal(environment.activeDirectoryEndpointUrl);
      dataPassedToAcquireToken.authConfig.resourceId.should.equal(environment.activeDirectoryResourceId);
      
      //we should only ask for authenticateWithUsernamePassword once
      should.not.exist(data2PassedToAcquireToken);
    });
    
    it('should return a subscription with expected username', function () {
      should.exist(subscriptions[0].user);
      subscriptions[0].user.name.should.equal(expectedUserName);
    });
    
    it('should return listed subscriptions', function () {
      subscriptions.should.have.length(expectedSubscriptions.length);
      for (var i = 0, len = subscriptions.length; i < len; ++i) {
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
  
  describe('When load using interactive flow', function () {
    var subscriptions;
    
    beforeEach(function (done) {
      account.load(expectedUserName, expectedPassword, '', { interactive: true }, function (err, result) {
        subscriptions = result.subscriptions;
        done();
      });
    });
    
    it('should pass correct parameters to to acquireUserCode', function () {
      dataPassedToAcquireUserCode.authConfig.tenantId.should.equal('common');
      
      dataPassedToAcquireUserCode.authConfig.authorityUrl.should.equal(environment.activeDirectoryEndpointUrl);
      dataPassedToAcquireUserCode.authConfig.resourceId.should.equal(environment.activeDirectoryResourceId);
    });
    
    it('should pass correct parameters to authenticateWithDeviceCode', function () {
      dataPassedToAcquireTokenWithDeviceCode.authConfig.tenantId.should.equal('common');
      dataPassedToAcquireTokenWithDeviceCode.authConfig.authorityUrl.should.equal(environment.activeDirectoryEndpointUrl);
      dataPassedToAcquireTokenWithDeviceCode.authConfig.resourceId.should.equal(environment.activeDirectoryResourceId);
      
      dataPassedToAcquireTokenWithDeviceCode.userCodeResponse.foo.should.equal('bar');
    });
    
    it('should return listed subscriptions', function () {
      subscriptions.should.have.length(expectedSubscriptions.length);
      for (var i = 0, len = subscriptions.length; i < len; ++i) {
        subscriptions[i].id.should.equal(expectedSubscriptions[i].subscriptionId);
        subscriptions[i].name.should.equal(expectedSubscriptions[i].displayName);
      }
    });
  });
});

describe('account loading with logon error', function () {
  var adalAuth = {
    normalizeUserName: function (name) { return name; }
  };
  
  var account = new Account(environment, adalAuth, null, log);
  var subscriptions;
  
  it('should catch error indicating user is enabled with MFA', function () {
    adalAuth.authenticateWithUsernamePassword = function (authConfig, username, password, callback) {
      callback(new Error('AADSTS50076: Application password is required.'));
    };
    account.load(expectedUserName, expectedPassword, '', {}, function (err, result) {
      err[account.WarnToUserInteractiveFieldName].should.be.true;
    });
  });
  
  it('should catch error indicating user is using non org-id', function () {
    adalAuth.authenticateWithUsernamePassword = function (authConfig, username, password, callback) {
      callback(new Error('Server returned an unknown AccountType: undefined'));
    };
    account.load(expectedUserName, expectedPassword, '', {}, function (err, result) {
      err[account.WarnToUserInteractiveFieldName].should.be.true;
    });
  });
  
  it('should catch error user is using live-id', function () {
    adalAuth.authenticateWithUsernamePassword = function (authConfig, username, password, callback) {
      callback(new Error('Server returned error in RSTR - ErrorCode: NONE : FaultMessage: NONE'));
    };
    account.load(expectedUserName, expectedPassword, '', {}, function (err, result) {
      err[account.WarnToUserInteractiveFieldName].should.be.true;
    });
  });
  
  it('should return original error otherwise', function () {
    var regularError = 'wrong user name or password';
    adalAuth.authenticateWithUsernamePassword = function (authConfig, username, password, callback) {
      callback(new Error(regularError));
    };
    account.load(expectedUserName, expectedPassword, '', {}, function (err, result) {
      should.not.exist(err[account.WarnToUserInteractiveFieldName]);
      err.message.should.equal(regularError);
    });
  });
});

describe('account add for service principal', function () {
  var dataPassedToAcquireServicePrincipalToken;
  var servicePrincipalId = 'https://myapp';
  var secret = 'mysecret';
  var adalAuth = {
    createServicePrincipalTokenCredentials: function (authConfig, servicePrincipalId, secretOrCert, callback) {
      dataPassedToAcquireServicePrincipalToken = {
        authConfig: authConfig,
        servicePrincipalId: servicePrincipalId,
        secretOrCert: secretOrCert
      };
      return callback(null, sampleAuthContext);
    },
    normalizeUserName: function (name) { return name; }
  };
  var resourceClient = {
    createResourceSubscriptionClient: function (cred, armEndpoint) {
      return testArmSubscriptionClient;
    }
  };
  var account = new Account(environment, adalAuth, resourceClient, log);
  
  describe('using secret', function () {
    var subscriptions;
    
    beforeEach(function (done) {
      account.load(servicePrincipalId, secret, 'fooTenant', { servicePrincipal: true }, function (err, result) {
        subscriptions = result.subscriptions;
        done();
      });
    });
    
    it('should invoke authenticateWithUsernamePassword with correct fields', function () {
      dataPassedToAcquireServicePrincipalToken.authConfig.tenantId.should.equal('fooTenant');
      dataPassedToAcquireServicePrincipalToken.servicePrincipalId.should.equal(servicePrincipalId);
      dataPassedToAcquireServicePrincipalToken.secretOrCert.should.equal(secret);
    });
    
    it('should return a subscription with expected servicePrincipalId', function () {
      should.exist(subscriptions[0].user);
      subscriptions[0].user.name.should.equal(servicePrincipalId);
    });
  });

  describe('using certificate and thumbprint', function () {
    var subscriptions;
    
    var cert = {
      'certificateFile' : 'junk',
      'thumbprint': 'junk'
    };

    beforeEach(function (done) {
      account.load(servicePrincipalId, cert, 'fooTenant', { servicePrincipal: true }, function (err, result) {
        subscriptions = result.subscriptions;
        done();
      });
    });
    
    it('should invoke authenticateWithUsernamePassword with correct fields', function () {
      dataPassedToAcquireServicePrincipalToken.authConfig.tenantId.should.equal('fooTenant');
      dataPassedToAcquireServicePrincipalToken.servicePrincipalId.should.equal(servicePrincipalId);
      dataPassedToAcquireServicePrincipalToken.secretOrCert.certificateFile.should.equal(cert.certificateFile);
      dataPassedToAcquireServicePrincipalToken.secretOrCert.thumbprint.should.equal(cert.thumbprint);
    });
    
    it('should return a subscription with expected servicePrincipalId', function () {
      should.exist(subscriptions[0].user);
      subscriptions[0].user.name.should.equal(servicePrincipalId);
    });
  });
});