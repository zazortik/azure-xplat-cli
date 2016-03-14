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

var util = require('util');
var commander = require('commander');
var batchUtil = require('./batch.util');
var utils = require('../../util/utils');
var validation = require('../../util/validation');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch job command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch job command usage
  */
  var batch = cli.category('batch');

  var job = batch.category('job').description($('Commands to manage your Batch jobs'));

  var logger = cli.output;

  var interaction = cli.interaction;

};
