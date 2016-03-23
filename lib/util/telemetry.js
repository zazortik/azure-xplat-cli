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

var INSTRUMENTATION_KEY = '218959e7-a213-4923-a22b-d8b001062f28';

var _appInsights = require("applicationinsights");
var profile = require('./profile');
var os = require('os');
var crypto = require('crypto');

var _Data = (function() {
  var Data = function() {
  }
  return Data;
})();

var _PageViewData = (function() {
  var PageViewData = function() {
    this.ver = 2;
    this.properties = {};
    this.measurements = {};
  }
  return PageViewData;
})();

var _AzureCliQosEvent = (function() {
    var _arch = os.arch();
    var _platform = os.platform();
    var _type = os.type();
    var _release = os.release();
    var _user = (function() {
      var sub = profile.getSubscription();
      if (sub !== null) {
        return sub.user;
      }
      return null;
    })();
    var _userId = (function(user) {
      var id = '';
      if (user !== null && user !== undefined && typeof user === 'object') {
        id = crypto.createHash('sha256').update(user.name).digest('hex');
      }
      return id;
    })(_user);
    var _userType = (function(user) {
      var type = '';
      if (user !== null && user !== undefined && typeof user === 'object') {
        type = user.type;
      }
      return type;
    })(_user);

    function AzureCliQosEvent() {
      this.startTime = +new Date();
      this.duration = 0;
      this.isSuccess = true;
      this.commandName = '';
      this.command = '';
      this.mode = ''; // arm or asm
      this.hostVersion = JSON.stringify({
          arch: _arch,
          platform: _platform,
          type: _type,
          release: _release
      });
      this.nodeVersion = process.version;
      this.userId = _userId;
      this.userType = _userType;
    }
    return AzureCliQosEvent;
})();

var _event;
var _isEnabled = false;
var _currentCommand;

exports.init = function(isEnabled) {
  _isEnabled = isEnabled;
  if (_isEnabled) {
    debugger;
    _appInsights.setup(INSTRUMENTATION_KEY)
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectExceptions(false);

    var context = _appInsights.client.context;
    context.tags = {
      'ai.user.id': '34c4e9462b74db4590fde56c4a8798e068bc6eca1097882764e8cf1b4c5b68ad'
    }

    _appInsights.start()
  }
}

exports.currentCommand = function(command) {
  if (command !== null && command !== undefined && typeof command === 'object') {
    _currentCommand = command;
    return;
  } else {
    return _currentCommand;
  }
}

exports.start = function() {
  if (_isEnabled) {
    _event = new _AzureCliQosEvent();
  }
}

exports.setMode = function(mode) {
  if (_isEnabled) {
    _event.mode = mode;
  }
}

var _stop = function() {
  //validation _event
  if (_event !== null) {
    _event.duration = +new Date() - _event.startTime
    if (_currentCommand !== null) {
      _event.commandName = _currentCommand.fullName();
    }
  }
}
exports.stop = _stop;

exports.onError = function(err, callback) {
  if (_isEnabled) {
    _stop();
    _appInsights.client.trackTrace(err.stack);
    _flush(callback);
  }
}

exports.onFinish = function(callback) {
  if (_isEnabled) {
    _stop();
    //_appInsights.client.trackEvent(_event.commandName, _event, {});
    _trackPageView(_event);
    _flush(callback);
  }
}

var _flush = function(callback) {
  if (_isEnabled) {
    _appInsights.client.sendPendingData(callback);
  }
}

// helper for Application Insights
var _msToTimeSpan = function (totalms) {
    if (isNaN(totalms) || totalms < 0) {
        totalms = 0;
    }
    var ms = "" + totalms % 1000;
    var sec = "" + Math.floor(totalms / 1000) % 60;
    var min = "" + Math.floor(totalms / (1000 * 60)) % 60;
    var hour = "" + Math.floor(totalms / (1000 * 60 * 60)) % 24;
    ms = ms.length === 1 ? "00" + ms : ms.length === 2 ? "0" + ms : ms;
    sec = sec.length < 2 ? "0" + sec : sec;
    min = min.length < 2 ? "0" + min : min;
    hour = hour.length < 2 ? "0" + hour : hour;
    return hour + ":" + min + ":" + sec + "." + ms;
};

var _trackPageView = function(data) {
  var pageView = new _PageViewData();
  pageView.name = data.commandName;
  if (!isNaN(data.duration)) {
      pageView.duration = _msToTimeSpan(data.duration);
  }
  pageView.properties = data;

  var _data = new _Data();
  _data.baseType = "PageViewData";
  _data.baseData = pageView;

  _appInsights.client.track(_data);
}
