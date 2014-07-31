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
var testPrefix = 'cli.vm.endpoint.update_delete-tests';

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var vmName;

    before(function(done) {
      suite = new CLITest(testPrefix, [], isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      suite.setupSuite(done);
    });

    after(function(done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }

      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = process.env.TEST_VM_NAME;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //udpate and delete the endpoint
    describe('Endpoint:', function() {
      it('Update and Delete', function(done) {
        var vmEndpointName = 'NewTestEndpoint';
        var vmExistingEndpointName = 'tcp-5555-5565';
        suite.execute('vm endpoint update %s -t %s -l %s -n %s -o tcp %s --json',
          vmName, 8081, 8082, vmEndpointName, vmExistingEndpointName, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm endpoint show %s -e %s --json', vmName, vmEndpointName, function(result) {
              result.exitStatus.should.equal(0);
              var vmEndpointObj = JSON.parse(result.text);
              suite.execute('vm endpoint delete %s %s --json', vmName, vmEndpointName, function(result) {
                result.exitStatus.should.equal(0);
                setTimeout(done, timeout);
              });
            });
          });
      });
    });
  });
});