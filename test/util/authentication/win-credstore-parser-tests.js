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
// 'creds.exe' wrapper over the Windows credential store
//

var _ = require('underscore');
var childProcess = require('child_process');
var es = require('event-stream');
var os = require('os');
var util = require('util');
var should = require('should');

var credStoreParser = require('../../../lib/util/authentication/win-credstore-parser');

var entries = require('../../data/win-credstore-entries');

describe('credstore output parsing', function () {
  var parsingResult;
  function parseEntries(entryString, done) {
    parsingResult = [];
    var dataSource = es.through();
    var parser = dataSource.pipe(credStoreParser());
    parser.on('data', function (data) {
      parsingResult.push(data);
    });
    parser.on('end', function () {
      done();
    });

    dataSource.push(entryString);
    dataSource.push(null);
  }

  describe('one entry without password', function () {
    before(function (done) {
      parseEntries(entries.entry1, done);
    });

    it('should have one result', function () {
      parsingResult.should.have.length(1);
    });

    it('should have expected target', function () {
      parsingResult[0].targetName.should
        .equal('AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\://management.core.windows.net/');
    });

    it('should not have a credential', function () {
      parsingResult[0].should.not.have.property('credential');
    });

    it('should be generic type', function () {
      parsingResult[0].type.should.equal('Generic');
    });

    it('should have creds user name', function () {
      parsingResult[0].userName.should.equal('creds.exe');
    });
  });

  describe('two entries without passwords', function () {
    before(function (done) {
      parseEntries(entries.entry1 + os.EOL + entries.entry2, done);
    });

    it('should have two results', function () {
      parsingResult.should.have.length(2);
    });

    it('should have expected targets', function () {
      parsingResult[0].targetName.should
        .equal('AzureXplatCli:target=userId:someuser@domain.example::resourceId:https\://management.core.windows.net/');
      parsingResult[1].targetName.should
        .equal('AzureXplatCli:target=userId:someotheruser@domain.example::resourceId:https\://management.core.windows.net/');
    });
  });

  describe('one entry with credential', function () {
    before(function (done) {
      parseEntries(entries.entry1WithCredential + os.EOL, done);
    });

    it('should have expected credential', function () {
      parsingResult[0].credential.should.equal('00010203AABBCCDD');
    });
  });
});
