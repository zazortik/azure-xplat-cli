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
//var adUtils = require('');
var testprefix = 'arm-adUtils-tests';

describe('arm', function () {
  describe('adUtils', function () {
    var suite;
    before(function (done) {
      suite = new CLITest(testprefix);
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
    

    it('should work to list and show users', function (done) {
      var upn = getTestUPN();
      var upn2 = getTestUPN2();
      suite.execute('ad user list --json', function (result) {
        result.exitStatus.should.equal(0);
        var text = result.text;
        var seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) !== -1);
        seemsCorrect.should.equal(true);
        suite.execute('ad user show --upn %s --json', upn, function (result) {
          result.exitStatus.should.equal(0);
          text = result.text;
          seemsCorrect = (text.indexOf(upn) !== -1) && (text.indexOf(upn2) === -1);
          seemsCorrect.should.equal(true);
          done();
        });
      });
    });
  });
});