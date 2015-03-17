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
var createdVms = [];
var testPrefix = 'cli.vm.extension_set-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      retry = 5,
      extensionname,
      publishername,
      version,
      timeout;
    testUtils.TIMEOUT_INTERVAL = 5000;

    before(function(done) {

      suite = new CLITest(testPrefix, requiredEnvironment);
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

    //List extensions
    describe('Extension', function() {
      it('List extensions', function(done) {
        var listcmd = util.format('vm extension list --json').split(' ');
        testUtils.executeCommand(suite, retry, listcmd, function(outerresult) {
          outerresult.exitStatus.should.equal(0);
          var extnarr = JSON.parse(outerresult.text);
          var found = extnarr.some(function(ext) {
            extensionname = ext.name;
            publishername = ext.publisher;
            version = ext.version;
            return true;
          });
          done();
        });
      });
    });

    //Set extensions
    describe('Extension', function() {
      it('Set extensions for the created vm', function(done) {
        createVM(function() {
          var cmd = util.format('vm extension set %s %s %s %s --json',
            vmName, extensionname, publishername, version).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    });

    // VM extension check
    describe('Extension', function() {
      it('Uninstall the set extension', function(done) {
        var cmd = util.format('vm extension set -u %s %s %s %s --json', vmName, extensionname, publishername, version).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(innerresult) {
          innerresult.exitStatus.should.equal(0);
          cmd = util.format('vm extension get %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(checkresult) {
            var exts = JSON.parse(checkresult.text);
            var found = false;
            found = exts.some(function(ext) {
              if (extensionname === ext.name)
                return true;
            });
            found.should.be.false;
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

    function createVM(callback) {
      getImageName('Windows', function(imagename) {
        var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(callback, timeout);
        });
      });
    }

  });
});