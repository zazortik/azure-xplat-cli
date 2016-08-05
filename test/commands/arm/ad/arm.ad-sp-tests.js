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
var testprefix = 'arm-cli-ad-sp-tests';
var appPrefix = 'xplatTestAppCreate';
var createdApps = [];
var spObjectId

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
    
    describe('sp', function () {
      it('create list show and delete should work', function (done) {
        var appName = suite.generateId(appPrefix, createdApps);
        var idUri = 'https://' + appName + '.com/home';
        var replyUrls = 'https://locahost:9090,https://localhost:8080';
        suite.execute('ad sp create -n testapp --home-page http://www.bing.com --identifier-uris %s -r %s --json', idUri, replyUrls, function (result) {
          result.exitStatus.should.equal(0);
          var sp = JSON.parse(result.text);
          spObjectId = sp.objectId;
          var appId = sp.appId;
          result.exitStatus.should.equal(0);
          suite.execute('ad sp show --spn %s --json', appId, function(result) {
            result.exitStatus.should.equal(0);
            var showSp = JSON.parse(result.text);
            showSp[0].objectId.should.equal(spObjectId);
            suite.execute('ad sp list --json', function(result) {
              result.exitStatus.should.equal(0);
              var splist = JSON.parse(result.text);
              splist.length.should.be.above(0);
              splist.some(function(item) {
                return item.objectId === spObjectId;
              }).should.be.true;
              suite.execute('ad sp delete --objectId %s -q --json', spObjectId, function(result) {
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