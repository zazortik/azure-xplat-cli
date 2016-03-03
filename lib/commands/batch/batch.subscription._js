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
var batchUtil = require('./batch.util');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var batch = cli.category('batch');

  var batchSubscription = batch.category('subscription')
    .description($('Commands to manage Batch options at the subscription level'));

  function listQuotas(batchClient, location, options, _) {
    var quotas = batchClient.subscription.getSubscriptionQuotas(location, options, _);
    return quotas;
  }

  batchSubscription.listQuotasCommand = function (location, options, _) {
    var batchClient = batchUtil.createBatchManagementClient(options.subscription);

    var quotas = listQuotas(batchClient, location, options, _);

    if (quotas) {
      cli.interaction.formatOutput(quotas, function(outputData) {
        log.data($('Account Quota:'), outputData.accountQuota);
      });
    } else {
      log.info($('No quotas retrieved'));
    }
  };

  // Command: azure batch subscription show-quotas
  batchSubscription.command('list-quotas <location>')
    .description($('List the subscription level Batch quotas in the specified region'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(batchSubscription.listQuotasCommand);
};