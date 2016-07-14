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
var testprefix = 'arm-cli-ad-user-tests';
var userPrefix = 'testuser1012';
var testdomain = '@AzureSDKTeam.onmicrosoft.com';
var userObjectId;
var createdUsers = [];

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
    
    describe('user', function () {
      it('create set list show and delete should work', function (done) {
        var upn = userPrefix + testdomain;
        var displayName = 'test101 user101', mailNickname = 'testu101', password = 'DummyM12#';
        suite.execute('ad user create -u %s -d %s -m %s -p %s --json', upn, displayName, mailNickname, password, function(result) {
          result.exitStatus.should.equal(0);
          var user = JSON.parse(result.text);
          userObjectId = user.objectId;
          var newMailNickname = 'testu102';
          suite.execute('ad user set -u %s -m %s --json', userObjectId, newMailNickname, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('ad user show -u %s --json', upn, function(result) {
              result.exitStatus.should.equal(0);
              var showUser = JSON.parse(result.text);
              showUser[0].mailNickname.should.equal(newMailNickname);
              suite.execute('ad user list --json', function(result) {
                result.exitStatus.should.equal(0);
                var userlist = JSON.parse(result.text);
                userlist.length.should.be.above(0);
                userlist.some(function(item) {
                  return item.objectId === userObjectId;
                }).should.be.true;
                suite.execute('ad user delete -u %s -q --json', upn, function(result) {
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