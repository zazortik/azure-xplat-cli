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
var testprefix = 'arm-cli-provider-tests';

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

  describe('provider', function () {
    it('list should work', function (done) {
      suite.execute('provider list --json', function (result) {
        result.exitStatus.should.equal(0);
        var providers = JSON.parse(result.text);
        providers.length.should.be.above(0);
        done();
      });
    });

    it('show should work', function (done) {
      suite.execute('provider show %s --json', 'Microsoft.web', function (result) {
        result.exitStatus.should.equal(0);
        var provider = JSON.parse(result.text);
        provider.namespace.should.match(/^Microsoft.Web$/ig);
        done();
      });
    });

    it('register should work', function (done) {
      suite.execute('provider register %s --json', 'Microsoft.AppService', function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('provider show %s --json', 'Microsoft.AppService', function (result) {
          result.exitStatus.should.equal(0);
          var provider = JSON.parse(result.text);
          provider.namespace.should.match(/^Microsoft.AppService$/ig);
          provider.registrationState.should.match(/.*register.*/ig);
          done();
        });
      });
    });

    it('unregister should work', function (done) {
      suite.execute('provider unregister %s --json', 'Microsoft.AppService', function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('provider show %s --json', 'Microsoft.AppService', function (result) {
          result.exitStatus.should.equal(0);
          var provider = JSON.parse(result.text);
          provider.namespace.should.match(/^Microsoft.AppService$/ig);
          provider.registrationState.should.match(/.*unregister.*/ig);
          done();
        });
      });
    });
  });
});