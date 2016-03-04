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
var utils = require('../../util/utils');
var validation = require('../../util/validation');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch pool command
*/
exports.init = function(cli) {
  
  //Init StorageUtil
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

  pool.command('create [poolId]')
    .description($('Create a batch pool'))
    .option('--id <poolId>', $('the batch pool id'))
    .appendBatchAccountOption()
    .execute(createPool);

  pool.command('list')
    .description($('List batch pools'))
    .appendBatchAccountOption()
    .execute(listPool);
  
  pool.command('listUsageMetrics')
    .description($('List batch pool usage metrics'))
    .appendBatchAccountOption()
    .execute(listUsageMetrics);

  pool.command('show [poolId]')
    .description($('Show details of the batch pool'))
    .option('--id <poolId>', $('the batch pool id'))
    .appendBatchAccountOption()
    .execute(showPool);

  pool.command('delete [poolId]')
    .description($('Delete the specified batch pool'))
    .option('--id <poolId>', $('the batch pool id'))
    .option('-q, --quiet', $('remove the specified batch pool without confirmation'))
    .appendBatchAccountOption()
    .execute(deletePool);

  /**
  * Implement batch pool cli
  */

  /**
  * Create a batch pool
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createPool(table, options, _) {
    var tableService = getTableServiceClient(options);
    table = interaction.promptIfNotGiven($('Table name: '), table, _);
    var operation = getStorageTableOperation(tableService, 'createTable');
    var tips = util.format($('Creating storage table %s'), table);
    var storageOptions = getStorageTableOperationDefaultOption();
    startProgress(tips);
    try {
      var created = performStorageOperation(operation, _, table, storageOptions);
      if (created === false) {
        throw new Error(util.format($('Table \'%s\' already exists'), table));
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('Table %s has been created successfully'), table));
    showTable(table, StorageUtil.getStorageAccountOptions(options), _);
  }

  /**
  * Delete the specified batch pool
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteTable(table, options, _) {
    var tableService = getTableServiceClient(options);
    table = interaction.promptIfNotGiven($('Table name: '), table, _);
    var operation = getStorageTableOperation(tableService, 'deleteTable');
    var tips = util.format($('Deleting storagetable %s'), table);
    var storageOptions = getStorageTableOperationDefaultOption();

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete table %s? '), table), _)) {
        return;
      }
    }

    startProgress(tips);

    try {
      performStorageOperation(operation, _, table, storageOptions);
    } catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Can not find table \'%s\''), table));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Table %s has been deleted successfully'), table));
  }

  /**
  * Show the details of the specified Batch pool
  * @param {string} [poolId] pool id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showPool(poolId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    var tips = $('Getting Batch pool information');
    var batchOptions = batchUtil.getBatchOperationDefaultOption();
    var pool = null;

    startProgress(tips);
    try {
      pool = client.pool.get(poolId, options, _);
    } catch (e) {
      if (batchUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Pool %s doesn\'t exist'), poolId));
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
    
    cli.interaction.formatOutput(pool, function (outputData) {
      var UTCFormat = 'YYYY-MM-DDTHH:MM:SSZ';
      logger.data($('Name:'), outputData.id);
      logger.data($('Creation Time:'), outputData.creationTime.toUTCFormat(UTCFormat));
      if (outputData.tags) {
        cli.interaction.logEachData($('Tags:'), outputData.tags);
      }
    });
  }

  /**
  * List batch pools
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listPool(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing batch pools');
    var batchOptions = batchUtil.getBatchOperationDefaultOption();
    var options = {};
    options.poolListOptions = batchOptions;
    var pools = [];
    startProgress(tips);

    try {
      result = client.pool.list(options, _);
      result.forEach(function (pool) {
        pools.push(pool);
      });
      var nextLink = result.odatanextLink;
            
      while (nextLink) {
        batchOptions = batchUtil.getBatchOperationDefaultOption();
        options.poolListOptions = batchOptions;
        result = client.pool.listNext(nextLink, options, _);
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
          row.cell($('Name'), item.id);
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
    var batchOptions = batchUtil.getBatchOperationDefaultOption();
    
    var metrics = [];
    startProgress(tips);
    
    try {
      metrics = client.pool.listPoolUsageMetrics(batchOptions, _);
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
      if (outputData.length === 0) {
        logger.info($('No Usage Metric found'));
      } else {
        console.log(outputData);
        logger.table(outputData, function (row, item) {
          row.cell($('Name'), item.id);
        });
      }
    });
  }
  
  /**
  * Delete the specified storage table
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deletePool(table, options, _) {
    var tableService = getTableServiceClient(options);
    table = interaction.promptIfNotGiven($('Table name: '), table, _);
    var operation = getStorageTableOperation(tableService, 'deleteTable');
    var tips = util.format($('Deleting storagetable %s'), table);
    var storageOptions = getStorageTableOperationDefaultOption();
    
    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete table %s? '), table), _)) {
        return;
      }
    }
    
    startProgress(tips);
    
    try {
      performStorageOperation(operation, _, table, storageOptions);
    } catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Can not find table \'%s\''), table));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }
    
    logger.info(util.format($('Table %s has been deleted successfully'), table));
  }

  /**
  * Patch for azure node sdk
  */
  function applyTableServicePatch(tableService) {
    /*
    * List all tables
    * NOTICE: All the caller should use the options parameter since it's just a internal implementation
    */
    tableService.listAllTables = function(options, callback) {
      StorageUtil.listWithContinuation(tableService.listTablesSegmentedWithPrefix, tableService, StorageUtil.ListContinuationTokenArgIndex.Table, options.prefix, null, options, callback);
    };
  }
};
