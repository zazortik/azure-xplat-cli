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

//
// Logging infrastructure for xplat CLI tests
//
var fs = require('fs');
var path  = require('path');
var util = require('util');
var exports = module.exports;
var testLogDir = path.resolve(__dirname, '..', 'output');
var testLogFile = '';
var currentTest = '';

//provides the log directory where the test logs would reside 
function getLogDir() {
  if(!fs.existsSync(testLogDir)) {
    fs.mkdirSync(testLogDir);
  }
  return testLogDir;
};

//creates the log file if it has not been created
function createLogFile() {
  testLogFile = getLogDir() + '/test_log_' + getTimeStamp() + '.log';
  if(!fs.existsSync(testLogFile)) {
    fs.writeFileSync(testLogFile,"");
  }
  return testLogFile;
}

//appends the content to the log file
function appendContent(content) {
  if(!fs.existsSync(testLogFile)) {
    createLogFile();
  }
  fs.appendFileSync(testLogFile, content);
}

//provides current time in custom format that will be used in naming log files
//example '2014_8_20_15_11_13'
function getTimeStamp() {
  var now = new Date();
  var dArray = [now.getFullYear(), now.getMonth() + 1, now. getDate(), now.getHours(), now.getMinutes(), now.getSeconds()];
  return dArray.join("_");
}

/**
 * Provides the log file path where test logs would be stored
 *
 * @return {string} test log file path
 */
exports.getLogFilePath = function() {
  if(!testLogFile) {
    return createLogFile();
  }
  else {
    return testLogFile;
  }
};
/**
 * Logs the data
 *
 * @param {Object}   data    Data to be logged
 */
exports.logData = function(data) {
  var content;
  if (typeof(data) === 'undefined') {
    content = '\n';
  }
  else {
    content = util.inspect(data, {depth: null}) + '\n';
  }
  appendContent(content);
};

/**
 * Logs the error information
 *
 * @param {Object}   err    Error to be logged
 */
exports.logError = function(err) {
  var content = '\n' + (new Date()) + ':\n' + util.inspect(err, {depth: null}) + '\n';
  if(err.stack) {
    content += util.inspect(err.stack, {depth: null}) + '\n';
  }
  appendContent(content);
};

exports.setCurrentTest = function(test) {
  currentTest = test;
};


exports.getCurrentTest = function() {
  return currentTest;
};
