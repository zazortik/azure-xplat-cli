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

// Test includes
var fs = require('fs');
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var util = require('util');
var _ = require('underscore');

var adalAuth = require('../../lib/util/authentication/adalAuth');
var keyFiles = require('../../lib/util/keyFiles');
var profile = require('../../lib/util/profile');
var utils = require('../../lib/util/utils');
var pluginCache = require('../../lib/util/pluginCache');

var executeCommand = require('./cli-executor').execute;
var MockTokenCache = require('./mock-token-cache');
var nockHelper = require('./nock-helper');

exports = module.exports = CLITest;

function CLITest(testPrefix, env, forceMocked) {
  if (!Array.isArray(env)) {
    forceMocked = env;
    env = [];
  }

  this.testPrefix = testPrefix;
  this.currentTest = 0;
  this.recordingsFile = __dirname + '/../recordings/' + this.testPrefix + '.nock.js';

  if (forceMocked) {
    this.isMocked = true;
  } else {
    this.isMocked = testPrefix && !process.env.NOCK_OFF;
  }

  this.isRecording = process.env.AZURE_NOCK_RECORD;
  this.skipSubscription = true;

  // change this in derived classes to switch mode
  this.commandMode = 'asm';

  // Normalize environment
  this.normalizeEnvironment(env);
  this.validateEnvironment();

  if (this.isMocked && !this.isRecording) {
    this.setTimeouts();
  }

  pluginCache.clear();
}

