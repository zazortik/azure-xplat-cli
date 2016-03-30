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
'use strict';

var should = require('should');
var utils = require('../../../../lib/util/utils');
var CLITest = require('../../../framework/arm-cli-test');

var location;

var requiredEnvironment = [
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'westus' },
];

var testPrefix = 'arm-cli-batch-subscription-tests';
var suite;
var liveOnly = process.env.NOCK_OFF ? it : it.skip;

describe('arm', function () {
  describe('batch subscription', function () {

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      suite.setupSuite(done);
    });
    
    after(function (done) {
      suite.teardownSuite(function () {
        done();
      });
    });
    
    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_ARM_TEST_LOCATION;
        done();
      });
    });
    
    afterEach(function (done) {
      suite.teardownTest(done);
    });
    
    it('should list batch subscription quotas', function (done) {
      suite.execute('batch subscription list-quotas %s --json', location, function (result) {
        var quotas = JSON.parse(result.text);
        quotas.accountQuota.should.not.be.null;
        result.exitStatus.should.equal(0);
        done();
      });
    });

  });
});