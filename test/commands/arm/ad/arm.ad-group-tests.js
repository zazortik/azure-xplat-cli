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
    });
  });
});