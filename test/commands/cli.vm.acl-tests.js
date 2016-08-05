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

var suite;
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.acl-tests';
var createdVms = [];

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var timeout,
      vmName,
      location,
      endpoint = 'rdp',
      remotesubnet = '23.99.18.228/31',
      username = 'azureuser',
      password = 'Collabera@01',
      order = 1,
      neworder = 2,
      retry = 5,
      description = "testing description",
      action = 'permit';
    testUtils.TIMEOUT_INTERVAL = 12000;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        done();
      });
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
        } else
          callback();
      }

      deleteUsedVM(function() {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });

    describe('ACL:', function() {

      it('Create a VM', function(done) {
        getImageName('Windows', function(ImageName) {
          var cmd = util.format('vm create %s %s %s %s -r --json',
            vmName, ImageName, username, password).split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('Create an ACL rule for a VM endpoint with description', function(done) {
        var cmd = util.format('vm endpoint acl-rule create -n %s -e %s -o %s -a %s -t %s -r %s --json',
          vmName, endpoint, order, action, remotesubnet, description).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('list an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule list %s %s --json',
          vmName, endpoint).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var publicipList = JSON.parse(result.text);
          publicipList[0].order.should.not.be.null;
          done();
        });
      });

      it('update an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule set %s %s %s --new-order %s --json', vmName, endpoint, order, neworder).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vm endpoint acl-rule list %s %s --json',
            vmName, endpoint).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var publicipList = JSON.parse(result.text);
            publicipList[0].order.should.equal(neworder);
            done();
          });
        });
      });

      it('Delete an ACL rule for a VM endpoint', function(done) {
        var cmd = util.format('vm endpoint acl-rule delete %s %s %s --quiet --json',
          vmName, endpoint, neworder).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vm endpoint acl-rule list %s %s --json',
            vmName, endpoint).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var publicipList = JSON.parse(result.text);
            publicipList.length.should.be.zero;
            done();
          });
        });
      });
    });

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
