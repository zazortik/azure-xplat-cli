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

require('should');
var sinon = require('sinon');

var utilsCore = require('../lib/util/utilsCore');

function wrap(sinonObj, obj, functionName, setup) {
  var original = obj[functionName];
  return sinonObj.stub(obj, functionName, setup(original));
}

var AutoComplete = require('../lib/autocomplete');

describe('cli', function(){
  var sandbox;
  var results;
  var originalArgv;

  beforeEach(function () {
    results = [];
    originalArgv = process.argv;
    process.argv = [
      'azure',
      '--compbash',
      '--compgen',
      '', // fragment
    ];

    sandbox = sinon.sandbox.create();
    wrap(sandbox, utilsCore, 'readConfig', function (originalReadConfig) {
      return function () {
        var config = originalReadConfig();
        config.mode = 'asm';
        return config;
      };
    });

    sandbox.stub(console, 'log', function (d) {
      results.push(d);
    });
    sandbox.stub(process, 'exit');
  });

  afterEach(function () {
    sandbox.restore();
    process.argv = originalArgv;
  });

  describe('autocomplete', function() {
    it('should return the categories for top level categories', function (done) {
      process.argv = process.argv.concat([
        'azure', // word
        'azure' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      // Sub commands
      results.indexOf('account').should.be.above(-1);
      results.indexOf('storage').should.be.above(-1);
      results.indexOf('service').should.be.above(-1);
      results.indexOf('config').should.be.above(-1);
      results.indexOf('hdinsight').should.be.above(-1);
      results.indexOf('mobile').should.be.above(-1);
      results.indexOf('sb').should.be.above(-1);
      results.indexOf('site').should.be.above(-1);
      results.indexOf('sql').should.be.above(-1);
      results.indexOf('vm').should.be.above(-1);
      results.indexOf('help').should.be.above(-1);
      results.indexOf('portal').should.be.above(-1);

      done();
    });

    it('should return the categories for sub categories', function (done) {
      process.argv = process.argv.concat([
        'site', // word
        'azure site' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      // Sub commands
      results.indexOf('list').should.be.above(-1);
      results.indexOf('set').should.be.above(-1);
      results.indexOf('create').should.be.above(-1);
      results.indexOf('browse').should.be.above(-1);
      results.indexOf('show').should.be.above(-1);
      results.indexOf('delete').should.be.above(-1);
      results.indexOf('start').should.be.above(-1);
      results.indexOf('stop').should.be.above(-1);
      results.indexOf('restart').should.be.above(-1);

      // Sub categories
      results.indexOf('location').should.be.above(-1);
      results.indexOf('appsetting').should.be.above(-1);
      results.indexOf('config').should.be.above(-1);
      results.indexOf('connectionstring').should.be.above(-1);
      results.indexOf('defaultdocument').should.be.above(-1);
      results.indexOf('deployment').should.be.above(-1);
      results.indexOf('log').should.be.above(-1);
      results.indexOf('repository').should.be.above(-1);
      results.indexOf('scale').should.be.above(-1);
      results.indexOf('deploymentscript').should.be.above(-1);

      done();
    });

    it('should return the options for a command', function (done) {
      process.argv = process.argv.concat([
        'create', // word
        'azure site create' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      // Sub commands
      results.indexOf('--verbose').should.be.above(-1);
      results.indexOf('--json').should.be.above(-1);
      results.indexOf('--subscription').should.be.above(-1);
      results.indexOf('--location').should.be.above(-1);
      results.indexOf('--hostname').should.be.above(-1);
      results.indexOf('--git').should.be.above(-1);
      results.indexOf('--gitusername').should.be.above(-1);
      results.indexOf('--github').should.be.above(-1);
      results.indexOf('--githubusername').should.be.above(-1);
      results.indexOf('--githubpassword').should.be.above(-1);
      results.indexOf('--githubrepository').should.be.above(-1);

      done();
    });
  });
});