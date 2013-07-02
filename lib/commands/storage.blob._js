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
var fs = require('fs');
var path = require('path');
var StorageUtil = require('../util/storage.util');
var util = require('util');
var url = require('url');
var utils = require('../util/utils');
var interaction = require('../util/interaction');
var validation = require('../util/validation');
var Wildcard = utils.Wildcard;
var performStorageOperation = StorageUtil.performStorageOperation;
var startProgress = StorageUtil.startProgress;
var endProgress = StorageUtil.endProgress;
var setOperationTimeout = StorageUtil.setOperationTimeout;
var normalizeParameters = StorageUtil.normalizeParameters;
var BlobConstants = azure.Constants.BlobConstants;
var SpeedSummary = azure.BlobService.SpeedSummary;

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

  var blob = storage.category('blob')
    .description('Commands to manage your Storage blob');

  blob.command('list [containerName] [blobName]')
    .description('List storage blob in the sepcified storage container')
    .option('-c, --container <containerName>', 'Storage container name')
    .option('-b, --blob <blobName>', 'Storage blob name prefix')
    .execute(listAzureBlob);

  blob.command('show [containerName] [blobName]')
    .description('Show details of the specified storage blob')
    .option('-c, --container <containerName>', 'Storage container name')
    .option('-b, --blob <blobName>', 'Storage blob name')
    .execute(showAzureBlob);

  blob.command('delete [containerName] [blobName]')
    .description('Delete the specified storage blob')
    .option('-c, --container <containerName>', 'Storage container name')
    .option('-b, --blob <blobName>', 'Storage blob name')
    //nodesdk don't support deleteBlob with snapshot http header
    //.option('-d, --deleteSnapshot', 'Delete the blob with snapshots')
    .option('-q, --quiet', 'Remove the specified Storage blob without confirmation')
    .execute(deleteAzureBlob);

  blob.command('upload [file] [containerName] [blobName]')
    .description('Upload the specified file to storage blob')
    .option('-f, --file <file>', 'Local file path')
    .option('-c, --container <containerName>', 'Storage container name')
    .option('-b, --blob <blobName>', 'Storage blob name')
    .option('-t, --blobtype <blobtype>', 'Storage blob type(Page, Block)')
    .option('-p, --properties <properties>', 'Storage blob properties for uploaded file. Properties are key=value pairs and separated with semicolon(;).')
    .option('-m, --metadata <metadata>', 'Storage blob metadata for uploaded file. Metadata are key=value pairs and separated with semicolon(;).')
    .option('--concurrenttaskcount <concurrenttaskcount>', 'Concurrent upload threads number.')
    .option('-q, --quiet', 'Overwrite the specified Storage blob without confirmation')
    .execute(uploadAzureBlob);

  blob.command('download [containerName] [blobName] [destination]')
    .description('Download the specified storage blob')
    .option('-c, --container <containerName>', 'Storage container name')
    .option('-b, --blob <blobName>', 'Storage blob name')
    .option('-d, --destination [destination]', 'Download destination file or directory path')
    .option('-m, --checkmd5', 'Check md5sum for the downloaded file')
    .option('--concurrenttaskcount <concurrenttaskcount>', 'Concurrent download threads number.')
    .option('-q, --quiet', 'Overwrite the destination file without confirmation')
    .execute(downloadAzureBlob);

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

  /**
  * List storage blob in the specified container
  */
  function listAzureBlob(containerName, blobName, options, _) {
    var params = normalizeParameters({
      containerName : [containerName, options.container],
      blobName : [blobName, options.blob]
    });

    var specifiedContainerName = promptIfNotGiven('Container name:', params.values.containerName, _);
    var tips = 'Looking up blobs in container ' + containerName;
    var operation = getStorageBlobOperation('listBlobs');
    var storageOptions = getStorageBlobOperationDefaultOption();
    var useWildcard = false;
    var inputBlobName = params.values.blobName;
    if (Wildcard.containWildcards(inputBlobName)) {
      storageOptions.prefix = Wildcard.getNonWildcardPrefix(inputBlobName);
      useWildcard = true;
    } else {
      storageOptions.prefix = inputBlobName;
    }
    storageOptions.include = 'snapshots';//,metadata,copy';
    var blobs = [];

    startProgress(tips);

    try {
      blobs = performStorageOperation(operation, _, specifiedContainerName, storageOptions);
    } finally {
      endProgress();
    }

    var outputBlobs = [];

    if (useWildcard) {
      for(var i = 0, len = blobs.length; i < len; i++) {
        var blob = blobs[i];
        if (Wildcard.isMatch(blob.name, inputBlobName)) {
          outputBlobs.push(blob);
        }
      }
    } else {
      outputBlobs = blobs;
    }

    logger.table(outputBlobs, function(row, item) {
      row.cell('Name', item.name);
      row.cell('BlobType', item.properties.blobtype);
      row.cell('Length', item.properties['content-length']);
      row.cell('Content-Type', item.properties['content-type']);
      row.cell('Last-Modified', item.properties['last-modified']);
      var uri = url.parse(item.url, true);
      row.cell('SnapshotTime', uri.query.snapshot || '');
    });
  }

  /**
  * Show the details of the specified Storage blob
  */
  function showAzureBlob(containerName, blobName, options, _) {
    var params = normalizeParameters({
      containerName : [containerName, options.container],
      blobName : [blobName, options.blob]
    });

    var specifiedContainerName = promptIfNotGiven('Container name:', params.values.containerName, _);
    var specifiedBlobName = promptIfNotGiven('Blob name:', params.values.blobName, _);
    var storageOptions = getStorageBlobOperationDefaultOption();
    var blob = {};
    var propertiesOperation = getStorageBlobOperation('getBlobProperties');
    var tips = 'Retrieving Storage blob information';

    startProgress(tips);

    try {
      blob = performStorageOperation(propertiesOperation, _, specifiedContainerName, specifiedBlobName, storageOptions);
    } catch (e) {
      if(StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format('Blob %s in Container %s doesn\'t exist', specifiedBlobName, specifiedContainerName));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.json(blob);
  }

  /**
  * Show the details of the specified Storage blob
  */
  function deleteAzureBlob(containerName, blobName, options, _) {
    var params = normalizeParameters({
      containerName : [containerName, options.container],
      blobName : [blobName, options.blob]
    });

    var specifiedContainerName = promptIfNotGiven('Container name:', params.values.containerName, _);
    var specifiedBlobName = promptIfNotGiven('Blob name:', params.values.blobName, _);
    var storageOptions = getStorageBlobOperationDefaultOption();
    var tips = util.format('Deleting Blob %s in container %s', blobName, containerName);
    var operation = getStorageBlobOperation('deleteBlob');
    startProgress(tips);

    try {
      performStorageOperation(operation, _, specifiedContainerName, specifiedBlobName, storageOptions);
    } catch(e) {
      if(StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format('Can not find blob \'%s\' in container \'%s\'.', specifiedBlobName, specifiedContainerName));
      } else {
        throw e;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format('Blob %s deleted successfully', blobName));
  }

  /**
  * upload local file to blob
  */
  function uploadAzureBlob(file, containerName, blobName, options, _) {
    var params = normalizeParameters({
      fileName : [file, options.file],
      containerName : [containerName, options.container],
      blobName : [blobName, options.blob]
    });
    var blobTypeName = options.blobtype || 'BLOCK';
    validation.isValidEnumValue(blobTypeName, Object.keys(BlobConstants.BlobTypes));
    var specifiedContainerName = promptIfNotGiven('Container name:', params.values.containerName, _);
    var specifiedFileName = promptIfNotGiven('File name:', params.values.fileName, _);
    var specifiedBlobName = params.values.blobName;
    var storageOptions = getStorageBlobOperationDefaultOption();
    var properties = StorageUtil.parseKvParameter(options.properties);
    var force = options.quiet;
    storageOptions.metadata = StorageUtil.parseKvParameter(options.metadata);
    storageOptions.setBlobContentMd5 = true; //setBlobContentMd5 can't work for page blob in sdk now.
    StorageUtil.formatBlobProperties(properties, storageOptions);
    var summary = new SpeedSummary(specifiedBlobName);
    storageOptions.speedSummary = summary;

    if (!specifiedBlobName) {
      specifiedBlobName = path.basename(specifiedFileName);
    }

    if (!utils.fileExists(specifiedFileName, _)) {
      throw new Error(util.format('Local file %s doesn\'t exists.', specifiedFileName));
    }
    var fsStatus = fs.stat(specifiedFileName, _);
    if (!fsStatus.isFile()) {
      throw new Error(util.format('%s is not a file.', specifiedFileName));
    }
    var tips = '';
    if (force !== true) {
      var blobProperties = null;
      try {
        tips = util.format('Checking blob %s in container %s', specifiedBlobName, specifiedContainerName);
        startProgress(tips);
        var propertiesOperation = getStorageBlobOperation('getBlobProperties');
        blobProperties = performStorageOperation(propertiesOperation, _,
          specifiedContainerName, specifiedBlobName, storageOptions);
      } catch(e) {
        if(!StorageUtil.isNotFoundException(e)) {
          throw e;
        }
      } finally {
        endProgress();
      }

      if(blobProperties !== null) {
        if (blobProperties.blobType !== storageOptions.blobType) {
          throw new Error(util.format('BlobType mismatch. The current blob type is %s',
            blobProperties.blobType));
        } else {
          if(!confirm(util.format('Do you want to remove the blob %s in container %s?',
            specifiedBlobName, specifiedContainerName), _)) {
            return;
          }
        }
      }
    }

    tips = util.format('Uploading %s to blob %s in container %s', specifiedFileName, specifiedBlobName, specifiedContainerName);
    var operation = getStorageBlobOperation('createBlockBlobFromFile');
    storageOptions.ParallelOperationThreadCount = options.concurrenttaskcount;
    var printer = getSpeedPrinter(summary);
    var intervalId = setInterval(printer, 1000);
    startProgress(tips);
    endProgress();
    try {
      if (blobTypeName.toLowerCase() == 'page') {
        //Upload page blob
        createPageBlobIfNotExists(specifiedContainerName, specifiedBlobName, fsStatus.size, _);
        operation = getStorageBlobOperation('createPageBlobFromFile');
        performStorageOperation(operation, _, specifiedContainerName, specifiedBlobName, specifiedFileName, storageOptions);
      } else {
        //Upload block blob
        operation = getStorageBlobOperation('createBlockBlobFromFile');
        performStorageOperation(operation, _, specifiedContainerName, specifiedBlobName, specifiedFileName, storageOptions);
      }
    } finally {
      printer();
      clearInterval(intervalId);
    }
    showAzureBlob(specifiedContainerName, specifiedBlobName, {}, _);
  }

  /**
  * download storage blob
  */
  function downloadAzureBlob(containerName, blobName, destination, options, _) {
    var params = normalizeParameters({
      destination : [destination, options.destination],
      containerName : [containerName, options.container],
      blobName : [blobName, options.blob]
    });
    var specifiedContainerName = promptIfNotGiven('Container name:', params.values.containerName, _);
    //Default download destination is the current directory.
    var specifiedFileName = params.values.destination || '.';
    var specifiedBlobName = promptIfNotGiven('Blob name:', params.values.blobName, _);
    var dirName = '';
    var fileName = '';
    var isDirectory = false;
    var force = options.quiet;
    if(utils.pathExistsSync(specifiedFileName)) {
      var fsStatus = fs.stat(specifiedFileName, _);
      isDirectory = fsStatus.isDirectory();
    }

    if (isDirectory) {
      dirName = specifiedFileName;
      fileName = '';
    } else {
      fileName = path.basename(specifiedFileName);
      dirName = path.dirname(specifiedFileName);
    }

    if (!utils.fileExists(dirName, _)) {
      throw new Error(util.format('Local directory %s doesn\'t exists.', dirName));
    }

    if (!fileName) {
      fileName = StorageUtil.convertBlobNameToFileName(specifiedBlobName);
    }
    var fullName = path.join(dirName, fileName);
    if (force !== true && utils.fileExists(fullName, _)) {
      if(!confirm(util.format('Do you want to overwrite %s?', fullName), _)) {
        return;
      }
    }
    var tips = util.format('download blob %s in container %s to %s', specifiedBlobName, specifiedContainerName, fullName);
    var storageOptions = getStorageBlobOperationDefaultOption();
    var operation = getStorageBlobOperation('getBlobToFile');
    storageOptions.ParallelOperationThreadCount = options.concurrenttaskcount;
    var summary = new SpeedSummary(specifiedBlobName);
    storageOptions.speedSummary = summary;

    startProgress(tips);
    endProgress();
    var printer = getSpeedPrinter(summary);
    var intervalId = setInterval(printer, 1000);
    try {
      performStorageOperation(operation, _, specifiedContainerName, specifiedBlobName, fullName, storageOptions);
    } catch(e) {
      if(StorageUtil.isNotFoundException(e)) {
        throw new Error(util.format('Can not find blob \'%s\' in container \'%s\'.', specifiedBlobName, specifiedContainerName));
      } else {
        throw e;
      }
    } finally {
      printer();
      clearInterval(intervalId);
    }

    if(options.checkmd5) {
      var calcTips = 'Calculating content md5';
      var blobProperties = {};
      var fileMd5 = '';
      startProgress(calcTips);
      try {
        var propertiesOperation = getStorageBlobOperation('getBlobProperties');
        blobProperties = performStorageOperation(propertiesOperation, _,
          specifiedContainerName, specifiedBlobName, storageOptions);
        fileMd5 = StorageUtil.calculateFileMd5(fullName, _);
      } finally {
        endProgress();
      }

      if(!blobProperties.contentMD5) {
        logger.warn(util.format('Blob contentMd5 is missing, and the local file md5 is %s', fileMd5));
      } else {
        if (blobProperties.contentMD5 == fileMd5) {
          logger.info(util.format('Md5checksum validation passed, and md5checksum is %s', fileMd5));
        } else {
          throw new Error(util.format('Md5checksum validation failed. Blob md5 is %s, but local file md5 is %s', blobProperties.contentMD5, fileMd5));
        }
      }
    }

    showAzureBlob(specifiedContainerName, specifiedBlobName, {}, _);
  }

  /**
  * Create the specified page blob if not exits
  */
  function createPageBlobIfNotExists(container, blob, length, _) {
    var operation = getStorageBlobOperation('createPageBlob');
    var storageOptions = getStorageBlobOperationDefaultOption();
    performStorageOperation(operation, _, container, blob, length, storageOptions);
  }


  /**
  * Get a printer for speed summary
  */
  function getSpeedPrinter(summary) {
    var clearBuffer = new Buffer(80, 'utf8');
    clearBuffer.fill(' ');
    clearBuffer = clearBuffer.toString();
    return function() {
      var tips = util.format('Perecent: %s%% (%s/%s) Speed: %s Time: %s ', summary.getCompletePercent(), summary.getCompleteSize(), summary.getTotalSize(), summary.getAverageSpeed(), summary.getRunningSeconds());
      fs.writeSync(1, '\r' + clearBuffer + '\r');
      process.stdout.write(tips);
    }
  }
};
