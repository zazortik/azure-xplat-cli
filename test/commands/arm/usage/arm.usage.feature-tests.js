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

//"should.js" (http://unitjs.com/guide/should-js.html) is used for asserting the outcomes.
var should = require('should');

var CLITest = require('../../../framework/arm-cli-test');

var testPrefix = 'arm-cli-usage-tests';

var sitename;
var createdSites = [];

var util = require('util');
var profile = require('../../../../lib/util/profile');
var utils = require('../../../../lib/util/utils');

var resourceClient;

describe('arm', function () {
  var suite;

  before(function (done) {
    suite = new CLITest(this, testPrefix);
    suite.setupSuite(function () {
      var subscription = profile.current.getSubscription();
      resourceClient = utils.createResourceClient(subscription);
      done();
    });
  });

  after(function (done) {
    suite.teardownSuite(function () {
        done();
    });
  });

  beforeEach(function (done) {
    suite.setupTest(done);
  });

  afterEach(function (done) {
    suite.teardownTest(done);
  });

  describe('usage', function () {
        
    it('list should work', function (done) {
      suite.execute('usage list 5/5/2015 5/7/2015 --json', function (result) {
        result.exitStatus.should.equal(0);
        result.text.length.should.be.above(0);
        
        done();
      });
    });
      
  });
});