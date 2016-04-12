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
var path = require('path');
var jobJsonFilePath = path.resolve(__dirname, '../../data/batchCreateJobForFileTests.json');
var taskJsonFilePath = path.resolve(__dirname, '../../data/batchCreateTaskForFileTests.json');
var jobId = 'xplatJobForFileTests';
var taskId = 'xplatTask';
var taskWorkDir = 'wd';
var taskOut = 'wd\\taskOut.txt';
var taskStdErr = 'stderr.txt';
var taskOutComputeNodePath = 'workitems\\xplatjobforfiletests\\job-1\\xplattask\\wd\\taskOut.txt';
var poolId = 'xplatTestPool';
var computeNodeId;
var startTaskDir = 'startup';
var startTaskStdOut = 'startup\\stdout.txt';
var downloadLocation = '.\\temp.txt';

var requiredEnvironment = [
  { name: 'AZURE_BATCH_ACCOUNT', defaultValue: 'defaultaccount' },
  { name: 'AZURE_BATCH_ENDPOINT', defaultValue: 'https://defaultaccount.westus.batch.azure.com' }
];

var testPrefix = 'cli-batch-file-tests';
var suite;

var batchAccount;
var batchAccountKey;
var batchAccountEndpoint;

describe('cli', function () {
  describe('batch file', function () {
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
          suite.execute('batch job create %s --account-name %s --account-key %s --account-endpoint %s --json', jobJsonFilePath,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('batch task create %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskJsonFilePath,
              batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
              result.exitStatus.should.equal(0);
              //TODO: While the task is simple and should finish very quickly, we should probably poll to ensure it completes.
              done();
            });
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
        });
      }
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should list the node files on a compute node', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', poolId,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var computeNodes = JSON.parse(result.text);
        computeNodeId = computeNodes[0].id;
        suite.execute('batch node-file list %s %s --account-name %s --account-key %s --account-endpoint %s --json', poolId, computeNodeId,
          batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var topLevelFiles = JSON.parse(result.text);
          topLevelFiles.should.not.be.null;
          topLevelFiles.some(function (file) {
            return file.name === startTaskDir;
          }).should.be.true;
          topLevelFiles.every(function (file) {
            return file.name != startTaskStdOut;
          }).should.be.true;
          done();
        });
      });
    });
    
    it('should list start task files recursively on a compute node', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', poolId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var computeNodes = JSON.parse(result.text);
        computeNodeId = computeNodes[0].id;
        suite.execute('batch node-file list %s %s --recursive --account-name %s --account-key %s --account-endpoint %s --json',
          poolId, computeNodeId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var files = JSON.parse(result.text);
          files.some(function (file) {
            return file.name === startTaskStdOut;
          }).should.be.true;
          done();
        });
      });
    });
    
    it('should show start task stdout file properties', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', poolId,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var computeNodes = JSON.parse(result.text);
        computeNodeId = computeNodes[0].id;
        suite.execute('batch node-file show %s %s %s --account-name %s --account-key %s --account-endpoint %s --json',
          poolId, computeNodeId, startTaskStdOut, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var stdOutProperties = JSON.parse(result.text);
          stdOutProperties.should.not.be.null;
          stdOutProperties.name.should.equal(startTaskStdOut);
          stdOutProperties.isDirectory.should.equal(false);
          done();
        });
      });
    });

    it('should list the files associated with a task', function (done) {
      suite.execute('batch task-file list %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var topLevelFiles = JSON.parse(result.text);
          topLevelFiles.should.not.be.null;
          topLevelFiles.some(function (file) {
            return file.name === taskWorkDir;
          }).should.be.true;
          topLevelFiles.every(function (file) {
            return file.name != taskOut;
          }).should.be.true;
          done();
        });
    });

    it('should list task files recursively', function (done) {
      suite.execute('batch task-file list %s %s --recursive --account-name %s --account-key %s --account-endpoint %s --json',
        jobId, taskId, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var files = JSON.parse(result.text);
          files.some(function (file) {
            return file.name === taskOut;
          }).should.be.true;
          done();
        });
    });

    it('should show task output file properties', function (done) {
      suite.execute('batch task-file show %s %s %s --account-name %s --account-key %s --account-endpoint %s --json',
        jobId, taskId, taskOut, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var stdOutProperties = JSON.parse(result.text);
          stdOutProperties.should.not.be.null;
          stdOutProperties.name.should.equal(taskOut);
          stdOutProperties.isDirectory.should.equal(false);
          done();
        });
    });

    it('should download the node file', function (done) {
      suite.execute('batch node list %s --account-name %s --account-key %s --account-endpoint %s --json', poolId, 
        batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var computeNodes = JSON.parse(result.text);
        computeNodeId = computeNodes[0].id;
        suite.execute('batch node-file download %s %s %s %s --account-name %s --account-key %s --account-endpoint %s --json -q',
          poolId, computeNodeId, startTaskStdOut, downloadLocation, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          var downloadedContent = fs.readFileSync(downloadLocation).toString();
          downloadedContent.should.not.be.null;
          downloadedContent.length.should.not.equal(0);
          fs.unlinkSync(downloadLocation);
          done();
        });
      });
    });

    it('should download the task file', function (done) {
      suite.execute('batch task-file download %s %s %s %s --account-name %s --account-key %s --account-endpoint %s --json -q',
        jobId, taskId, taskOut, downloadLocation, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var downloadedContent = fs.readFileSync(downloadLocation).toString();
        downloadedContent.should.not.be.null;
        downloadedContent.length.should.not.equal(0);
        fs.unlinkSync(downloadLocation);
        done();
      });
    });

    it('should delete the node file', function (done) {
      suite.execute('batch task show %s %s --account-name %s --account-key %s --account-endpoint %s --json', jobId, taskId,
      batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        var task = JSON.parse(result.text);
        computeNodeId = task.nodeInfo.nodeId;

        suite.execute('batch node-file delete %s %s %s --account-name %s --account-key %s --account-endpoint %s -q --json',
          poolId, computeNodeId, taskOutComputeNodePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.exitStatus.should.equal(0);
          suite.execute('batch node-file show %s %s %s --account-name %s --account-key %s --account-endpoint %s --json',
            poolId, computeNodeId, taskOutComputeNodePath, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
            result.text.should.equal('');
            done();
          });
        });
      });
    });

    it('should delete the task file', function (done) {
      suite.execute('batch task-file delete %s %s %s --account-name %s --account-key %s --account-endpoint %s -q --json',
        jobId, taskId, taskStdErr, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('batch task-file show %s %s %s --account-name %s --account-key %s --account-endpoint %s --json',
          jobId, taskId, taskStdErr, batchAccount, batchAccountKey, batchAccountEndpoint, function (result) {
          result.text.should.equal('');
          done();
        });
      });
    });
  });
});