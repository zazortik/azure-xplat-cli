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

var utils = require('../util/utils');
var util = require('util');
var path = require('path');
var fs = require('fs');
var url = require('url');
var childProcess = require('child_process');
var __ = require('underscore');

var constants = {
  filename: 'serviceFabric.json',
  serviceFabricCodePath: '/opt/microsoft/servicefabric/bin/Fabric/Fabric.Code',
  managedBinariesPath: '/opt/microsoft/servicefabric/bin/Fabric/Fabric.Code',
  azureCliProxyName: 'AzureCliProxy.sh',
  defaultConfig: {
  },
  optionsBase: {
    noRetryPolicy: true,
    requestOptions: {
      // strictSSL: false,
      // rejectUnauthorized: false,
    }
  }
};

// For dev environment
if (process.env.SERVICE_FABRIC_DEVELOPER) {
  constants.serviceFabricCodePath = process.env.SERVICE_FABRIC_CODE_PATH;
  constants.managedBinariesPath = process.env.SERVICE_FABRIC_MANAGED_BINARIES_PATH;
}


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
    fs.access(path.join(constants.managedBinariesPath, constants.azureCliProxyName), fs.F_OK, _);
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
  var fullCommand = path.join(constants.managedBinariesPath, constants.azureCliProxyName) + ' ' + command;
  var processEnv = {LD_LIBRARY_PATH: constants.serviceFabricCodePath, FabricLogRoot: '/tmp'};
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

var enumMap = {
  healthState: {
    Invalid: 0,
    Ok: 1,
    Warning: 2,
    Error: 3,
    Unknown: 65535
  },
  rollingUpgradeMode: {
    Invalid: 0,
    UnmonitoredAuto: 1,
    UnmonitoredManual: 2,
    Monitored: 3
  },
  failureAction: {
    Invalid: 0,
    Rollback: 1,
    Manual: 2
  },
  serviceKind: {
    Invalid: 0,
    Stateless: 1,
    Stateful: 2
  },
  partitionScheme: {
    Invalid: 0,
    Singleton: 1,
    Int64Range: 2,
    Named: 3
  },
  serviceCorrelationScheme: {
    Invalid: 0,
    Affinity: 1,
    AlignedAffinity: 2,
    NonAlignedAffinity: 3
  },
  servicePlacementPolicyType: {
    Invalid: 0,
    InvalidDomain: 1,
    RequireDomain: 2,
    PreferPrimaryDomain: 3,
    RequireDomainDistribution: 4
  }
};

exports.getEnumVal = function (key, val) {
  var keyKeys = Object.keys(enumMap);
  var keyKeysLowerCase = __.map(keyKeys, function (i) { return i.toLowerCase(); });
  var keyIndex = keyKeysLowerCase.indexOf(key.toLowerCase());
  if (keyIndex < 0) {
    throw util.format('Key %s not found.', key);
  }
  var valKeys = Object.keys(enumMap[keyKeys[keyIndex]]);
  var valKeysLowerCase = __.map(valKeys, function (i) { return i.toLowerCase(); });
  var valIndex = valKeysLowerCase.indexOf(val.toLowerCase());
  if (valIndex < 0) {
    throw util.format('Key %s val %s not found.', key, val);
  }
  return enumMap[keyKeys[keyIndex]][valKeys[valIndex]];
};

var enumValPrefixes = [
    'FABRIC_OPERATION_TYPE_',
    'FABRIC_SERVICE_PARTITION_ACCESS_STATUS_',
    'FABRIC_REPLICA_SET_',
    'FABRIC_PARTITION_KEY_TYPE_',
    'FABRIC_SERVICE_PARTITION_KIND_',
    'FABRIC_SERVICE_LOAD_METRIC_WEIGHT_',
    'FABRIC_SERVICE_CORRELATION_SCHEME_',
    'FABRIC_FAULT_TYPE_',
    'FABRIC_NODE_DEACTIVATION_INTENT_',
    'FABRIC_SERVICE_DESCRIPTION_KIND_',
    'FABRIC_PARTITION_SCHEME_',
    'FABRIC_PROPERTY_TYPE_',
    'FABRIC_PROPERTY_BATCH_OPERATION_KIND_',
    'FABRIC_QUERY_SERVICE_OPERATION_NAME_',
    'FABRIC_QUERY_REPLICATOR_OPERATION_NAME_',
    'FABRIC_SERVICE_KIND_'
  ];

exports.setEnumVal = function (data) {
  if (data instanceof Array) {
    data.forEach(function (element) {
      exports.setEnumVal(element);
    });
  }
  else if (data instanceof Object) {
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        if (typeof data[key] === 'string' || data[key] instanceof String) {
          enumValPrefixes.forEach(function (prefix) {
            if (data[key].startsWith(prefix)) {
              var temp = data[key].substring(prefix.length);
              temp = temp.replace('_', ' ');
              temp = temp.charAt(0).toUpperCase() + temp.slice(1).toLowerCase();
              data[key] = temp;
            }
          });
        }
        else if (data[key] instanceof Object) {
          exports.setEnumVal(data[key]);
        }
      }
    }
  }
};

exports.setApplicationEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setClusterEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setNodeEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setPackageEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setPartitionEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setReplicaEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setServiceEnumVal = function (data) {
  exports.setEnumVal(data);
};

exports.setServiceGroupEnumVal = function (data) {
  exports.setEnumVal(data);
};
