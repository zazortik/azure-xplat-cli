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
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.image-tests';
var createdVmImages = [];

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmImgName,
      location,
      timeout, retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;
    var vmUtil = new vmTestUtil();

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmImgName = suite.generateId(vmPrefix, createdVmImages);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        location = process.env.AZURE_VM_TEST_LOCATION;
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //create a image
    describe('Image:', function() {
      it('Create', function(done) {
        vmUtil.getDiskName('Linux', location, suite, function(diskObj) {
          var imageSourcePath = diskObj.mediaLinkUri;
          var domainUrl = 'http://' + imageSourcePath.split('/')[2];
          var blobUrl = domainUrl + '/vm-images/' + vmImgName;

          var cmd = util.format('vm image create -u %s %s %s --os %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux').split(' ');
          cmd.push('-l');
          cmd.push(location);
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(done, timeout);
          });
        });
      });

      //show the created image
      it('Show', function(done) {
        var cmd = util.format('vm image show %s --json', vmImgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vmImageObj = JSON.parse(result.text);
          vmImageObj.name.should.equal(vmImgName);
          vmImageObj.operatingSystemType.should.equal('Linux');
          Array.isArray(vmImageObj.location).should.be.true;
          done();
        });
      });

      //list all images
      it('List', function(done) {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.length.should.be.above(0);
          var found = null,
            imageObj = null;
          found = imageList.some(function(image) {
            if (image.category.toLowerCase() === 'public') {
              imageObj = image;
              return true;
            }
          });
          found.should.be.true;
          imageObj.category.toLowerCase().should.equal('public');

          found = null,
            imageObj = null;
          found = imageList.some(function(image) {
            if (image.category.toLowerCase() === 'user') {
              imageObj = image;
              return true;
            }
          });
          found.should.be.true;
          imageObj.category.toLowerCase().should.equal('user');

          found = null,
            imageObj = null;
          found = imageList.some(function(image) {
            if (image.category.toLowerCase() === 'user' && image.deploymentName) {
              imageObj = image;
              return true;
            }
          });
          if (found) {
            imageObj.deploymentName.should.not.equal(undefined);
          }

          done();
        });
      });

      it('Delete', function(done) {
        var cmd = util.format('vm image delete -b %s --json', vmImgName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

  });
});
