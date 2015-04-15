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
var testprefix = 'arm-cli-resourcegrouptag-tests';

var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' }
];

var createdGroups = [];
var createdTags = [];
var groupPrefix = 'xplatResourceGroupTagGrp';
var tagPrefix = 'xplatResourceGroupTag';

describe('arm', function () {
  describe('resourcegroup tags', function () {
    var suite;
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
        done();
      });
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    describe('create group with tag', function () {
      it('should work in the group creation and querying', function (done) {
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);
        var tagName = suite.generateId(tagPrefix, createdTags, suite.isMocked);
        var tagValue = 'fooValue';
        var invalidTagValue = 'foo2';
        
        suite.execute('tag create --name %s --value %s --json', tagName, tagValue, function (result) {
          result.exitStatus.should.equal(0);
          
          suite.execute('group create %s --location %s -t %s --json', groupName, testGroupLocation, tagName + '=' + tagValue, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group list -t %s --json', tagName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              
              var groups = JSON.parse(showResult.text);
              groups.length.should.equal(1);
              groups[0].name.should.equal(groupName);
              
              suite.execute('group list -t %s --json', tagName + '=' + tagValue, function (showResult) {
                showResult.exitStatus.should.equal(0);
                var groups = JSON.parse(showResult.text);
                groups.length.should.equal(1);
                groups[0].name.should.equal(groupName);
                
                suite.execute('group list -t %s --json', tagName + '=' + invalidTagValue, function (showResult) {
                  showResult.exitStatus.should.equal(0);
                  showResult.text.should.not.include(tagValue);

                  suite.execute('group delete %s --quiet --json', groupName, function () {
                    //Note, we don't clean up the tag here because it can't be removed till associated resource group is gone which could take a while;
                    //also adding the same tag by multiple tests won't cause error and fail the tests.
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    
    describe('set tags on a group', function () {
      it('should work in settting group and filtering', function (done) {
        var groupName = suite.generateId(groupPrefix, createdGroups, suite.isMocked);
        var tagName = suite.generateId(tagPrefix, createdTags, suite.isMocked);
        
        suite.execute('tag create -n %s --json', tagName, function (result) {
          result.exitStatus.should.equal(0);
          
          suite.execute('group create %s --location %s --json', groupName, testGroupLocation, function (result) {
            result.exitStatus.should.equal(0);
            
            //set a tag
            suite.execute('group set %s -t %s --json', groupName, tagName, function (result) {
              result.exitStatus.should.equal(0);
              
              //verify by using it as a filter
              suite.execute('group list -t %s --json', tagName, function (showResult) {
                showResult.exitStatus.should.equal(0);
                
                var groups = JSON.parse(showResult.text);
                groups.length.should.equal(1);
                groups[0].name.should.equal(groupName);
                
                //clear the tag
                suite.execute('group set %s --no-tags --json', groupName, function (result) {
                  result.exitStatus.should.equal(0);
                  
                  //again, verify by using it a a filter
                  suite.execute('group list -t %s --json', tagName, function (showResult) {
                    showResult.exitStatus.should.equal(0);
                    showResult.text.should.not.include(tagName);
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