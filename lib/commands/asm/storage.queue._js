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
* Init storage queue command
*/
exports.init = function (cli) {

  //Init StorageUtil
  StorageUtil.init(cli);

  /**
  * Define storage queue command usage
  */
  var storage = cli.category('storage')
    .description($('Commands to manage your Storage objects'));

  var logger = cli.output;

  var queue = storage.category('queue')
    .description($('Commands to manage your Storage queues'));

  queue.command('create [queue]')
    .description($('Create a storage queue'))
    .option('--queue <queue>',$('the storage queue name'))
    .addStorageAccountOption()
    .execute(createQueue);

  queue.command('list [prefix]')
  .description($('List storage queues with wildcard'))
  .option('-p, --prefix <prefix>',$('the storage queue name prefix'))
  .addStorageAccountOption()
  .execute(listQueue);

  queue.command('show [queue]')
    .description($('Show details of the storage able'))
    .option('--queue <queue>',$('the storage queue name'))
    .addStorageAccountOption()
    .execute(showQueue);

  queue.command('delete [queue]')
    .description($('Delete the specified storage queue'))
    .option('--queue <queue>',$('the storage queue name'))
    .option('-q, --quiet',$('remove the specified storage queue without confirmation'))
    .addStorageAccountOption()
    .execute(deleteQueue);

  /**
  * Implement storage queue cli
  */

  /**
  * Get queue account from user specified credential or env variables
  * @param {object} options command line options
  */
  function getQueueServiceClient(options) {
    var serviceClient = StorageUtil.getServiceClient(StorageUtil.getQueueService, options);
    applyQueueServicePatch(serviceClient);
    return serviceClient;
  }

  /**
  * Get Storage queue operation object
  * @param {string} [operationName] operation name
  * @return {StorageOperation} storage queue operation
  */
  function getStorageQueueOperation(serviceClient, operationName) {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.Queue;
    operation.operation = operationName;
    operation.service = serviceClient;
    return operation;
  }

  /**
  * Get Storage queue operation options
  */
  function getStorageQueueOperationDefaultOption() {
    var option = StorageUtil.getStorageOperationDefaultOption();

    // Add queue specific options here

    return option;
  }

  /**
  * Create a storage queue
  * @param {string} [queue] queue name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function createQueue(queue,options,_) {
    var queueService = getQueueServiceClient(options);
    queue = StorageUtil.promptIfNotGiven($('Queue name: '),queue,_);
    var operation = getStorageQueueOperation(queueService,'createQueue');
    var tips = util.format($('Creating storage queue %s'),queue);
    var storageOptions = getStorageQueueOperationDefaultOption();
    startProgress(tips);
    try {
      var created = performStorageOperation(operation,_,queue,storageOptions);
      if (created === false) {
        throw new Error(util.format($('Queue \'%s\' already exists'),queue));
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('Queue %s has been created successfully'),queue));
    showQueue(queue,StorageUtil.getStorageAccountOptions(options),_);
  }

  /**
  * Delete the specified storage queue
  * @param {string} [queue] queue name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function deleteQueue(queue,options,_) {
    var queueService = getQueueServiceClient(options);
    queue = StorageUtil.promptIfNotGiven($('Queue name: '),queue,_);
    var operation = getStorageQueueOperation(queueService,'deleteQueue');
    var tips = util.format($('Deleting storagequeue %s'),queue);
    var storageOptions = getStorageQueueOperationDefaultOption();

    if (!options.quiet) {
      if (!StorageUtil.confirm(util.format($('Do you want to delete queue %s?'),queue),_)) {
        return;
      }
    }

    startProgress(tips);

    try {
      performStorageOperation(operation,_,queue,storageOptions);
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Can not find queue \'%s\''),queue));
      } else {
        throw e;
      }
    }
    finally {
      endProgress();
    }

    logger.info(util.format($('Queue %s has been deleted successfully'),queue));
  }

  /**
  * Show the details of the specified Storage queue
  * @param {string} [queue] queue name
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showQueue(queue,options,_) {
    var queueService = getQueueServiceClient(options);
    queue = StorageUtil.promptIfNotGiven($('Queue name: '),queue,_);
    var operation = getStorageQueueOperation(queueService,'doesQueueExist');
    var tips = $('Getting Storage queue information');
    var storageOptions = getStorageQueueOperationDefaultOption();
    var output = [];

    startProgress(tips);
    try {
      var exist = performStorageOperation(operation,_,queue,storageOptions);
      if (!exist) {
        throw new Error(util.format($('Queue %s doesn\'t exist'),queue));
      } else {
        var info = {name: queue};
        operation = getStorageQueueOperation(queueService,'getQueueMetadata');
        info.metadata = performStorageOperation(operation,_,queue,storageOptions);

        operation = getStorageQueueOperation(queueService,'getQueueAcl');
        info.policies = performStorageOperation(operation,_,queue,storageOptions);

        output.push(info);
      }
    }
    catch (e) {
      if (StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format($('Queue %s doesn\'t exist'),queue));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(output[0],function(outputData) {
      logger.info(util.format($('Approximate message count in the queue %s is %s'),queue,outputData.metadata.approximatemessagecount));
      if (Object.keys(outputData.metadata.metadata).length > 0) {
        logger.info('');
        logger.table(outputData.metadata.metadata,function(row,item) {
          row.cell($('Metadata'),item);
          row.cell($('Value'),outputData.metadata.metadata[item]);
        });
      }
      if (outputData.policies.signedIdentifiers.length > 0) {
        logger.info('');
        logger.table(outputData.policies.signedIdentifiers,function(row,item) {
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
  * List storage queues
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listQueue(prefix, options,_) {
    var queueService = getQueueServiceClient(options);
    var listOperation = getStorageQueueOperation(queueService,'listAllQueues');
    var tips = $('Getting storage queues');
    var queueOptions = getStorageQueueOperationDefaultOption();
    var useWildcard = false;

    if (Wildcard.containWildcards(prefix)) {
      queueOptions.prefix = Wildcard.getNonWildcardPrefix(prefix);
      useWildcard = true;
    } else {
      queueOptions.prefix = prefix;
    }

    var queues = [];
    startProgress(tips);

    try {
      performStorageOperation(listOperation,_,queueOptions).forEach_(_,StorageUtil.opConcurrency,function(_,queue) {
        if (useWildcard && !Wildcard.isMatch(queue.name,prefix)) {
          return;
        }
        var info = {name: queue.name};
        queues.push(info);
      });
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(queues, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No queue found'));
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
  function applyQueueServicePatch(queueService) {
    /*
    * List all queues
    * NOTICE: All the caller should use the options parameter since it's just a internal implementation
    */
    queueService.listAllQueues = function(options,callback) {
      StorageUtil.listWithContinuation(queueService.listQueuesSegmentedWithPrefix,queueService,options.prefix,null,options,callback);
    };
  }
};
