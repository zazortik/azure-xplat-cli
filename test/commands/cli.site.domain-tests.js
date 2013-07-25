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
var testPrefix = 'cli.site.domain-tests';

/**
* Note: to rerecord this test, an azure website and a cname domain pointing to
* it must be created and specified in the variables below.
*/
var domainName = 'armarmt.mooo.com';
var fakeDomainName = 'fake.mooo.com';
var siteName = 'asdqweqwe';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function(){
  describe('site domain', function() {

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

    it('should list, add and delete site domain', function(done) {
      cmd = ('node cli.js site domain list ' + siteName + ' --json ').split(' ');
      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);

        var domainList = JSON.parse(result.text);

        should.not.exist(domainList.filter(function (d) {
          return d === domainName;
        })[0]);

        var cmd = ('node cli.js site domain add ' + domainName + ' ' + siteName + ' --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          cmd = ('node cli.js site domain list ' + siteName + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            var domainList = JSON.parse(result.text);

            should.exist(domainList.filter(function (d) {
              return d === domainName;
            })[0]);

            var cmd = ('node cli.js site domain delete ' + domainName + ' ' + siteName + ' --quiet --json').split(' ');
            executeCmd(cmd, function (result) {
              result.text.should.equal('');
              result.exitStatus.should.equal(0);

              cmd = ('node cli.js site domain list ' + siteName + ' --json').split(' ');
              executeCmd(cmd, function (result) {
                var domainList = JSON.parse(result.text);

                should.not.exist(domainList.filter(function (d) {
                  return d === domainName;
                })[0]);

                done();
              });
            });
          });
        });
      });
    });

    it('should give decent error for invalid domain', function(done) {
      var cmd = ('node cli.js site domain add ' + fakeDomainName + ' ' + siteName + ' --json').split(' ');
      executeCmd(cmd, function (result) {
        result.errorText.should.include('No CNAME pointing from ' + fakeDomainName + ' to ' + siteName + '.azurewebsites.net. Please create a CNAME record and execute the operation again.');
        result.exitStatus.should.not.equal(0);

        done();
      });
    });
  });
});