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

var StorageUtil = require('../../util/storage.util');
var util = require('util');
var utils = require('../../util/utils');
var commander = require('commander');
var Wildcard = utils.Wildcard;
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Add storge account command line options
*/
commander.Command.prototype.addStorageAccountOption = function () {
  this.option('-a, --account-name <accountName>', $('the storage account name'));
  this.option('-k, --account-key <accountKey>', $('the storage account key'));
  this.option('-c, --connection-string <connectionString>', $('the storage connection string'));
  this.option('-vv', $('run storage command in debug mode'));
  return this;
};

/**
* Init storage table command
*/
exports.init = function (cli) {

  //Init StorageUtil
  StorageUtil.init(cli);

  /**
  * Define storage table command usage
  */
  var storage = cli.category('storage')
    .description($('Commands to manage your Storage objects'));

  var logger = cli.output;

  var table = storage.category('table')
    .description($('Commands to manage your Storage tables'));

  table.command('create [table]')
    .description($('Create a storage table'))
    .option('--table <table>',$('the storage table name'))
    .addStorageAccountOption()
    .execute(createTable);

  table.command('list [prefix]')
  .description($('List storage tables with wildcard'))
  .option('-p, --prefix <prefix>',$('the storage table name prefix'))
  .addStorageAccountOption()
  .execute(listTable);

  table.command('show [table]')
    .description($('Show details of the storage able'))
    .option('--table <table>',$('the storage table name'))
    .addStorageAccountOption()
    .execute(showTable);

  table.command('delete [table]')
    .description($('Delete the specified storage table'))
    .option('--table <table>',$('the storage table name'))
    .option('-q, --quiet',$('remove the specified storage table without confirmation'))
    .addStorageAccountOption()
    .execute(deleteTable);

  /**
  * Implement storage table cli
  */

  /**
  * Get table account from user specified credential or env variables
  * @param {object} options command line options
  */
  function getTableServiceClient(options) {
    var serviceClient = StorageUtil.getServiceClient(StorageUtil.getTableService, options);
    applyTableServicePatch(serviceClient);
    return serviceClient;
  }

  /**
  * Get Storage table operation object
  * @param {string} [operationName] operation name
  * @return {StorageOperation} storage table operation
  */
  function getStorageTableOperation(serviceClient, operationName) {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.Table;
    operation.operation = operationName;
    operation.service = serviceClient;
    return operation;
  }

  /**
  * Get Storage table operation options
  */
  function getStorageTableOperationDefaultOption() {
    var option = StorageUtil.getStorageOperationDefaultOption();

    // Add table specific options here

    return option;
  }

  /**
  * Create a storage table
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createTable(table,options,_) {
    var tableService = getTableServiceClient(options);
    table = StorageUtil.promptIfNotGiven($('Table name: '),table,_);
    var operation = getStorageTableOperation(tableService,'createTable');
    var tips = util.format($('Creating storage table %s'),table);
    var storageOptions = getStorageTableOperationDefaultOption();
    startProgress(tips);
    try {
      var created = performStorageOperation(operation,_,table,storageOptions);
      if (created === false) {
        throw new Error(util.format($('Table \'%s\' already exists'),table));
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('Table %s has been created successfully'),table));
    showTable(table,StorageUtil.getStorageAccountOptions(options),_);
  }

  /**
  * Delete the specified storage table
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteTable(table,options,_) {
    var tableService = getTableServiceClient(options);
    table = StorageUtil.promptIfNotGiven($('Table name: '),table,_);
    var operation = getStorageTableOperation(tableService,'deleteTable');
    var tips = util.format($('Deleting storagetable %s'),table);
    var storageOptions = getStorageTableOperationDefaultOption();

    if (!options.quiet) {
      if (!StorageUtil.confirm(util.format($('Do you want to delete table %s?'),table),_)) {
        return;
      }
    }

    startProgress(tips);

    try {
      performStorageOperation(operation,_,table,storageOptions);
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Can not find table \'%s\''),table));
      } else {
        throw e;
      }
    }
    finally {
      endProgress();
    }

    logger.info(util.format($('Table %s has been deleted successfully'),table));
  }

  /**
  * Show the details of the specified Storage table
  * @param {string} [table] table name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showTable(table,options,_) {
    var tableService = getTableServiceClient(options);
    table = StorageUtil.promptIfNotGiven($('Table name: '),table,_);
    var operation = getStorageTableOperation(tableService,'doesTableExist');
    var tips = $('Getting Storage table information');
    var storageOptions = getStorageTableOperationDefaultOption();
    var output = [];

    startProgress(tips);
    try {
      var exist = performStorageOperation(operation,_,table,storageOptions);
      if (!exist) {
        throw new Error(util.format($('Table %s doesn\'t exist'),table));
      } else {
        operation = getStorageTableOperation(tableService,'getTableAcl');
        var info = {name: table};
        var acl = performStorageOperation(operation,_,table,storageOptions);
        info.policies = acl.signedIdentifiers;
        output.push(info);
      }
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Table %s doesn\'t exist'),table));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(output[0],function(outputData) {
      if (outputData.policies.length === 0) {
        logger.info(util.format($('No information is found for table %s'),table));
      } else {
        logger.table(outputData.policies,function(row,item) {
          var UTCFormat = 'YYYY-MM-DDTHH:MM:SSZ';
          row.cell($('Policy'),item.Id);
          row.cell($('Permission'),item.AccessPolicy.Permission ? item.AccessPolicy.Permission : '');
          row.cell($('Start'),item.AccessPolicy.Start ? item.AccessPolicy.Start.toUTCFormat(UTCFormat) : '');
          row.cell($('Expiry'),item.AccessPolicy.Expiry ? item.AccessPolicy.Expiry.toUTCFormat(UTCFormat) : '');
        });
      }
    });
  }

  /**
  * List storage tables
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listTable(prefix, options,_) {
    var tableService = getTableServiceClient(options);
    var listOperation = getStorageTableOperation(tableService,'listAllTables');
    var tips = $('Getting storage tables');
    var tableOptions = getStorageTableOperationDefaultOption();
    var useWildcard = false;

    if (Wildcard.containWildcards(prefix)) {
      tableOptions.prefix = Wildcard.getNonWildcardPrefix(prefix);
      useWildcard = true;
    } else {
      tableOptions.prefix = prefix;
    }

    var tables = [];
    startProgress(tips);

    try {
      performStorageOperation(listOperation,_,tableOptions).forEach_(_,StorageUtil.opConcurrency,function(_,table) {
        if (useWildcard && !Wildcard.isMatch(table,prefix)) {
          return;
        }
        var info = {name: table};
        tables.push(info);
      });
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(tables, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No table found'));
      } else {
        logger.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
        });
      }
    });
  }

  /**
  * Patch for azure node sdk
  */
  function applyTableServicePatch(tableService) {
    /*
    * List all tables
    * NOTICE: All the caller should use the options parameter since it's just a internal implementation
    */
    tableService.listAllTables = function(options,callback) {
      StorageUtil.listWithContinuation(tableService.listTablesSegmentedWithPrefix,tableService,options.prefix,null,options,callback);
    };
  }
};
