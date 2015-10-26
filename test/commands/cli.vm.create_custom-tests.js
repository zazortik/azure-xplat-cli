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
var fs = require('fs');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'clitestvm';
var createdVms = [];
var testPrefix = 'cli.vm.create_custom-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

describe('cli', function() {
  describe('vm', function() {
    var customVmName;
    var fileName = 'customdata',
      certFile,
      timeout,
      location,
      retry,
      vmsize = 'Small',
      sshPort = '223',
      username = 'azureuser';
    testUtils.TIMEOUT_INTERVAL = 5000;
    var vmUtil = new vmTestUtil();

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        customVmName = suite.generateId(vmPrefix, createdVms);
        certFile = process.env.SSHCERT;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        retry = 5;
        done();
      });
    });

    afterEach(function(done) {
      vmUtil.deleteUsedVM(vmToUse, timeout, suite, function() {
        suite.teardownTest(done);
      });
    });

    //Create vm with custom data
    //'node cli.js vm create -e 223 -z Small --ssh-cert cert2.pfx --no-ssh-password clitestvm_cdata4367 0b11de9248dd4d87b18621318e037d37__RightImage-CentOS-6.2-x64-v5.8.8.1 azureuser -d customdata --json --verbose -l West US'
    //'Specified SSH certificate is not in PEM format'
    describe('Create:', function() {
      it('with custom data', function(done) {
        vmUtil.getImageName('Linux', suite, function(vmImgName) {
          vmUtil.generateFile(fileName, null, 'nodejs,python,wordpress');
          var cmd = util.format('vm create -e %s -z %s --ssh-cert %s --no-ssh-password %s %s %s -d %s --json --verbose',
            sshPort, vmsize, certFile, customVmName, vmImgName, username, fileName).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var verboseString = result.text;
            var iPosCustom = verboseString.indexOf('customdata');
            iPosCustom.should.not.equal(-1);
            fs.unlinkSync(fileName);
            vmToUse.Name = customVmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      });
    });

  });
});
