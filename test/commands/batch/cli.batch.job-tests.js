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

var jobScheduleId = 'xplatJobScheduleJobTests';
var jobId = 'xplatJob';
var createdWithParametersJobId = 'xplatParamJob';

var path = require('path');
var createJobScheduleJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobScheduleForJobTests.json');
var createJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJob.json');
var updateJsonFilePath = path.resolve(__dirname, '../../data/batchUpdateJob.json');

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT' },
  { name: 'AZURE_BATCH_ENDPOINT' }
  //Note we do not include AZURE_BATCH_ACCESS_KEY here because then it would be recorded
];

var testPrefix = 'cli-batch-job-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch job', function () {
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
          suite.execute('batch job-schedule create %s --account-name %s --account-key %s --account-endpoint %s --json', createJobScheduleJsonFilePath, 
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
        suite.execute('batch job-schedule delete %s --account-name %s --account-key %s --account-endpoint %s --quiet --json', jobScheduleId, 
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
    
    it('should create a job from a json file', function (done) {
      suite.execute('batch job create %s --account-name %s --account-key %s --account-endpoint %s --json', createJsonFilePath, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdJob = JSON.parse(result.text);
        createdJob.should.not.be.null;
        createdJob.id.should.equal(jobId);
        done();
      });
    });
    
    it('should create a job using parameters', function (done) {
      var poolId = "pool1";
      var priority = 1;
      var maxWallClockTime = "PT12H";
      var maxTaskRetryCount = Number(3);
      var metadata = "meta1=value1;meta2=value2";
      suite.execute('batch job create -i %s -p %s --metadata %s --priority %s --max-wall-clock-time %s --max-task-retry-count %s --account-name %s --account-key %s --account-endpoint %s --json', 
        createdWithParametersJobId, poolId, metadata, priority, maxWallClockTime, maxTaskRetryCount,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var createdJob = JSON.parse(result.text);
        createdJob.should.not.be.null;
        createdJob.id.should.equal(createdWithParametersJobId);
        createdJob.poolInfo.poolId.should.equal(poolId);
        createdJob.priority.should.equal(priority);
        createdJob.constraints.maxWallClockTime.should.equal(maxWallClockTime);
        createdJob.constraints.maxTaskRetryCount.should.equal(maxTaskRetryCount);
        createdJob.metadata.length.should.equal(2);
        createdJob.metadata[0].name.should.equal("meta1");
        createdJob.metadata[0].value.should.equal("value1");
        createdJob.metadata[1].name.should.equal("meta2");
        createdJob.metadata[1].value.should.equal("value2");
        done();
      });
    });
    
    it('should list jobs under a batch account', function (done) {
      suite.execute('batch job list --account-name %s --account-key %s --account-endpoint %s --json', 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var jobs = JSON.parse(result.text);
        jobs.some(function (job) {
          return job.id === jobId;
        }).should.be.true;
        done();
      });
    });
    
    it('should list jobs under a job schedule', function (done) {
      suite.execute('batch job list --job-schedule-id %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobScheduleId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var jobs = JSON.parse(result.text);
        jobs.every(function (job) {
          // Jobs created from a job schedule have ids of the format '<jobScheduleId>:job<number>'
          // We check to make sure the job id contains the job schedule id.
          return job.id.indexOf(jobScheduleId) != -1;
        }).should.be.true;
        jobs.every(function (job) {
          return job.id != jobId;
        }).should.be.true;
        done();
      });
    });
    
    it('should disable the job', function (done) {
      suite.execute('batch job disable %s --disable-option %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobId, 'requeue', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job show %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var job = JSON.parse(result.text);
          job.should.not.be.null;
          (job.state === 'disabling' || job.state === 'disabled').should.be.true;
          done();
        });
      });
    });
    
    it('should list job prep and release status for the job', function (done) {
      suite.execute('batch job prep-release-status list %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var jobPrepAndReleaseInfo = JSON.parse(result.text);
        jobPrepAndReleaseInfo.should.not.be.null;
        jobPrepAndReleaseInfo.every(function (info) {
          return info.poolId != null && info.nodeId != null;
        }).should.be.true;
        
        done();
      });
    });
    
    it('should enable the job', function (done) {
      suite.execute('batch job enable %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job show %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var job = JSON.parse(result.text);
          job.should.not.be.null;
          job.state.should.equal('active');
          done();
        });
      });
    });

    it('should update the job using a json file', function (done) {
      // The update JSON should change the priority, so we store the original, perform the update,
      // and then ensure that the priority was in fact changed.
      suite.execute('batch job show %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var originalJob = JSON.parse(result.text);
        originalJob.priority.should.not.be.null;

        suite.execute('batch job set %s %s --account-name %s --account-key %s --account-endpoint %s --json --replace', jobId, updateJsonFilePath, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var updatedJob = JSON.parse(result.text);
          updatedJob.priority.should.not.be.null;
          updatedJob.priority.should.not.equal(originalJob.priority);

          done();
        });
      });
    });

    it('should update a job using parameters', function (done) {
      var poolId = "pool1";
      var priority = 2;
      var maxWallClockTime = "PT10H";
      var maxTaskRetryCount = Number(5);
      var metadata = "meta1=newValue";
      suite.execute('batch job set -i %s -p %s --metadata %s --priority %s --max-wall-clock-time %s --max-task-retry-count %s --account-name %s --account-key %s --account-endpoint %s --json', 
        createdWithParametersJobId, poolId, metadata, priority, maxWallClockTime, maxTaskRetryCount,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var updated = JSON.parse(result.text);
        updated.should.not.be.null;
        updated.id.should.equal(createdWithParametersJobId);
        updated.poolInfo.poolId.should.equal(poolId);
        updated.priority.should.equal(priority);
        updated.constraints.maxWallClockTime.should.equal(maxWallClockTime);
        updated.constraints.maxTaskRetryCount.should.equal(maxTaskRetryCount);
        updated.metadata.length.should.equal(1);
        updated.metadata[0].name.should.equal("meta1");
        updated.metadata[0].value.should.equal("newValue");
        
        suite.execute('batch job delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', 
          createdWithParametersJobId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
    
    it('should stop the job', function (done) {
      suite.execute('batch job stop %s --reason %s --account-name %s --account-key %s --account-endpoint %s --json', 
        jobId, 'done', batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch job show %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var job = JSON.parse(result.text);
          job.should.not.be.null;
          (job.state === 'terminating' || job.state === 'completed').should.be.true;
          done();
        });
      });
    });
    
    it('should delete the job', function (done) {
      suite.execute('batch job delete %s --account-name %s --account-key %s --account-endpoint %s --json --quiet', jobId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('batch job show %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, 
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          if (result.exitStatus === 0) {
            var deletingJob = JSON.parse(result.text);
            deletingJob.state.should.equal('deleting');
          } else {
            result.text.should.equal('');
          }
          
          done();
        });
      });
    });
  });
});