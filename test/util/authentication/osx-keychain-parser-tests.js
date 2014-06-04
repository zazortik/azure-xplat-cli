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

//
// Tests to verify the parsing used to handle the output of the
// darwin 'security' command
//

var es = require('event-stream');
var should = require('should');

var keychainParser = require('../../../lib/util/authentication/osx-keychain-parser');

var entries = require('../../data/osx-keychain-entries');

describe('security tool output parsing', function () {

  describe('one entry', function () {
    var parsingResult = [];

    before(function (done) {
      var dataSource = es.through();
      var parser = dataSource.pipe(keychainParser());
      parser.on('data', function (data) {
        parsingResult.push(data);
      });

      parser.on('end', function () {
        done();
      });

      dataSource.push(entries.entry1);
      dataSource.push(null);
    });

    it('should have one result', function () {
      parsingResult.should.have.length(1);
    });

    it('should have expected account', function () {
      parsingResult[0].acct.should.equal('a:b:c:d');
    });

    it('should have expected service name', function () {
      parsingResult[0].svce.should.equal('azure');
    });

    it('should have expected description', function () {
      parsingResult[0].desc.should.equal('active directory token');
    });

    it('should not have a password', function () {
      should.not.exist(parsingResult[0].password);
    });
  });
});