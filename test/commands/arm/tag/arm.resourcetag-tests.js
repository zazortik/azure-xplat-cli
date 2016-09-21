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
var assert = require('assert');

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
  describe('resource tag', function () {
    var suite;
    var testApiVersion = '2014-04-01';
    var testGroupLocation;
    var testResourceLocation;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
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

        suite.execute('tag create %s %s --json', tagName, tagValue, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('resource create %s %s %s %s -p %s -t %s --json', groupName, resourceName,
              'Microsoft.Web/sites', testApiVersion,
              '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }',
              tagName + '=' + tagValue, function (result) {
                result.exitStatus.should.equal(0);

                listPoll(suite, groupName, tagName, 3, false, function (showResult) {
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
                      showResult.exitStatus.should.equal(0);
                      showResult.text.should.equal('');
                      suite.execute('group delete %s --quiet --json', groupName, function () {
                        //Note, we don't clean up the tag here because it can't be removed till associated resource group is gone which could take a while;
                        //also addingthe  same tag by multiple tests won't cause error and fail the tests.
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

    describe('set tags on a resource', function () {
      it('should work in setting it and filtering', function (done) {
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);
        var resourceName = suite.generateId(resourcePrefix, createdResources, suite.isMocked);
        var tagName = suite.generateId(tagPrefix, createdTags, suite.isMocked);

        suite.execute('tag create %s --json', tagName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('resource create %s %s %s %s -p %s --json', groupName, resourceName,
              'Microsoft.Web/sites', testApiVersion,
              '{ "Name": "' + resourceName + '", "SiteMode": "Limited", "ComputeMode": "Shared" }',
              function (result) {
                result.exitStatus.should.equal(0);

                //set a tag
                suite.execute('resource set %s %s %s -o %s -t %s --json', groupName, resourceName,
                  'Microsoft.Web/sites', testApiVersion, tagName, function (result) {
                  result.exitStatus.should.equal(0);

                  //verify by using it as a filter
                  listPoll(suite, groupName, tagName, 3, false, function (showResult) {
                    showResult.exitStatus.should.equal(0);

                    var resources = JSON.parse(showResult.text);
                    resources.length.should.equal(1);
                    resources[0].name.should.equal(resourceName);

                    //clear the tag
                    suite.execute('resource set %s %s %s -o %s --no-tags --json', groupName, resourceName,
                      'Microsoft.Web/sites', testApiVersion, function (result) {
                      result.exitStatus.should.equal(0);

                      //again, verify by using it as a filter
                      listPoll(suite, groupName, tagName, 3, true, function (showResult) {
                        showResult.exitStatus.should.equal(0);
                        showResult.text.should.equal('');
                        suite.execute('group delete %s --quiet --json', groupName, function () {
                          //Note, we don't clean up the tag here because it can't be removed till associated resource group is gone which could take a while;
                          //also addingthe  same tag by multiple tests won't cause error and fail the tests.
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
});

function listPoll(suite, groupName, tagName, attemptsLeft, responseIsEmpty, callback) {
  if(attemptsLeft === 0) {
    throw new Error('resource list did not receive expected response');
  }

  suite.execute('resource list %s -t %s --json', groupName, tagName, function (showResult) {
    if((showResult.text && !responseIsEmpty) ||
       (showResult.text === '' && responseIsEmpty)) {
      callback(showResult);
    }
    else {
      setTimeout( function() {
        console.log('Listing resources. ' + attemptsLeft + ' attempt(s) left');
        listPoll(suite, groupName, tagName, attemptsLeft-1, responseIsEmpty, callback);
      }, 10000);
    }
  });
}
