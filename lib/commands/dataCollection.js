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

var utils = require('../util/utils');
var utilsCore = require('../util/utilsCore');
var validation = require('../util/validation');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var config = cli.category('data-collection')
    .description($('Commands to manage your data collection preference'));

  config.command('set <value>')
  .description($('Sets the data collection preference. Valid values are true, false. Value true will enable data collection and false will disable it.'))
  .execute(function (value, callback) {
    validation.isValidEnumValue(value, ['true', 'false']);
    var telemetryInfo = utilsCore.readTelemetry();
    telemetryInfo.telemetry = value === 'true' ? true : false;
    utilsCore.writeTelemetry(telemetryInfo);
    var isJson = log.format().json;
    if (isJson) {
      log.json(telemetryInfo);
    } else {
      if (telemetryInfo.telemetry) {
        log.info(util.format($('You choose to participate in Microsoft Azure CLI data collection.\n')));
      } else {
        log.info(util.format($('You choose not to participate in Microsoft Azure CLI data collection.\n')));
      }
    }

    callback();
  });
};
