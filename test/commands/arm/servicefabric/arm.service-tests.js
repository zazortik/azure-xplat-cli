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
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');


var testprefix = 'arm-cli-servicefabric-tests';
var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  { name: 'AZURE_STORAGE_ACCESS_KEY', defaultValue: null}
];
var clusterEndpoint = '127.0.0.1:10549';
var httpEndpoint = '127.0.0.1:10550';
var applicationPackagePath = '/tmp/StatelessPi';
var applicationPackageName = 'StatelessPi';
var applicationTypeName = 'StatelessPiServiceApp';
var applicationTypeVersion = '1.0';

describe('Service Fabric', function () {
  describe('Test service create to remove', function () {
    var suite;
    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
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
    
    it('should connect to cluster', function (done) {
      suite.execute('servicefabric cluster connect --json ' + httpEndpoint, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should copy application package', function (done) {
      suite.execute('servicefabric application-package copy --json ' + clusterEndpoint + ' ' + applicationPackagePath + ' fabric:ImageStore', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should register application type', function (done) {
      suite.execute('servicefabric application type register --json ' + applicationPackageName, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should create application', function (done) {
      suite.execute('servicefabric application create --json --application-name fabric:/myapp --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should create service', function (done) {
      suite.execute('servicefabric service create --json --application-name fabric:/myapp --service-name fabric:/myapp/svc1 --service-type-name StatelessPiServiceType --service-kind 1 --instance-count 1 --partition-scheme 1', function (result) {
        setTimeout(function () {
          result.exitStatus.should.equal(0);
          done();
        }, 5000);
      });
    });
    
    it('should show health', function (done) {
      suite.execute('servicefabric service health show --json fabric:/myapp/svc1', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should remove service', function (done) {
      suite.execute('servicefabric service remove --json fabric:/myapp/svc1', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should remove application', function (done) {
      suite.execute('servicefabric application remove --json fabric:/myapp', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should unregister application type', function (done) {
      suite.execute('servicefabric application type unregister --json ' + applicationTypeName + ' ' + applicationTypeVersion, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});
