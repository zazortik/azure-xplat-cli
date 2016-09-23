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
      it('create set and delete app should work', function (done) {
        var appName = suite.generateId(appPrefix, createdApps);
        var idUri = 'https://' + appName + '.com/home';
        var replyUrls = 'https://locahost:9090,https://localhost:8080';
        suite.execute('ad app create -n %s --home-page http://www.bing.com --identifier-uris %s -r %s --json', appName, idUri, replyUrls, function (result) {
          result.exitStatus.should.equal(0);
          var application = JSON.parse(result.text);
          var appObjectId = application.objectId;
          var appId = application.appId;
          suite.execute('ad app set --objectId %s -n %s -r %s --json', appObjectId, 'testapp101', 'https://localhost:7878', function(result) {
            suite.execute('ad sp create -a %s --json', appId, function (result) {
              result.exitStatus.should.equal(0);
              var sp = JSON.parse(result.text);
              var spObjectId = sp.objectId;
              suite.execute('ad sp delete -o %s -q', spObjectId, function (result) {
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

      it('get and list app should work', function (done) {
        var appName = suite.generateId(appPrefix, createdApps);
        var idUri = 'https://' + appName + '.com/home';
        suite.execute('ad app create -n %s --home-page http://www.bing.com --identifier-uris %s --json', appName, idUri, function (result) {
          result.exitStatus.should.equal(0);
          var application = JSON.parse(result.text);
          var appObjectId = application.objectId;
          var appId = application.appId;
          var identifierUri = application.identifierUris[0];
          var displayName = application.displayName;

          suite.execute('ad app list --json', function (result) {
            result.exitStatus.should.equal(0);
            var applications = JSON.parse(result.text);
            applications.length.should.be.above(0);
            applications.some(function (res) {
              return (res.appId === appId);
            }).should.be.true;

            suite.execute('ad app show --applicationId %s --json', appId, function (result) {
              result.exitStatus.should.equal(0);
              var applications = JSON.parse(result.text);
              applications.length.should.equal(1);
              applications[0].appId.should.equal(appId);
              
              suite.execute('ad app show --objectId %s --json', appObjectId, function (result) {
                result.exitStatus.should.equal(0);
                var applications = JSON.parse(result.text);
                applications.length.should.equal(1);
                applications[0].objectId.should.equal(appObjectId);
                
                suite.execute('ad app show --identifierUri %s --json', identifierUri, function (result) {
                  result.exitStatus.should.equal(0);
                  var applications = JSON.parse(result.text);
                  applications.length.should.equal(1);
                  applications[0].identifierUris.some(function (res) {
                    return (res === identifierUri);
                  }).should.be.true;
                  
                  suite.execute('ad app show --search %s --json', displayName, function (result) {
                    result.exitStatus.should.equal(0);
                    var applications = JSON.parse(result.text);
                    applications.length.should.be.above(0);
                    applications.every(function (res) {
                      return res.displayName.toLowerCase().indexOf(displayName.toLowerCase()) === 0;
                    }).should.be.true;
                    
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

    });
  });
});