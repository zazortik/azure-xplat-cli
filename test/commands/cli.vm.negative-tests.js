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

var suite;
var vmPrefix = 'cliNegtestvm';
var createdVms = [];
var testPrefix = 'cli.vm.negative-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var location, username = 'azureuser',
      password = 'Pa$$word@123',
      vmNegName, retry = 5;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        vmNegName = suite.generateId(vmPrefix, createdVms);
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    // Negative Test Case by specifying invalid Password
    it('Negative test case for password', function(done) {
      getImageName('Linux', function(ImageName) {
        suite.execute('vm create %s %s %s "Coll" --json --location %s',
          vmNegName, ImageName, username, location, function(result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include('password must be at least 8 character in length, it must contain a lower case, an upper case, a number and a special character such as !@#$%^&+=');
            done();
          });
      });
    });

    // Negative Test Case for Vm Create with Invalid Name
    it('Negative Test Case for Vm Create with Invalid name', function(done) {
      vmNegName = 'test1@1';
      getImageName('Linux', function(ImageName) {
        suite.execute('vm create %s %s %s %s --json --location %s',
          vmNegName, ImageName, username, password, location, function(result) {
            // check the error code for error
            result.exitStatus.should.equal(1);
            result.errorText.should.include('The hosted service name is invalid.');
            done();
          });
      });
    });

    // Negative Test Case by specifying invalid Location
    it('Negative Test Case for Vm create Location', function(done) {
      getImageName('Linux', function(ImageName) {
        suite.execute('vm create %s %s %s %s --json --location %s',
          vmNegName, ImageName, username, password, 'SomeLoc', function(result) {
            result.exitStatus.should.equal(1);
            result.errorText.should.include(' No location found which has DisplayName or Name same as value of --location');
            done();
          });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (process.env.VM_LINUX_IMAGE) {
        callBack(process.env.VM_LINUX_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_LINUX_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_LINUX_IMAGE);
        });
      }
    }
  });
});