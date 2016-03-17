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

var _appInsights = require("applicationinsights");

var INSTRUMENTATION_KEY = '218959e7-a213-4923-a22b-d8b001062f28';
var telemetry = {};

var azureCliEventBuilder = function() {
  var _builder = {};
  var _event = {};
  var startTime;

  _builder.start = function(){
    startTime = +new Date();
  }

  _builder.finish = function() {
    var timeElapsed = +new Date() - startTime;
    _event['duration'] = timeElapsed.toString();
  }

  _builder.setEventName = function(name) {
    //validate
    _event['name'] = name;
    return _builder;
  }

  _builder.build = function() {
    return _event;
  }

  return _builder;
}

telemetry.init = function() {
  // disable in debug/test mode?
  _appInsights.setup(INSTRUMENTATION_KEY).start();
}

telemetry.isTelemetryAccepted = function() {
  // if found record return it else ask user
  return true;
}

telemetry.EvnetBuilder = function(info) {
  return azureCliEventBuilder(info);
}

telemetry.logEvent = function(event_json) {
  _appInsights.client.trackEvent(event_json.name, event_json);
}

module.exports = telemetry;
