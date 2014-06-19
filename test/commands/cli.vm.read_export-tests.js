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

var suite;
var testPrefix = 'cli.vm.read_export-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmName;

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
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('Vm', function () {

      //location list
      it('Location List', function (done) {
        suite.execute('vm location list --json', function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.not.empty;
          done();
        });
      });

      it('List', function (done) {
        suite.execute('vm list --json', function (result) {
          var vmList = JSON.parse(result.text);

          // Look for created VM
          var vmExists = vmList.some(function (vm) {
              return vm.VMName.toLowerCase() === vmName.toLowerCase();
            });
          vmExists.should.be.ok;
          done();
        });
      });

      it('Show', function (done) {
        suite.execute('vm show %s --json', vmName, function (result) {
          var vmObj = JSON.parse(result.text);
          vmObj.VMName.should.equal(vmName);
          done();
        });
      });

      // Export a VM
      it('Export', function (done) {
        var file = 'vminfo.json';
        suite.execute('vm export %s %s  --json', vmName, file, function (result) {
          result.exitStatus.should.equal(0);
          if (fs.exists) {
            fs.exists(file, function (result) {
              result.should.be.true;
              // this file will be deleted in 'create-from a VM' method
              done();
            });
          } else {
            path.exists(file, function (result) {
              result.should.be.true;
              // this file will be deleted in 'create-from a VM' method
              done();
            });
          }
        });
      });
    });
  });
});
