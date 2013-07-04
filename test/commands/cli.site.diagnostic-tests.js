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

var should = require('should');

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var gitUsername = process.env['AZURE_GIT_USERNAME'];

var suiteUtil;
var testPrefix = 'cli.site.diagnostic-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function () {
  describe('site log', function () {
    var createdSites = [];

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
      var deleteSites = function () {
        if (createdSites.length > 0) {
          deleteSite(createdSites.pop(), deleteSites);
        } else {
          return suiteUtil.teardownTest(done);
        }
      };

      deleteSites();
    });

    describe('config', function () {
      var siteName;

      beforeEach(function (done) {
        siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

        createSite(siteName, function () {
          done();
        });
      });

      it('should allow setting everything', function (done) {
        var cmd = ('node cli.js site log set ' + siteName + ' --application -o file -l error --web-server-logging --detailed-error-messages --failed-request-tracing --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          showSite(siteName, function (result) {
            result.exitStatus.should.equal(0);

            var site = JSON.parse(result.text);

            site.diagnosticsSettings.AzureDriveEnabled.should.equal(true);
            site.diagnosticsSettings.AzureDriveTraceLevel.should.equal('error');

            site.config.RequestTracingEnabled.should.equal('true');
            site.config.HttpLoggingEnabled.should.equal('true');
            site.config.DetailedErrorLoggingEnabled.should.equal('true');

            done();
          });
        });
      });

      it('should allow disabling everything', function (done) {
        var cmd = ('node cli.js site log set ' + siteName + ' --disable-application -o file --disable-web-server-logging --disable-detailed-error-messages --disable-failed-request-tracing --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          showSite(siteName, function (result) {
            result.exitStatus.should.equal(0);

            var site = JSON.parse(result.text);

            site.diagnosticsSettings.AzureDriveEnabled.should.equal(false);

            site.config.RequestTracingEnabled.should.equal('false');
            site.config.HttpLoggingEnabled.should.equal('false');
            site.config.DetailedErrorLoggingEnabled.should.equal('false');

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
  });
});
