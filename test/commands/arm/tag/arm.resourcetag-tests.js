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

'use strict';

var should = require('should');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-resourcetag-tests';

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' },
  { name: 'AZURE_ARM_TEST_RESOURCE_LOCATION', defaultValue: 'East US' }
];

var createdGroups = [];
var createdResources = [];
var createdTags = [];
var groupPrefix = 'xplatResourceTagGrp';
var resourcePrefix = 'xplatResourceTagRes';
var tagPrefix = 'xplatResourceTag';

describe('arm', function () {
  describe('resource', function () {
    var suite;
    var testApiVersion = '2014-04-01';
    var testGroupLocation;
    var testResourceLocation;

    before(function (done) {
      suite = new CLITest(testprefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        testGroupLocation = process.env['AZURE_ARM_TEST_LOCATION'];
        testResourceLocation = process.env['AZURE_ARM_TEST_RESOURCE_LOCATION'];
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('create resource with tag', function () {
      it('should work in the creation and querying', function (done) {
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);
        var resourceName = suite.generateId(resourcePrefix, createdResources, suite.isMocked);
        var tagName = suite.generateId(tagPrefix, createdTags, suite.isMocked);
        var tagValue = 'fooValue';
        var invalidTagValue = 'foo2';

        suite.execute('tag add %s %s --json', tagName, tagValue, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group create %s --location %s --quiet --json', groupName, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('resource create %s %s %s %s %s -p %s -t %s --quiet --json', groupName, resourceName,
              'Microsoft.Web/sites', testResourceLocation, testApiVersion,
              '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }',
              tagName + '=' + tagValue, function (result) {
                result.exitStatus.should.equal(0);

                suite.execute('resource list %s -t %s --json', groupName, tagName, function (showResult) {
                  showResult.exitStatus.should.equal(0);

                  var resources = JSON.parse(showResult.text);
                  resources.length.should.equal(1);
                  resources[0].name.should.equal(resourceName);                  

                  suite.execute('resource list %s -t %s --json', groupName, tagName + '=' + tagValue, function (showResult) {
                    showResult.exitStatus.should.equal(0);
                    var resources = JSON.parse(showResult.text);
                    resources.length.should.equal(1);
                    resources[0].name.should.equal(resourceName);

                    suite.execute('resource list %s -t %s --json', groupName, tagName + '=' + invalidTagValue, function (showResult) {
                      var resources = JSON.parse(showResult.text);
                      resources.length.should.equal(0);
                      suite.execute('group delete %s --quiet --json', groupName, function () {
                        //TODO: delete the tag
                        done();
                      });
                    });
                  });
                });
              });
          });
        });
      });
    });
  });
});