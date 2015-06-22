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
var util = require('util');
var testUtils = require('../util/util');
var sinon = require('sinon');
var crypto = require('crypto');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'clitestvm';
var createdVms = [];
var testPrefix = 'cli.vm.create_comm-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'AZURE_COMMUNITY_IMAGE_ID',
  defaultValue: null
}];

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var location,
      communityImageId,
      timeout,
      retry,
      customVmName,
      username = 'azureuser',
      password = 'Pa$$word@123';
    testUtils.TIMEOUT_INTERVAL = 5000;
    var vmUtil = new vmTestUtil();

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      location = process.env.AZURE_VM_TEST_LOCATION;
      communityImageId = process.env.AZURE_COMMUNITY_IMAGE_ID;
      customVmName = suite.generateId(vmPrefix, createdVms);
      timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
      retry = 5;
      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });
      }
      suite.setupSuite(done);
    });

    after(function(done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
      });
    });

    //Create vm with custom data
    describe('Create:', function() {
      //this tests only runs live, because it downloads data from a live site, taking 4 minutes
      if (process.env.NOCK_OFF) {
        it('with community data', function(done) {
          var cmd = util.format('vm create -o %s %s %s %s --json --verbose',
            customVmName, communityImageId, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            vmToUse.Name = customVmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      }
    });
  });
});
