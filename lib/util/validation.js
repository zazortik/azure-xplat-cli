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

var _ = require('underscore');
var check = require('validator');

var util = require('util');
var azureutil = require('./utils');

exports.isValidEnumValue = function(value, list) {
  if (!list.some(function (current) {
    return current.toLowerCase() === value.toLowerCase();
  })) {
    throw new Error(util.format('Invalid value: %s. Options are: %s.', value, list));
  }
};

exports.isURL = function (uri) {
  return (azureutil.stringStartsWith(uri, 'http://') ||
    azureutil.stringStartsWith(uri, 'https://')) &&
    check.isURL(uri);
};

exports.isIP = function (uri) {
  if (azureutil.stringStartsWith(uri, 'http://') || azureutil.stringStartsWith(uri, 'https://')) {
    uri = uri.substring(uri.indexOf('/') + 2);    
  }
  return check.isIP(uri);
};

/**
* Creates a anonymous function that check if the given uri is valid or not.
*
* @param {string} uri The uri to validate.
* @return {function}
*/
exports.isValidUri = function (uri) {
  if (!check.isURL(uri)){
    throw new Error('The provided URI "' + uri + '" is invalid.');
  }
  return true;
};

/**
* Creates a anonymous function that check if the given value is an integer or a string that can be parsed into integer
*
* @param {object} value The value to validate.
*/
exports.isInt = function (value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
};

/**
* Creates a anonymous function that check if the given string is a valid datetime.
*
* @param {string} stringDateTime The datetime string.
* @return {Date}
*/
exports.parseDateTime = function (stringDateTime) {
  try {
    return new Date(stringDateTime);
  } catch (e) {
    throw new Error($('The date format is incorrect'));
  }
};