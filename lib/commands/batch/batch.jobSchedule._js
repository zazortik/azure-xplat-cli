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

var util = require('util');
var commander = require('commander');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var validation = require('../../util/validation');
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

  var job = batch.category('job');

  var logger = cli.output;

  var interaction = cli.interaction;

  var jobSchedule = job.category('schedule')
    .description($('Commands to manage your Batch job schedules'));

  jobSchedule.command('list')
    .description($('List batch job schedules'))
    .appendBatchAccountOption()
    .execute(listJobSchedules);
  
  jobSchedule.command('show [jobScheduleId]')
    .description($('Show details of the batch job schedule'))
    .option('--id <jobScheduleId>', $('the batch job schedule id'))
    .appendBatchAccountOption()
    .execute(showJobSchedule);

  /**
  * Implement batch job schedule cli
  */

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
    var tips = $('Getting batch job schedule information');
    var batchOptions = batchUtil.getBatchOperationDefaultOption();
    var jobSchedule = null;

    startProgress(tips);
    try {
      jobSchedule = client.jobSchedule.get(jobScheduleId, options, _);
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
    var tips = $('Listing batch job schedules');
    var batchOptions = batchUtil.getBatchOperationDefaultOption();
    var options = {};
    options.jobScheduleListOptions = batchOptions;
    var jobSchedules = [];
    startProgress(tips);

    try {
      result = client.jobSchedule.list(options, _);
      result.forEach(function (jobSchedule) {
        jobSchedules.push(jobSchedule);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        options.jobScheduleListOptions = batchOptions;
        result = client.jobSchedule.listNext(nextLink, options, _);
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
};
