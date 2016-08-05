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

var jobScheduleId = 'xplatJobSchedule';
var createdWithParamsId = 'xplatParamsJobSchedule';

var path = require('path');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobSchedule.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdateJobSchedule.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT' },
  { name: 'AZURE_BATCH_ENDPOINT' }
  //Note we do not include AZURE_BATCH_ACCESS_KEY here because then it would be recorded
];

var testPrefix = 'cli-batch-jobschedule-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch job schedule', function () {
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
    
    it('should create a job schedule from a json file', function (done) {
      suite.execute('batch job-schedule create %s --account-name %s --account-key %s --account-endpoint %s --json', createJsonFilePath, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var createdSchedule = JSON.parse(result.text);
        createdSchedule.should.not.be.null;
        createdSchedule.id.should.equal(jobScheduleId);
        done();
      });
    });
    
    it('should create a job schedule using parameters', function (done) {
      var poolId = "pool1";
      var priority = 1;
      var maxWallClockTime = "PT12H";
      var maxTaskRetryCount = Number(3);
      var metadata = "meta1=value1;meta2=value2";
      var doNotRunUntil = "2020-01-01T12:00:00.000Z";
      var doNotRunAfter = "2021-01-01T12:00:00.000Z";
      var startWindow = "PT1H";
      var recurrence = "PT2H";
      suite.execute('batch job-schedule create -i %s -p %s --metadata %s --priority %s --max-wall-clock-time %s --max-task-retry-count %s --do-not-run-until %s --do-not-run-after %s --start-window %s --recurrence-interval %s --account-name %s --account-key %s --account-endpoint %s --json',
        createdWithParamsId, poolId, metadata, priority, maxWallClockTime, maxTaskRetryCount, doNotRunUntil, doNotRunAfter,
        startWindow, recurrence, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdJobSchedule = JSON.parse(result.text);
        createdJobSchedule.should.not.be.null;
        createdJobSchedule.id.should.equal(createdWithParamsId);
        createdJobSchedule.jobSpecification.poolInfo.poolId.should.equal(poolId);
        createdJobSchedule.jobSpecification.priority.should.equal(priority);
        createdJobSchedule.jobSpecification.constraints.maxWallClockTime.should.equal(maxWallClockTime);
        createdJobSchedule.jobSpecification.constraints.maxTaskRetryCount.should.equal(maxTaskRetryCount);
        createdJobSchedule.metadata.length.should.equal(2);
        createdJobSchedule.metadata[0].name.should.equal("meta1");
        createdJobSchedule.metadata[0].value.should.equal("value1");
        createdJobSchedule.metadata[1].name.should.equal("meta2");
        createdJobSchedule.metadata[1].value.should.equal("value2");
        createdJobSchedule.schedule.doNotRunUntil.should.equal(doNotRunUntil);
        createdJobSchedule.schedule.doNotRunAfter.should.equal(doNotRunAfter);
        createdJobSchedule.schedule.startWindow.should.equal(startWindow);
        createdJobSchedule.schedule.recurrenceInterval.should.equal(recurrence);
        done();
      });
    });
    
    it('should list job schedules under a batch account', function (done) {
      suite.execute('batch job-schedule list --account-name %s --account-key %s --account-endpoint %s --json', 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var jobSchedules = JSON.parse(result.text);
        jobSchedules.some(function (jobSchedule) {
          return jobSchedule.id === jobScheduleId;
        }).should.be.true;
        done();
      });
    });
    
    it('should disable the job schedule', function (done) {
      suite.execute('batch job-schedule disable %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobScheduleId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job-schedule show %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var jobSchedule = JSON.parse(result.text);
          jobSchedule.should.not.be.null;
          jobSchedule.state.should.equal('disabled');
          done();
        });
      });
    });
    
    it('should enable the job schedule', function (done) {
      suite.execute('batch job-schedule enable %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobScheduleId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job-schedule show %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var jobSchedule = JSON.parse(result.text);
          jobSchedule.should.not.be.null;
          jobSchedule.state.should.equal('active');
          done();
        });
      });
    });

    it('should update the job schedule using a json file', function (done) {
      // The update JSON should change the job manager task id, so we store the original, perform the update,
      // and then ensure that the job manager task id was in fact changed.
      suite.execute('batch job-schedule show %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) 
      {
        result.exitStatus.should.equal(0);
        var originalJobSchedule = JSON.parse(result.text);
        originalJobSchedule.jobSpecification.should.not.be.null;
        originalJobSchedule.jobSpecification.jobManagerTask.should.not.be.null;
        originalJobSchedule.jobSpecification.jobManagerTask.id.should.not.be.null;

        suite.execute('batch job-schedule set %s %s --account-name %s --account-key %s --account-endpoint %s --json --replace', jobScheduleId, updateJsonFilePath, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var updatedJobSchedule = JSON.parse(result.text);
          updatedJobSchedule.jobSpecification.should.not.be.null;
          updatedJobSchedule.jobSpecification.jobManagerTask.should.not.be.null;
          updatedJobSchedule.jobSpecification.jobManagerTask.id.should.not.be.null;
          updatedJobSchedule.jobSpecification.jobManagerTask.id.should.not.equal(originalJobSchedule.jobSpecification.jobManagerTask.id);

          done();
        });
      });
    });
    
    it('should update a job schedule using parameters', function (done) {
      var poolId = "pool1";
      var priority = 3;
      var maxWallClockTime = "PT10H";
      var maxTaskRetryCount = Number(5);
      var doNotRunUntil = "2020-01-01T06:00:00.000Z";
      var doNotRunAfter = "2021-01-01T06:00:00.000Z";
      var startWindow = "PT2H";
      var recurrence = "PT4H";
      suite.execute('batch job-schedule set -i %s -p %s --priority %s --max-wall-clock-time %s --max-task-retry-count %s --do-not-run-until %s --do-not-run-after %s --start-window %s --recurrence-interval %s --account-name %s --account-key %s --account-endpoint %s --json',
        createdWithParamsId, poolId, priority, maxWallClockTime, maxTaskRetryCount, doNotRunUntil, doNotRunAfter,
        startWindow, recurrence, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var updatedJobSchedule = JSON.parse(result.text);
        updatedJobSchedule.should.not.be.null;
        updatedJobSchedule.id.should.equal(createdWithParamsId);
        updatedJobSchedule.jobSpecification.poolInfo.poolId.should.equal(poolId);
        updatedJobSchedule.jobSpecification.priority.should.equal(priority);
        updatedJobSchedule.jobSpecification.constraints.maxWallClockTime.should.equal(maxWallClockTime);
        updatedJobSchedule.jobSpecification.constraints.maxTaskRetryCount.should.equal(maxTaskRetryCount);
        updatedJobSchedule.schedule.doNotRunUntil.should.equal(doNotRunUntil);
        updatedJobSchedule.schedule.doNotRunAfter.should.equal(doNotRunAfter);
        updatedJobSchedule.schedule.startWindow.should.equal(startWindow);
        updatedJobSchedule.schedule.recurrenceInterval.should.equal(recurrence);
        
        suite.execute('batch job-schedule delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
          createdWithParamsId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
    
    it('should stop the job schedule', function (done) {
      suite.execute('batch job-schedule stop %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobScheduleId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job-schedule show %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var jobSchedule = JSON.parse(result.text);
          jobSchedule.should.not.be.null;
          jobSchedule.state.should.equal('completed');
          done();
        });
      });
    });

    it('should delete the job schedule', function (done) {
      suite.execute('batch job-schedule delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', jobScheduleId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch job-schedule show %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          if (result.exitStatus === 0) {
            var deletingJobSchedule = JSON.parse(result.text);
            deletingJobSchedule.state.should.equal('deleting');
          } else {
            result.text.should.equal('');
          }
          
          done();
        });
      });
    });
  });
});