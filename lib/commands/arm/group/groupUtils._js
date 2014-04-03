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

'use strict';

var fs = require('fs');
var path = require('path');
var azure = require('azure');
var through = require('through');
var util = require('util');

var knownLocations = require('../location/knownLocations');
var validation = require('../../../util/validation');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

/**
* Validate that a given location is valid for group creation
* and prompts for location if not valid or not given.
*
* @param {string} location location requested
* @param {object} log object to print messages to user
* @param {object} interaction the interactor object to prompt with
* @param {function} callback callback received either error or final location
*/
exports.validateLocation = function validateLocation(location, log, interaction, callback) {
  var validLocations = knownLocations.getValidLocationsOfResourceGroup();

  if (location && validLocations.some(function (l) { return utils.ignoreCaseEquals(l, location); })) {
    return callback(null, location);
  }

  if (location) {
    log.info(util.format($('The location %s is not valid'), location));
  }

  log.info($('Choose location: '));
  interaction.choose(validLocations, function (err, locationIndex) {
    callback(err, validLocations[locationIndex]);
  });
};

exports.getGroup = function getGroup(client, name, callback) {
  client.resourceGroups.get(name, function (err, group) {
    if (err) {
      // 404 means doesn't exist
      if (err.statusCode === 404) {
        callback(null, null);
      } else {
      // some other error, let it out
        callback(err);
      }
    } else {
      // No error, group exists
      callback(null, group.resourceGroup);
    }
  });
};

exports.getResource = function getResource(client, resourceGroup, identity, callback) {
  client.resources.get(resourceGroup, identity, function (err, resource) {
    if (err) {
      // 404 means doesn't exist
      if (err.statusCode === 404) {
        callback(null, null);
      } else {
      // some other error, let it out
        callback(err);
      }
    } else {
      // No error, resource exists
      callback(null, resource.resource);
    }
  });
};

var deploymentTemplateStorageContainerName = 'deployment-templates';

exports.createDeployment = function (cli, resourceGroup, name, options, _) {
  var subscription = profile.current.getSubscription(options.subscription);
  var client = subscription.createResourceClient('createResourceManagementClient');

  var templateParameters = createDeploymentParameters(cli, subscription, resourceGroup, options, _);

  //if not provided, derive it from the template file name
  if (!name) {
    var templateName = options.galleryTemplate || options.templateFile || options.templateUri;
    var baseTemplateName = path.basename(templateName);
    //if the file extension is '.json', get rid of it.
    if (utils.stringEndsWith(baseTemplateName, '.json', true)){
      baseTemplateName = path.basename(baseTemplateName, path.extname(baseTemplateName));
    }
    name = baseTemplateName;
  }

  var deploymentObject = cli.interaction.withProgress($('Creating a deployment'),
    function (log, _) {
      client.deployments.validate(resourceGroup, name, templateParameters, _);
      return client.deployments.createOrUpdate(resourceGroup, name, templateParameters, _);
    }, _);

  cli.output.info(util.format($('Created template deployment "%s"'), name));
  return deploymentObject;
};

exports.validateTemplate = function (cli, resourceGroup, options, _) {
  var subscription = profile.current.getSubscription(options.subscription);
  var client = subscription.createResourceClient('createResourceManagementClient');

  var templateParameters = createDeploymentParameters(cli, subscription, resourceGroup, options, _);

  return cli.interaction.withProgress($('Validating the template'),
    function (log, _) {
      return client.deployments.validate(resourceGroup, 'fakedDeploymentName', templateParameters, _);
    }, _);
};

