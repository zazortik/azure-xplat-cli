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
var batchUtil = require('./batch.util');

var $ = utils.getLocaleString;

var batchShowUtil = {};
var nameLength = 32;
var UTCFormat = 'YYYY-MM-DDTHH:MI:SSZ';

batchShowUtil.showNameValue = function (name, value, discardNullValue, output, indent) {
  var key;
  if (value) {
    key = _spaces(indent) + name;
    key += _spaces(nameLength - key.length);
    output(key + ': ' + value);
  } else if (!discardNullValue) {
    key = _spaces(indent) + name;
    key += _spaces(nameLength - key.length);
    output(key + ': ' + '""');
  }
};

batchShowUtil.showKvPairs = function (title, kvPairs, output, indent) {
  for (var key in kvPairs) {
    if (kvPairs.hasOwnProperty(key)) {
      if (kvPairs[key]) {
        batchShowUtil.showNameValue(title, key + ' ' + kvPairs[key], true, output, indent);
      }
    }
  }
}

batchShowUtil.showHeader = function (header, newline, output, indent) {
  if (newline) {
    output('');
  }
  output(_spaces(indent) + header);
};

function _spaces(count) {
  var space = '';
  for (var i = 0; i < count; i++) {
    space += ' ';
  }

  return space;
}

batchShowUtil.showBatchAccount = function(account, output) {
  if (!account) {
    return;
  }

  var indent = 0;
  var showNameValue = batchShowUtil.showNameValue;

  showNameValue($('Name'), account.name, true, output, indent);
  showNameValue($('URL'), account.id, true, output, indent);
  showNameValue($('Resource Group'), batchUtil.parseResourceGroupNameFromId(account.id), true, output, indent);
  showNameValue($('Location'), account.location, true, output, indent);
  showNameValue($('Endpoint'), 'https://' + account.properties.accountEndpoint, true, output, indent);
  showNameValue($('Provisioning State'), account.properties.provisioningState, true, output, indent);
  showNameValue($('Core Quota'), account.properties.coreQuota, true, output, indent);
  showNameValue($('Pool Quota'), account.properties.poolQuota, true, output, indent);
  showNameValue($('Active Job and Job Schedule Quota'), account.properties.activeJobAndJobScheduleQuota, true, output, indent);
  if (account.tags) {
    batchShowUtil.showKvPairs($('Tags'), account.tags, output, indent);
  }
  batchShowUtil.showAutoStorage(account.properties.autoStorage, output, indent);
}

batchShowUtil.showAutoStorage = function(autoStorage, output) {
  if (!autoStorage) {
    return;
  }

  var indent = 0;
  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Auto Storage'), false, output, indent);
  indent += 2;
  showNameValue($('Account Id'), autoStorage.storageAccountId, true, output, indent);
  showNameValue($('Last Key Sync'), autoStorage.lastKeySync.toUTCFormat(UTCFormat), true, output, indent);
}

batchShowUtil.showCloudJobSchedule = function(jobSchedule, output) {
  if (!jobSchedule) {
    return;
  }

  var indent = 0;
  var showNameValue = batchShowUtil.showNameValue;

  showNameValue($('Id'), jobSchedule.id, true, output, indent);
  showNameValue($('State'), jobSchedule.state, true, output, indent);
  showNameValue($('Creation Time'), jobSchedule.creationTime.toUTCFormat(UTCFormat), true, output, indent);
  batchShowUtil.showJobSpecification(jobSchedule.jobSpecification, output, indent);
  batchShowUtil.showSchedule(jobSchedule.schedule, output, indent);
}

batchShowUtil.showSchedule = function(schedule, output, indent) {
  if (!schedule) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Schedule'), false, output, indent);
  indent += 2;
  if (schedule.doNotRunUntil) {
    showNameValue($('Do Not Run Until'), schedule.doNotRunUntil.toUTCFormat(UTCFormat), true, output, indent);
  }
  if (schedule.doNotRunAfter) {
    showNameValue($('Do Not Run After'), schedule.doNotRunAfter.toUTCFormat(UTCFormat), true, output, indent);
  }
  showNameValue($('Start Window'), schedule.startWindow, true, output, indent);
  showNameValue($('Recurrence Interval'), schedule.recurrenceInterval, true, output, indent);
}

batchShowUtil.showJobSpecification = function(jobSpec, output, indent) {
  if (!jobSpec) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Job Specification'), false, output, indent);
  indent += 2;
  showNameValue($('Priority'), jobSpec.priority, true, output, indent);
  batchShowUtil.showPoolInformation(jobSpec.poolInfo, output, indent);
}

batchShowUtil.showPoolInformation = function(poolInfo, output, indent) {
  if (!poolInfo) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Pool Information'), false, output, indent);
  indent += 2;
  if (poolInfo.poolId) {
    showNameValue($('Pool Id'), poolInfo.poolId, true, output, indent);
  } else {
    batchShowUtil.showAutoPoolSpecification(poolInfo.autoPoolSpecification, output, indent);
  }
}

batchShowUtil.showAutoPoolSpecification = function(autoPoolSpec, output, indent) {
  if (!autoPoolSpec) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Auto Pool Specification'), false, output, indent);
  indent += 2;
  showNameValue($('Auto Pool Id Prefix'), autoPoolSpec.autoPoolIdPrefix, true, output, indent);
  showNameValue($('Keep Alive'), autoPoolSpec.keepAlive, true, output, indent);
  showNameValue($('Pool Lifetime Option'), autoPoolSpec.poolLifetimeOption, true, output, indent);
  batchShowUtil.showPoolSpecification(autoPoolSpec.pool, output, indent);
}

batchShowUtil.showPoolSpecification = function(poolSpec, output, indent) {
  if (!poolSpec) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Pool Specification'), false, output, indent);
  indent += 2;
  showNameValue($('VM Size'), poolSpec.vmSize, true, output, indent);
}

module.exports = batchShowUtil;
