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

var should = require('should');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-feature-tests';

describe('arm', function () {
  var suite;

    before(function (done) {
      suite = new CLITest(this, testprefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

  describe('feature', function () {
    it('list should work', function (done) {
      suite.execute('feature list --json', function (result) {
        result.exitStatus.should.equal(0);
        var features = JSON.parse(result.text);
        features.length.should.be.above(0);
        done();
      });
    });

    it('show should work', function (done) {
      suite.execute('feature show %s %s --json', 'Microsoft.Automation', 'dsc', function (result) {
        result.exitStatus.should.equal(0);
        var feature = JSON.parse(result.text);
        feature.name.should.match(/^Microsoft.Automation/ig);
        done();
      });
    });

    it('register should work', function (done) {
      suite.execute('feature register %s %s --json', 'Microsoft.Automation', 'dsc', function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('feature show %s %s --json', 'Microsoft.Automation', 'dsc', function (result) {
          result.exitStatus.should.equal(0);
          var feature = JSON.parse(result.text);
          feature.name.should.match(/^Microsoft.Automation/ig);
          feature.properties.state.should.match(/.*register.*/ig);
          done();
        });
      });
    });    
  });
});