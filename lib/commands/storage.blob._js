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
var commander = require('commander');
var Wildcard = utils.Wildcard;
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;
var setOperationTimeout = StorageUtil.setOperationTimeout;
var BlobConstants = azure.Constants.BlobConstants;
var normalizeParameters = StorageUtil.normalizeParameters;

/**
* Add storge account command line options
*/
commander.Command.prototype.addStorageAccountOption = function() {
  this.option('-a, --account-name <accountName>', 'Azure Storage account name');
  this.option('-k, --account-key <accountKey>', 'Azure Storage account key');
  this.option('-c, --connection-string <connectionString>', 'Azure Storage connection string');
  return this;
};

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

  container.command('list [container]')
    .description('List Azure Storage container')
    .option('--prefix <prefix>', 'Container name prefix')
    .addStorageAccountOption()
    .execute(listAzureContainersWithAcl);

  container.command('show [container]')
    .description('Show details of the specified storage container')
    .option('--container <container>', 'Container name')
    .addStorageAccountOption()
    .execute(showAzureContainer);

  container.command('create [container]')
    .description('Create a new storage container')
    .option('--container <container>', 'Container name')
    .option('-p, --permission <permission>', 'Container permission(Off/Blob/Container)')
    .addStorageAccountOption()
    .execute(createAzureContainer);

  container.command('delete [container]')
    .description('Delete the specified storage container')
    .option('--container <container>', 'Container name')
    .option('-q, --quiet', 'Remove the specified Storage contianer without confirmation')
    .addStorageAccountOption()
    .execute(deleteAzureContainer);

  container.command('set [container]')
    .description('Set container acl')
    .option('--container <container>', 'Container name')
    .option('-p, --permission <permission>', 'Container permission(Off/Blob/Container)')
    .addStorageAccountOption()
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
  function getStorageBlobOperation(serviceClient, operationName) {
    var operation = new StorageUtil.StorageOperation();
    operation.type = StorageUtil.OperationType.Blob;
    operation.operation = operationName;
    operation.service = serviceClient;
    return operation;
  }

  /**
  * Extract the storage account options from the specified options
  */
  function getStorageAccountOptions(options) {
    return {
      accountName : options.accountName,
      accountKey : options.accountKey,
      connectionString : options.connectionString
    };
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
  * Get blob service account from user specified credential or env variables
  */
  function getBlobServiceClient(options) {
    var isNameDefined = options.accountName !== undefined;
    var isKeyDefined = options.accountKey !== undefined;
    var isConnectionStringDefined = options.connectionString !== undefined;
    var isAccountDefined = isNameDefined || isKeyDefined;
    if(isConnectionStringDefined && isAccountDefined) {
      throw new Error('Please only define one of them: 1. --connection-string. 2 --account-name and --account-key.');
    } else {
      if (isConnectionStringDefined) {
        return StorageUtil.getBlobService(options.connectionString);
      } else if (isAccountDefined) {
        if (isNameDefined && isKeyDefined) {
          var connString = util.format('DefaultEndpointsProtocol=https;AccountName=%s;AccountKey=%s', options.accountName, options.accountKey);
          return StorageUtil.getBlobService(connString);
        } else {
          throw new Error('Please set both --account-name and --account-key.');
        }
      } else {
        //Use environment variable
        return StorageUtil.getBlobService();
      }
    }
  }

  /**
  * Add a space at the end of string and use single line prompt
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
    var params = normalizeParameters({
      containerName : [containerName, options.prefix]
    });
    containerName = params.values.containerName;
    var blobService = getBlobServiceClient(options);
    var listOperation = getStorageBlobOperation(blobService,'listContainers');
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
        var aclOperation = getStorageBlobOperation(blobService, 'getContainerAcl');
        var aclOptions = {};
        setOperationTimeout(aclOptions);
        try {
          var permission = performStorageOperation(aclOperation, _, container.name, aclOptions);
          var level = StorageUtil.containerAccessLevelToString(permission.publicAccessLevel);
          container.publicAccessLevel = level;
        } catch(e) {
          logger.warn(e.message || e);
        }
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
    var params = normalizeParameters({
      containerName : [containerName, options.container]
    });
    containerName = params.values.containerName;
    var blobService = getBlobServiceClient(options);
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var propertiesOperation = getStorageBlobOperation(blobService, 'getContainerProperties');
    var tips = 'Retrieving Storage container information';
    var showOptions = getStorageBlobOperationDefaultOption();
    var aclOperation = getStorageBlobOperation(blobService, 'getContainerAcl');
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
    var params = normalizeParameters({
      containerName : [containerName, options.container]
    });
    containerName = params.values.containerName;
    var blobService = getBlobServiceClient(options);
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var operation = getStorageBlobOperation(blobService, 'createContainerIfNotExists');
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
        var aclOperation = getStorageBlobOperation(blobService, 'setContainerAcl');
        var accessLevel = StorageUtil.stringToContainerAccessLevel(permission);
        performStorageOperation(aclOperation, _, containerName, accessLevel, storageOptions);
      }
    } finally {
      endProgress();
    }

    logger.verbose(util.format('Container %s created successfully', containerName));
    showAzureContainer(containerName, getStorageAccountOptions(options), _);
  }

  /**
  * Delete the specified storage container
  */
  function deleteAzureContainer(containerName, options, _) {
    var params = normalizeParameters({
      containerName : [containerName, options.container]
    });
    containerName = params.values.containerName;
    var blobService = getBlobServiceClient(options);
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var tips = util.format('Deleting Container %s', containerName);
    var operation = getStorageBlobOperation(blobService, 'deleteContainer');
    var storageOptions = getStorageBlobOperationDefaultOption();
    var force = !!options.quiet;

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
    var params = normalizeParameters({
      containerName : [containerName, options.container]
    });
    containerName = params.values.containerName;
    var blobService = getBlobServiceClient(options);
    containerName = promptIfNotGiven('Container name: ', containerName, _);
    var tips = 'Set container';
    startProgress(tips);

    try {
      if(options.permission) {
        setAzureContainerAcl(blobService, containerName, options.permission, _);
      }
    } finally {
      endProgress();
    }
    showAzureContainer(containerName, getStorageAccountOptions(options), _);
  }

  /**
  * Set container acl
  */
  function setAzureContainerAcl(blobService, containerName, permission, _) {
    var operation = getStorageBlobOperation(blobService, 'setContainerAcl');
    var storageOptions = getStorageBlobOperationDefaultOption();
    validation.isValidEnumValue(permission, Object.keys(BlobConstants.BlobContainerPublicAccessType));
    var accessLevel = StorageUtil.stringToContainerAccessLevel(permission);
    performStorageOperation(operation, _, containerName, accessLevel, storageOptions);
  }
};
