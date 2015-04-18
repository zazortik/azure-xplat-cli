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

//
// Utility functions used to encode and decode values
// stored in the token cache as keys or values.
//

'use strict';

var _ = require('underscore');
var should = require('should');

var cacheEncoding = require('../../../lib/util/authentication/token-cache-encoding');

describe('Token cache encoding', function () {
  describe('string escaping', function () {
    var strings = [
      [ 'nospecialcharacters', 'nospecialcharacters' ],
      [ ':string:with:colons:', '\\:string\\:with\\:colons\\:' ],
      [ 'string\\with\\backslashes\\', 'string\\\\with\\\\backslashes\\\\' ],
      [ '\\string:with:\\both', '\\\\string\\:with\\:\\\\both' ]
    ];

    it('should escape strings correctly', function () {
      strings.forEach(function (pair) {
        var original = pair[0];
        var expected = pair[1];
        cacheEncoding.escape(original).should.equal(expected);
      });
    });

    it('should unescape strings correctly', function () {
      strings.forEach(function (pair) {
        var original = pair[1];
        var expected = pair[0];
        cacheEncoding.unescape(original).should.equal(expected);
      });
    });
  });

  describe('object encoding', function () {
    var objects = [
      [
        {
          userId: 'user@someorg.example',
          resourceId: 'https://some.resource.id',
          tenantId: '1855B651-EA3D-4545-A0A9-447AC90B8717',
          'key:with:colon': 'value\\with\\backslashes',
          expiresOn: new Date('2014-06-09T19:00:00.000Z'),
          boolValue: true
        },
        'boolValue:true::expiresOn:2014-06-09T19\\:00\\:00.000Z::key\\:with\\:colon:value\\\\with\\\\backslashes::resourceId:https\\://some.resource.id::tenantId:1855B651-EA3D-4545-A0A9-447AC90B8717::userId:user@someorg.example'
      ]
    ];

    it('should encode objects correctly', function () {
      objects.forEach(function (pair) {
        var obj = pair[0];
        var encoding = pair[1];

        cacheEncoding.encodeObject(obj).should.equal(encoding);
      });
    });
    
    it('should encode objects with property that has no value', function () {
      objects.forEach(function (pair) {
        var refreshToken; //leave it uninitialized so to use the undefined status
        var fakedTokenPair = { a: 'faked access token', r: refreshToken };
        var encoding = cacheEncoding.encodeObject(fakedTokenPair);
        encoding.should.equal('a:faked access token::r:');
      });
    });

    it('should decode objects correctly', function () {
      objects.forEach(function (pair) {
        var obj = pair[0];
        var encoding = pair[1];

        var decoded = cacheEncoding.decodeObject(encoding);
        decoded.should.have.properties(_.omit(obj, ['boolValue', 'expiresOn']));
        if (_.has(obj, 'boolValue')) {
          decoded.boolValue.should.equal(obj.boolValue.toString());
        }

        if (_.has(obj, 'expiresOn')) {
          decoded.expiresOn.should.equal(obj.expiresOn.toISOString());
        }
      });
    });
  });
});
