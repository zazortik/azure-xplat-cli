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
var should = require('should');
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

var vmPrefix = 'clitestvm';
var timeout = isForceMocked ? 0 : 5000;

var suite;
var testPrefix = 'cli.vm.capture-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmName,
    captureImg = 'xplattestcapimg';

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }

      vmName = process.env.TEST_VM_NAME;
      suite.setupSuite(done);
    });

    after(function (done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }
      if (suite.isMocked)
        suite.teardownSuite(done);
      else {
        suite.execute('service delete %s --quiet --json', vmName, function (result) {
          suite.teardownSuite(done);
        });
      }

    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    //shutdown a vm
    describe('Vm:', function () {
      it('shutdown', function (done) {
        suite.execute('vm shutdown %s --json', vmName, function (result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

    // VM Capture into a disk
    describe('Vm:', function () {
      it('capture', function (done) {
        suite.execute('vm capture %s %s %s --json --delete', vmName, captureImg, function (result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });

    //delete the captured disk
    describe('Vm:', function () {
      it('delete captured image', function (done) {
        suite.execute('vm image delete -b %s --json', captureImg, function (result) {
          result.exitStatus.should.equal(0);
          setTimeout(done, timeout);
        });
      });
    });
  });
});
