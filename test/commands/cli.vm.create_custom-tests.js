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
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var vmPrefix = 'clitestvm';

var suite;
var testPrefix = 'cli.vm.create_custom-tests';
var timeout = isForceMocked ? 0 : 5000;
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'SSHCERT',
  defaultValue: null
}];

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var customVmName = 'xplattestvmcustdata';
    var fileName = 'customdata',
      certFile,
      location,
      vmsize = 'small',
      sshPort = '223';

    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
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
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        certFile = process.env.SSHCERT;
        done();
      });
    });

    afterEach(function(done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b -q --json', vm.Name).split(' ');
            suite.execute(cmd, function(result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              vm.Created = vm.Delete = false;
              callback();
            });
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownTest(done);
      });
    });

    //Create vm with custom data
    describe('Create:', function() {
      it('with custom data', function(done) {
        getImageName('Linux', function(vmImgName) {
          generateFile(fileName, null, 'nodejs,python,wordpress');
          suite.execute('vm create -e %s -z %s --ssh-cert %s --no-ssh-password %s %s testuser Collabera@01 -l %s -d %s --json --verbose',
            sshPort, vmsize, certFile, customVmName, vmImgName, location, fileName, function(result) {
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

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      suite.execute('vm image list --json', function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            getImageName.ImageName = image.name;
            return true;
          }
        });
        callBack(getImageName.ImageName);
      });
    }

    //create a file and write desired data given as input
    function generateFile(filename, fileSizeinBytes, data) {
      if (fileSizeinBytes)
        data = testUtils.generateRandomString(fileSizeinBytes);
      fs.writeFileSync(filename, data);
    }
  });
});