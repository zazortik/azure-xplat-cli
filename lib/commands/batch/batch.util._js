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

var __ = require('underscore');
var util = require('util');
var uuid = require('node-uuid');

var profile = require('../../util/profile');
var utils = require('../../util/utils');

var $ = utils.getLocaleString;

var batchUtil = {};

/**
* Module variables
*/
var cli = null;
var logger = null;
var progress = null;
var userAgent = null;
var operationTimeout = null;

/**
* Batch connection string environment variable name
*/
batchUtil.ENV_SDK_ACCOUNT_ENDPOINT = 'AZURE_BATCH_ENDPOINT';
batchUtil.ENV_SDK_ACCOUNT_NAME = 'AZURE_BATCH_ACCOUNT';
batchUtil.ENV_SDK_ACCOUNT_KEY = 'AZURE_BATCH_ACCESS_KEY';

/**
* Init cli module
*/
batchUtil.init = function (azureCli) {
  cli = azureCli;
  logger = cli.output;
  operationTimeout = 30;

  var batch = cli.category('batch');

  Object.getPrototypeOf(batch).appendSubscriptionAndResourceGroupOption = function () {
    this.option('-g, --resource-group <resourceGroup>', $('the resource group name'));
    this.option('-s, --subscription <id>', $('the subscription id'));
    return this;
  }

  Object.getPrototypeOf(batch).appendBatchAccountOption = function () {
    this.option('-a, --account-name <accountName>', $('the batch account name'));
    this.option('-k, --account-key <accountKey>', $('the batch account key'));
    this.option('-u, --account-endpoint <endpointUrlString>', $('the batch connection endpoint'));
    return this;
  }

  Object.getPrototypeOf(batch).appendODataFilterOption = function (select, filter, expand) {
    if (select) {
      this.option('--select-clause <selectClause>', $('the select list'));
    }
    
    if (filter) {
      this.option('--filter-clause <filterClause>', $('the filter expression'));
    }
    
    if (expand) {
      this.option('--expand-clause <expandClause>', $('the expanding level'));
    }
    return this;
  }
};

/**
* Start cli operation progress
*/
batchUtil.startProgress = function (tips) {
  if (progress !== null) {
    batchUtil.endProgress();
  }
  progress = cli.interaction.progress(tips);
};

/**
* End cli operation progress
*/
batchUtil.endProgress = function () {
  if (progress !== null) {
    progress.end();
  }
  progress = null;
};

/**
* Get Batch default operation options
*/
batchUtil.getBatchOperationDefaultOption = function () {
  var option = {};
  batchUtil.setOperationTimeout(option);
  batchUtil.setClientRequestId(option);
  return option;
};

/**
* Set REST operation time out
*/
batchUtil.setOperationTimeout = function (options) {
  if ((options.timeout === undefined) 
      &&  operationTimeout !== null && !isNaN(operationTimeout) && operationTimeout > 0) {
    options.timeout = 30;
  }
};

/**
* Set REST operation client request id
*/
batchUtil.setClientRequestId = function (options) {
  if (options.clientRequestId === undefined) {
    options.clientRequestId = uuid();
    options.returnClientRequestId = true;
  }
};

/**
* Is not found exception
*/
batchUtil.isNotFoundException = function (e) {
  var notFoundErrors = ['NotFound', 'ResourceNotFound', 'PoolNotFound'];
  return notFoundErrors.some(function (error) { return e.body && e.body.code === error; });
};

batchUtil.createBatchManagementClient = function(subscriptionOrName) {
  var client;
  if (__.isString(subscriptionOrName) || !subscriptionOrName) {
    subscriptionOrName = profile.current.getSubscription(subscriptionOrName);
  }
  client = utils.createBatchResourceProviderClient(subscriptionOrName);
  return client;
};

batchUtil.createBatchServiceClient = function(options) {
  var accountName = undefined;
  var accountKey = undefined;
  var accountEndpoint = undefined;
  
  if (options) {
    accountName = options.accountName;
    accountKey = options.accountKey;
    accountEndpoint = options.accountEndpoint;
  }
  
  if (!accountName && !accountKey && !accountEndpoint) {
    accountName = process.env[batchUtil.ENV_SDK_ACCOUNT_NAME];
    accountKey = process.env[batchUtil.ENV_SDK_ACCOUNT_KEY];
    accountEndpoint = process.env[batchUtil.ENV_SDK_ACCOUNT_ENDPOINT];
  }
  
  if (!accountName || !accountKey || !accountEndpoint) {
    throw new Error($('Please specify a Batch account name, access key, and endpoint URL in one of the two following ways:\n 1. Use the --account-name, --account-key, and --account-endpoint parameters.\n 2. Set the AZURE_BATCH_ACCOUNT, AZURE_BATCH_ACCESS_KEY, and AZURE_BATCH_ENDPOINT environment variables.'));
  }
  
  client = utils.createBatchClient(accountName, accountKey, accountEndpoint);
  return client;
};

module.exports = batchUtil;
