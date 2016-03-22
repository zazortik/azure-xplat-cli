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
    var _userId = (function() {
      var id = '';
      if (_user !== null && _user !== undefined && typeof _user === 'object') {
        id = crypto.createHash('sha256').update(_user.name).digest('hex');
      }
      return id;
    })();
    var _userType = (function() {
      var type = '';
      if (_user !== null && _user !== undefined && typeof _user === 'object') {
        type = _user.type;
      }
      return type;
    })();

    function AzureCliQosEvent() {
      this.startTime = +new Date();
      this.duration = 0;
      this.isSuccess = true;
      this.commandName = '';
      this.command = '';
      this.mode = ''; // arm or asm
      this.hostVersion = {
          arch: _arch,
          platform: _platform,
          type: _type,
          release: _release
      };
      this.nodeVersion = process.version;
      this.userId = _userId; // hashed id
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
    _appInsights.setup(INSTRUMENTATION_KEY)
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false)
      .setAutoCollectExceptions(false)
      .start();
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

exports.onError = function(err) {
  if (_isEnabled) {
    _stop();
    //_appInsights.client.trackEception(err);
  }
}

exports.onFinish = function() {
  if (_isEnabled) {
    _stop();
    _appInsights.client.trackEvent(_event.commandName, _event);
  }
}
