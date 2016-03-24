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
  serviceFabricCodePath: '/home/jeffrey/Desktop/WindowsFabric/build.prod/lib',//'/opt/microsoft/servicefabric/bin/Fabric/Fabric.Code',
  managedPath: path.resolve(__dirname, '../../../..', 'FabricManagedRefs'),
  defaultConfig: {
    noRetryPolicy: true
  },
  optionsBase: {
    requestOptions: {
      // strictSSL: false
      // rejectUnauthorized: false,
    }
  }
};


exports.writeConfigFile = function (data, _) {
  var base = __.clone(constants.defaultConfig);
  data = __.extend(base, data);
  var filePath = path.join(utils.azureDir(), constants.filename);
  fs.writeFile(filePath, JSON.stringify(data, null, 2), _);
};

exports.isFileExist = function (filePath, _) {
  try {
    fs.access(filePath, fs.F_OK, _);
    return true;
  }
  catch (e) {
    return false;
  }
};

exports.readConfigFile = function (_) {
  var filePath = path.join(utils.azureDir(), constants.filename);
  var dataString = fs.readFile(filePath, _);
  var base = __.clone(constants.defaultConfig);
  var data = JSON.parse(dataString);
  return __.extend(base, data);
};

exports.isValidFabricUrl = function (urlString, _) {
  var urlObj = url.parse(urlString);
  if (!urlObj.protocol || !urlObj.pathname) {
    return false;
  }
  return true;
};

exports.isSubPath = function (parent, child, _) {
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  if (!exports.isValidFabricUrl(parent, _)) {
    throw util.format('Invalid url %s', parent); 
  }
  if (!exports.isValidFabricUrl(child, _)) {
    throw util.format('Invalid url %s', child); 
  }
  if (parent.charAt(parent.length - 1) == '/') {
    parent = parent.subString(0, parent.length - 1);
  }
  if (child.charAt(child.length - 1) == '/') {
    child = child.subString(0, child.length - 1);
  }
  if (!child.startsWith(parent)) {
    return false;
  }
  if (child.length == parent.length) {
    return false;
  }
  if (child.charAt(parent.length) != '/') {
    return false;
  }
  return true;
};

exports.parseUrl = function (urlString, _) {
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  if (urlString === null || urlString === undefined || urlString === '') {
    return urlString;
  }
  if (!exports.isValidFabricUrl(urlString, _)) {
    throw util.format('Invalid url %s', urlString);
  }
  var urlObj = url.parse(urlString);
  return urlObj.pathname.replace(/^\//, '');
};

exports.getOptions = function (_) {
  var options = __.clone(constants.optionsBase);
  var config = exports.readConfigFile(_);
  if (config.caCertPath) {
    if (!options.requestOptions) options.requestOptions = {};
    options.requestOptions.ca = fs.readFile(config.caCertPath, _);
  }
  if (config.clientKeyPath && config.clientCertPath) {
    if (!options.requestOptions) options.requestOptions = {};
    options.requestOptions.key = fs.readFile(config.clientKeyPath, _);
    options.requestOptions.cert = fs.readFile(config.clientCertPath, _);
  }
  return options;
};

exports.readServiceFabricConfig = function (progress, _) {
  if (!exports.isFileExist(path.join(utils.azureDir(), constants.filename), _)) {
    progress.end();
    throw 'Cannot read servicefabric config file. You are either not connected or having corrupted config file.';
  }
  fs.access(path.join(utils.azureDir(), constants.filename), fs.F_OK, _);
  return exports.readConfigFile(_);
};

exports.createConnectionUrl = function (config, _) {
  if (!config.connectionEndpoint) {
    return null;
  }
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  var urlObj = url.parse(config.connectionEndpoint);
  return url.format(urlObj);
};

exports.isServiceFabricInstalled = function (_) {
  if (false) {// workaround for jslint false alarm
    console.log(_);
  }
  try {
    fs.access(path.join(constants.managedPath, 'AzureCliProxy.exe'), fs.F_OK, _);
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
  var processEnv = {MONO_LOG_LEVEL: 'error', LD_LIBRARY_PATH: constants.serviceFabricCodePath};
  console.log('Running ' + fullCommand);
  console.log(processEnv);
  
  return childProcess.exec(fullCommand, {env: processEnv}, _);
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
