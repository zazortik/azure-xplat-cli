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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var VMTestUtil = require('../../../util/vmTestUtil');
var testprefix = 'arm-cli-availset-tests';
var groupPrefix = 'xplatTestGAvailCreate';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

var groupName,
  location,
  availprefix = 'xplatTestaAvail';


describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        location = location.replace(/\s/g, '');
        groupName = suite.generateId(groupPrefix, null);
        availprefix = suite.generateId(availprefix, null);
        done();
      });
    });
    after(function(done) {
      deleteUsedGroup(function() {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('availset', function() {



      it('create should pass', function(done) {
        vmTest.createGroup(groupName, location, suite, function(result) {
          var cmd = util.format('availset create -g %s -n %s -l %s -a 3 -b 3 --json', groupName, availprefix, location).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('list should display all availability sets in a resource group', function(done) {
        var cmd = util.format('availset list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === availprefix;
          }).should.be.true;
          done();
        });
      });
      it('show should display details about the availability set', function(done) {
        var cmd = util.format('availset show %s %s --json', groupName, availprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(availprefix);
          result.text.should.containEql('"platformUpdateDomainCount": 3,');
          result.text.should.containEql('"platformFaultDomainCount": 3,');
          done();
        });
      });

      it('list-available-sizes should list the available VM sizes in availability set', function (done) {
        var cmd = util.format('availset list-available-sizes %s %s', groupName, availprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql('Standard_A1');
          result.text.should.containEql('Standard_D1');
          done();
        });
      });

      it('delete should delete the availability set', function (done) {
        var cmd = util.format('availset delete %s %s --quiet --json', groupName, availprefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

    function deleteUsedGroup(callback) {
      if (!suite.isPlayback()) {
        var cmd = util.format('group delete %s --quiet --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          callback();
        });
      } else callback();
    }

  });
});