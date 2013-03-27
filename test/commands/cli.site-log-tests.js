/**
* Copyright 2012 Microsoft Corporation
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

var uuid = require('node-uuid');

var should = require('should');

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var gitUsername = process.env['AZURE_GIT_USERNAME'];

var suiteUtil;
var testPrefix = 'cli.site-log-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
}

describe('cli', function () {
  describe('site log', function () {
    var createdSites = [];

    before(function (done) {
      process.env.AZURE_ENABLE_STRICT_SSL = false;
      suiteUtil = new MockedTestUtils(testPrefix, true);
      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(function () {
        delete process.env.AZURE_ENABLE_STRICT_SSL;
        done();
      });
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      var deleteSites = function () {
        if (createdSites.length > 0) {
          deleteSite(createdSites.pop(), deleteSites);
        } else {
          return suiteUtil.teardownTest(done);
        }
      };

      deleteSites();
    });

    it('should show tail', function (done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      createSite(siteName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        showSite(siteName, function (result) {
          result.exitStatus.should.equal(0);

          connectLogStream(siteName, function (result) {
            result.text.replace(/\n/g, '').should.include('Welcome, you are now connected to log-streaming service.');

            done();
          });
        });
      });
    });

    function createSite(siteName, callback) {
      var cmd = ('node cli.js site create ' + siteName + ' --git --gitusername ' + gitUsername + ' --json --location').split(' ');
      cmd.push('East US');
      executeCmd(cmd, callback);
    }

    function showSite(siteName, callback) {
      var cmd = ('node cli.js site show ' + siteName + ' --json').split(' ');
      executeCmd(cmd, callback);
    }

    function deleteSite(siteName, callback) {
      var cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
      executeCmd(cmd, callback);
    }

    function connectLogStream(siteName, callback) {
      setTimeout(function () { process.exit(0); }, 5000);
      var cmd = ('node cli.js site log tail ' + siteName + ' --log').split(' ');
      executeCmd(cmd, callback);
    }
  });
});
