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
var sinon = require('sinon');

var adalAuth = require('../../../lib/util/authentication/adalAuth');
var adalAuthForUser = require('../../../lib/util/authentication/adalAuthForUser');
var adalAuthForServicePrincipal = require('../../../lib/util/authentication/adalAuthForServicePrincipal');

describe('login as an user', function () {
  var sandbox = sinon.sandbox.create();
  var testConfig = {
    resourceId: 'https://res123',
    authorityUrl: 'https://authority123', 
    clientId: '12345'
  };
  var testUser = 'johndoe@johndoe.com';
  var sampleError;
  var configMatched;
  
  before(function (done) {
    sandbox.stub(adalAuth, 'removeCachedToken', function (user, callback) {
      return callback();
    });
    
    sandbox.stub(adalAuth, 'createAuthenticationContext', function () {
      return {
        acquireToken: function (resource, user, clientId, callback) {
          configMatched = (resource === testConfig.resource || 
                         clientId === testConfig.clientId ||
                         user === testUser);
          return callback(new Error(sampleError));
        }
      }
    });
    done();
  });
  
  after(function (done) {
    sandbox.restore();
    done();
  });

  it('should polish on error to tell people login again', function (done) {
    //arrange 
    sampleError = 'Some error happend';
    
    //action
    var cred = new adalAuthForUser.UserTokenCredentials(testConfig, testUser);
    cred.retrieveTokenFromCache(function (err) {
      //assert
      (err.message.indexOf('Please run "azure login" again') !== -1).should.be.true;
      (err.message.indexOf(sampleError) !== -1).should.be.true;
      configMatched.should.be.true;
      done();
    });
  });

  it('should trash bad error from adal-node on polishing', function (done) {
    //arrange 
    var badError = 'Entry not found in cache.';
    
    //action
    var cred = new adalAuthForUser.UserTokenCredentials(testConfig, testUser);
    cred.retrieveTokenFromCache(function (err) {
      //assert
      (err.message.indexOf('Please run "azure login" again') !== -1).should.be.true;
      (err.message.indexOf(badError) !== -1).should.be.false;
      done();
    });
  });
});

describe('login as service principal', function () {
  var config = {
    resourceId: 'https://res123',
    authorityUrl: 'https://authority123'
  };
  
  it('should invoke callback on error', function (done) {
    //arrange 
    var accessToken = '123';
    var tokenMatched = false;
    adalAuth.tokenCache.find = function (query, callback) {
      callback(null, [{ 'accessToken' : accessToken }]);
    };
    adalAuth.tokenCache.remove = function (entries, callback) {
      tokenMatched = (entries.length === 1 && entries[0].accessToken === accessToken);
      callback(null);
    };
    //action
    var cred = new adalAuthForServicePrincipal.ServicePrincipalTokenCredentials(config, 'apid123');
    cred.retrieveTokenFromCache(function (err) {
      //assert
      var errorFired = (!!err);
      errorFired.should.be.true;
      tokenMatched.should.be.true;
      done();
    });
  });
  
  it('should not add empty refresh token to credentails cache', function (done) {
    //arrange 
    var addInvoked = false;
    var hasRefreshToken = false;
    adalAuth.tokenCache.add = function (entries, callback) {
      addInvoked = true;
      hasRefreshToken = !!(entries[0].refreshToken);
      callback(null);
    };
    //action
    adalAuthForServicePrincipal.createServicePrincipalTokenCredentials(config, 'https://myapp1', 'Secret', function(){
      addInvoked.should.be.true;
      hasRefreshToken.should.be.false;
      done();
    });
  });
});

describe('logoutUser', function () {
  it('remove cached tokens', function (done) {
    //arrange 
    var timesTokenFindGetsInvoked = 0;
    var timesTokenRemoveGetsInvoked = 0;
    var entriesToRemove;
    var tokenCache = {
      find: function (query, callback) { 
        timesTokenFindGetsInvoked++;
        callback(null, [{foo: timesTokenFindGetsInvoked}]);
      },
      remove: function (entries, callback) {
        timesTokenRemoveGetsInvoked++;
        entriesToRemove = entries;
        callback();
      }
    };
    //action
    adalAuth.removeCachedToken('dummyUser', tokenCache, function (err) {
      //verify
      timesTokenFindGetsInvoked.should.equal(3);
      timesTokenRemoveGetsInvoked.should.equal(1);
      entriesToRemove.length.should.equal(3);
      done();
    });
  });
});
