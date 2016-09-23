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
var util = require('util');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-ad-group-tests';
var groupObjectId;

describe('arm', function () {
  describe('ad', function () {
    var suite;
    
    before(function (done) {
      suite = new CLITest(this, testprefix);
      suite.setupSuite(done);
    });
    
    after(function (done) {
      suite.teardownSuite(done);
    });
    
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    describe('group', function () {
      it('create list show and delete should work', function (done) {
        var groupName = 'testGroup1034';
        var mailNickname = 'testG1034';
        suite.execute('ad group create -d %s -m %s --json', groupName, mailNickname, function (result) {
          result.exitStatus.should.equal(0);
          var group = JSON.parse(result.text);
          groupObjectId = group.objectId;
          suite.execute('ad group show --objectId %s --json', groupObjectId, function(result) {
            result.exitStatus.should.equal(0);
            var showGroup = JSON.parse(result.text);
            showGroup[0].objectId.should.equal(groupObjectId);
            suite.execute('ad group list --json', function(result) {
              result.exitStatus.should.equal(0);
              var grouplist = JSON.parse(result.text);
              grouplist.length.should.be.above(0);
              grouplist.some(function(item) {
                return item.objectId === groupObjectId;
              }).should.be.true;
              suite.execute('ad group delete --objectId %s -q --json', groupObjectId, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        });
      });

      it ('add list check and remove member should work', function (done) {
        var groupName = 'testGroup4301';
        var mailNickname = 'testG4301';
        var upn = 'testuser9007@rbacclitest.onmicrosoft.com';
        var userObjectId = '';
        //Create Group
        suite.execute('ad group create -d %s -m %s --json', groupName, mailNickname, function (result) {
          result.exitStatus.should.equal(0);
          var group = JSON.parse(result.text);
          groupObjectId = group.objectId;
          var displayName = 'test9007 user9007', mailNickname = 'testu9007', password = 'DummyM129007#';
          //Create User
          suite.execute('ad user create -u %s -d %s -m %s -p %s --json', upn, displayName, mailNickname, password, function (result) {
            result.exitStatus.should.equal(0);
            var user = JSON.parse(result.text);
            userObjectId = user.objectId;
            //Add user to group
            suite.execute('ad group member add -o %s -m %s --json', groupObjectId, userObjectId, function (result) {
              result.exitStatus.should.equal(0);
              //Verify that the user has been added to the group
              suite.execute('ad group member check -o %s -m %s --json', groupObjectId, userObjectId, function (result) {
                result.exitStatus.should.equal(0);
                var outcome = JSON.parse(result.text);
                outcome.value.should.be.true;
                //Delete the member from the group
                suite.execute('ad group member delete -q -o %s -m %s --json', groupObjectId, userObjectId, function (result) {
                  result.exitStatus.should.equal(0);
                  // Verify that the user is no longer a member of that group
                  suite.execute('ad group member list -o %s --json', groupObjectId, function (result) {
                    result.exitStatus.should.equal(0);
                    var updatedMemberList = JSON.parse(result.text);
                    updatedMemberList.some(function (member) { return member.objectId === userObjectId; }).should.be.false;
                    //Delete the user
                    suite.execute('ad user delete -q %s --json', upn, function (result) {
                      result.exitStatus.should.equal(0);
                      //Delete the group
                      suite.execute('ad group delete -q %s --json', groupObjectId, function(result) {
                        result.exitStatus.should.equal(0);
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