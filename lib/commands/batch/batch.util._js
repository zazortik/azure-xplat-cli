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

var profile = require('../../util/profile');
var utils = require('../../util/utils');

var $ = utils.getLocaleString;

var batchUtil = {};

batchUtil.createBatchManagementClient = function(subscriptionOrName) {
  var client;
  if (__.isString(subscriptionOrName) || !subscriptionOrName) {
    subscriptionOrName = profile.current.getSubscription(subscriptionOrName);
  }
  client = utils.createBatchResourceProviderClient(subscriptionOrName);
  return client;
};

module.exports = batchUtil;
