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

var path = require('path');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobSchedule.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdateJobSchedule.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
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

        suite.execute('batch job-schedule set %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobScheduleId, updateJsonFilePath, 
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