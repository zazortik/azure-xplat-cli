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

var createdPoolId = 'xplatCreatedPool';
var sharedPoolId = 'xplatTestPool';

var path = require('path');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreatePool.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdatePool.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-pool-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch pool', function () {
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
    
    it('should create a pool from a json file', function (done) {
      suite.execute('batch pool create %s --account-name %s --account-key %s --account-endpoint %s --json', createJsonFilePath, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var createdPool = JSON.parse(result.text);
        createdPool.should.not.be.null;
        createdPool.id.should.equal(createdPoolId);
        done();
      });
    });
    
    it('should list pools under a batch account', function (done) {
      suite.execute('batch pool list --account-name %s --account-key %s --account-endpoint %s --json', 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var pools = JSON.parse(result.text);
        pools.some(function (pool) {
          return pool.id === createdPoolId;
        }).should.be.true;
        done();
      });
    });

    it('should update the created pool using a json file', function (done) {
      // The update JSON should change the start task command line, so we store the original, perform the update,
      // and then ensure that the start task was in fact changed.
      suite.execute('batch pool show %s --account-name %s --account-key %s --account-endpoint %s --json', createdPoolId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var originalPool = JSON.parse(result.text);
        originalPool.startTask.should.not.be.null;
        originalPool.startTask.commandLine.should.not.be.null;

        suite.execute('batch pool set %s %s --account-name %s --account-key %s --account-endpoint %s --json', createdPoolId, 
          updateJsonFilePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var updatedPool = JSON.parse(result.text);
          updatedPool.startTask.should.not.be.null;
          updatedPool.startTask.commandLine.should.not.be.null;
          updatedPool.startTask.commandLine.should.not.equal(originalPool.startTask.commandLine);

          done();
        });
      });
    });
    
    it('should delete the created pool', function (done) {
      suite.execute('batch pool delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', createdPoolId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch pool show %s --account-name %s --account-key %s --account-endpoint %s --json', createdPoolId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          if (result.exitStatus === 0) {
            var deletingPool = JSON.parse(result.text);
            deletingPool.state.should.equal('deleting');
          } else {
            result.text.should.equal('');
          }
          
          done();
        });
      });
    });

    it('should remove nodes from the shared pool', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', 
        sharedPoolId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var nodes = JSON.parse(result.text);
        nodes.should.not.be.null;
        nodes.length.should.be.above(0);
        var computeNodeId = nodes[0].id;
        
        suite.execute('batch node delete %s %s --resize-timeout %s --account-name %s --account-key %s --account-endpoint %s --json --quiet',
          sharedPoolId, computeNodeId, "00:05:00", batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          // TODO: Pool state doesn't change to resizing immediately - we could poll with a timeout until the transition to verify the command worked.
          done();
        });
      });
    });

    it('should list node agent skus', function (done) {
      suite.execute('batch pool list-node-agent-skus --account-name %s --account-key %s --account-endpoint %s --json',  
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var skus = JSON.parse(result.text);
        skus.should.not.be.null;
        skus.length.should.be.above(0);
        skus[0].id.should.not.be.null;
        skus[0].osType.should.not.be.null;
        done();
      });
    });
  });
});