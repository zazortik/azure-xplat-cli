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
var util = require('util');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-ad-app-tests';
var appPrefix = 'xplatTestAppCreate';
var createdApps = [];

describe('arm', function () {
  describe('ad', function () {
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
    
    describe('app', function () {
      it('create and delete app should work', function (done) {
        var appName = suite.generateId(appPrefix, createdApps);
        var idUri = 'https://' + appName + '.com/home';
        suite.execute('ad app create -n testapp --home-page http://www.bing.com --identifier-uris %s --json', idUri, function (result) {
          result.exitStatus.should.equal(0);
          var appObjectId = result.text.substring(40, 76);
          var appId = result.text.substring(1, 37);
          suite.execute('ad sp create %s --json', appId, function (result) {
            result.exitStatus.should.equal(0);
            var spObjectId = result.text.substring(1, 37);
            suite.execute('ad sp delete %s -q', spObjectId, function (result) {
              result.exitStatus.should.equal(0);
              suite.execute('ad app delete %s -q', appObjectId, function (result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        });
      });
    });
  });
});