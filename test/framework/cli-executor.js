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
var AzureCli = require('../../lib/cli');
var profile = require('../../lib/util/profile');
var _ = require('underscore');
var fs = require('fs');
var util = require('util');
var winston = require('winston');
var testLogger = require('./test-logger');

require('winston-memory').Memory;

winston.add(winston.transports.Memory);
winston.remove(winston.transports.Console);

exports = module.exports = {
  execute: execute
};

function execute(cmd, cb) {
  var sandbox = sinon.sandbox.create();
  var cli;

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
    try {
      return cb(result);
    } catch (err) {
      testLogger.logError(err);
      testLogger.logSillyError(winston.getCapturedSillyLogs());
      process.nextTick(function() {
        throw err;
      });
    }
  });

  if (!process.exit.restore) {
    sandbox.stub(process, 'exit', function (exitStatus) {
      result.exitStatus = exitStatus;
      end();
    });
  }

  try {
    cli = new AzureCli();
    if(!AzureCli.prototype.recordError.restore) {
      var sandbox2 = sinon.sandbox.create();
      sandbox2.stub(AzureCli.prototype, 'recordError', function (err) {
        testLogger.logError(err);
        sandbox2.restore();
        AzureCli.prototype.recordError(err);
      });
    }
    try {
      fs.unlinkSync(AzureCli.prototype.getErrorFile());
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw e;
      }
    }
    var cmdStr = cmd.join(" ");
    testLogger.logData(cmdStr);
    winston.default.transports.silly.clear();
    cli.parse(cmd);
  } catch(err) {
    result.errorStack = err.stack;
    result.error = err;
    end();
  }
}
