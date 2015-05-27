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
var testUtils = require('../../../util/util');
var utils = require('../../../../lib/util/utils');
var testprefix = 'arm-network-lb-vip-tests';
var groupPrefix = 'xplatTestGCreate';
var createdGroups = [];
var groupName,
  publicipPrefix = 'xplatTestIp',
  LBName = 'armEmptyLB',
  LBAddPool = 'LB-AddPoll',
  VipName = 'xplattestVipName',
  location = "southeastasia";
var publicIpId, publicIpName;

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

describe('arm', function() {
  describe('network', function() {
    var suite, retry = 5;

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        groupName = suite.isMocked ? 'armrestestingvipgrp' : suite.generateId(groupPrefix, null)
        publicipPrefix = suite.isMocked ? 'xplatTestIp' : suite.generateId(publicipPrefix, null);
        LBName = suite.isMocked ? 'armEmptyLB' : suite.generateId(LBName, null);
        LBAddPool = suite.isMocked ? 'LB-AddPoll' : suite.generateId(LBAddPool, null);
        VipName = suite.isMocked ? VipName : suite.generateId(VipName, null);
        done();
      });
    });
    after(function(done) {
      deleteUsedLB(function() {
        deleteUsedPublicIp(function() {
          deleteUsedGroup(function() {
            suite.teardownSuite(done);
          });
        });
      });
    });
    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('lb frontend-ip', function() {

      it('create', function(done) {
        createGroup(function() {
          createPublicIp(function() {
            showPublicIp(function() {
              createLB(function() {
                var cmd = util.format('network lb frontend-ip create %s %s %s -u %s -o %s', groupName, LBName, VipName, publicIpId, 'Dynamic').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });
      it('set', function(done) {
        suite.execute('network lb frontend-ip set -g %s -l %s -n %s -u %s -o %s --json', groupName, LBName, VipName, publicIpId, 'Dynamic', function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('list', function(done) {
        var cmd = util.format('network lb frontend-ip list -g %s -l %s --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].name.should.equal(VipName);
          done();
        });
      });
      // it('delete', function (done) {
      // suite.execute('network lb address-pool delete -g %s -l %s %s -q --json', groupName, LBName, LBAddPool, function (result) {
      // result.exitStatus.should.equal(0);
      // done();
      // });
      // });

    });

    function createGroup(callback) {
      var cmd = util.format('group create %s --location %s --json', groupName, location).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    }

    function deleteUsedGroup(callback) {
      if (!suite.isMocked) {
        var cmd = util.format('group delete %s --quiet', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          callback();
        });
      } else
        callback();
    }

    function createPublicIp(callback) {
      var cmd = util.format('network public-ip create %s %s --location %s --json', groupName, publicipPrefix, location).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);;
        callback();
      });
    }

    function showPublicIp(callback) {
      var cmd = util.format('network public-ip show %s %s --json', groupName, publicipPrefix).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var allResources = JSON.parse(result.text);
        publicIpId = allResources.id;
        publicIpName = allResources.name;
        callback();
      });
    }

    function deleteUsedPublicIp(callback) {
      if (!suite.isMocked) {
        var cmd = util.format('network public-ip delete %s %s --quiet', groupName, publicipPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          callback();
        });
      } else
        callback();
    }

    function createLB(callback) {
      var cmd = util.format('network lb create %s %s %s --json', groupName, LBName, location).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        callback();
      });
    }

    function deleteUsedLB(callback) {
      if (!suite.isPlayback()) {
        var cmd = util.format('network lb delete %s %s --quiet --json', groupName, LBName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          callback();
        });
      } else
        callback();
    }

  });
});