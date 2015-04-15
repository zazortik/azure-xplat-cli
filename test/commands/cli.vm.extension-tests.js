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
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.extension-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var timeout, retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('Extension:', function() {
      var extensionList = null;
      var extensionVersions = null;

      //list all extensions
      it('should list all vm extensions', function(done) {
        var cmd = util.format('vm extension list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);

          extensionList = JSON.parse(result.text);
          extensionList.length.should.be.above(0);

          done();
        });
      });

      // when both publisher name and extension name are given check
      // whether all extensions fetched match given publisher and
      // extension name
      it('should fetch extensions matching given publisher or extension name', function(done) {

        //pick two different extensions at random
        var index1 = suite.isMocked ? 0 : Math.random() * extensionList.length >> 0;
        var index2 = suite.isMocked ? 1 : Math.random() * extensionList.length >> 0;
        while (index2 === index1) {
          index2 = Math.random() * extensionList.length >> 0;
        }

        var cmd = util.format('vm extension list -p %s -n %s --json', extensionList[index1].publisher, extensionList[index2].name).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);

          var ext = JSON.parse(result.text);
          ext.length.should.be.above(0);

          ext.forEach(function(e) {
            ((e.publisher === extensionList[index1].publisher) ||
              (e.name === extensionList[index2].name)).should.be.true;
          });

          done();
        });
      });

      // fetch all versions for a given extension and publisher
      it('should fetch all versions for a given extension and publisher', function(done) {

        // pick an extension at random
        var index = suite.isMocked ? 0 : Math.random() * extensionList.length >> 0;

        var cmd = util.format('vm extension list -p %s -n %s -a --json', extensionList[index].publisher, extensionList[index].name).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);

          extensionVersions = JSON.parse(result.text);
          extensionVersions.length.should.be.above(0);

          extensionVersions.forEach(function(e) {
            e.publisher.should.equal(extensionList[index].publisher);
            e.name.should.equal(extensionList[index].name);
          });

          done();
        });
      });

      // fetch details a given extension and publisher and version
      it('should fetch details for a given extension, publisher and version', function(done) {

        // pick a version at random
        var index = suite.isMocked ? 0 : Math.random() * extensionVersions.Length >> 0;
        var cmd = util.format('vm extension list -p %s -n %s -e %s --json',
          extensionVersions[index].publisher,
          extensionVersions[index].name,
          extensionVersions[index].version).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);

          var extVer = JSON.parse(result.text);
          extVer.length.should.be.exactly(1);

          extVer[0].publisher.should.equal(extensionVersions[index].publisher);
          extVer[0].name.should.equal(extensionVersions[index].name);
          extVer[0].version.should.equal(extensionVersions[index].version);

          done();
        });
      });
    });
  });
});