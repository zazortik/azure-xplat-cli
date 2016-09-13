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
var createMultipleJsonFilePath = path.resolve(__dirname, '../../data/batchCreateMultiTasks.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT' },
  { name: 'AZURE_BATCH_ENDPOINT' }
  //Note we do not include AZURE_BATCH_ACCESS_KEY here because then it would be recorded
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

    it('should update the task', function (done) {
      // The update JSON should change the constraints.maxTaskRetryCount, so we store the original, perform the update,
      // and then ensure that the property was in fact changed.
      suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var originalTask = JSON.parse(result.text);
        originalTask.constraints.should.not.be.null;
        originalTask.constraints.maxTaskRetryCount.should.not.be.null;

        suite.execute('batch task set %s %s --max-wall-clock-time P1D --max-task-retry-count 5 --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var updatedTask = JSON.parse(result.text);
          updatedTask.constraints.should.not.be.null;
          updatedTask.constraints.maxTaskRetryCount.should.not.be.null;
          updatedTask.constraints.maxTaskRetryCount.should.not.equal(originalTask.constraints.maxTaskRetryCount);

          done();
        });
      });
    });

    it('should show subtasks with a task', function (done) {
      function waitForTaskComplete(callback) {
        suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {

          result.exitStatus.should.equal(0);
          var task = JSON.parse(result.text);
          if (task.state != 'completed') {
            setTimeout(waitForTaskComplete.bind(null, callback), suite.isPlayback() ? 0 : 5000);
          } else {
            callback();
          }
        });
      }
      
      waitForTaskComplete(function () {
        suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json --subtasks', jobId, taskId,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var task = JSON.parse(result.text);
          task.task.id.should.equal(taskId);
          task.subTasks.should.not.be.null;
          task.subTasks.value.should.not.be.null;
          task.subTasks.value.length.should.equal(2);
          task.subTasks.value.some(function (task) {
            return task.id === 1;
          }).should.be.true;
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

    it('should create the task by parameterized', function (done) {
      suite.execute('batch task create %s -i aaa -c %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
        'echo hello', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdTask = JSON.parse(result.text);
        createdTask.should.not.be.null;
        createdTask.id.should.equal('aaa');
        createdTask.commandLine.should.equal('echo hello');

        suite.execute('batch task delete %s aaa --account-name %s --account-key %s --account-endpoint %s --json --quiet', jobId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          // Tasks don't have a deleting state, so no need to check for it.
          result.text.should.equal('');     
          done();
        });
      });
    });
    
    it('should create multiple tasks from a json file', function (done) {
      suite.execute('batch task create %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
        createMultipleJsonFilePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdTasks = JSON.parse(result.text);
        createdTasks.should.not.be.null;
        createdTasks.length.should.equal(3);
        createdTasks.some(function (task) {
          return task.taskId === 'xplatTask1';
        }).should.be.true;
        done();
      });
    });
   
    it('should terminate the task', function (done) {
      suite.execute('batch task stop %s %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', jobId, 
        'xplatTask1', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 'xplatTask1',
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var originalTask = JSON.parse(result.text);
          originalTask.state.should.equal('completed');
          done();
        });
      });
    });

    it('should reactivate the task', function (done) {
      var reactivateTaskId = 'reactivateTask';
      // Create a task which will fail with exit code 1
      suite.execute('batch task create %s -i %s -c %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
        reactivateTaskId, 'cmd /c dir abc.123', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        
        setTimeout(function () {
          suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, reactivateTaskId,
            batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
            result.exitStatus.should.equal(0);
            var failedTask = JSON.parse(result.text);
            failedTask.state.should.equal('completed');
            failedTask.executionInfo.should.not.be.null;
            failedTask.executionInfo.exitCode.should.equal(1);
            
            suite.execute('batch task reactivate %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
              reactivateTaskId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, reactivateTaskId,
                batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
                result.exitStatus.should.equal(0);
                var reactivatedTask = JSON.parse(result.text);
                reactivatedTask.state.should.equal('active');
                done();
              });
            });
          });
        }, suite.isPlayback() ? 0 : 10000);
      });
    });
    
  });
});