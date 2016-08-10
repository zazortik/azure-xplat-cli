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
var testprefix = 'arm-cli-location-tests';

describe('arm', function () {
  describe('location', function () {
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

    describe('list', function () {
      it('should work', function (done) {
        suite.execute('location list --json', function (result) {
          result.exitStatus.should.equal(0);
          var locations = JSON.parse(result.text);
          locations.some(function (location) {
            return location.name === 'westus' && location.displayName === 'West US';
          }).should.be.true;
          locations.some(function (location) {
            return location.providers.length > 1 && location.providers.indexOf("Microsoft.Batch") >= 0;
          }).should.be.true;
          done();
        });
      });
    });
  });
});