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


var os = require('os');
var fs = require('fs');
var crypto = require('crypto');
var _appInsights = require('applicationinsights');
var profile = require('./profile');
var utilsCore = require('./utilsCore');
var Constants = require('./constants');

var _event;
var _isEnabled = false;
var _currentCommand;
var _rawCommand;
var _user;

var _Data = (function() {
  var Data = function () {
  };
  return Data;
})();

var _PageViewData = (function() {
  var PageViewData = function () {
    this.ver = 2;
    this.properties = {};
    this.measurements = {};
  };
  return PageViewData;
})();

var _AzureCliQosEvent = function() {
  return {
    startTime: Date.now(),
    duration: 0,
    isSuccess: true,
    commandName: '',
    command: '',
    mode: '', // arm or asm
    nodeVersion: '',
    userId: '',
    userType: '',
    installationType: 'NONE', //NONE, INSTALLER or NPM
    osType: os && os.type(),
    osVersion: os && os.release()
  };
};

var _getInstallationType = function (command) {
  var type = 'NONE';
  var osType = os.type();
  if (osType === 'Windows_NT') {
    if (command) {
      type = command.indexOf('Microsoft SDKs\\Azure') > -1 ? 'INSTALLER' : 'NPM';
    }
  } else if (osType === 'Darwin') {
    try {
      // If azure-cli is installed using npm, '/usr/local/bin/azure' is a symbolic link to node_modules
      // If installed by installer, '/usr/local/bin/azure' is an executable file instead.
      var lstat = fs.lstatSync('/usr/local/bin/azure');
      type = lstat.isSymbolicLink() ? 'NPM' : 'INSTALLER';
    } catch (e) {
      // Not able to figure out installation type.
    }
  } else {
    // On Linux, no installer provided currently.
    type = 'NPM';
  }
  return type;
};

var _getUser = function () {
  var user = {
    id: '',
    type: ''
  };
  var sub;
  try {
    sub = profile.current.getSubscription();
  } catch (e) {

  }

  if (sub && sub.user) {
    user.id = crypto.createHash('sha256').update(sub.user.name).digest('hex');
    user.type = sub.user.type;
  }
  return user;
};

var _filterCommand = function (commandName, rawCommand) {
  var outCmd = '';
  if (rawCommand && commandName) {
    outCmd = commandName;
    // Starting from 3rd argv is the commands
    var filterStartIndex = 2 + outCmd.split(/\s+/).length;
    for (var i = filterStartIndex; i < rawCommand.length; i++) {
      var token = rawCommand[i];
      if (!utilsCore.stringStartsWith(token, '-')) {
        token = token.replace(/./g, '*');
      }
      outCmd += ' ' + token;
    }
  }
  return outCmd;
};

var _stop = function (qosEvent) {
  if (qosEvent) {
    qosEvent.duration = Date.now() - qosEvent.startTime;
    if (_currentCommand) {
      qosEvent.commandName = _currentCommand.fullName();
      qosEvent.command = _filterCommand(qosEvent.commandName, _rawCommand);
    }
  }
};

// helper for Application Insights
var _msToTimeSpan = function (totalms) {
  if (isNaN(totalms) || totalms < 0) {
      totalms = 0;
  }
  var ms = '' + totalms % 1000;
  var sec = '' + Math.floor(totalms / 1000) % 60;
  var min = '' + Math.floor(totalms / (1000 * 60)) % 60;
  var hour = '' + Math.floor(totalms / (1000 * 60 * 60)) % 24;
  ms = ms.length === 1 ? '00' + ms : ms.length === 2 ? '0' + ms : ms;
  sec = sec.length < 2 ? '0' + sec : sec;
  min = min.length < 2 ? '0' + min : min;
  hour = hour.length < 2 ? '0' + hour : hour;
  return hour + ':' + min + ':' + sec + '.' + ms;
};

var _trackPageView = function (data) {
  var pageView = new _PageViewData();
  pageView.name = data.commandName;
  if (!isNaN(data.duration)) {
    pageView.duration = _msToTimeSpan(data.duration);
  }
  pageView.properties = data;
  var _data = new _Data();
  _data.baseType = 'PageViewData';
  _data.baseData = pageView;
  _appInsights.client.track(_data);
};

var _flush = function (callback) {
  if (_isEnabled) {
    _appInsights.client.sendPendingData(callback);
  }
};

exports.init = function (isEnabled) {
  _isEnabled = isEnabled;
  if (_isEnabled) {
    _appInsights.setup(Constants.TELEMETRY_INSTRUMENTATION_KEY)
    .setAutoCollectRequests(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectExceptions(false);

    _user = _getUser();
    var context = _appInsights.client.context;
    context.tags[context.keys.userId] = _user.id;
    context.tags[context.keys.locationIp] = '0.0.0.0';

    _appInsights.start();
  }
};

exports.currentCommand = function (command) {
  if (command && typeof command === 'object') {
    _currentCommand = command;
  }
};

exports.start = function (command) {
  if (_isEnabled) {
    if (command) {
      _rawCommand = command;
    }
    _event = _AzureCliQosEvent();
    _event.installationType = _getInstallationType(command);
    _event.nodeVersion = process.version;
    if (_user) {
      _event.userId = _user.id;
      _event.userType = _user.type;
    }
  }
};

exports.setAppInsights = function (appInsights) {
  _appInsights = appInsights;
};

exports.setMode = function (mode) {
  if (_event) {
    _event.mode = mode;
  }
};

exports.onError = function (err, callback) {
  if (_isEnabled && _event) {
    _stop(_event);
    _event.isSuccess = false;
    _event.stacktrace = err.stack;
    _appInsights.client.trackEvent('CmdletError', _event);
    _flush(callback);
  } else {
    callback();
  }
};

exports.onFinish = function (callback) {
  if (_isEnabled && _event) {
    _stop(_event);
    _trackPageView(_event);
    _flush(callback);
  } else {
    callback();
  }
};

