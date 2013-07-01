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

var azure = require('azure');
var StorageUtil = require('../util/storage.util');
var util = require('util');
var utils = require('../util/utils');
var interaction = require('../util/interaction');
var validation = require('../util/validation');
var Wildcard = utils.Wildcard;
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;
var setOperationTimeout = StorageUtil.setOperationTimeout;
var BlobConstants = azure.Constants.BlobConstants;

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

  container.command('show [containerName]')
    .description('Show details of the specified storage container')
    .execute(showAzureContainer);

  container.command('create [containerName]')
    .description('Create a new storage container')
    .option('-p, --permission <permission>', 'Container permission(Off/Blob/Container)')
    .execute(createAzureContainer);

  container.command('delete [containerName]')
    .description('Delete the specified storage container')
    .option('-q, --quiet', 'Remove the specified Storage contianer without confirmation')
    .execute(deleteAzureContainer);

  container.command('set [containerName]')
    .description('Set container acl')
    .option('-p, --permission <permission>', 'Container permission(Off/Blob/Container)')
    .execute(setAzureContainer);

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
  * @param {string} [operationName] operation name
  * @return {StorageOperation} storage blob operation
  */
  function getStorageBlobOperation(operationName) {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.Blob;
    operation.operation = operationName;
    return operation;
  }

  /**
  * Get Storage blob operation options
  */
  function getStorageBlobOperationDefaultOption() {
    var option = {};
    setOperationTimeout(option);
    return option;
  }

  /**
  * Add a space at the end of string (in order to fix the output issue for commander.js)
  */
  function addTailSpace(str) {
    if(str && str.length && str[str.length - 1] != ' ') {
      str += ' ';
    }
    return str;
  }

  /**
  * Ask for input if the specified value is not given
  */
  function promptIfNotGiven(label, value, _) {
    label = addTailSpace(label);
    value = interaction.promptIfNotGiven(cli, label, value, _);
    return value;
  }

  /**
  * Confirm the specified action
  */
  function confirm(msg, _) {
    msg = addTailSpace(msg);
    var ok = interaction.confirm(cli, msg, _);
    if(!ok) {
      logger.warn('The operation is cancelled');
    }
    return ok;
  }

  /**
  * List storage container with acl
  * @param {string} containerName container name
  * @param {object} options commadline options
  * @param {callback} _ callback function
  */
  function listAzureContainersWithAcl(containerName, options, _) {
    var listOperation = getStorageBlobOperation('listContainers');
    var tips = 'Looking up Azure Storage containers';
    var containerOpts = getStorageBlobOperationDefaultOption();
    var useWildcard = false;
    containerOpts.include = 'metadata';

    if (Wildcard.containWildcards(containerName)) {
      containerOpts.prefix = Wildcard.getNonWildcardPrefix(containerName);
      useWildcard = true;
    } else {
      containerOpts.prefix = containerName;
    }

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
        var aclOperation = getStorageBlobOperation('getContainerAcl');
        var aclOptions = {};
        setOperationTimeout(aclOptions);
        var permission = performStorageOperation(aclOperation, _, container.name, aclOptions);
        var level = StorageUtil.containerAccessLevelToString(permission.publicAccessLevel);
        container.publicAccessLevel = level;
      });
    } finally {
      endProgress();
    }
    logger.table(containers, function(row, item) {
      row.cell('Name', item.name);
      row.cell('Public-Access', item.publicAccessLevel);
      row.cell('Last-Modified', item.properties['last-modified']);
    });
  }

  /**
  * Show the details for the specified storage container
  * @param {string} containerName container name
  */
  function showAzureContainer(containerName, options, _) {
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var propertiesOperation = getStorageBlobOperation('getContainerProperties');
    var tips = 'Retrieving Storage container information';
    var showOptions = getStorageBlobOperationDefaultOption();
    var aclOperation = getStorageBlobOperation('getContainerAcl');
    var properties = {};

    startProgress(tips);

    try {
      //Get Container Properties operation returns all user-defined metadata and system properties for the specified container.
      properties = performStorageOperation(propertiesOperation, _, containerName, showOptions);
      var permission = performStorageOperation(aclOperation, _, containerName, showOptions);
      var level = StorageUtil.containerAccessLevelToString(permission.publicAccessLevel);
      properties.publicAccessLevel = level;
    } catch (e) {
      if(StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format('Container %s doesn\'t exist', containerName));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.json(properties);
  }

  /**
  * Create a new storage container
  */
  function createAzureContainer(containerName, options, _) {
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var operation = getStorageBlobOperation('createContainerIfNotExists');
    var tips = util.format('Creating Windows Azure Storage container %s', containerName);
    var storageOptions = getStorageBlobOperationDefaultOption();
    var permission = options.permission;
    if(permission) {
      validation.isValidEnumValue(permission, Object.keys(BlobConstants.BlobContainerPublicAccessType));
    }

    startProgress(tips);
    try {
      var created = performStorageOperation(operation, _, containerName, storageOptions);
      if(created === false) {
        throw new Error(util.format('Container \'%s\' already exists', containerName));
      } else if(permission) {
        var aclOperation = getStorageBlobOperation('setContainerAcl');
        var accessLevel = StorageUtil.stringToContainerAccessLevel(permission);
        performStorageOperation(aclOperation, _, containerName, accessLevel, storageOptions);
      }
    } finally {
      endProgress();
    }

    logger.verbose(util.format('Container %s created successfully', containerName));
    showAzureContainer(containerName, {}, _);
  }

  /**
  * Delete the specified storage container
  */
  function deleteAzureContainer(containerName, options, _) {
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var tips = util.format('Deleting Container %s', containerName);
    var operation = getStorageBlobOperation('deleteContainer');
    var storageOptions = getStorageBlobOperationDefaultOption();
    var force = options.quiet;

    if(force !== true) {
      force = confirm(util.format('Do you want to remove the storage container %s?', containerName), _);
      if(force !== true) {
        return;
      }
    }

    startProgress(tips);

    try {
      performStorageOperation(operation, _, containerName, storageOptions);
    } catch(e) {
      if(StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format('Can not find container \'%s\'.', containerName));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format('Container %s deleted successfully', containerName));
  }

  /**
  * Set container acl(properties/metadata)
  */
  function setAzureContainer(containerName, options, _) {
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var tips = 'Set container';
    startProgress(tips);

    try {
      if(options.permission) {
        setAzureContainerAcl(containerName, options.permission, _);
      }
    } finally {
      endProgress();
    }
    showAzureContainer(containerName, {}, _);
  }

  /**
  * Set container acl
  */
  function setAzureContainerAcl(containerName, permission, _) {
    var operation = getStorageBlobOperation('setContainerAcl');
    var storageOptions = getStorageBlobOperationDefaultOption();
    validation.isValidEnumValue(permission, Object.keys(BlobConstants.BlobContainerPublicAccessType));
    var accessLevel = StorageUtil.stringToContainerAccessLevel(permission);
    performStorageOperation(operation, _, containerName, accessLevel, storageOptions);
  }
};
