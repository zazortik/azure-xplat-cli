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
var CLITest = require('../framework/arm-cli-test');
var testUtil = require('../util/util');
var utils = require('../../lib/util/utils');


var testprefix = 'arm-cli-servicefabric-tests';
var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  { name: 'AZURE_STORAGE_ACCESS_KEY', defaultValue: null}
];
var httpEndpoint = 'http://10.91.140.221:10550';
var applicationPackagePath = '/media/share/CounterActorApplication';
var applicationPackageName = 'CounterActorApplication';
var applicationTypeName = 'CounterActorApplicationType';
var applicationTypeVersion = '1.0';
var serviceTypeName = 'CounterActor.CounterServiceType';

describe('Service Fabric', function () {
  describe('create service to remove service', function () {
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
      suite.execute('servicefabric cluster connect ' + httpEndpoint + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should copy application package', function (done) {
      suite.execute('servicefabric application-package copy ' + applicationPackagePath + ' fabric:ImageStore' + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should register application type', function (done) {
      suite.execute('servicefabric application type register ' + applicationPackageName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should show application type', function (done) {
      suite.execute('servicefabric application type show ' + applicationTypeName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep([{name: applicationPackageName, version: applicationTypeVersion}]);
        done();
      });
    });
    
    it('should create application', function (done) {
      suite.execute('servicefabric application create --application-name fabric:/myapp --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should show application', function (done) {
      suite.execute('servicefabric application show fabric:/myapp --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({name: 'fabric:/myapp', typeName: applicationTypeName, typeVersion: applicationTypeVersion});
        done();
      });
    });
    
    it('should create service', function (done) {
      suite.execute('servicefabric service create --application-name fabric:/myapp --service-name fabric:/myapp/svc1 --service-type-name ' + serviceTypeName + ' --service-kind Stateful --target-replica-set-size 1 --min-replica-set-size 1 --partition-scheme Singleton --has-persisted-state true --json', function (result) {
        setTimeout(function () {
          result.exitStatus.should.equal(0);
          done();
        }, 5000);
      });
    });
    
    it('should show service', function (done) {
      suite.execute('servicefabric service show fabric:/myapp fabric:/myapp/svc1 --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({name: 'fabric:/myapp/svc1'});
        done();
      });
    });
    
    it('should show health', function (done) {
      suite.execute('servicefabric service health show fabric:/myapp/svc1 --json', function (result) {
        var res = JSON.parse(result.text);
        res.should.have.property('name');
        res.should.have.property('aggregatedHealthState');
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should remove service', function (done) {
      suite.execute('servicefabric service remove fabric:/myapp/svc1 --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should remove application', function (done) {
      suite.execute('servicefabric application remove fabric:/myapp --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should unregister application type', function (done) {
      suite.execute('servicefabric application type unregister ' + applicationTypeName + ' ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});
