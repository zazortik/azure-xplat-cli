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

var utils = require('../../../util/utils');
var path = require('path');
var fs = require('fs');
var url = require('url');

var constants = {
  filename: 'servicefabric.json'
};

exports.writeConfigFile = function (data, _) {
  var filePath = path.join(utils.azureDir(), constants.filename);
  fs.writeFile(filePath, JSON.stringify(data, null, 2), _);
};

exports.readConfigFile = function (_) {
  var filePath = path.join(utils.azureDir(), constants.filename);
  var dataString = fs.readFile(filePath, _);
  return JSON.parse(dataString);
};

exports.parseUrl = function (urlString, _) {
  if (urlString === null || urlString === undefined || urlString === '') {
    return urlString;
  }
  var urlObj = url.parse(urlString);
  return urlObj.pathname.replace(/^\//, '');
};

exports.readServiceFabricConfig = function (progress, _) {
  var data = null;
  try {
    var err = fs.access(path.join(utils.azureDir(), constants.filename), fs.F_OK, _);
    if (!err) {
      data = exports.readConfigFile(_);
    }
    else {
      return {};
    }
  }
  catch (err) {
    var errMessage = 'Cannot read servicefabric config file. You are either not connected or having corrupted config file.';
    progress.end();
    throw errMessage;
  }
  return data;
};