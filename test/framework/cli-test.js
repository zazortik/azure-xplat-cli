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
require('streamline').register();
// Test includes
var fs = require('fs');
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var util = require('util');
var _ = require('underscore');

var testLogger = require('./test-logger');
var adalAuth = require('../../lib/util/authentication/adalAuth');
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
  this.setRecordingsDirectory(__dirname + '/../recordings/' + this.testPrefix + '/');
  if (forceMocked) {
    this.isMocked = true;
  } else {
    this.isMocked = testPrefix && !process.env.NOCK_OFF;
  }
  this.suiteRecordingsFile = this.getRecordingsDirectory() + 'suite.' + this.testPrefix + '.nock.js';
  console.log("&&&&&&&&&&&&&&&&&&&&&&&this.suiteRecordingsFile  " + this.suiteRecordingsFile);
  this.isRecording = process.env.AZURE_NOCK_RECORD;
  this.skipSubscription = true;
  
  // change this in derived classes to switch mode
  this.commandMode = 'asm';

  // Normalize environment
  this.normalizeEnvironment(env);
  this.validateEnvironment();

  //track & restore generated uuids to be used as part of request url, like a RBAC role assignment name
  this.uuidsGenerated = [];
  this.currentUuid = 0;

  this.randomTestIdsGenerated = [];
  this.numberOfRandomTestIdGenerated = 0;

  if (this.isPlayback()) {
    this.setTimeouts();
  }

  pluginCache.clear();
}

