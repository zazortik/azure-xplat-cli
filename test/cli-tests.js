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
var fs = require('fs');
var path = require('path');
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
        config.mode = 'arm';
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
        '', 'azure' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      // Sub commands
      results.indexOf('account').should.be.above(-1);
      results.indexOf('storage').should.be.above(-1);
      results.indexOf('group').should.be.above(-1);
      results.indexOf('network').should.be.above(-1);
      results.indexOf('vm').should.be.above(-1);

      done();
    });

    it('should return the categories for sub categories', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      // Sub commands
      results.indexOf('set').should.be.above(-1);
      results.indexOf('create').should.be.above(-1);

      // Sub categories
      results.indexOf('deployment').should.be.above(-1);
      results.indexOf('template').should.be.above(-1);

      done();
    });

    it('should return the options for a command', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group create' // line
      ]);

      var cli = new AutoComplete();

      sandbox.restore();

      results = results[0].split('\n');

      //command options
      results.indexOf('--verbose').should.be.above(-1);
      results.indexOf('--json').should.be.above(-1);
      results.indexOf('--subscription').should.be.above(-1);
      results.indexOf('--template-file').should.be.above(-1);
      results.indexOf('--parameters-file').should.be.above(-1);
      done();
    });

    it('should return matched options for a command', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group create --p' // line
      ]);
      
      var cli = new AutoComplete();
      
      sandbox.restore();
      
      results = results[0].split('\n');
      
      // matched options
      results.indexOf('--json').should.equal(-1);
      results.indexOf('--parameters').should.be.above(-1);
      results.indexOf('--parameters-file').should.be.above(-1);
      done();
    });

    it('should return files under current working folder', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group create --parameters-file' // line
      ]);
      
      var cli = new AutoComplete();
      
      sandbox.restore();
      
      results = results[0].split('\n');
      
      //get pick one file under current working folder to verify
      if (results.length >= 1 && results[0]) {
        var exists = fs.existsSync(path.join(process.cwd(), results[0]));
        exists.should.be.true;
      }
      done();
    });

    it('should get nothing when the command does not exist', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group foo' // line
      ]);
      
      var cli = new AutoComplete();
      
      sandbox.restore();
      
      results = results[0].split('\n');
      
      results.length.should.equal(1);
      results[0].should.equal('');
      done();
    });

    it('should get nothing when the category does not exist', function (done) {
      process.argv = process.argv.concat([
        '', 'azure foo' // line
      ]);
      
      var cli = new AutoComplete();
      
      sandbox.restore();
      
      results = results[0].split('\n');
      
      results.length.should.equal(1);
      results[0].should.equal('');
      done();
    });

    it('should get nothing when the command option does not exist', function (done) {
      process.argv = process.argv.concat([
        '', 'azure group create --foo' // line
      ]);
      
      var cli = new AutoComplete();
      
      sandbox.restore();
      
      results = results[0].split('\n');
      
      results.length.should.equal(1);
      results[0].should.equal('');
      done();
    });
  });
});