exports.getTemplateUri = function (subscription, templateFile, galleryTemplateName, storageAccountName, _) {
  var templateFileUri;

  if (templateFile) {
    if (validation.isURL(templateFile)) {
      templateFileUri = templateFile;
    } else {
      var storageClient = utils._createStorageClient(subscription);
      var keys = storageClient.storageAccounts.getKeys(storageAccountName, _);
      var storageAccount = storageClient.storageAccounts.get(storageAccountName, _).storageAccount;

      var blobService = azure.createBlobService(storageAccountName, keys.primaryKey, storageAccount.properties.endpoints[0]);

      try {
        blobService.createContainer(deploymentTemplateStorageContainerName, {
          publicAccessLevel: azure.Constants.BlobConstants.BlobContainerPublicAccessType.BLOB
        }, _);
      } catch (e) {
        if (e.statusCode !== 409) {
          // Don't throw if container already exists
          throw e;
        }
      }

      var blobName = process.env.ARM_TEST_BLOB_NAME || new Date().toISOString().split('.')[0]
            .replace(/-/g, '')
            .replace(/_/g, '')
            .replace(/:/g, '');

      blobService
          .createBlockBlobFromFile(deploymentTemplateStorageContainerName,
            blobName, templateFile,_);

      templateFileUri = blobService.getBlobUrl(deploymentTemplateStorageContainerName, blobName, {
        AccessPolicy: {
          Permissions: azure.Constants.BlobConstants.SharedAccessPermissions.READ,
          Expiry: azure.date.hoursFromNow(24)
        }
      });
    }
  } else if (galleryTemplateName) {
    templateFileUri = exports.getGalleryTemplateFile(subscription, galleryTemplateName, _);
  }

  return templateFileUri;
};

exports.getGalleryTemplateFile = function (subscription, galleryTemplateName, _) {
  var galleryClient = utils.createClient('createGalleryClient', new azure.AnonymousCloudCredentials(),
    subscription.galleryEndpointUrl);
  var galleryItem = galleryClient.items.get(galleryTemplateName, _).item;
  return exports.getTemplateDownloadUrl(galleryItem);
};

exports.getTemplateDownloadUrl = function getTemplateDownloadUrl(templateData) {
  var key = templateData.definitionTemplates.defaultDeploymentTemplateId;
  var urls = Object.keys(templateData.definitionTemplates.deploymentTemplateFileUrls)
    .filter(function (url) { return utils.ignoreCaseEquals(key, url); });

  if (urls.length === 0) {
    throw new Error($('Error in template, the key %s is not found in deploymentTemplateFileUrls'));
  }

  return templateData.definitionTemplates.deploymentTemplateFileUrls[urls[0]];
};

exports.normalizeDownloadFileName = function normalizeDownloadFileName(name, file, quiet, confirmer, callback) {
  name = name + '.json';
  var downloadFile = path.resolve(file || name);

  function ensureDirExists(dirname) {
    if (!dirname) {
      return;
    }

    if (utils.pathExistsSync(dirname)) {
      if (!fs.statSync(dirname).isDirectory()) {
        throw new Error(util.format($('Path %s already exists and is not a directory.'), dirname));
      }
      return;
    }

    ensureDirExists(path.dirname(dirname));

    fs.mkdirSync(dirname);
  }

  function normalizeFile() {
    try {
      ensureDirExists(path.dirname(downloadFile));
      if (utils.pathExistsSync(downloadFile) && !quiet) {
        confirmer(
          util.format($('The file %s already exists. Overwrite? [y/n]: '), downloadFile),
            function (confirmed) {
              if (confirmed) {
                callback(null, downloadFile);
              } else {
                callback(null, null);
              }
            }
        );
      } else {
        callback(null, downloadFile);
      }
    } catch(ex) {
      callback(ex);
    }
  }

  function normalizeDirectory() {
    downloadFile = path.join(downloadFile, name);
    normalizeFile();
  }

  if (utils.pathExistsSync(downloadFile) && fs.statSync(downloadFile).isDirectory()) {
    normalizeDirectory();
  } else {
    normalizeFile();
  }
};

