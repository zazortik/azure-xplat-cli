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
* Init batch task command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch task command usage
  */
  var batch = cli.category('batch');

  var task = batch.category('task').description($('Commands to manage your Batch tasks'));

  var logger = cli.output;

  var interaction = cli.interaction;

  task.command('create [jobId] [json-file]')
    .description($('Create a batch task'))
    .option('--job-id <jobId>', $('the id of the job to which the task is to be added'))
    .option('-f, --json-file <json-file>', $('the file containing the task object to create in JSON format'))
    .appendBatchAccountOption()
    .execute(createTask);

  task.command('list [jobId]')
    .description($('List batch tasks under a job'))
    .option('--job-id <jobId>', $('the id of the job from which you want to get a list of tasks'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listTasks);
  
  task.command('show [jobId] [taskId]')
    .description($('Show details of the batch task'))
    .option('--job-id <jobId>', $('the batch job id'))
    .option('--id <taskId>', $('the batch task id'))
    .appendODataFilterOption(true, false, true)
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(showTask);

  task.command('delete [jobId] [taskId]')
    .description($('Delete the specified batch task'))
    .option('--job-id <jobId>', $('the batch job id'))
    .option('--id <taskId>', $('the batch task id'))
    .option('-q, --quiet', $('remove the specified batch task without confirmation'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(deleteTask);

  task.command('set [jobId] [taskId] [json-file]')
    .description($('Update the batch task'))
    .option('--job-id <jobId>', $('the batch job id'))
    .option('-i, --id <taskId>', $('the batch task id'))
    .option('-f, --json-file <json-file>', $('the file containing the task properties to update in JSON format'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(updateTask);

  /**
  * Implement batch task cli
  */

  /**
  * Create a batch task
  * @param {string} [jobId] the id of the job to which the task is to be added
  * @param {string} [jsonFile] the file containing the task to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createTask(jobId, jsonFile, options, _) {
    if (!jobId) {
      jobId = options.jobId;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var addTask = JSON.parse(objJson);
    if (parsedResponse !== null && parsedResponse !== undefined) {
      var resultMapper = new client.models['TaskAddParameter']().mapper();
      addTask = client.deserialize(resultMapper, parsedResponse, 'result');
    }

    var tips = $('Creating Batch task');
    var batchOptions = {};
    batchOptions.taskAddOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.task.add(jobId, addTask, batchOptions, _);
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

    logger.verbose(util.format($('Task %s has been created successfully'), addTask.id));
    showTask(jobId, addTask.id, options, _);
  }

  /**
  * Show the details of the specified Batch task
  * @param {string} [jobId] job id
  * @param {string} [taskId] task id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showTask(jobId, taskId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobId) {
      jobId = options.jobId;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    if (!taskId) {
      taskId = options.id;
    }
    taskId = interaction.promptIfNotGiven($('Task id: '), taskId, _);
    var tips = $('Getting batch task information');

    var batchOptions = {};
    batchOptions.taskGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.taskGetOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.taskGetOptions.expand = options.expandClause;
    }

    var task = null;

    startProgress(tips);
    try {
      task = client.task.get(jobId, taskId, batchOptions, _);
    } catch (e) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Task %s does not exist'), taskId));
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
    
    batchShowUtil.showCloudTask(task, cli.output);
  }

  /**
  * List batch tasks under a job
  * @param {string} [jobId] job id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listTasks(jobId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobId) {
      jobId = options.jobId;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    var tips = $('Listing batch tasks');
    var batchOptions = {};
    batchOptions.taskListOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.taskListOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.taskListOptions.expand = options.expandClause;
    }
    if (options.filterClause) {
      batchOptions.taskListOptions.filter = options.filterClause;
    }

    var tasks = [];
    startProgress(tips);

    try {
      result = client.task.list(jobId, batchOptions, _);
      result.forEach(function (task) {
        tasks.push(task);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        options.taskListOptions = batchOptions;
        result = client.task.listNext(nextLink, batchOptions, _);
        result.forEach(function (task) {
          tasks.push(task);
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

    cli.interaction.formatOutput(tasks, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No task found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
          row.cell($('Command Line'), item.commandLine);
        });
      }
    });
  }

  /**
  * Delete the specified batch task
  * @param {string} [jobId] job Id
  * @param {string} [taskId] task Id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteTask(jobId, taskId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!jobId) {
      jobId = options.id;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    if (!taskId) {
      taskId = options.id;
    }
    taskId = interaction.promptIfNotGiven($('Task id: '), taskId, _);
    var tips = util.format($('Deleting task %s'), taskId);
    var batchOptions = {};
    batchOptions.taskDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.taskDeleteMethodOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.taskDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.taskDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.taskDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete task %s? [y/n]: '), taskId), _)) {
        return;
      }
    }
    
    startProgress(tips);

    try {
      client.task.deleteMethod(jobId, taskId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Task %s does not exist'), taskId));
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

    logger.info(util.format($('Task %s has been deleted successfully'), taskId));
  }

  /**
   * Update the specified batch task
   * @param {string} [jobId] job Id
   * @param {string} [taskId] task Id
   * @param {string} [jsonFile] file containing the task properties to update in JSON format
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updateTask(jobId, taskId, jsonFile, options, _) {
    if (!jobId) {
      jobId = options.jobId;
    }
    jobId = interaction.promptIfNotGiven($('Job id: '), jobId, _);
    if (!taskId) {
      taskId = options.id;
    }
    taskId = interaction.promptIfNotGiven($('Task id: '), taskId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);

    var objJson = fs.readFileSync(jsonFile).toString();
    var client = batchUtil.createBatchServiceClient(options);

    var parsedResponse = JSON.parse(objJson);
    var updateTaskParam = JSON.parse(objJson);
    
    if (parsedResponse !== null && parsedResponse !== undefined) {
      var resultMapper = new client.models['TaskUpdateParameter']().mapper();
      updateTaskParam = client.deserialize(resultMapper, parsedResponse, 'result');
    }

    var tips = util.format($('Updating task %s'), taskId);

    var batchOptions = {};
    batchOptions.taskUpdateOptions = batchUtil.getBatchOperationDefaultOption();
    // For the update task call, the constraints property from the TaskUpdateParameter has to 
    // be copied over to the TaskUpdateOptions.
    batchOptions.constraints = updateTaskParam.constraints;

    if (options.ifMatch) {
      batchOptions.taskUpdateOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.taskUpdateOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.taskUpdateOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.taskUpdateOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    startProgress(tips);

    try {
      client.task.update(jobId, taskId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Task %s does not exist'), taskId));
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

    logger.verbose(util.format($('Task %s has been updated successfully'), taskId));
    showTask(jobId, taskId, options, _);
  }
};