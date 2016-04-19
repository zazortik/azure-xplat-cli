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

var jobId = 'xplatJobForTaskTests';
var taskId = 'xplatTask';

var path = require('path');
var createJobJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobForTaskTests.json');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreateTask.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdateTask.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-task-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch task', function () {
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
        
        if (!suite.isPlayback()) {
          suite.execute('batch job create %s --account-name %s --account-key %s --account-endpoint %s --json', createJobJsonFilePath, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }
        else {
          done();
        }
      });
    });
    
    after(function (done) {
      if (!suite.isPlayback()) {
        suite.execute('batch job delete %s --account-name %s --account-key %s --account-endpoint %s --quiet --json', jobId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });
    
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should create a task from a json file', function (done) {
      suite.execute('batch task create %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
        createJsonFilePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdTask = JSON.parse(result.text);
        createdTask.should.not.be.null;
        createdTask.id.should.equal(taskId);
        done();
      });
    });
    
    it('should list tasks under a job', function (done) {
      suite.execute('batch task list %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var tasks = JSON.parse(result.text);
        tasks.some(function (task) {
          return task.id === taskId;
        }).should.be.true;
        done();
      });
    });

    it('should update the task using a json file', function (done) {
      // The update JSON should change the constraints.maxTaskRetryCount, so we store the original, perform the update,
      // and then ensure that the property was in fact changed.
      suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var originalTask = JSON.parse(result.text);
        originalTask.constraints.should.not.be.null;
        originalTask.constraints.maxTaskRetryCount.should.not.be.null;

        suite.execute('batch task set %s %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
          updateJsonFilePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var updatedTask = JSON.parse(result.text);
          updatedTask.constraints.should.not.be.null;
          updatedTask.constraints.maxTaskRetryCount.should.not.be.null;
          updatedTask.constraints.maxTaskRetryCount.should.not.equal(originalTask.constraints.maxTaskRetryCount);

          done();
        });
      });
    });
    
    it('should delete the task', function (done) {
      suite.execute('batch task delete %s %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', jobId, 
        taskId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          // Tasks don't have a deleting state, so no need to check for it.
          result.text.should.equal('');     
          done();
        });
      });
    });
  });
});