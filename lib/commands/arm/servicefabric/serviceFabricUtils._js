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
var util = require('util');
var path = require('path');
var fs = require('fs');
var url = require('url');
var childProcess = require('child_process');
var __ = require('underscore');

var constants = {
  filename: 'serviceFabric.json',
  serviceFabricCodePath: '/opt/microsoft/servicefabric/bin/Fabric/Fabric.Code',
  managedPath: '/opt/microsoft/servicefabric/bin/Fabric/Fabric.Code',
  defaultConfig: {
    noRetryPolicy: true
  }
};


exports.writeConfigFile = function (data, _) {
  var base = __.clone(constants.defaultConfig);
  data = __.extend(base, data);
  var filePath = path.join(utils.azureDir(), constants.filename);
  fs.writeFile(filePath, JSON.stringify(data, null, 2), _);
};

exports.readConfigFile = function (_) {
  var filePath = path.join(utils.azureDir(), constants.filename);
  var dataString = fs.readFile(filePath, _);
  var base = __.clone(constants.defaultConfig);
  var data = JSON.parse(dataString);
  return __.extend(base, data);
};

exports.parseUrl = function (urlString, _) {
  if (urlString === null || urlString === undefined || urlString === '') {
    return urlString;
  }
  if (false) {// workaround for jslint false alarm
    console.log(_);
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
      console.log('You have not made a connection.');
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

exports.createConnectionUrl = function (config, _) {
  if (!config.connectionEndpoint) {
    return null;
  }
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  var urlObj = url.parse('http://' + config.connectionEndpoint);
  return url.format(urlObj);
};

exports.isServiceFabricInstalled = function (_) {
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  try {
    fs.access(constants.serviceFabricCodePath, fs.F_OK, _);
  }
  catch (err) {
    return false;
  }
  return true;
};

exports.runChildProcess = function (command, _) {
  if (!exports.isServiceFabricInstalled(_)) {
    var errMessage = 'Service Fabric SDK is not installed, please install Service Fabric SDK for full feature.';
    throw errMessage;
  }
  var fullCommand = 'mono ' + path.join(constants.managedPath, 'AzureCliProxy.exe') + ' ' + command;
  return childProcess.exec(fullCommand, {env: {'LD_LIBRARY_PATH': constants.serviceFabricCodePath, 'FabricConfigFileName': path.join(constants.serviceFabricCodePath, 'AzureCliProxy.cfg')}}, _);
};

exports.pick = function (obj, keys, _) {
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  keys = keys.split(',');
  if (Array.isArray(obj)) {
    return __.map(obj, function (item) {
      return __.pick(item, keys);
    });
  }
  else {
    return __.pick(obj, keys);
  }
};

