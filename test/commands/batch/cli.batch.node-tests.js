//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
'use strict';

var should = require('should');
var utils = require('../../../lib/util/utils');
var CLITest = require('../../framework/arm-cli-test');

var fs = require('fs');
var moment = require('moment');

var poolId = 'xplatTestPool';
var computeNodeId;
var computeNodeId2;
var userName = "xplatUser";
var downloadLocation = "node.rdp";

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-node-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch node', function () {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      
      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(function () {
        batchAccount = process.env.AZURE_BATCH_ACCOUNT;
        if (suite.isPlayback()) {
          batchAccountKey = 'non null default value';
        } else {
          batchAccountKey = process.env.AZURE_BATCH_ACCESS_KEY;
        }
        batchAccountEndpoint = process.env.AZURE_BATCH_ENDPOINT;
        
        done();
      });
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
    
    it('should list nodes in a pool', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', 
        poolId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var nodes = JSON.parse(result.text);
        nodes.should.not.be.null;
        nodes.length.should.be.above(1);
        computeNodeId = nodes[0].id;
        computeNodeId2 = nodes[1].id;
        done();
      });
    });
    
    it('should download the node RDP file', function (done) {
      suite.execute('batch node show %s %s --account-name %s --account-key %s --account-endpoint %s --json', 
        poolId, computeNodeId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var node = JSON.parse(result.text);
        node.should.not.be.null;
        suite.execute('batch node get-remote-desktop %s %s %s --account-name %s --account-key %s --account-endpoint %s --json -q',
          poolId, computeNodeId, downloadLocation, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var downloadedContent = fs.readFileSync(downloadLocation).toString();
          downloadedContent.should.not.be.null;
          downloadedContent.length.should.not.equal(0);
          fs.unlinkSync(downloadLocation);
          done();
        });
      });
    });
    
    it('should create a user on a compute node', function (done) {
      suite.execute('batch node-user create %s %s %s %s --account-name %s --account-key %s --account-endpoint %s --json', 
        poolId, computeNodeId, userName, "Password1234!", batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        // The service provides no way to list users, so we just depend on the successful return value.
        done();
      });
    });

    it('should update the compute node node user', function (done) {
      var expiryTime = "2021-01-02T03:04:05";

      suite.execute('batch node-user set %s %s %s --user-password %s --expiry-time %s --account-name %s --account-key %s --account-endpoint %s --json',
        poolId, computeNodeId, userName, "Password5678!", expiryTime, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        // The service provides no way to list users, so we just depend on the successful return value.
        done();
      });
    });
    
    it('should delete the compute node user', function (done) {
      suite.execute('batch node-user delete %s %s %s --account-name %s --account-key %s --account-endpoint %s --json --quiet',  
        poolId, computeNodeId, userName, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        // The service provides no way to list users, so we just depend on the successful return value.
        done();
      });
    });

    it('should reboot the compute node', function (done) {
      suite.execute('batch node reboot %s %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
        poolId, computeNodeId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch node show %s %s --account-name %s --account-key %s --account-endpoint %s --json', 
        poolId, computeNodeId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var node = JSON.parse(result.text);
          node.should.not.be.null;
          node.state.should.equal('rebooting');
          done();
        });
      });
    });

    it('should reimage the compute node', function (done) {
      suite.execute('batch node reimage %s %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
        poolId, computeNodeId2, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch node show %s %s --account-name %s --account-key %s --account-endpoint %s --json', 
        poolId, computeNodeId2, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var node = JSON.parse(result.text);
          node.should.not.be.null;
          node.state.should.equal('reimaging');
          done();
        });
      });
    });
  });
});