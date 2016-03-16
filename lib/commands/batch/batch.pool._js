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
var commander = require('commander');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var validation = require('../../util/validation');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch pool command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch pool command usage
  */
  var batch = cli.category('batch')
    .description($('Commands to manage your Batch objects'));

  var logger = cli.output;

  var interaction = cli.interaction;

  var pool = batch.category('pool')
    .description($('Commands to manage your Batch pools'));

  pool.command('create [json-file]')
    .description($('Create a batch pool'))
    .option('-f, --json-file <json-file>', $('the pool object to create in the file'))
    //.option('-i, --id <pool-id>', $('the pool id'))
    //.option('-s, --vm-size <vm-size>', $('the vm size'))
    //.option('-o, --os-family <os-family>', $('the os family'))
    //.option('--target-dedicated <target-dedicated>', $('the target dedicated vm count'))
    //.option('--enable-autoscale', $('enabling autoscale'))
    //.option('--autoscale-formula <autoscale-formula>', $('the autoscale formula'))
    //.option('--enable-inter-node-communication', $('enabling communication between VMs'))
    .appendBatchAccountOption()
    .execute(createPool);

  pool.command('list')
    .description($('List batch pools'))
    .appendODataFilterOption(true, true, true)
    .appendBatchAccountOption()
    .execute(listPool);
  
  pool.command('listUsageMetrics')
    .description($('List batch pool usage metrics'))
    .option('--start-time <start-time>', $('the earliest time from which to include metrics'))
    .option('--end-time <end-time>', $('the latest time from which to include metrics'))
    .appendODataFilterOption(false, true, false)
    .appendBatchAccountOption()
    .execute(listUsageMetrics);

  pool.command('show [pool-id]')
    .description($('Show details of the batch pool'))
    .option('--id <pool-id>', $('the batch pool id'))
    .appendODataFilterOption(true, false, true)
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(showPool);

  pool.command('showAllStats')
      .description($('Show lifetime summary statistics for all of the pools'))
      .appendBatchAccountOption()
      .execute(showAllPoolsStats);

  pool.command('delete [pool-id]')
    .description($('Delete the specified batch pool'))
    .option('--id <pool-Id>', $('the batch pool id'))
    .option('-q, --quiet', $('remove the specified batch pool without confirmation'))
    .appendCommonHeaderFilterOption(true, true)
    .appendBatchAccountOption()
    .execute(deletePool);

  pool.command('update [pool-id] [json-file]')
      .description($('Update the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .option('-f, --json-file <json-file>', $('the pool object to update in the file'))
      .option('-p, --patch', $('uses patch instead of update'))
      .appendCommonHeaderFilterOption(true, true)
      .appendBatchAccountOption()
      .execute(updatePool);

  pool.command('disableAutoscale [pool-id]')
      .description($('Disable autoscale at the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .appendBatchAccountOption()
      .execute(disablePoolAutoscale);

  pool.command('enableAutoscale [pool-id] [autoscale-formula] [autoscale-evaluation-interval]')
      .description($('Enable autoscale at the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .option('--autoscale-formula <autoscale-formula>', $('the autoscale formula'))
      .option('--autoscale-evaluation-interval <autoscale-evaluation-interval>', $('the time interval for the desired AutoScale evaluation period'))
      .appendCommonHeaderFilterOption(true, true)
      .appendBatchAccountOption()
      .execute(enablePoolAutoscale);

  pool.command('evaluateAutoscale [pool-id] [autoscale-formula]')
      .description($('Evaluate autoscale at the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .option('-f, --autoscale-formula <autoscale-formula>', $('the autoscale formula'))
      .appendBatchAccountOption()
      .execute(evaluatePoolAutoscale);

  pool.command('resize [pool-id] [target-dedicated] [resize-timeout] [deallocate-option]')
      .description($('Resize (or stop resizing) the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .option('-s, --stop', $('stop resizing'))
      .option('--target-dedicated <target-dedicated>', $('the dedicated vm count to resize'))
      .option('--resize-timeout <resize-timeout>', $('the timeout for allocation compute nodes to the pool or removal of compute nodes from the pool'))
      .option('--deallocate-option <deallocate-option>', $('sets when nodes may be removed from the pool, if the pool size is decreasing'))
      .appendCommonHeaderFilterOption(true, true)
      .appendBatchAccountOption()
      .execute(resizePool);

  pool.command('removeNodes [pool-id] [node-list')
      .description($('Remove nodes from the batch pool'))
      .option('-i, --id <pool-id>', $('the pool id'))
      .option('-l, --node-list <node-list>', $('the node list'))
      .option('-q, --quiet', $('remove nodes from the specified batch pool without confirmation'))
      .option('--resize-timeout <resize-timeout>', $('the timeout for removal of compute nodes from the pool'))
      .option('--deallocate-option <deallocate-option>', $('sets when nodes may be removed from the pool'))
      .appendCommonHeaderFilterOption(true, true)
      .appendBatchAccountOption()
      .execute(removePoolNodes);

  /**
  * Implement batch pool cli
  */

  /**
  * Create a batch pool
  * @param {string} [jsonFile] the file contains Pool to create in JSON format
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createPool(jsonFile, options, _) {
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('JSON file name: '), jsonFile, _);
    var objJson = fs.readFileSync(jsonFile).toString();
    var addPool = JSON.parse(objJson);
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Creating Batch pool');
    var batchOptions = {};
    batchOptions.poolAddOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.pool.add(addPool, batchOptions, _);
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

    logger.verbose(util.format($('Pool %s has been created successfully'), addPool.id));
    showPool(addPool.id, options, _);
  }

  /**
  * Show the details of the specified Batch pool
  * @param {string} [poolId] pool id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showPool(poolId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    var tips = $('Getting Batch pool information');
    var batchOptions = {};
    batchOptions.poolGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.poolGetOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.poolGetOptions.expand = options.expandClause;
    }

    if (options.ifMatch) {
      batchOptions.poolGetOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.poolGetOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.poolGetOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.poolGetOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    var pool = null;
    startProgress(tips);

    try {
      pool = client.pool.get(poolId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    batchShowUtil.showCloudPool(pool, cli.output);
  }

  /**
   * Show lifetime summary statistics for all of the pools
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function showAllPoolsStats(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Getting lifetime summary statistics');
    var batchOptions = {};
    batchOptions.poolGetAllPoolsLifetimeStatisticsOptions = batchUtil.getBatchOperationDefaultOption();
    var stats;

    startProgress(tips);
    try {
      stats = client.pool.getAllPoolsLifetimeStatistics(batchOptions, _);
    } catch (e) {
      if (e.message) {
        if (typeof e.message === 'object') {
          e.message = e.message.value;
        }
      }

      throw e;
    } finally {
      endProgress();
    }

    batchShowUtil.showPoolStats(stats, cli.output);
  }

  /**
  * List batch pools
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listPool(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing batch pools');
    var batchOptions = {};
    batchOptions.poolListOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.poolListOptions.select = options.selectClause;
    }
    if (options.expandClause) {
      batchOptions.poolListOptions.expand = options.expandClause;
    }
    if (options.filterClause) {
      batchOptions.poolListOptions.filter = options.filterClause;
    }

    var pools = [];
    startProgress(tips);

    try {
      var result = client.pool.list(batchOptions, _);
      result.forEach(function (pool) {
        pools.push(pool);
      });
      var nextLink = result.odatanextLink;

      while (nextLink) {
        batchOptions.poolListOptions = batchUtil.getBatchOperationDefaultOption();
        result = client.pool.listNext(nextLink, batchOptions, _);
        result.forEach(function (pool) {
          pools.push(pool);
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

    cli.interaction.formatOutput(pools, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No pool found'));
      } else {
        logger.pool(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
          row.cell($('VM Size'), item.vmSize);
          row.cell($('VM Count'), item.currentDedicated);
        });
      }
    });
  }
  
  /**
  * List batch pool usage metrics
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listUsageMetrics(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing batch pool usage metrics');
    var batchOptions = {};
    batchOptions.poolListPoolUsageMetricsOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.startTime) {
      batchOptions.poolListPoolUsageMetricsOptions.startTime = options.startTime;
    }
    if (options.endTime) {
      batchOptions.poolListPoolUsageMetricsOptions.endTime = options.endTime;
    }
    if (options.filterClause) {
      batchOptions.poolListPoolUsageMetricsOptions.filter = options.filterClause;
    }

    var metrics = [];
    startProgress(tips);
    
    try {
      var result = client.pool.listPoolUsageMetrics(batchOptions, _);
      result.forEach(function (pool) {
        metrics.push(pool);
      });
      var nextLink = result.odatanextLink;

      while (nextLink) {
        batchOptions.poolListPoolUsageMetricsOptions = batchUtil.getBatchOperationDefaultOption();
        result = client.pool.listPoolUsageMetricsNext(nextLink, batchOptions, _);
        result.forEach(function (pool) {
          metrics.push(pool);
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
    
    cli.interaction.formatOutput(metrics, function (outputData) {
      var UTCFormat = 'YYYY-MM-DDTHH:MI:SSZ';
      if (outputData.length === 0) {
        logger.info($('No Usage Metric found'));
      } else {
        console.log(outputData);
        logger.table(outputData, function (row, item) {
          row.cell($('Id'), item.id);
          row.cell($('Start Time'), item.startTime.toUTCFormat(UTCFormat));
          row.cell($('End Time'), item.endTime.toUTCFormat(UTCFormat));
          row.cell($('VM Size'), item.vmSize);
          row.cell($('Total Core Hours'), item.totalCoreHours);
        });
      }
    });
  }
  
  /**
  * Delete the specified batch pool
  * @param {string} [poolId] pool Id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deletePool(poolId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    var tips = util.format($('Deleting pool %s'), poolId);
    var batchOptions = {};
    batchOptions.poolDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.ifMatch) {
      batchOptions.poolDeleteMethodOptions.ifMatch = options.ifMatch;
    }
    if (options.ifNoneMatch) {
      batchOptions.poolDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
    }
    if (options.ifModifiedSince) {
      batchOptions.poolDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
    }
    if (options.ifUnmodifiedSince) {
      batchOptions.poolDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete pool %s? '), poolId), _)) {
        return;
      }
    }
    
    startProgress(tips);

    try {
      client.pool.deleteMethod(poolId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    logger.info(util.format($('Pool %s has been deleted successfully'), poolId));
  }

  /**
   * Update/Patch the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {string} [jsonFile] file name of pool update json object
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updatePool(poolId, jsonFile, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    if (!jsonFile) {
      jsonFile = options.jsonFile;
    }
    jsonFile = interaction.promptIfNotGiven($('Json file name: '), jsonFile, _);

    var objJson = fs.readFileSync(jsonFile).toString();
    var updatePoolParam = JSON.parse(objJson);

    if (options.patch) {
      var tips = util.format($('Patching pool %s'), poolId);

      var batchOptions = {};
      batchOptions.poolPatchOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.poolPatchOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.poolPatchOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.poolPatchOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.poolPatchOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.pool.patch(poolId, updatePoolParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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
      var tips = util.format($('Updating pool %s'), poolId);

      var batchOptions = {};
      batchOptions.poolUpdatePropertiesOptions = batchUtil.getBatchOperationDefaultOption();

      if (options.ifMatch) {
        batchOptions.poolUpdatePropertiesOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.poolUpdatePropertiesOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.poolUpdatePropertiesOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.poolUpdatePropertiesOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.pool.updateProperties(poolId, updatePoolParam, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    logger.verbose(util.format($('Pool %s has been updated/patched successfully'), addPool.id));
    showPool(poolId, options, _);
  }

  /**
   * Disable autoscale for the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function disablePoolAutoscale(poolId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    var tips = util.format($('Disabling autoscale at pool %s'), poolId);
    var batchOptions = {};
    batchOptions.poolDisableAutoScaleOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);

    try {
      client.pool.disableAutoScale(poolId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    logger.info(util.format($('Pool %s has been disabled autoscale successfully'), poolId));
  }

  /**
   * Enable autoscale for the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function enablePoolAutoscale(poolId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    var tips = util.format($('Enabling autoscale at pool %s'), poolId);
    var batchOptions = {};
    batchOptions.poolEnableAutoScaleOptions = batchUtil.getBatchOperationDefaultOption();

    var param = {};
    if (options.autoscaleFormula) {
      param.autoScaleFormula = options.autoscaleFormula;
    }
    if (options.autoscaleEvaluationInterval) {
      param.autoScaleEvaluationInterval = options.autoscaleEvaluationInterval;
    }

    startProgress(tips);

    try {
      client.pool.enableAutoScale(poolId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    logger.info(util.format($('Pool %s has been enabled autoscale successfully'), poolId));
  }

  /**
   * Evaluate autoscale at the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function evaluatePoolAutoscale(poolId, autoscaleFormula, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    if (!autoscaleFormula) {
      autoscaleFormula = options.autoscaleFormula;
    }
    autoscaleFormula = interaction.promptIfNotGiven($('AutoScale formula: '), autoscaleFormula, _);
    var tips = util.format($('Evaluating autoscale at pool %s'), poolId);
    var batchOptions = {};
    batchOptions.poolEvaluateAutoScaleOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);

    var run;
    try {
      run = client.pool.evaluateAutoScale(poolId, autoscaleFormula, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    batchShowUtil.showAutoScaleRun(run, cli.output);
  }

  /**
   * Resize/stop resize the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function resizePool(poolId, targetDedicated, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);

    if (options.stop) {
      var tips = util.format($('Stopping resize pool %s'), poolId);
      var batchOptions = {};
      batchOptions.poolStopResizeOptions = batchUtil.getBatchOperationDefaultOption();

      startProgress(tips);

      try {
        client.pool.stopResize(poolId, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(e)) {
          throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

      logger.info(util.format($('Pool %s has been stopped resize successfully'), poolId));
    } else {
      if (!targetDedicated) {
        targetDedicated = options.targetDedicated;
      }
      targetDedicated = interaction.promptIfNotGiven($('Target Dedicated VM Count: '), targetDedicated, _);
      var param = {};
      param.targetDedicated = targetDedicated;
      if (options.resizeTimeout) {
        param.resizeTimeout = options.resizeTimeout;
      }
      if (options.deallocateOption) {
        param.nodeDeallocationOption = options.deallocateOption;
      }

      var tips = util.format($('Resizing pool %s'), poolId);
      var batchOptions = {};
      batchOptions.poolResizeOptions = batchUtil.getBatchOperationDefaultOption();
      if (options.ifMatch) {
        batchOptions.poolDeleteMethodOptions.ifMatch = options.ifMatch;
      }
      if (options.ifNoneMatch) {
        batchOptions.poolDeleteMethodOptions.ifNoneMatch = options.ifNoneMatch;
      }
      if (options.ifModifiedSince) {
        batchOptions.poolDeleteMethodOptions.ifModifiedSince = options.ifModifiedSince;
      }
      if (options.ifUnmodifiedSince) {
        batchOptions.poolDeleteMethodOptions.ifUnmodifiedSince = options.ifUnmodifiedSince;
      }

      startProgress(tips);

      try {
        client.pool.resize(poolId, param, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(e)) {
          throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

      logger.info(util.format($('Pool %s has been resized successfully'), poolId));
    }
  }

  /**
   * Remove nodes from the specified batch pool
   * @param {string} [poolId] pool Id
   * @param {list} [nodeList] nodes List
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function removePoolNodes(poolId, nodeList, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    if (!nodeList) {
      nodeList = options.nodeList;
    }
    nodeList = interaction.promptIfNotGiven($('Nodes list: '), nodeList, _);

    var tips = util.format($('Removing nodes from pool %s'), poolId);
    var batchOptions = {};
    batchOptions.poolRemoveNodesOptions = batchUtil.getBatchOperationDefaultOption();

    var param = {};
    param.nodeList = nodeList;
    if (options.resizeTimeout) {
      param.resizeTimeout = options.resizeTimeout;
    }
    if (options.deallocateOption) {
      param.nodeDeallocationOption = options.deallocateOption;
    }

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to remove nodes from pool %s? '), poolId), _)) {
        return;
      }
    }

    startProgress(tips);

    try {
      client.pool.removeNodes(poolId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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

    logger.info(util.format($('Nodes have been removed from pool %s successfully'), poolId));
  }

};
