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

'use strict';

var _ = require('underscore');
var should = require('should');

var cacheLookup = require('../../../lib/util/authentication/token-cache-lookup');

describe('Token cache look up', function () {
  var query = {
    '_clientId': '04b07795-8ddb-461a-bbee-02f9e1bf1234',
    'userId': 'jonDOE@microsoft.com',
    '_authority': 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47'
  };
  var noUserQuery = {
    '_clientId': '04b07795-8ddb-461a-bbee-02f9e1bf1234',
    '_authority': 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47'
  };
  var entries = [
    {
      '_authority': 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47',
      '_clientId': '04b07795-8ddb-461a-bbee-02f9e1bf1234',
      'expiresIn': 3599,
      'expiresOn': '2014-09-14T00:46:36.728Z',
      'familyName': 'Doe',
      'givenName': 'Jon',
      'isMRRT': true,
      'isUserIdDisplayable': true,
      'resource': 'https://management.core.windows.net/',
      'tenantId': '72f988bf-86f1-41af-91ab-2d7cd011db47',
      'tokenType': 'Bearer',
      'userId': 'jonDoe@microsoft.com',
    }
  ];
  
  it('should return 1 entry when the query object contains userId', function () {
    var result = cacheLookup.find(query, entries);
    result.length.should.equal(1);
    result[0]._clientId.should.equal(query._clientId);
    result[0]._authority.should.equal(query._authority);
    result[0].userId.toLowerCase().should.equal(query.userId.toLowerCase());
  });
  
  it('should return 1 entry when the query object contains no userId', function () {
    var result = cacheLookup.find(noUserQuery, entries);
    result.length.should.equal(1);
  });

  it('should return 0 entry whenno match', function () {
    var result = cacheLookup.find({foo: 'bar'}, entries);
    result.length.should.equal(0);
  });
});
