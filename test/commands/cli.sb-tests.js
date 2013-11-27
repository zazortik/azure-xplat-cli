// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var should = require('should');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.sb-tests';

var namespacePrefix = 'sbtst';
var namespaces = [];

describe('cli', function () {
  describe('sb', function() {
    before(function (done) {
      suite = new CLITest(testPrefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('location', function () {
      it('should work', function (done) {
        suite.execute('sb namespace location list --json', function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          var locations = JSON.parse(result.text);

          locations.some(function (l) {
            return l.fullName === 'East Asia';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'West Europe';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'North Europe';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'East US';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'Southeast Asia';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'North Central US';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'West US';
          }).should.be.true;

          locations.some(function (l) {
            return l.fullName === 'South Central US';
          }).should.be.true;

          done();
        });
      });
    });

    describe('namespace', function () {
      describe('check', function () {
        var namespaceName;

        beforeEach(function (done) {
          namespaceName = suite.generateId(namespacePrefix, namespaces);

          suite.execute('sb namespace create %s --json --region %s', namespaceName, 'West US', function () {
            done();
          });
        });

        it('should detect non available namespace name', function (done) {
          suite.execute('sb namespace check %s --json', namespaceName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            JSON.parse(result.text).available.should.equal(false);

            done();
          });
        });

        it('should detect available namespace name', function (done) {
          var namespaceName = suite.generateId(namespacePrefix, namespaces);
          suite.execute('sb namespace check %s --json', namespaceName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            JSON.parse(result.text).available.should.equal(true);

            done();
          });
        });
      });
    });
  });
});