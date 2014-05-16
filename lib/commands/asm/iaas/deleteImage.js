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

/**
 * Common code to delete OS or Disk image, possibly with a blob
 */

var util = require('util');
var blobUtils = require('../../../util/blobUtils');
var uploadVMImage = require('./upload/uploadVMImage');


function noop() {}

function deleteImageInternal(apiName, logName, logger, computeManagementClient, diskName, progressEnd, deleteFromStorage, callback) {
  if(apiName === 'Disk') {
    // deleting Data Disk
    computeManagementClient.virtualMachineDisks.deleteDisk(diskName, deleteFromStorage, function(error) {
      progressEnd();
      if (!error) {
        logger.info(logName + ' deleted: ' + diskName);
      } else {
        logger.error(logName + ' not deleted: ' + diskName);
      }
      callback(error);
    });
  } else {
    // deleting OS Image
    computeManagementClient.virtualMachineOSImages.delete(diskName, deleteFromStorage, function(error) {
      progressEnd();
      if (!error) {
        logger.info(logName + ' deleted: ' + diskName);
      } else {
        logger.error(logName + ' not deleted: ' + diskName);
      }
      callback(error);
    });
  }
}

//set blobUrl to null if you don't need to delete disk or image from blob
exports.deleteImage = function deleteImage(apiName, logName, logger, computeManagementClient, diskName, deleteOptions, cliProgress, callback) {
  var msg = util.format('Deleting %s', logName);
  var progressEnd = cliProgress ? cliProgress(msg, logger).end : noop;

  if (!deleteOptions.blobDelete) {
    deleteImageInternal(apiName, logName, logger, computeManagementClient, diskName, progressEnd, false, callback);
    return;
  }

  if (deleteOptions.blobDelete && deleteOptions.blobUrl) {
    // Don't query for it
    // delete image first!
    deleteImageInternal(apiName, logName, logger, computeManagementClient, diskName, progressEnd, false, deleteBlob);
    return;
  }

  if(apiName === 'Disk') {
    // let's get blob url for Data Disk
    computeManagementClient.virtualMachineDisks.getDisk(diskName, function(error, response) {
      if (!error) {
        deleteOptions.blobUrl = response.mediaLinkUri;
        // delete data disk
        deleteImageInternal(apiName, logName, logger, computeManagementClient, diskName, progressEnd, deleteOptions.blobDelete, callback);
      } else {
        progressEnd();
        callback(error);
      }
    });
  }
  else {
     // let's get blob url for OS Image
    computeManagementClient.virtualMachineOSImages.get(diskName, function(error, response) {
      if (!error) {
        deleteOptions.blobUrl = response.mediaLinkUri;
        // delete os image
        deleteImageInternal(apiName, logName, logger, computeManagementClient, diskName, progressEnd, deleteOptions.blobDelete, callback);
      } else {
        progressEnd();
        callback(error);
      }
    });
  }
  
  function deleteBlob(error) {
    if (error) { callback(error); return; }

    deleteOptions.blobUrl = blobUtils.unescape(deleteOptions.blobUrl);
    // sometimes blob contains '//' - an RDFE issue. Workaround: remove - except in protocol
    var split = deleteOptions.blobUrl.split('://');
    var next = split[split.length - 1];
    var prev;
    do {
      prev = next;
      next = next.replace('//', '/');
    } while (next !== prev);
    split[split.length - 1] = next;
    deleteOptions.blobUrl = split.join('://');

    logger.silly('Deleting blob ' + deleteOptions.blobUrl);
    uploadVMImage.deleteBlobFromIaasClient(deleteOptions.blobUrl, computeManagementClient, {logger: logger}, function (error) {
      progressEnd();
      if (error) {
        logger.warn('Warning: couldn\'t delete page blob '+ deleteOptions.blobUrl);
      } else {
        logger.info('Blob deleted: ' + deleteOptions.blobUrl);
      }
      callback(error);
    });
  }
};