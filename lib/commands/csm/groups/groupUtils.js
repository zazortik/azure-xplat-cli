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
var util = require('util');
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
  // TODO: We currently don't have a way to query the server for
  // valid group locations, so hard coded to what the test cluster
  // allows.

  var validLocations = ['South Central US', 'West Europe'];

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

exports.groupExists = function groupExists(client, name, callback) {
  client.resourceGroups.get(name, function (err) {
    if (err) {
      // 404 means doesn't exist
      if (err.statusCode === 404) {
        callback(null, false);
      } else {
      // some other error, let it out
        callback(err);
      }
    } else {
      // No error, group exists
      callback(null, true);
    }
  });
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