function createDeploymentParameters(cli, subscription, resourceGroup, options, _) {
  var templateOptions = [options.galleryTemplate, options.templateFile, options.templateUri];
  var templateOptionsProvided = templateOptions.filter(function(value) { return value !== undefined; }).length;
  if (templateOptionsProvided > 1) {
    throw new Error($('Specify exactly one of the --gallery-template, --template-file, or template-uri options.'));
  } else if (templateOptionsProvided === 0) {
    throw new Error($('One of the --gallery-template, --template-file, or --template-uri options is required.'));
  }

  if (options.parameters && options.parametersFile) {
    throw new Error($('Either --parameters or --parameters-file need to be specified. Not both.'));
  }

  var deploymentParameters;
  if (options.parametersFile) {
    var jsonFile = fs.readFileSync(options.parametersFile, 'utf8');
    deploymentParameters = JSON.parse(utils.stripBOM(jsonFile));
  } else if (options.parameters) {
    deploymentParameters = JSON.parse(options.parameters);
  }

  var templateParameters;
  cli.interaction.withProgress($('Initializing template configurations and parameters'),
    function (log, _) {

      var templateUri = options.templateUri;
      if (!templateUri) {
        templateUri = exports.getTemplateUri(subscription,
          options.templateFile,
          options.galleryTemplate,
          options.storageAccount, _);
      }

      templateParameters = {
        mode: 'Incremental',
        templateLink: {
          uri: templateUri
        }
      };

      if (deploymentParameters) {
        templateParameters.parameters = deploymentParameters;

        if (options.parametersHash) {
          templateParameters.parameters.contentHash = {
            value: options.parametersHash
          };

          if (options.parametersHashAlgorithm) {
            templateParameters.parameters.contentHash.algorithm = options.parametersHashAlgorithm;
          }
        }

        if (options.parametersVersion) {
          templateParameters.parameters.contentVersion = options.parametersVersion;
        }
      }

      if (options.templateHash) {
        templateParameters.templateLink = {
          contentHash: {
            value: options.templateHash
          }
        };

        if (options.templateHashAlgorithm) {
          templateParameters.templateLink.contentHash.algorithm = options.templateHashAlgorithm;
        }
      }

      if (options.templateVersion) {
        if (!options.templateVersion) {
          templateParameters = {};
        }

        templateParameters.templateLink.contentVersion = options.templateVersion;
      }
    }, _);
  return templateParameters;
}


var eventRetentionPeriodMS = 89 * 24 * 60 * 60 * 1000; // 89 days in milliseconds

function getDeploymentLogs(subscription, correlationId) {
  var output = through();
  var client = subscription.createResourceClient('createEventsClient');
  client.eventData.listEventsForCorrelationId({
    correlationId: correlationId,
    startTime: new Date(Date.now() - eventRetentionPeriodMS),
    endTime: new Date()
  }, function (err, response) {
    if (err) {
      return output.emit('error', err);
    }
    response.eventDataCollection.value.forEach(function (e) {
      output.queue(e);
    });
    output.end();
  });
  return output;
}

exports.getAllEvents = function (subscription, groupName) {
  var output = through();
  var client = subscription.createResourceClient('createEventsClient');

  client.eventData.listEventsForResourceGroup({
    resourceGroupName: groupName,
    startTime: new Date(Date.now() - eventRetentionPeriodMS),
    endTime: new Date()
  }, function (err, response) {
    if (err) {
      return output.emit('error', err);
    }

    response.eventDataCollection.value.forEach(function (e) {
      output.queue(e);
    });
    output.end();
  });
  return output;
};

exports.getDeploymentLog = function (subscription, name, deploymentName) {
  var output = through();
  var client = subscription.createResourceClient('createResourceManagementClient');

  client.deployments.get(name, deploymentName, function (err, result) {
    if (err) {
      output.emit('error', err);
    }
    getDeploymentLogs(subscription, result.deployment.properties.correlationId).pipe(output);
  });
  return output;
};

exports.getLastDeploymentLog = function (subscription, name) {
  var output = through();
  var client = subscription.createResourceClient('createResourceManagementClient');

  client.deployments.list(name, { top: 1 }, function (err, response) {
    if (err) { return output.emit('error', err); }
    if (response.deployments.length === 0) {
      output.emit('error', new Error($('Deployment not found')));
    }
    getDeploymentLogs(subscription, response.deployments[0].properties.correlationId).pipe(output);
  });
  return output;
};

