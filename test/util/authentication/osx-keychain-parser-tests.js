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

var _ = require('underscore');
var es = require('event-stream');
var os = require('os');
var should = require('should');

var childProcess = require('child_process');

var keychain = require('../../../lib/util/authentication/osx-keychain');
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

  describe('multiple entries', function () {
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

      dataSource.push(entries.entry2);
      dataSource.push(entries.entry1);
      dataSource.push(null);
    });

    it('should have two results', function () {
      parsingResult.should.have.length(2);
    });

    it('should have expected accounts', function () {
      parsingResult[0].acct.should.equal('e:f:g:h');
      parsingResult[1].acct.should.equal('a:b:c:d');
    });
  });

  describe('Load entries with bad attributes', function () {
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
      dataSource.push(entries.badEntry);
      dataSource.push(entries.superbadEntry);
      dataSource.push(entries.entry2);
      dataSource.push(null);
    });
    
    it('should not crash', function () {
      parsingResult.should.have.length(4);
      parsingResult[0].acct.should.equal('a:b:c:d');
      parsingResult[1].acct.should.equal('bad guy');
      parsingResult[2].acct.should.equal('super bad guy');
      parsingResult[3].acct.should.equal('e:f:g:h');
    });
  });
});

describe('Parsing output of security child process', function () {
  if (os.platform() !== 'darwin') {
    console.log('These tests only run on Mac OSX');
    return;
  }

  var parseResults = [];
  var testUser = 'xplat-test-user';
  var testService = 'xplat test account';
  var testDescription = 'A dummy entry for testing';
  var testPassword = 'Sekret!';

  before(function (done) {
    addExpectedEntry(function (err) {
      if (err) { return done(err); }
      runAndParseOutput(function (err) {
        done(err);
      });
    });
  });

  after(function (done) {
    removeExpectedEntry(function (err) {
      done(err);
    });
  });

  // Helper functions to do each stage of the setup
  function addExpectedEntry(done) {
    keychain.set(testUser, testService, testDescription, testPassword, done);
  }

  function runAndParseOutput(done) {
    var parser = keychain.list();

    parser.on('data', function (entry) {
      parseResults.push(entry);
    });
    parser.on('end', function () {
      done();
    });
  }

  function removeExpectedEntry(done) {
    keychain.remove(testUser, testService, done);
  }

  it('should have entries', function () {
    parseResults.length.should.be.greaterThan(0);
  });

  it('should have expected entry', function () {
    var entry = _.findWhere(parseResults, { svce: testService });
    should.exist(entry);
    entry.should.have.properties({
      svce: testService,
      acct: testUser,
      desc: testDescription
    });
  });

  it('should be able to retrieve password for expected entry', function (done) {
    var entry = _.findWhere(parseResults, {svce: testService });

    keychain.get(entry.acct, entry.svce, function (err, password) {
      should.not.exist(err);
      password.should.equal(testPassword);
      done();
    });
  });
});
