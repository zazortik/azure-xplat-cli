/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

//
// Logging infrastructure for the xplat CLI
//

var log = require('winston');
var eyes = require('eyes');
var Table = require('easy-table');

require('./patch-winston');

// use cli output settings by default
log.cli();

log.format = function (options) {
  for (var i in log['default'].transports) {
    if (log['default'].transports.hasOwnProperty(i)) {
      var transport = log['default'].transports[i];
      if (arguments.length === 0) {
        return {
          json: transport.json,
          terse: transport.terse,
          level: transport.level,
          logo: log.format.logo
        };
      }

      if (options.json) {
        log.padLevels = false;
        log.stripColors = true;
        transport.json = true;
        transport.terse = true;
      } else {
        log.padLevels = true;
        log.stripColors = false;
        transport.json = false;
        transport.terse = false;
      }

      if (options.terse) {
        log.padLevels = false;
        transport.terse = true;
      }

      if (options.level) {
        transport.level = options.level;
      }

      if (options.logo) {
        log.format.logo = options.logo;
      }
    }
  }
};

log.json = function (level, data) {
  if (arguments.length == 1) {
    data = level;
    level = 'data';
  }

  if (log.format().json) {
    log.log(level, typeof data, data);
  } else {
    var lines = eyes.inspect(data, level, { stream: false });
    lines.split('\n').forEach(function (line) {
      // eyes all is "cyan" by default, so this property accessor will
      // fix the entry/exit color codes of the line. it's needed because we're
      // splitting the eyes formatting and inserting winston formatting where it
      // wasn't before.
      log.log(level, line[eyes.defaults.styles.all]);
    });
  }
};

log.table = function (level, data, transform) {
  if (arguments.length == 2) {
    transform = data;
    data = level;
    level = 'data';
  }

  if (log.format().json) {
    log.log(level, 'table', data);
  } else {
    var table = new Table();
    table.LeftPadder = Table.LeftPadder;
    table.padLeft = Table.padLeft;
    table.RightPadder = Table.RightPadder;
    table.padRight = Table.padRight;

    if (data && data.forEach) {
      data.forEach(function (item) { transform(table, item); table.newLine(); });
    } else if (data) {
      for (var item in data) {
        transform(table, item);
        table.newLine();
      }
    }

    var lines = table.toString();
    lines.substring(0, lines.length - 1).split('\n').forEach(function (line) {
      log.log(level, line);
    });
  }
};

log.createLogFilter = function () {
  return function handle(resource, next, callback) {
    log.silly('requestOptions');
    log.json('silly', resource);

    return next(resource, function (err, response, body) {
      log.silly('returnObject');
      if (response) {
        log.json('silly', {
          header: response.headers,
          body: body
        });
      }

      callback(err, response, body);
    });
  };
};

module.exports = log;
