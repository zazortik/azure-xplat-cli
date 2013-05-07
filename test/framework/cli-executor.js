/**
* Copyright 2012 Microsoft Corporation
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

var sinon = require('sinon');
var cli = require('../../lib/cli');
var _ = require('underscore');

var winston = require('winston');
require('winston-memory').Memory;

winston.add(winston.transports.Memory);
winston.remove(winston.transports.Console);

exports = module.exports = {
  execute: execute
};

var cleanCliOptions = function (cli) {
  _.each(cli.categories, function (category) {
    delete category.rawArgs;
    delete category.args;

    _.each(category.commands, function (command) {
      for (var option in command.options) {
        var optionName = command.options[option].long.substr(2);
        if (_.startsWith(optionName, 'no-')) {
          optionName = optionName.substr(3);
        }

        delete command[optionName];
      }
    });

    cleanCliOptions(category);
  });
};

function execute(cmd, cb) {
  var sandbox = sinon.sandbox.create();

  var result = {
    text: '',
    errorText: '',
    exitStatus: 0
  };

  var end = _.once(function () {
    var transport = cli.output['default'].transports['memory'];

    if (transport.writeOutput.length > 0) {
      result.text = transport.writeOutput.join('\n') + '\n';
      transport.writeOutput = [];
    }

    if (transport.errorOutput.length > 0) {
      result.errorText = transport.errorOutput.join('\n') + '\n';
      transport.errorOutput = [];
    }

    sandbox.restore();

    return cb(result);
  });

  sandbox.stub(process, 'exit', function (exitStatus) {
    result.exitStatus = exitStatus;

    end();
  });

  try {
    cleanCliOptions(cli);
    cli.parse(cmd);
  } catch(err) {
    result.errorStack = err.stack;
    result.error = err;

    end();
  }
}