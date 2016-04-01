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

var fs = require('fs');
var util = require('util');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch job command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch job command usage
  */
  var batch = cli.category('batch');

  var job = batch.category('job').description($('Commands to manage your Batch jobs'));

  var logger = cli.output;

  var interaction = cli.interaction;

  job.command('create [json-file]')
    .description($('Adds a job to the specified account'))
    .option('-f, --json-file <json-file>', $('the file containing the job object to create in JSON format'))
    .appendBatchAccountOption()
    .execute(createJob);

  job.command('list')
    .description($('Lists all of the jobs in the specified account'))
    .option('--job-schedule-id [jobScheduleId]', $('the id of the job schedule from which you want to get a list of jobs'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listJobs);
  
  job.command('show [jobId]')
    .description($('Show information about the specified job'))
    .option('--id <jobId>', $('the id of the job'))
    .appendODataFilterOption(true, false, true)
    .appendBatchAccountOption()
    .execute(showJob);

  job.command('delete [jobId]')
    .description($('Delete the specified job'))
    .option('--id <jobId>', $('the id of the job to delete'))
    .option('-q, --quiet', $('remove the specified job without confirmation'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(deleteJob);

  job.command('set [jobId] [json-file]')
    .description($('Update the properties of a job'))
    .option('-i, --id <jobId>', $('the id of the job whose properties you want to update'))
    .option('-f, --json-file <json-file>', $('the file containing the job properties to update in JSON format'))
    .option('-p, --patch', $('uses patch instead of update'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(updateJob);

  /**
  * Implement batch job cli
  */

  /**
  * Create a batch job
  * @param {string} [jsonFile] the file containing the job to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createJob(jsonFile, options, _) {
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var addJob = JSON.parse(objJson);
    if (parsedResponse !== null && parsedResponse !== undefined) {
      var resultMapper = new client.models['JobAddParameter']().mapper();
      addJob = client.deserialize(resultMapper, parsedResponse, 'result');
    }

    var tips = $('Creating Batch job');
    var batchOptions = {};
    batchOptions.jobAddOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.job.add(addJob, batchOptions, _);
    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }

      throw err;
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('Job %s has been created successfully'), addJob.id));
    showJob(addJob.id, options, _);
  }

  /**
  * Show the details of the specified Batch job
  * @param {string} [jobId] job id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showJob(jobId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobId) {
      jobId = options.id;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    var tips = $('Getting Batch job information');

    var batchOptions = {};
    batchOptions.jobGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.jobGetOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.jobGetOptions.expand = options.expandClause;
    }

    var job = null;

    startProgress(tips);
    try {
      job = client.job.get(jobId, batchOptions, _);
    } catch (e) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Job %s does not exist'), jobId));
      } else {
        if (e.message) {
          if (typeof e.message === 'object') {
            e.message = e.message.value;
          }
        }
        
        throw e;
      }
    } finally {
      endProgress();
    }
    
    batchShowUtil.showCloudJob(job, cli.output);
  }

  /**
  * List batch jobs
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listJobs(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing Batch jobs');
    var batchOptions = {};

    if (options.jobScheduleId) {
      batchOptions.jobListFromJobScheduleOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.selectClause) {
        batchOptions.jobListFromJobScheduleOptions.select = options.selectClause;
      }
      if (options.expandClause) {
        batchOptions.jobListFromJobScheduleOptions.expand = options.expandClause;
      }
      if (options.filterClause) {
        batchOptions.jobListFromJobScheduleOptions.filter = options.filterClause;
      }   
    } else {
      batchOptions.jobListOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.selectClause) {
        batchOptions.jobListOptions.select = options.selectClause;
      }
      if (options.expandClause) {
        batchOptions.jobListOptions.expand = options.expandClause;
      }
      if (options.filterClause) {
        batchOptions.jobListOptions.filter = options.filterClause;
      } 
    }

    var jobs = [];
    startProgress(tips);

    try {
      if (options.jobScheduleId) {
        result = client.job.listFromJobSchedule(options.jobScheduleId, batchOptions, _);
      } else {
        result = client.job.list(batchOptions, _);
      }
      result.forEach(function (job) {
        jobs.push(job);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        
        if (options.jobScheduleId) {
          options.jobListFromJobScheduleOptions = batchOptions;
          result = client.job.listFromJobScheduleNext(nextLink, batchOptions, _);
        } else {
          options.jobListOptions = batchOptions;
          result = client.job.listNext(nextLink, batchOptions, _);
        }
        result.forEach(function (job) {
          jobs.push(job);
        });
        nextLink = result.odatanextLink;
      }

    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }
      
      throw err;
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(jobs, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No job found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
        });
      }
    });
  }

  /**
  * Delete the specified batch job
  * @param {string} [jobId] job Id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteJob(jobId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobId) {
      jobId = options.id;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    var tips = util.format($('Deleting job %s'), jobId);
    var batchOptions = {};
    batchOptions.jobDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.jobDeleteMethodOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete job %s? [y/n]: '), jobId), _)) {
        return;
      }
    }
    
    startProgress(tips);

    try {
      client.job.deleteMethod(jobId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Job %s does not exist'), jobId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Job %s has been deleted successfully'), jobId));
  }

  /**
   * Update/Patch the specified batch job
   * @param {string} [jobId] job Id
   * @param {string} [jsonFile] file containing the job properties to update in JSON format
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updateJob(jobId, jsonFile, options, _) {
    if (!jobId) {
      jobId = options.id;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);

    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var updateJobParam = JSON.parse(objJson);
    var resultMapper;
    var tips;
    var batchOptions = {};

    if (options.patch) {
      if (parsedResponse !== null && parsedResponse !== undefined) {
        resultMapper = new client.models['JobPatchParameter']().mapper();
        updateJobParam = client.deserialize(resultMapper, parsedResponse, 'result');
      }

      tips = util.format($('Patching job %s'), jobId);

      batchOptions.jobPatchOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.jobPatchOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.jobPatchOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.jobPatchOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.jobPatchOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.job.patch(jobId, updateJobParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Job %s does not exist'), jobId));
        } else {
          if (err.message) {
            if (typeof err.message === 'object') {
              err.message = err.message.value;
            }
          }

          throw err;
        }
      } finally {
        endProgress();
      }
    } else {
      if (parsedResponse !== null && parsedResponse !== undefined) {
        resultMapper = new client.models['JobUpdateParameter']().mapper();
        updateJobParam = client.deserialize(resultMapper, parsedResponse, 'result');
      }

      tips = util.format($('Updating job %s'), jobId);

      batchOptions.jobUpdateOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.jobUpdateOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.jobUpdateOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.jobUpdateOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.jobUpdateOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.job.update(jobId, updateJobParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Job %s does not exist'), jobId));
        } else {
          if (err.message) {
            if (typeof err.message === 'object') {
              err.message = err.message.value;
            }
          }

          throw err;
        }
      } finally {
        endProgress();
      }
    }

    logger.verbose(util.format($('Job %s has been updated/patched successfully'), jobId));
    showJob(jobId, options, _);
  }
};