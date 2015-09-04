/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the 'License');
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an 'AS IS' BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

//
// Utility functions used to encode and decode values
// stored in the token cache as keys or values.
//

'use strict';

var _ = require('underscore');
var should = require('should');
var sinon = require('sinon');

var TokenCache = require('../../../lib/util/authentication/token-cache');

describe('Token cache', function () {
  var testUserId = 'johndoe@microsoft.com';
  var testToken = {
    _authority: 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd0111234', 
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    expiresIn: 3599, 
    expiresOn: new Date('2014-09-20T04:47:16.288Z'), 
    familyName: 'Doe', 
    givenName: 'John', 
    isMRRT: true, 
    isUserIdDisplayable: true, 
    resource: 'https://management.core.windows.net/', 
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd0111234', 
    tokenType: 'Bearer', 
    userId: testUserId, 
    accessToken: 'token dummy 1234'
  };
  var testToken2 = {
    _authority: 'https://login.windows.net/common', 
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    expiresIn: 3599, 
    expiresOn: new Date('2014-09-20T04:47:14.151Z'),
    familyName: 'Doe', 
    givenName: 'John', 
    isMRRT: true, 
    isUserIdDisplayable: true, 
    resource: 'https://management.core.windows.net/', 
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd0111234',
    tokenType: 'Bearer', 
    userId: testUserId, 
    accessToken: 'token dummy 12345'
  };
  var tokensInCache = [testToken, testToken2];
  var sampleTokenQuery = {
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    userId: testUserId, 
    _authority: 'https://login.windows.net/common'
  };
  var sampleTokenQueryWithTenantId = {
    userId: testUserId,
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd0111234'
  };
  var sampleTokenQueryWithUpperCasing = {
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    userId: testUserId.toUpperCase(), 
    _authority: 'https://login.windows.net/common'
  };
  
  describe('find', function () {
    var tokenStorage = {
      loadEntries : function (callback) {
        callback(null, tokensInCache);
      }
    };

    it('should find entry using exact userId', function (done) {
      var cache = new TokenCache(tokenStorage);
      cache.find(sampleTokenQueryWithTenantId, function (err, tokens) {
        tokens.length.should.equal(2);
        tokens[0].userId.should.equal(testUserId);
        done();
      });
    });
    
    it('should find entry using tenantId', function (done) {
      var cache = new TokenCache(tokenStorage);
      
      cache.find(sampleTokenQuery, function (err, tokens) {
        tokens.length.should.equal(1);
        tokens[0].userId.should.equal(testUserId);
        done();
      });
    });

    it('should find entry using userId with upper casing', function (done) {
      var cache = new TokenCache(tokenStorage);
      cache.find(sampleTokenQueryWithUpperCasing, function (err, tokens) {
        tokens.length.should.equal(1);
        tokens[0].userId.should.equal(testUserId);
        done();
      });
    });
  });

  describe('clear', function () {
    var tokenStorage = {
      loadEntries : function (callback) {
        callback(null, tokensInCache);
      },
      clear : sinon.stub().callsArg(0)
    };
    
    it('calls token storage clear', function(done) {
      var cache = new TokenCache(tokenStorage);
      cache.clear(function () {
        tokenStorage.clear.calledOnce.should.be.true;
        done();
      });
    });
  });
  
  describe('add', function () {
    var newUserId = 'mikedoe@microsoft.com';
    var testTokenToAdd = {
      _authority: 'https://login.windows.net/common', 
      _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
      expiresIn: 3599, 
      expiresOn: '2014-09-20T04:47:14.151Z', 
      familyName: 'Doe', 
      givenName: 'Mike', 
      isMRRT: true, 
      isUserIdDisplayable: true, 
      resource: 'https://management.core.windows.net/', 
      tenantId: '72f988bf-86f1-41af-91ab-2d7cd0111234',
      tokenType: 'Bearer', 
      userId: newUserId, 
      accessToken: 'token dummy 123456'
    };
    function constructStorageObject(tokensInCache) {
      return {
        loadEntries : function (callback) {
          callback(null, tokensInCache);
        },
        addEntries : function (newEntries, existingEntries, callback) {
          tokensInCache = existingEntries.concat(newEntries);
          callback(null);
        }
      };
    }

    it('should add an entry', function (done) {
      var tokensInCache = [testToken, testToken2];
      var cache = new TokenCache(constructStorageObject(tokensInCache));
      cache.add([testTokenToAdd], function () {
        tokensInCache.length.should.equal(3);
        tokensInCache[2].userId.should.equal(newUserId);
        done();
      });
    });
    
    it('should not add duplicate tokens', function (done) {
      var tokensInCache = [testToken, testToken2];
      var cache = new TokenCache(constructStorageObject(tokensInCache));
      cache.add([testTokenToAdd, testToken], function () {
        tokensInCache.length.should.equal(3);
        done();
      });
    });
    
    it('should convert userId to lower case', function (done) {
      var tokensInCache = [];
      var tokenStorage = {
        loadEntries : function (callback) {
          callback(null, []);
        },
        addEntries : function (newEntries, existingEntries,callback) {
          tokensInCache = existingEntries.concat(newEntries);
          callback(null);
        }
      };
      var cache = new TokenCache(tokenStorage);
      cache.add([{ userId: 'FOO@BAR.com'}], function () {
        tokensInCache.length.should.equal(1);
        tokensInCache[0].userId.should.equal('foo@bar.com');
        done();
      });
    });

    describe('remove', function () {
      
      function constructStorageObject(tokensInCache) {
        return {
          loadEntries : function (callback) {
            callback(null, tokensInCache);
          },
          removeEntries : function (entriesToRemove, entriesToKeep, callback) {
            tokensInCache.length = 0;
            entriesToKeep.forEach(function (entry) { tokensInCache.push(entry); });
            callback(null);
          }
        };
      }
      
      it('should remove a matched entry', function (done) {
        var tokensInCache = [testToken, testToken2];
        var cache = new TokenCache(constructStorageObject(tokensInCache));
        cache.remove([testToken], function () {
          tokensInCache.length.should.equal(1);
          tokensInCache[0].userId.should.equal(testUserId);
          done();
        });
      });
      
      it('should remove entry with casing difference on userId', function (done) {
        var tokensInCache = [testToken, testToken2];
        var tokenClone = JSON.parse(JSON.stringify(testToken2));
        tokenClone.userId = tokenClone.userId.toUpperCase();

        var cache = new TokenCache(constructStorageObject(tokensInCache));
        cache.remove([tokenClone], function () {
          tokensInCache.length.should.equal(1);
          tokensInCache[0].should.equal(testToken);
          done();
        });
      });
    });
  });
});