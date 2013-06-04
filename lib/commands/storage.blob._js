/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var StorageUtil = require('../util/storage.util');
var utils = require('../util/utils');
var Wildcard = utils.Wildcard;
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;
var setOperationTimeout = StorageUtil.setOperationTimeout;

/**
* Init storage blob command
*/
exports.init = function(cli) {

  //Init StorageUtil
  StorageUtil.init(cli);

  /**
  * Define storage blob command usage
  */
  var storage = cli.category('storage')
    .description('Commands to manage your Storage objects');

  var logger = cli.output;

  var container = storage.category('container')
    .description('Commands to manage your Storage container');

  container.command('list [containerName]')
    .description('List Azure Storage container')
    .execute(listAzureContainersWithAcl);

  /**
  * Implement storage blob cli
  */

  /**
  * Operation concurrency.
  *   -1 means operations are fully parallelized.
  *   However the concurrent REST calls are limited by performStorageOperation
  */
  var opConcurrency = -1;

  /**
  * Get Storage blob operation object
  * @return {StorageOperation} storage blob operation
  */
  function getStorageBlobOperation() {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.Blob;
    return operation;
  }

  /**
  * List azure storage container with acl
  * @param {string} containerName container name
  * @param {object} options commadline options
  * @param {callback} _ callback function
  */
  function listAzureContainersWithAcl(containerName, options, _) {
    var listOperation = getStorageBlobOperation();
    listOperation.operation = 'listContainers';
    var tips = 'Looking up Azure Storage containers';
    var containerOpts = {};
    var useWildcard = false;

    if (Wildcard.containWildcards(containerName)) {
      containerOpts.prefix = Wildcard.getNonWildcardPrefix(containerName);
      useWildcard = true;
    } else {
      containerOpts.prefix = containerName;
    }
    setOperationTimeout(containerOpts);

    var containers = [];
    startProgress(tips);

    try {
      /*jshint camelcase:false*/
      performStorageOperation(listOperation, _, containerOpts).forEach_(_, opConcurrency, function(_, container) {
      /*jshint camelcase:true*/
        if(useWildcard && !Wildcard.isMatch(container.name, containerName)) {
          return;
        }
        containers.push(container);
        var aclOperation = getStorageBlobOperation();
        aclOperation.operation = 'getContainerAcl';
        var aclOptions = {};
        setOperationTimeout(aclOptions);
        var permission = performStorageOperation(aclOperation, _, container.name, aclOptions);
        var level = (permission.publicAccessLevel || '').toLowerCase();
        switch(level) {
        case 'blob':
          container.publicAccessLevel = 'Blob';
          break;
        case 'container':
          container.publicAccessLevel = 'Container';
          break;
        default:
          container.publicAccessLevel = 'Off';
          break;
        }
      });
    } finally {
      endProgress();
    }
    logger.table(containers, function(row, item) {
      row.cell('Name', item.name);
      row.cell('Public Access', item.publicAccessLevel);
      row.cell('Last-Modified', item.properties['last-modified']);
    });
  }
};
