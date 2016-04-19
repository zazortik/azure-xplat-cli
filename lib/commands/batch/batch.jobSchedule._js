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
* Init batch job schedule command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch job schedule command usage
  */
  var batch = cli.category('batch');

  var logger = cli.output;

  var interaction = cli.interaction;

  var jobSchedule = batch.category('job-schedule')
    .description($('Commands to manage your Batch job schedules'));

  jobSchedule.command('create [json-file]')
    .description($('Adds a job schedule to the specified account'))
    .option('-f, --json-file <json-file>', $('the file containing the job schedule object to create in JSON format'))
    .appendBatchAccountOption()
    .execute(createJobSchedule);

  jobSchedule.command('list')
    .description($('Lists all of the job schedules in the specified account'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listJobSchedules);
  
  jobSchedule.command('show [jobScheduleId]')
    .description($('Show information about the specified job schedule'))
    .option('--id <jobScheduleId>', $('the id of the job schedule to get'))
    .appendODataFilterOption(true, false, true)
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(showJobSchedule);

  jobSchedule.command('delete [jobScheduleId]')
    .description($('Deletes a job schedule from the specified account'))
    .option('--id <jobScheduleId>', $('the id of the job schedule to delete'))
    .option('-q, --quiet', $('remove the specified job schedule without confirmation'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(deleteJobSchedule);

  jobSchedule.command('set [jobScheduleId] [json-file]')
    .description($('Update the properties of the specified job schedule'))
    .option('-i, --id <jobScheduleId>', $('the id of the job schedule to update'))
    .option('-f, --json-file <json-file>', $('the file containing the job schedule properties to update in JSON format'))
    .option('-p, --patch', $('uses patch instead of update'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(updateJobSchedule);

  jobSchedule.command('enable <jobScheduleId>')
    .description($('Enables the specified job schedule, allowing jobs to be created according to its schedule'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(enableJobSchedule);

  jobSchedule.command('disable <jobScheduleId>')
    .description($('Disables the specified job schedule. Disabled schedules do not create new jobs, but may be re-enabled later.'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(disableJobSchedule);

  jobSchedule.command('stop <jobScheduleId>')
    .description($('Terminates the specified job schedule'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(terminateJobSchedule);

  /**
  * Implement batch job schedule cli
  */

  /**
  * Create a batch job schedule
  * @param {string} [jsonFile] the file containing the job schedule to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createJobSchedule(jsonFile, options, _) {
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var addJobSchedule = JSON.parse(objJson);
    if (parsedResponse !== null && parsedResponse !== undefined) {
      var resultMapper = new client.models['JobScheduleAddParameter']().mapper();
      addJobSchedule = client.deserialize(resultMapper, parsedResponse, 'result');
    }

    var tips = $('Creating Batch job schedule');
    var batchOptions = {};
    batchOptions.jobScheduleAddOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.jobSchedule.add(addJobSchedule, batchOptions, _);
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

    logger.verbose(util.format($('Job schedule %s has been created successfully'), addJobSchedule.id));
    showJobSchedule(addJobSchedule.id, options, _);
  }

  /**
  * Show the details of the specified Batch job schedule
  * @param {string} [jobScheduleId] job schedule id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showJobSchedule(jobScheduleId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobScheduleId) {
      jobScheduleId = options.id;
    }
    jobScheduleId = interaction.promptIfNotGiven($('Job schedule id: '), jobScheduleId, _);
    var tips = $('Getting Batch job schedule information');

    var batchOptions = {};
    batchOptions.jobScheduleGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.jobScheduleGetOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.jobScheduleGetOptions.expand = options.expandClause;
    }

    if (options.ifMatch) {
      batchOptions.jobScheduleGetOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobScheduleGetOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobScheduleGetOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobScheduleGetOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    var jobSchedule = null;

    startProgress(tips);
    try {
      jobSchedule = client.jobSchedule.get(jobScheduleId, batchOptions, _);
    } catch (e) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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
    
    batchShowUtil.showCloudJobSchedule(jobSchedule, cli.output);
  }

  /**
  * List batch job schedules
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listJobSchedules(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing Batch job schedules');
    var batchOptions = {};
    batchOptions.jobScheduleListOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.jobScheduleListOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.jobScheduleListOptions.expand = options.expandClause;
    }
    if (options.filterClause) {
      batchOptions.jobScheduleListOptions.filter = options.filterClause;
    }

    var jobSchedules = [];
    startProgress(tips);

    try {
      result = client.jobSchedule.list(batchOptions, _);
      result.forEach(function (jobSchedule) {
        jobSchedules.push(jobSchedule);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        options.jobScheduleListOptions = batchOptions;
        result = client.jobSchedule.listNext(nextLink, batchOptions, _);
        result.forEach(function (jobSchedule) {
          jobSchedules.push(jobSchedule);
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

    cli.interaction.formatOutput(jobSchedules, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No job schedule found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
        });
      }
    });
  }

  /**
  * Delete the specified batch job schedule
  * @param {string} [jobScheduleId] job schedule Id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteJobSchedule(jobScheduleId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobScheduleId) {
      jobScheduleId = options.id;
    }
    jobScheduleId = interaction.promptIfNotGiven($('Job schedule id: '), jobScheduleId, _);
    var tips = util.format($('Deleting job schedule %s'), jobScheduleId);
    var batchOptions = {};
    batchOptions.jobScheduleDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.jobScheduleDeleteMethodOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobScheduleDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobScheduleDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobScheduleDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete job schedule %s? [y/n]: '), jobScheduleId), _)) {
        return;
      }
    }
    
    startProgress(tips);

    try {
      client.jobSchedule.deleteMethod(jobScheduleId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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

    logger.info(util.format($('Job schedule %s has been deleted successfully'), jobScheduleId));
  }

  /**
   * Update/Patch the specified batch job schedule
   * @param {string} [jobScheduleId] job schedule Id
   * @param {string} [jsonFile] file containing the job schedule properties to update in JSON format
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updateJobSchedule(jobScheduleId, jsonFile, options, _) {
    if (!jobScheduleId) {
      poolId = options.id;
    }
    jobScheduleId = interaction.promptIfNotGiven($('Job schedule id: '), jobScheduleId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);

    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var updateJobScheduleParam = JSON.parse(objJson);
    var resultMapper;
    var tips;
    var batchOptions = {};

    if (options.patch) {
      if (parsedResponse !== null && parsedResponse !== undefined) {
        resultMapper = new client.models['JobSchedulePatchParameter']().mapper();
        updateJobScheduleParam = client.deserialize(resultMapper, parsedResponse, 'result');
      }

      tips = util.format($('Patching job schedule %s'), jobScheduleId);
      batchOptions.jobSchedulePatchOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.jobSchedulePatchOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.jobSchedulePatchOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.jobSchedulePatchOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.jobSchedulePatchOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.jobSchedule.patch(jobScheduleId, updateJobScheduleParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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
        resultMapper = new client.models['JobScheduleUpdateParameter']().mapper();
        updateJobScheduleParam = client.deserialize(resultMapper, parsedResponse, 'result');
      }

      tips = util.format($('Updating job schedule %s'), jobScheduleId);
      batchOptions.jobScheduleUpdateOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.jobScheduleUpdateOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.jobScheduleUpdateOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.jobScheduleUpdateOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.jobScheduleUpdateOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.jobSchedule.update(jobScheduleId, updateJobScheduleParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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

    logger.verbose(util.format($('Job schedule %s has been updated/patched successfully'), jobScheduleId));
    showJobSchedule(jobScheduleId, options, _);
  }

  /**
   * Enable the specified batch job schedule
   * @param {string} <jobScheduleId> job schedule Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function enableJobSchedule(jobScheduleId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Enabling job schedule %s'), jobScheduleId);
    var batchOptions = {};
    batchOptions.jobScheduleEnableOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.jobScheduleEnableOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobScheduleEnableOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobScheduleEnableOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobScheduleEnableOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.jobSchedule.enable(jobScheduleId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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

    logger.info(util.format($('Job schedule %s has been enabled'), jobScheduleId));
  }

  /**
   * Disable the specified batch job schedule
   * @param {string} <jobScheduleId> job schedule Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function disableJobSchedule(jobScheduleId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Disabling job schedule %s'), jobScheduleId);
    var batchOptions = {};
    batchOptions.jobScheduleDisableOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.jobScheduleDisableOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobScheduleDisableOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobScheduleDisableOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobScheduleDisableOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.jobSchedule.disable(jobScheduleId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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

    logger.info(util.format($('Job schedule %s has been disabled'), jobScheduleId));
  }

  /**
   * Terminate the specified batch job schedule
   * @param {string} <jobScheduleId> job schedule Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function terminateJobSchedule(jobScheduleId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);

    var tips = util.format($('Terminating job schedule %s'), jobScheduleId);
    var batchOptions = {};
    batchOptions.jobScheduleTerminateOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.jobScheduleTerminateOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.jobScheduleTerminateOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.jobScheduleTerminateOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.jobScheduleTerminateOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.jobSchedule.terminate(jobScheduleId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Job schedule %s does not exist'), jobScheduleId));
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

    logger.info(util.format($('Job schedule %s has been terminated'), jobScheduleId));
  }
};