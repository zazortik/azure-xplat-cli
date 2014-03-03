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