_.extend(CLITest.prototype, {
  getRecordingsDirectory: function() {
    return this.recordingsDirectory;
  },

  setRecordingsDirectory: function(dir) {
    if(!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    this.recordingsDirectory = dir;
  },

  getTestRecordingsFile: function() {
    this.testRecordingsFile = this.getRecordingsDirectory() + 
      testLogger.getCurrentTest().split(" ").join("_") + ".nock.js";
    return this.testRecordingsFile;
  },

   getSuiteRecordingsFile: function() {
    return this.suiteRecordingsFile;
  },

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
    if (this.isPlayback()) {
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
    } else if (this.requiresCert && profile.current.currentSubscription.user) {
      messages.push('This test requires certificate authentication only. The current subscription has an access token. Please switch subscriptions or use azure logout to remove the access token');
    } else if(this.requiresCert && !profile.current.currentSubscription.managementCertificate) {
      messges.push('This test requires certificate authentication but the current subscription does not have a management certificate. Please use azure account import to obtain one.');
    } else if (this.requiresToken && !profile.current.currentSubscription.user) {
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
    // Remove any existing cache files before starting the test
    this.removeCacheFiles();
    
    if (this.isMocked) {
      process.env.AZURE_ENABLE_STRICT_SSL = false;
    }
    
    if (this.isPlayback()) {
      // retrive recorded testids and uuids if any
      console.log(">>>>>>>>setupSuite in playback, testRecordingsFile" + util.inspect(this.getSuiteRecordingsFile(), {depth: null}));
      var nocked = require(this.getSuiteRecordingsFile());
      if (nocked.randomTestIdsGenerated) {
        this.randomTestIdsGenerated = nocked.randomTestIdsGenerated();
        console.log(">>>>>>>>setupSuite in playback, this.randomTestIdsGenerated" + util.inspect(this.randomTestIdsGenerated, {depth: null}));
      }

      if (nocked.uuidsGenerated) {
        this.uuidsGenerated = nocked.uuidsGenerated();
      }
    }

    callback();
    //write the testids and uuids to a suite recordings file
    if (this.isMocked && this.isRecording) {
      this.writeRecordingHeader(this.getSuiteRecordingsFile());
      fs.appendFileSync(this.getSuiteRecordingsFile(), '];\n');
      this.writeGeneratedUuids(this.getSuiteRecordingsFile());
      this.writeGeneratedRandomTestIds(this.getSuiteRecordingsFile());
    }
  },

  teardownSuite: function (callback) {
    this.curentTest = 0;
    if (this.isMocked) {
      delete process.env.AZURE_ENABLE_STRICT_SSL;
    }

    callback();
  },

  removeCacheFiles: function () {
    var cacheFilePattern = /(sites|spaces)\.[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\.json/;

    fs.readdirSync(utils.azureDir())
      .filter(function (p) { return p.match(cacheFilePattern); })
      .forEach(function (p) {
        fs.unlinkSync(path.join(utils.azureDir(), p));
      });
  },

  writeGeneratedUuids: function (filename) {
    if (this.uuidsGenerated.length > 0) {
      var uuids = this.uuidsGenerated.map(function (uuid) { return '\'' + uuid + '\''; }).join(',');
      console.log("^^^^^^^^^^^^^^^^ uuids -- " + util.inspect(uuids, {depth: null}));
      var content = util.format('\n exports.uuidsGenerated = function() { return [%s];};', uuids);
      filename = filename || this.getTestRecordingsFile();
      fs.appendFileSync(filename, content);
      this.uuidsGenerated.length = 0;
    }
  },

  writeGeneratedRandomTestIds: function (filename) {
    console.log(">>>>>>>>randomTestIdsGenerated -- " + util.inspect(this.randomTestIdsGenerated, {depth: null}));
    if (this.randomTestIdsGenerated.length > 0) {
      var ida = this.randomTestIdsGenerated.map(function (id) { return '\'' + id + '\''; });
      console.log(">>>>>>>>ida -- " + util.inspect(ida, {depth: null}));
      var ids = ida.join(',');
      console.log(">>>>>>>>ids -- " + util.inspect(ids, {depth: null}));
      var content = util.format('\n exports.randomTestIdsGenerated = function() { return [%s];};', ids);
      console.log(">>>>>>>>content -- " + util.inspect(content, {depth: null}));
      console.log("recieved filename:  " + filename);
      filename = filename || this.getTestRecordingsFile();
      console.log("Writing to file:  " + filename);
      fs.appendFileSync(filename, content);
      this.randomTestIdsGenerated.length = 0;
    }
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

    if (!this.skipSubscription && this.isPlayback() && cmd[2] != 'vm' && cmd[3] != 'location') {
      cmd.push('-s');
      cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
    }

    this.forceSuiteMode(sinon);

    if (this.isMocked){
      this.stubOutUuidGen(sinon);
    }

    executeCommand(cmd, function (result) {
      utils.readConfig.restore();
      if (this.isMocked){
        utils.uuidGen.restore();
      }
      callback(result);
    });
  },

  setupTest: function (callback) {
    this.currentTest += 1;
    this.numberOfRandomTestIdGenerated = 0;
    this.currentUuid = 0;
    nockHelper.nockHttp();
    if (this.isMocked && this.isRecording) {
      // nock recording
      this.writeRecordingHeader();
      nockHelper.nock.recorder.rec(true);
    }

    if (this.isPlayback()) {
      // nock playback
      var nocked = require(this.getTestRecordingsFile());
      if (nocked.randomTestIdsGenerated) {
        this.randomTestIdsGenerated = nocked.randomTestIdsGenerated();
        console.log(">>>>>>>>setupTest in playback, this.randomTestIdsGenerated" + util.inspect(this.randomTestIdsGenerated, {depth: null}));
      }

      if (nocked.uuidsGenerated) {
        this.uuidsGenerated = nocked.uuidsGenerated();
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

      if (nocked.scopes.length === 1) {
        nocked.scopes[0].forEach(function (createScopeFunc) {
          createScopeFunc(nockHelper.nock);
        });
      } else {
        throw new Error('It appears the ' + this.getTestRecordingsFile() + ' file has more tests than there are mocked tests. ' +
          'You may need to re-generate it.');
      }
    }
    else {
      this.setEnvironmentDefaults();
    }

    callback();
  },

  teardownTest: function (callback) {
    if (this.isMocked) {
      if (this.isRecording) {
        // play nock recording
        var scope = '[';
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
        fs.appendFileSync(this.getTestRecordingsFile(), scope);
        fs.appendFileSync(this.getTestRecordingsFile(), '];');
        this.writeGeneratedUuids();
        this.writeGeneratedRandomTestIds();
        nockHelper.nock.recorder.clear();
      } else {
        //playback mode
        adalAuth.tokenCache = this.originalTokenCache;
      }
    }
    nockHelper.unNockHttp();
    callback();
  },

  writeRecordingHeader: function (filename) {
    var template = fs.readFileSync(path.join(__dirname, 'preamble.template'), { encoding: 'utf8' });
    filename = filename || this.getTestRecordingsFile();
    fs.writeFileSync(filename, _.template(template, {
      sub: profile.current.currentSubscription,
      requiredEnvironment: this.requiredEnvironment
    }));
  },

  isPlayback: function (){
    return this.isMocked && !this.isRecording;
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
    console.log(">>>>>>>>prefix at start of generateId" + util.inspect(prefix, {depth: null}));
    console.log(">>>>>>>>current list at start of generateId" + util.inspect(currentList, {depth: null}));
    if (!currentList) {
      currentList = [];
    }

    var newNumber;
    if (!this.isPlayback()) {
      newNumber = CLITest.generateRandomId(prefix, currentList);
      console.log(">>>>>>>>generating new number if not in playback" + util.inspect(newNumber, {depth: null}));
      if (this.isMocked) {
        console.log(">>>>>>>>in Record index in array: " + util.inspect(this.numberOfRandomTestIdGenerated, {depth: null}));
        this.randomTestIdsGenerated[this.numberOfRandomTestIdGenerated++] = newNumber;
        console.log(">>>>>>>>in Record after assignment index in array: " + util.inspect(this.numberOfRandomTestIdGenerated, {depth: null}));
        console.log(">>>>>>>>in Record: " + util.inspect(this.randomTestIdsGenerated, {depth: null}));
      }
    } else {
      if (this.randomTestIdsGenerated && this.randomTestIdsGenerated.length > 0) {
        console.log(">>>>>>>>in playback numberOfRandomTestIdGenerated" + util.inspect(this.numberOfRandomTestIdGenerated, {depth: null}));
        console.log(">>>>>>>>in playback randomTestIdsGenerated" + util.inspect(this.randomTestIdsGenerated, {depth: null}));
        newNumber = this.randomTestIdsGenerated[this.numberOfRandomTestIdGenerated++];
        console.log(">>>>>>>>in playback after assignment numberOfRandomTestIdGenerated" + util.inspect(this.numberOfRandomTestIdGenerated, {depth: null}));
        console.log(">>>>>>>>in playback newNumber" + util.inspect(newNumber, {depth: null}));
      } else {
        //some test might not have recorded generated ids, so we fall back to the old sequential logic
        newNumber = prefix + (currentList.length + 1);
      }
    }

    currentList.push(newNumber);
    console.log(">>>>>>>>in any mode current list after pushing new number" + util.inspect(currentList, {depth: null}));
    console.log(">>>>>>>>returning new number" + util.inspect(newNumber, {depth: null}));
    return newNumber;
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
      };
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

  /*
  * for any generated uuids which end up in the rest url, record them, and restore under playback
  */
  stubOutUuidGen: function () {
    var self = this;
    if (utils.uuidGen.restore) {
      utils.uuidGen.restore();
    }

    CLITest.wrap(sinon, utils, 'uuidGen', function (originalUuidGen) {
      return function () {
        var uuid;
        if (self.isMocked) {
          if (!self.isRecording) {
            console.log("^^^^^^^^^^^^^^^In playback  before assignment self.currentUuid " + self.currentUuid);
            console.log("^^^^^^^^^^^^^^^In playback  sself.uuidsGenerated " + util.inspect(self.uuidsGenerated, {depth : null}));
            uuid = self.uuidsGenerated[self.currentUuid++];
            console.log("^^^^^^^^^^^^^^^In playback  after assignment self.currentUuid " + self.currentUuid);
            console.log("^^^^^^^^^^^^^^^In playback  uuid " + uuid);
          } else {
            uuid = originalUuidGen();
            console.log("^^^^^^^^^^^^^^^uuid = originalUuidGen();  " + uuid);
            self.uuidsGenerated.push(uuid);
            console.log("^^^^^^^^^^^^^^^^^self.uuidsGenerated after push         " + util.inspect(self.uuidsGenerated, {depth : null}));
          }
        }
        return uuid;
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

CLITest.generateRandomId = function (prefix, currentList) {
  var newNumber;
  while (true) {
    newNumber = prefix + Math.floor(Math.random() * 10000);
    if (!currentList || currentList.indexOf(newNumber) === -1) {
      break;
    }
  }
  return newNumber;
};
