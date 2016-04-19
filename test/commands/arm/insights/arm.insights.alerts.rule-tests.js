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

var __ = require('underscore');
var should = require('should');

var util = require('util');
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-insights-alerts-rule-tests';
var utils = require('../../../../lib/util/utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('alerts', function () {
      describe('rule', function() {
        var suite;
        var resourceId;
        var location;
        var description;
        var windowSize;
        var operationName;
        var actions;

        before(function(done) {
          suite = new CLITest(this, testprefix, requiredEnvironment);
          suite.setupSuite(done);
          
          // suite.execute('insights alerts rule metric set CPU westus %s 00:05:00 GreaterThan 1 %s %s Total', 'Default-Web-WestUS', '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/Microsoft.Web/sites/minuevositio2', 'CPU Time', function (result) { });
          // suite.execute('insights alerts rule metric set requestignhas westus %s 00:05:00 GreaterThan 5 %s Requests Total', 'Default-Web-WestUS', '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/Microsoft.Web/sites/minuevositio2', function (result) { });
        });

        after(function(done) {
          suite.teardownSuite(done);
        });

        beforeEach(function(done) {
          suite.setupTest(function () {
            resourceId = '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/Microsoft.Web/sites/minuevositio2';
            location = 'westus';
            description = 'Pura vida';
            windowSize = '00:05:00';
            operationName = 'microsoft.web/sites/delete';
            actions = '[{\"customEmails\":[\"gu@ms.com\"],\"type\":\"Microsoft.Azure.Management.Insights.Models.RuleEmailAction\"}, {\"serviceUri\":\"http://foo.com\",\"properties\":{\"key1\":\"value1\"},\"type\":\"Microsoft.Azure.Management.Insights.Models.RuleWebhookAction\"}]';
            done();
          });
        });

        afterEach(function(done) {
          suite.teardownTest(done);
        });

        describe('list', function() {
          it('should work with rg only', function(done) {
            suite.execute('insights alerts rule list %s --json', 'Default-Web-WestUS', function(result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.length.should.equal(7);

                      response[1].name.should.equal('CPU');
              }

              __.each(response, function(record) {
                record.should.have.property('properties');
                record.should.have.property('tags');

                record.properties.should.have.property('actions');
                record.properties.should.have.property('condition');
              });

              done();
            });
          });
      
          it('should work with target resource id', function (done) {
            suite.execute('insights alerts rule list %s -i %s --json', 'Default-Web-WestUS', resourceId, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                response.length.should.equal(2);

                response[1].should.have.property('name');
                response[1].name.should.equal('requestignhas');
              }
              
              __.each(response, function (record) {
                record.should.have.property('properties');
                record.should.have.property('tags');
                
                record.properties.should.have.property('actions');
                record.properties.should.have.property('condition');
              });

              done();
            });
          });
      
          it('should work with target rule name', function (done) {
            suite.execute('insights alerts rule list %s -n %s --json', 'Default-Web-WestUS', 'requestignhas', function (result) {
              result.exitStatus.should.equal(0);

              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.length.should.equal(1);
                   
                      response[0].name.should.equal('requestignhas');
                      response[0].should.have.property('properties');
                      // response[0].should.have.property('tags');
                      response[0].properties.should.have.property('actions');
                      response[0].properties.should.have.property('condition');
              }

              done();
            });
          });
        });

        describe('set', function () {
          it('should work for metric rules', function (done) {
            suite.execute('insights alerts rule metric set requestignhas %s %s %s GreaterThan 1 %s %s Total --description %s --json', location, 'Default-Web-WestUS', windowSize, resourceId, 'Requests', description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);

              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);

              done();
            });
          });

          it('should disable a metric rule', function (done) {
            suite.execute('insights alerts rule metric set requestignhas %s %s %s GreaterThan 1 %s %s Total --description %s --disable --json', location, 'Default-Web-WestUS', windowSize, resourceId, 'Requests', description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);

              done();
            });
          });
          
          it('should work for metric rules with actions', function (done) {
            suite.execute('insights alerts rule metric set requestignhas %s %s %s GreaterThan 1 %s %s Total --actions %s --description %s --json', location, 'Default-Web-WestUS', windowSize, resourceId, 'Requests', actions, description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(201);
              
              done();
            });
          });

          it('should work for log rules', function (done) {
            suite.execute('insights alerts rule log set logRule %s mytestrg005 create -d %s --json', 'East US', description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              
              done();
            });
          });
          
          it('should work for log rules with actions', function (done) {
            suite.execute('insights alerts rule log set logRuleActions %s mytestrg005 create --actions %s -d %s --json', 'East US', actions, description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              
              done();
            });
          });

          it('should disable a log rule', function (done) {
            suite.execute('insights alerts rule log set logRule %s mytestrg005 create -d %s --disable --json', 'East US', description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              
              done();
            });
          });

          it.skip('should work for webtest rules', function (done) {
            suite.execute('insights alerts rule webtest set %s %s %s %s %s %s %s --json', 'leowebtestr1-webtestr1', 'eastus', 'Default-Web-WestUS', windowSize, 1, 'GSMT_AvRaw', '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/microsoft.insights/webtests/leowebtestr1-webtestr1', function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              
              done();
            });
          });
          
          it.skip('should disable a webtest rule', function (done) {
            suite.execute('insights alerts rule webtest set %s %s %s %s %s %s %s --disable --json', 'leowebtestr1-webtestr1', '"East US"', 'Default-Web-WestUS', windowSize, 1, 'GSMT_AvRaw', '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/microsoft.insights/webtests/leowebtestr1-webtestr1', function (result) {

              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              
              done();
            });
          });
        });

        describe('delete', function () {
          it('should work', function (done) {
            // NOTE: this must be executed before all the tests (it is not working in 'before')
            // 'node bin\azure insights alerts rule metric set CPU westus Default-Web-WestUS 00:05:00 GreaterThan 1 /subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/Microsoft.Web/sites/minuevositio2 CpuTime Total'
            // 'node bin\azure insights alerts rule metric set requestignhas westus Default-Web-WestUS 00:05:00 GreaterThan 5 /subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourcegroups/Default-Web-WestUS/providers/Microsoft.Web/sites/minuevositio2 Requests Total

            suite.execute('insights alerts rule delete %s requestignhas --json', 'Default-Web-WestUS', function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');

              response.statusCode.should.equal(200);

              done();
            });
          });
        });
      });
    });
  });
});