_.extend(CLITest.prototype, {
  normalizeEnvironment: function (env) {
    env = env.filter(function (e) {
      if (e.requiresCert || e.requiresToken) {
        this.requiresCert = e.requiresCert;
        this.requiresToken = e.requiresToken;
        return false;
      }
      return true;
    });

    this.requiredEnvironment = env.map(function (env) {
      if (typeof(env) === 'string') {
        return { name: env, secure: false };
      } else {
        return env;
      }
    });
  },

  validateEnvironment: function () {
    if (this.isMocked && !this.isRecording) {
      return;
    }

    var messages = [];
    var missing = [];
    this.requiredEnvironment.forEach(function (e) {
      if (!process.env[e.name] && !e.defaultValue) {
        missing.push(e.name);
      }
    });

    if (missing.length > 0) {
      messages.push('This test requires the following environment variables which are not set: ' +
        missing.join(', '));
    }

    if (this.requiresCert && this.requiresToken) {
      messages.push('This test is marked as requiring both a certificate and a token. This is impossible, please fix the test setup.');
    } else if (this.requiresCert && profile.current.currentSubscription.username) {
      messages.push('This test requires certificate authentication only. The current subscription has an access token. Please switch subscriptions or use azure logout to remove the access token');
    } else if(this.requiresCert && !profile.current.currentSubscription.managementCertificate) {
      messges.push('This test requires certificate authentication but the current subscription does not have a management certificate. Please use azure account import to obtain one.');
    } else if (this.requiresToken && !profile.current.currentSubscription.username) {
      messages.push('This test required an access token but the current subscription does not have one. Please use azure login to obtain an access token');
    }

    if (messages.length > 0) {
      throw new Error(messages.join(os.EOL));
    }
  },

  setEnvironmentDefaults: function () {
    this.requiredEnvironment.forEach(function (env) {
      if (env.defaultValue && !process.env[env.name]) {
        process.env[env.name] = env.defaultValue;
      }
    });
  },

  setupSuite: function (callback) {
    if (this.isMocked) {
      process.env.AZURE_ENABLE_STRICT_SSL = false;
    }

    if (!this.isMocked || this.isRecording) {
      this.setEnvironmentDefaults();
    }

    if (this.isRecording) {
        this.writeRecordingHeader();
    }

    // Remove any existing cache files before starting the test
    this.removeCacheFiles();

    callback();
  },

  teardownSuite: function (callback) {
    this.currentTest = 0;

    if (this.isMocked) {
      if (this.isRecording) {
        fs.appendFileSync(this.recordingsFile, '];');
      }

      delete process.env.AZURE_ENABLE_STRICT_SSL;
    }

    callback();
  },

  removeCacheFiles: function () {
    var cacheFilePattern = /(sites|spaces)\.[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\.json/;

    var cacheFiles = fs.readdirSync(utils.azureDir())
      .filter(function (p) { return p.match(cacheFilePattern); })
      .forEach(function (p) {
        fs.unlinkSync(path.join(utils.azureDir(), p));
      });
  },

  execute: function (cmd) {
    if (!_.isString(cmd) && !_.isArray(cmd)) {
      throw new Error('First argument needs to be a string or array with the command to execute');
    }

    var args = Array.prototype.slice.call(arguments);

    if (args.length < 2 || !_.isFunction(args[args.length - 1])) {
      throw new Error('Callback needs to be passed as last argument');
    }

    var callback = args[args.length - 1];

    if (_.isString(cmd)) {
      cmd = cmd.split(' ');

      var rep = 1;
      for (var i = 0; i < cmd.length; i++) {
        if (cmd[i] === '%s') {
          cmd[i] = args[rep++];
        }
      }
    }

    if (cmd[0] !== 'node') {
      cmd.unshift('cli.js');
      cmd.unshift('node');
    }

    if (!this.skipSubscription && this.isMocked && !this.isRecording && cmd[2] != 'vm' && cmd[3] != 'location') {
      cmd.push('-s');
      cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
    }

    this.forceSuiteMode(sinon);

    executeCommand(cmd, function (result) {
      utils.readConfig.restore();
      callback(result);
    });
  },

  setupTest: function (callback) {
    nockHelper.nockHttp();

    if (this.isMocked && this.isRecording) {
      // nock recoding
      nockHelper.nock.recorder.rec(true);
    } else if (this.isMocked) {
      // nock playback
      var nocked = require(this.recordingsFile);

      if (this.currentTest < nocked.scopes.length) {
        nocked.scopes[this.currentTest++].forEach(function (createScopeFunc) {
          createScopeFunc(nockHelper.nock);
        });
      } else {
        throw new Error('It appears the ' + this.recordingsFile + ' file has more tests than there are mocked tests. ' +
          'You may need to re-generate it.');
      }

      if (nocked.getMockedProfile) {
        profile.current = nocked.getMockedProfile();
        profile.current.save = function () { };
      }

      if (nocked.setEnvironment) {
        nocked.setEnvironment();
      }

      this.originalTokenCache = adalAuth.tokenCache;
      adalAuth.tokenCache = new MockTokenCache();
    }

    callback();
  },

  teardownTest: function (callback) {
    if (this.isMocked && this.isRecording) {
      // play nock recording
      var scope = this.scopeWritten ? ',\n[' : '[';
      this.scopeWritten = true;
      var lineWritten;
      nockHelper.nock.recorder.play().forEach(function (line) {
        if (line.indexOf('nock') >= 0) {
          // apply fixups of nock generated mocks

          // do not filter on body as they usual have time related stamps
          line = line.replace(/(\.post\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');
          line = line.replace(/(\.get\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');
          line = line.replace(/(\.put\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');
          line = line.replace(/(\.delete\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');
          line = line.replace(/(\.merge\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');
          line = line.replace(/(\.patch\('.*?')\s*,\s*"[^]+[^\\]"\)/, '.filteringRequestBody(function (path) { return \'*\';})\n$1, \'*\')');

          // put deployment have a timestamp in the url
          line = line.replace(/(\.put\('\/deployment-templates\/\d{8}T\d{6}')/,
            '.filteringPath(/\\/deployment-templates\\/\\d{8}T\\d{6}/, \'/deployment-templates/timestamp\')\n.put(\'/deployment-templates/timestamp\'');

          // Requests to logging service contain timestamps in url query params, filter them out too
          line = line.replace(/(\.get\('.*\/microsoft.insights\/eventtypes\/management\/values\?api-version=[0-9-]+)[^)]+\)/,
            '.filteringPath(function (path) { return path.slice(0, path.indexOf(\'&\')); })\n$1\')');

          scope += (lineWritten ? ',\n' : '') + 'function (nock) { \n' +
            'var result = ' + line + ' return result; }';
          lineWritten = true;
        }
      });
      scope += ']';
      fs.appendFileSync(this.recordingsFile, scope);
      nockHelper.nock.recorder.clear();
    } else if (this.isMocked) {
      adalAuth.tokenCache = this.originalTokenCache;
    }

    nockHelper.unNockHttp();

    callback();
  },

  writeRecordingHeader: function () {
    var template = fs.readFileSync(path.join(__dirname, 'preamble.template'), { encoding: 'utf8' });

    fs.writeFileSync(this.recordingsFile, _.template(template, {
      sub: profile.current.currentSubscription,
      requiredEnvironment: this.requiredEnvironment
    }));
  },

  /**
  * Generates an unique identifier using a prefix, based on a currentList and repeatable or not depending on the isMocked flag.
  *
  * @param {string} prefix          The prefix to use in the identifier.
  * @param {array}  currentList     The current list of identifiers.
  * @param {bool}   isMocked        Boolean flag indicating if the test is mocked or not.
  * @return {string} A new unique identifier.
  */
  generateId: function (prefix, currentList) {
    if (!currentList) {
      currentList = [];
    }

    while (true) {
      var newNumber;
      if (this.isMocked) {
        // Predictable
        newNumber = prefix + (currentList.length + 1);
        currentList.push(newNumber);

        return newNumber;
      } else {
        // Random
        newNumber = prefix + Math.floor(Math.random() * 10000);
        if (currentList.indexOf(newNumber) === -1) {
          currentList.push(newNumber);

          return newNumber;
        }
      }
    }
  },

  /**
  * Helper function for cleanup. executes an async loop over a collection
  * of names (typically onces created using the generateId method)
  * and invokes an async iterator on each one. The iterator can do
  * whatever it needs to on each name.
  *
  * @param {string[]}                    names    The array of names
  *
  * @param {function(string, function)}  iterator function to run on each
  *                                               element in the names
  *                                               array. form is
  *                                               function (name, done)
  *
  * @param {function}                    done     Callback invoked when
  *                                               all elements in names
  *                                               have completed processing.
  */
  forEachName: function (names, iterator, done) {
    var self = this;
    if(typeof iterator === 'string') {
      var commandString = iterator;
      iterator = function (name, done) {
        self.execute(commandString, name, done);
      }
    }

    function nextName(names) {
      if (names.length === 0) {
        return done();
      }

      iterator(names[0], function () {
        nextName(names.slice(1));
      });
    }

    nextName(names);
  },

  setTimeouts: function () {
    // Possible it's already wrapped from a previous failed
    // execution. If so, unwrap then rewrap.
    if (utils.createClient.restore) {
      utils.createClient.restore();
    }

    CLITest.wrap(sinon, utils, 'createClient', function (originalCreateClient) {
      return function (factoryOrName, credentials, endpoint) {
        var client = originalCreateClient(factoryOrName, credentials, endpoint);
        client.longRunningOperationInitialTimeout = 0;
        client.longRunningOperationRetryTimeout = 0;

        return client;
      };
    });
  },

  /**
  * Stub out the utils.readConfig method to force the cli mode
  * to the one required by this test suite.
  *
  * This is broken out separately for those tests that are using
  * a suite for cli execution but otherwise don't need mock recording.
  *
  * @param {object} sinonObj The sinon object used to stub out
  *                          readConfig. This could be either
  *                          the sinon module or a sandbox.
  *
  */
  forceSuiteMode: function (sinonObj) {
    // Possible it's already wrapped from a previous failed
    // execution. If so, unwrap then rewrap.
    if (utils.readConfig.restore) {
      utils.readConfig.restore();
    }

    // Force mode regardless of current stored setting
    var commandMode = this.commandMode;
    CLITest.wrap(sinonObj, utils, 'readConfig', function (originalReadConfig) {
      return function () {
        var config = originalReadConfig();
        config.mode = commandMode;
        return config;
      };
    });
  }
});

/**
* A helper function to handle wrapping an existing method in sinon.
*
* @param {ojbect} sinonObj    either sinon or a sinon sandbox instance
* @param {object} object      The object containing the method to wrap
* @param {string} property    property name of method to wrap
* @param {function (function)} setup function that receives the original function,
*                              returns new function that runs when method is called.
* @return {object}             The created stub.
*/
CLITest.wrap = function wrap(sinonObj, object, property, setup) {
  var original = object[property];
  return sinonObj.stub(object, property, setup(original));
};
