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
  if (typeof value !== 'undefined' && value !== null) {
    key = _spaces(indent) + name;
    key += _spaces(nameLength - key.length);
    output.data(key + ': ' + value);
  } else if (!discardNullValue) {
    key = _spaces(indent) + name;
    key += _spaces(nameLength - key.length);
    output.data(key + ': ' + '""');
  }
};

batchShowUtil.showKvPairs = function (title, kvPairs, output, indent) {
  if (!kvPairs) {
    return;
  }

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
    output.data('');
  }
  output.data(_spaces(indent) + header);
};

function _spaces(count) {
  var space = '';
  for (var i = 0; i < count; i++) {
    space += ' ';
  }

  return space;
}

/**********************************************
 * Show utilities
 **********************************************/


batchShowUtil.showBatchAccount = function(account, output) {
  if (!account) {
    return;
  }

  if (output.format().json) {
    output.json(account);
    return;
  }

  var indent = 0;
  var showNameValue = batchShowUtil.showNameValue;

  showNameValue($('Name'), account.name, true, output, indent);
  showNameValue($('URL'), account.id, true, output, indent);
  showNameValue($('Resource Group'), batchUtil.parseResourceGroupNameFromId(account.id), true, output, indent);
  showNameValue($('Location'), account.location, true, output, indent);
  showNameValue($('Endpoint'), 'https://' + account.accountEndpoint, true, output, indent);
  showNameValue($('Provisioning State'), account.provisioningState, true, output, indent);
  showNameValue($('Core Quota'), account.coreQuota, true, output, indent);
  showNameValue($('Pool Quota'), account.poolQuota, true, output, indent);
  showNameValue($('Active Job and Job Schedule Quota'), account.activeJobAndJobScheduleQuota, true, output, indent);
  if (account.tags) {
    batchShowUtil.showKvPairs($('Tags'), account.tags, output, indent);
  }
  batchShowUtil.showAutoStorage(account.autoStorage, output, indent);
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

  if (output.format().json) {
    output.json(jobSchedule);
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

batchShowUtil.showResizeError = function(resizeError, output, indent) {
  if (!resizeError) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Resize Error'), false, output, indent);
  indent += 2;
  showNameValue($('Code'), resizeError.code, true, output, indent);
  showNameValue($('Message'), resizeError.message, true, output, indent);
  batchShowUtil.showKvPairs($('Details'), resizeError.values, output, indent);
}

batchShowUtil.showAutoScaleRun = function(autoRun, output, indent) {
  if (!autoRun) {
    return;
  }

  if (output.format().json) {
    output.json(autoRun);
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('AutoScale Run'), false, output, indent);
  indent += 2;
  showNameValue($('Time Stamp'), autoRun.timestamp, true, output, indent);
  showNameValue($('Results'), autoRun.results, true, output, indent);
  batchShowUtil.showResizeError(autoRun.resizeError, output, indent);
}

batchShowUtil.showStartTask = function(startTask, output, indent) {
  if (!startTask) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Start Task'), false, output, indent);
  indent += 2;
  showNameValue($('Command Line'), startTask.commandLine, true, output, indent);
  showNameValue($('Run Elevated'), startTask.runElevated, true, output, indent);
  showNameValue($('Max Task Retry Count'), startTask.maxTaskRetryCount, true, output, indent);
  showNameValue($('Wait For Success'), startTask.waitForSuccess, true, output, indent);
  batchShowUtil.showKvPairs($('Resource Files'), startTask.resourceFiles, output, indent);
  batchShowUtil.showKvPairs($('Environment Settings'), startTask.environmentSettings, output, indent);
}

batchShowUtil.showCertReferences = function(certRefs, output, indent) {
  if (!certRefs) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Certificate References'), false, output, indent);
  indent += 2;

  var i = 1;
  certRefs.forEach(function (certRef) {
    batchShowUtil.showHeader($('Certificate Reference #') + i, false, output, indent);
    batchShowUtil.showCertReference(certRef, output, indent);
    i++;
  });
}

batchShowUtil.showCertReference = function(certRef, output, indent) {
  var showNameValue = batchShowUtil.showNameValue;

  indent += 2;
  showNameValue($('Thumbprint'), certRef.thumbprint, true, output, indent);
  showNameValue($('Thumbprint Algorithm'), certRef.thumbprintAlgorithm, true, output, indent);
  showNameValue($('Store Location'), certRef.storeLocation, true, output, indent);
  showNameValue($('Store Name'), certRef.storeName, true, output, indent);
  showNameValue($('Visibility'), certRef.visibility, true, output, indent);
}

batchShowUtil.showAppReferences = function(appRefs, output, indent) {
  if (!appRefs) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Application References'), false, output, indent);
  indent += 2;

  var i = 1;
  appRefs.forEach(function (appRef) {
    batchShowUtil.showHeader($('Application Reference #') + i, false, output, indent);
    batchShowUtil.showAppReference(appRef, output, indent);
    i++;
  });
}

batchShowUtil.showAppReference = function(appRef, output, indent) {
  var showNameValue = batchShowUtil.showNameValue;

  indent += 2;
  showNameValue($('Application Id'), appRef.applicationId, true, output, indent);
  showNameValue($('Version'), appRef.version, true, output, indent);
}

batchShowUtil.showPoolStats = function(poolStats, output, indent) {
  if (!poolStats) {
    return;
  }

  if (output.format().json) {
    output.json(poolStats);
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Pool Stats'), false, output, indent);
  indent += 2;
  showNameValue($('Start Time'), poolStats.startTime.toUTCFormat(UTCFormat), true, output, indent);
  batchShowUtil.showResourceStats(poolStats.resourceStats, output, indent);
}

batchShowUtil.showResourceStats = function(resourceStats, output, indent) {
  if (!resourceStats) {
    return;
  }

  var showNameValue = batchShowUtil.showNameValue;

  batchShowUtil.showHeader($('Resource Stats'), false, output, indent);
  indent += 2;
  showNameValue($('Start Time'), resourceStats.avgCPUPercentage, true, output, indent);
  showNameValue($('Avg CPU Percentage'), resourceStats.avgCPUPercentage, true, output, indent);
  showNameValue($('Avg Memory(GiB)'), resourceStats.avgMemoryGiB, true, output, indent);
  showNameValue($('Peak Memory(GiB)'), resourceStats.peakMemoryGiB, true, output, indent);
  showNameValue($('Avg Disk(GiB)'), resourceStats.avgDiskGiB, true, output, indent);
  showNameValue($('Peak Disk(GiB)'), resourceStats.peakDiskGiB, true, output, indent);
  showNameValue($('Disk Read IOps'), resourceStats.diskReadIOps, true, output, indent);
  showNameValue($('Disk Write IOps'), resourceStats.diskWriteIOps, true, output, indent);
  showNameValue($('Disk Read(GiB)'), resourceStats.diskReadGiB, true, output, indent);
  showNameValue($('Disk Write(GiB)'), resourceStats.diskWriteGiB, true, output, indent);
  showNameValue($('Network Read(GiB)'), resourceStats.networkReadGiB, true, output, indent);
  showNameValue($('Network Write(GiB)'), resourceStats.networkWriteGiB, true, output, indent);
}

batchShowUtil.showCloudPool = function(pool, output, indent) {
  if (!pool) {
    return;
  }

  if (output.format().json) {
    output.json(pool);
    return;
  }

  var indent = 0;
  var showNameValue = batchShowUtil.showNameValue;

  showNameValue($('Pool Id'), pool.id, true, output, indent);
  showNameValue($('Display Name'), pool.displayName, true, output, indent);
  showNameValue($('Creation Time'), pool.creationTime.toUTCFormat(UTCFormat), true, output, indent);
  showNameValue($('State'), pool.state, true, output, indent);
  showNameValue($('Allocation State'), pool.allocationState, true, output, indent);
  showNameValue($('VM Size'), pool.vmSize, true, output, indent);
  showNameValue($('OS Family'), pool.osFamily, true, output, indent);
  showNameValue($('Current OS Version'), pool.currentOSVersion, true, output, indent);
  showNameValue($('VM Count'), pool.currentDedicated, true, output, indent);
  showNameValue($('Target VM Count'), pool.targetDedicated, true, output, indent);
  batchShowUtil.showResizeError(pool.resizeError, output, indent);
  showNameValue($('Enable AutoScale'), pool.enableAutoScale, true, output, indent);
  showNameValue($('AutoScale Formula'), pool.autoScaleFormula, true, output, indent);
  batchShowUtil.showAutoScaleRun(pool.autoScaleRun, output, indent);
  showNameValue($('Enable Internode Communication'), pool.enableInterNodeCommunication, true, output, indent);
  batchShowUtil.showStartTask(pool.startTask, output, indent);
  showNameValue($('Max Tasks Per Node'), pool.maxTasksPerNode, true, output, indent);
  batchShowUtil.showKvPairs($('Metadata'), pool.metadata, output, indent);
  batchShowUtil.showCertReferences(pool.certificateReferences, output, indent);
  batchShowUtil.showAppReferences(pool.applicationPackageReferences, output, indent);
  batchShowUtil.showPoolStats(pool.stats, output, indent);
}

module.exports = batchShowUtil;
