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
var CLITest = require('../framework/cli-test');
// A common VM used by multiple tests
var suite;
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.extension_set-chef';
var createdVms = [];
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];
var vmCreated=false;
describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      retry = 5,
      clientconfig = 'test/data/set-chef-extension-client-config.rb',
      validationpem = 'test/data/set-chef-extension-validation.pem',
      chefversion = '11.*',
      timeout;
    testUtils.TIMEOUT_INTERVAL = 5000;
    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });
    after(function(done) {
      function deleteUsedVM(callback) {
        if (!suite.isPlayback()) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(callback, timeout);
            });
          }, timeout);
        } else callback();
      }      
      deleteUsedVM(function() {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmName = suite.generateId(vmPrefix, createdVms);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    afterEach(function(done) {
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });
    //Set Chef extensions test
    describe('extension:', function() {
      it('Set Chef extension should fail without client config and validation pem', function(done) {
        var cmd = util.format('vm extension set-chef %s -V %s --json', vmName, chefversion).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.errorText.should.containEql('error: Required --validation-pem and --client-config options');
          result.exitStatus.should.equal(1);
          done();
        });
      });

      it('Set Chef extension should pass', function(done) {
        createVM(function() {
          var cmd = util.format('vm extension set-chef %s -V %s -c %s -O %s --json', vmName, chefversion, clientconfig, validationpem).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

    });

    function createVM(callback) {
      if (!vmCreated) {
        getImageName('Windows', function(imagename) {
          var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            vmCreated = true;
            setTimeout(callback, timeout);
          });
        });
      } else { callback(); }
    }
      // Get name of an image of the given category

    function getImageName(category, callBack) {
      if (process.env.VM_WIN_IMAGE) {
        callBack(process.env.VM_WIN_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_WIN_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_WIN_IMAGE);
        });
      }
    }
  });
});