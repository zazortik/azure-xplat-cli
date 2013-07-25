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

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var suiteUtil;
var testPrefix = 'cli.site.handler-tests';

var createdSites = [];
var siteNamePrefix = 'cli';
var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function(){
  describe('handler', function() {

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
      function removeSite() {
        if (createdSites.length === 0) {
          return suiteUtil.teardownTest(done);
        }

        var siteName = createdSites.pop();
        var cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
        executeCmd(cmd, function () {
          removeSite();
        });
      }

      removeSite();
    });

    it('should list, add and delete site handler', function(done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);
      var extension = '.js';

      // Create site
      var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
      cmd.push(location);
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        cmd = ('node cli.js site handler list ' + siteName + ' --json ').split(' ');
        executeCmd(cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = ('node cli.js site handler add ' + extension + ' c: ' + siteName + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            cmd = ('node cli.js site handler list ' + siteName + ' --json').split(' ');
            executeCmd(cmd, function (result) {
              var handlers = JSON.parse(result.text);

              should.exist(handlers.filter(function (d) {
                return d.Extension === extension;
              })[0]);

              cmd = ('node cli.js site handler delete ' + extension + ' ' + siteName + ' --quiet --json').split(' ');
              executeCmd(cmd, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                cmd = ('node cli.js site handler list ' + siteName + ' --json').split(' ');
                executeCmd(cmd, function (result) {
                  handlers = JSON.parse(result.text);

                  should.not.exist(handlers.filter(function (d) {
                    return d.Extension === extension;
                  })[0]);

                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});