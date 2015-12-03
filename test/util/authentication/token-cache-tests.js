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
  var johnUserId = 'johndoe@microsoft.com';
  var johnTokenFromTenant72f9 = {
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
    userId: johnUserId, 
    accessToken: 'token dummy 1234'
  };
  var johnTokenFromCommon = {
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
    userId: johnUserId, 
    accessToken: 'token dummy 12345'
  };
  var tokensInCache = [johnTokenFromTenant72f9, johnTokenFromCommon];
  var sampleTokenQuery = {
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    userId: johnUserId, 
    _authority: 'https://login.windows.net/common'
  };
  var sampleTokenQueryWithTenantId = {
    userId: johnUserId,
    tenantId: '72f988bf-86f1-41af-91ab-2d7cd0111234'
  };
  var sampleTokenQueryWithUpperCasing = {
    _clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', 
    userId: johnUserId.toUpperCase(), 
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
        tokens[0].userId.should.equal(johnUserId);
        done();
      });
    });
    
    it('should find entry using tenantId', function (done) {
      var cache = new TokenCache(tokenStorage);
      
      cache.find(sampleTokenQuery, function (err, tokens) {
        tokens.length.should.equal(1);
        tokens[0].userId.should.equal(johnUserId);
        done();
      });
    });

    it('should find entry using userId with upper casing', function (done) {
      var cache = new TokenCache(tokenStorage);
      cache.find(sampleTokenQueryWithUpperCasing, function (err, tokens) {
        tokens.length.should.equal(1);
        tokens[0].userId.should.equal(johnUserId);
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
    var mikeTokenFromCommon = {
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
        entries: tokensInCache,
        loadEntries : function (callback) {
          callback(null, this.entries);
        },
        addEntries : function (newEntries, existingEntries, callback) {
          this.entries = this.entries.concat(newEntries);
          callback(null);
        },
        removeEntries: function (entriesToRemove, entriesToKeep, callback) {
          this.entries = entriesToKeep;
          callback(null);
        }
      };
    }

    it('should add an entry', function (done) {
      var clonedJohnTokenFromTenant72f9 = _.clone(johnTokenFromTenant72f9);
      var clonedJohnTokenFromCommon = _.clone(johnTokenFromCommon);
      var tokensInCache = [clonedJohnTokenFromTenant72f9, clonedJohnTokenFromCommon];
      var cache = new TokenCache(constructStorageObject(tokensInCache));
      cache.add([_.clone(mikeTokenFromCommon)], function () {
        tokensInCache.length.should.equal(3);
        tokensInCache[2].userId.should.equal(newUserId);
        done();
      });
    });
    
    it('should get rid of useless fields', function (done) {
      var tokensInCache = [];
      var cache = new TokenCache(constructStorageObject(tokensInCache));
      cache.add([_.clone(mikeTokenFromCommon)], function () {
        should.not.exist(tokensInCache[0].familyName);
        should.not.exist(tokensInCache[0].givenName);
        should.not.exist(tokensInCache[0].isUserIdDisplayable);
        should.not.exist(tokensInCache[0].tenantId);
        done();
      });
    });
    
    it('should not add duplicate tokens', function (done) {
      var tokensInCache = [_.clone(johnTokenFromTenant72f9), _.clone(johnTokenFromCommon)];
      var tokenStorageObject = constructStorageObject(tokensInCache);
      var cache = new TokenCache(tokenStorageObject);
      cache.add([_.clone(mikeTokenFromCommon), _.clone(johnTokenFromTenant72f9)], function () {
        tokenStorageObject.entries.length.should.equal(3);
        done();
      });
    });
    
    it('should remove existing tokens with same field values including clientid, userid and authority', function (done) {
      var tokenToCleanUp = {
        _clientId: mikeTokenFromCommon._clientId,
        userId: mikeTokenFromCommon.userId,
        _authority: mikeTokenFromCommon._authority
      };
      var tokenShouldStay = {
        _clientId: mikeTokenFromCommon._clientId,
        userId: mikeTokenFromCommon.userId,
        _authority: mikeTokenFromCommon._authority + '-oldUnique',
      };
      var newToken = {
        _clientId: mikeTokenFromCommon._clientId,
        userId: mikeTokenFromCommon.userId,
        _authority: mikeTokenFromCommon._authority + '-New',
      };
      
      var newToken2 = {
        _clientId: mikeTokenFromCommon._clientId,
        userId: mikeTokenFromCommon.userId,
        _authority: mikeTokenFromCommon._authority,
      };
      var tokenStorageObj = constructStorageObject([tokenToCleanUp, tokenShouldStay]);
      var cache = new TokenCache(tokenStorageObj);
      cache.add([newToken, newToken2], function () {
        var entriesInCache = tokenStorageObj.entries;
        entriesInCache.length.should.equal(3);
        //verify we have tokenShouldStay, mikeTokenFromCommon, mikeTokenFromCommon-New
        entriesInCache[0].should.equal(tokenShouldStay);
        entriesInCache[1].should.equal(newToken);
        entriesInCache[2].should.equal(newToken2);
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
        var clonedJohnTokenFromTenant72f9 = _.clone(johnTokenFromTenant72f9);
        var clonedJohnTokenFromCommon = _.clone(johnTokenFromCommon);
        var tokensInCache = [clonedJohnTokenFromTenant72f9, clonedJohnTokenFromCommon];
        var cache = new TokenCache(constructStorageObject(tokensInCache));
        cache.remove([clonedJohnTokenFromTenant72f9], function () {
          tokensInCache.length.should.equal(1);
          tokensInCache[0].userId.should.equal(johnUserId);
          //Verify even now we skip useless fields like "familyName", but we
          //should still remove entry containing this field(could be added by old tools)
          tokensInCache[0].familyName.should.equal(clonedJohnTokenFromTenant72f9.familyName);
          done();
        });
      });
      
      it('should remove entry with casing difference on userId', function (done) {
        var clonedJohnTokenFromTenant72f9 = _.clone(johnTokenFromTenant72f9);
        var clonedJohnTokenFromCommon = _.clone(johnTokenFromCommon);
        var tokensInCache = [clonedJohnTokenFromTenant72f9, clonedJohnTokenFromCommon];
        var tokenClone = _.clone(johnTokenFromCommon);
        tokenClone.userId = tokenClone.userId.toUpperCase();

        var cache = new TokenCache(constructStorageObject(tokensInCache));
        cache.remove([tokenClone], function () {
          tokensInCache.length.should.equal(1);
          tokensInCache[0].should.equal(clonedJohnTokenFromTenant72f9);
          done();
        });
      });
    });
  });
});