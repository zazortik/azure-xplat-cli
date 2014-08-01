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
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;
var setOperationTimeout = StorageUtil.setOperationTimeout;

var $ = utils.getLocaleString;

/**
* Add storge account command line options
*/
commander.Command.prototype.addStorageAccountOption = function () {
  this.option('-a, --account-name <accountName>', $('the storage account name'));
  this.option('-k, --account-key <accountKey>', $('the storage account key'));
  this.option('-c, --connection-string <connectionString>', $('the storage connection string'));
  this.option('-vv, --debug', $('run storage command in debug mode'));
  return this;
};

/**
* Init storage file share command
*/
exports.init = function (cli) {

  //Init StorageUtil
  StorageUtil.init(cli);

  /**
  * Define storage file share command usage
  */
  var storage = cli.category('storage')
    .description($('Commands to manage your Storage objects'));

  var logger = cli.output;

  var share = storage.category('share')
    .description($('Commands to manage your Storage file shares'));

  share.command('create [share]')
    .description($('Create a storage file share'))
    .option('--share <share>', $('the storage file share name'))
    .addStorageAccountOption()
    .execute(createShare);

  share.command('show [share]')
    .description($('Show details of the storage file share'))
    .option('--share <share>', $('the storage file share name'))
    .addStorageAccountOption()
    .execute(showShare);

  share.command('delete [share]')
    .description($('Delete the specified storage file share'))
    .option('--share <share>', $('the storage file share name'))
    .option('-q, --quiet', $('remove the specified storage file share without confirmation'))
    .addStorageAccountOption()
    .execute(deleteShare);

  share.command('list [prefix]')
    .description($('List storage shares with prefix'))
    .option('-p, --prefix <prefix>', $('the storage share name prefix'))
    .addStorageAccountOption()
    .execute(listShares);

  /**
  * Implement storage file share cli
  */

  /**
  * Extract the storage account options from the specified options
  */
  function getStorageAccountOptions(options) {
    return {
      accountName: options.accountName,
      accountKey: options.accountKey,
      connectionString: options.connectionString
    };
  }

  /**
  * Get file service account from user specified credential or env variables
  */
  function getFileServiceClient(options) {
    var serviceClient = StorageUtil.getServiceClient(StorageUtil.getFileService, options);
    applyFileServicePatch(serviceClient);
    return serviceClient;
  }

  /**
  * Get Storage file operation object
  * @param {string} [operationName] operation name
  * @return {StorageOperation} storage blob operation
  */
  function getStorageFileOperation(serviceClient, operationName) {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.File;
    operation.operation = operationName;
    operation.service = serviceClient;
    return operation;
  }

  /**
  * Get Storage blob operation options
  */
  function getStorageFileOperationDefaultOption() {
    var option = {};
    setOperationTimeout(option);
    return option;
  }

  /**
  * Add a space at the end of string and use single line prompt
  */
  function addTailSpace(str) {
    if (str && str.length && str[str.length - 1] != ' ') {
      str += ' ';
    }
    return str;
  }

  /**
  * Ask for input if the specified value is not given
  */
  function promptIfNotGiven(label, value, _) {
    label = addTailSpace(label);
    value = cli.interaction.promptIfNotGiven(label, value, _);
    return value;
  }

  /**
  * Confirm the specified action
  */
  function confirm(msg, _) {
    msg = addTailSpace(msg);
    var ok = cli.interaction.confirm(msg, _);
    if (!ok) {
      logger.warn($('The operation is cancelled'));
    }
    return ok;
  }

  /**
  * Create a storage file share
  */
  function createShare(share, options, _) {
    var fileService = getFileServiceClient(options);
    share = promptIfNotGiven($('Share name: '), share, _);
    var operation = getStorageFileOperation(fileService, 'createShare');
    var tips = util.format($('Creating storage file share %s'), share);
    var storageOptions = getStorageFileOperationDefaultOption();
    startProgress(tips);
    try {
      var created = performStorageOperation(operation, _, share, storageOptions);
      if (created === false) {
        throw new Error(util.format($('Share \'%s\' already exists'), share));
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('Share %s has been created successfully'), share));
    showShare(share, getStorageAccountOptions(options), _);
  }

  /**
  * Delete the specified storage file share
  */
  function deleteShare(share, options, _) {
    var fileService = getFileServiceClient(options);
    share = promptIfNotGiven($('Share name: '), share, _);
    var operation = getStorageFileOperation(fileService, 'deleteShare');
    var tips = util.format($('Deleting storage file share %s'), share);
    var storageOptions = getStorageFileOperationDefaultOption();
    var force = !!options.quiet;

    if (force !== true) {
      force = confirm(util.format($('Do you want to delete share %s?'), share), _);
      if (force !== true) {
        return;
      }
    }

    startProgress(tips);

    try {
      performStorageOperation(operation, _, share, storageOptions);
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Can not find share \'%s\''), share));
      } else {
        throw e;
      }
    }
    finally {
      endProgress();
    }

    logger.info(util.format($('Share %s has been deleted successfully'), share));
  }

  /**
  * Show the details of the specified Storage file share
  */
  function showShare(share, options, _) {
    var fileService = getFileServiceClient(options);
    share = promptIfNotGiven($('Share name: '), share, _);
    var operation = getStorageFileOperation(fileService, 'getShareProperties');
    var tips = $('Getting Storage share information');
    var storageOptions = getStorageFileOperationDefaultOption();
    var properties = [];

    startProgress(tips);
    try {
      properties = performStorageOperation(operation, _, share, storageOptions);
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Share %s doesn\'t exist'), share));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.json(properties);
  }

  /**
  * List storage shares
  * @param {string} prefix share prefix
  * @param {object} options commadline options
  * @param {callback} _ callback function
  */
  function listShares(prefix, options, _) {
    var fileService = getFileServiceClient(options);
    var listOperation = getStorageFileOperation(fileService, 'listAllShares');
    var tips = $('Getting storage shares');
    var storageOptions = getStorageFileOperationDefaultOption();

    var shares = [];
    storageOptions.prefix = prefix;
    startProgress(tips);

    try {
      shares = performStorageOperation(listOperation, _, storageOptions);
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(shares, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No share found'));
      } else {
        logger.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Last-Modified'), item.properties['last-modified']);
        });
      }
    });
  }

  /**
  * Patch for azure node sdk
  */
  function applyFileServicePatch(fileService) {

    /*
    * List all shares
    * NOTICE: All the caller should use the options parameter since it's just a internal implementation
    */
    fileService.listAllShares = function (options, callback) {
      StorageUtil.listWithContinuation(fileService.listSharesSegmentedWithPrefix, fileService, options.prefix, null, options, callback);
    };

    /*
    * List files and directories in the given folder
    * NOTICE: All the caller should use the options parameter since it's just a internal implementation
    */
    fileService.listFilesAndDirectories = function (share, directory, options, callback) {
      StorageUtil.listWithContinuation(fileService.listFilesAndDirectoriesSegmented, fileService, share, directory, null, options, callback);
    };
  }
};
