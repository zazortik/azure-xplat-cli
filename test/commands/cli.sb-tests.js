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

var should = require('should');
var url = require('url');
var uuid = require('node-uuid');
var GitHubApi = require('github');
var util = require('util');
var cli = require('../../lib/cli');

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var suiteUtil;
var testPrefix = 'cli.sb-tests';

var namespacePrefix = 'sbtst';
var namespaces = [];

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function(){
  describe('sb', function() {
    before(function (done) {
      suiteUtil = new MockedTestUtils(testPrefix);
      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      suiteUtil.teardownTest(done);
    });

    describe('location', function () {
      it('should work', function (done) {
        var cmd = ('node cli.js sb namespace location list --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          var locations = JSON.parse(result.text);

          locations.some(function (l) {
            return l.FullName === 'East Asia';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'West Europe';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'North Europe';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'East US';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'Southeast Asia';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'North Central US';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'West US';
          }).should.be.true;

          locations.some(function (l) {
            return l.FullName === 'South Central US';
          }).should.be.true;

          done();
        });
      });
    });

    describe('namespace', function () {
      describe('check', function () {
        var namespaceName;

        beforeEach(function (done) {
          namespaceName = suiteUtil.generateId(namespacePrefix, namespaces);

          var cmd = ('node cli.js sb namespace create ' + namespaceName + ' --json').split(' ');
          cmd.push('--region');
          cmd.push('West US');

          executeCmd(cmd, function () {
            done();
          });
        });

        it('should detect non available namespace name', function (done) {
          var cmd = ('node cli.js sb namespace check ' + namespaceName + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            JSON.parse(result.text).available.should.equal(false);

            done();
          });
        });

        it('should detect available namespace name', function (done) {
          var namespaceName = suiteUtil.generateId(namespacePrefix, namespaces);
          var cmd = ('node cli.js sb namespace check ' + namespaceName + ' --json').split(' ');
          executeCmd(cmd, function (result) {
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
