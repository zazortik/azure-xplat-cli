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
var keyFiles = require('../../lib/util/keyFiles');
var profile = require('../../lib/util/profile');
var testUtil = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.mobilerecover-tests';
var requiredEnvironment = [];

describe('cli', function () {
  describe('mobile', function () {
    describe('recover', function () {

      before(function (done) {
        suite = new CLITest(this, testPrefix, requiredEnvironment);
        if (suite.isPlayback()) {
          suite.setupSuite(done);
        } else {
          done();
        }
      });

      after(function (done) {
        if (suite.isPlayback()) {
          suite.teardownSuite(done);
        } else {
          done();
        }
      });

      beforeEach(function (done) {
        if (suite.isPlayback()) {
          suite.setupTest(done);
        } else {
          done();
        }
      });

      afterEach(function (done) {
        if (suite.isPlayback()) {
          suite.teardownTest(done);
        } else {
          done();
        }
      });

      it('should recover successfully', function (done) {
        if (suite.isPlayback()) {
          suite.execute('node cli.js mobile recover foo bar -q -s f82cd983-da22-464f-8edd-31c8f4888e6b --json', function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        } else {
          done();
        }
      });
    });
  });
});