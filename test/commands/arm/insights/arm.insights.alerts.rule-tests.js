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

        before(function(done) {
          suite = new CLITest(this, testprefix, requiredEnvironment);
          suite.setupSuite(done);
        });

        after(function(done) {
          suite.teardownSuite(done);
        });

        beforeEach(function(done) {
          suite.setupTest(function () {
            resourceId = '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/mytestrg005/providers/Microsoft.Web/sites/mytestweb005';
            location = 'East US';
            description = 'Pura vida';
            windowSize = '00:05:00';
            done();
          });
        });

        afterEach(function(done) {
          suite.teardownTest(done);
        });

        describe('list', function() {
          it('should work with rg only', function(done) {
            suite.execute('insights alerts rule list %s --json', 'mytestrg005', function(result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.length.should.equal(5);

                      response[0].name.should.equal('CPUHigh mytestwhp005');
              }

              __.each(response, function(record) {
                record.should.have.property('properties');
                record.should.have.property('tags');

                record.properties.should.have.property('action');
                record.properties.should.have.property('condition');
              });

              done();
            });
          });
      
          it('should work with target resource id', function (done) {
            suite.execute('insights alerts rule list %s -i %s --json', 'mytestrg005', resourceId, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.length.should.equal(3);
                    
                      response[0].name.should.equal('ForbiddenRequests mytestweb005');
              }
              
              __.each(response, function (record) {
                record.should.have.property('properties');
                record.should.have.property('tags');
                
                record.properties.should.have.property('action');
                record.properties.should.have.property('condition');
              });

              done();
            });
          });
      
          it('should work with target rule name', function (done) {
            suite.execute('insights alerts rule list %s -n %s --json', 'mytestrg005', 'requestignhas-7c5d03cd-6715-4a7e-9eee-639a8fa38eda', function (result) {
              result.exitStatus.should.equal(0);

              var response = JSON.parse(result.text);
              if (suite.isPlayback()) {
                      response.length.should.equal(1);
                   
                      response[0].name.should.equal('requestignhas-7c5d03cd-6715-4a7e-9eee-639a8fa38eda');
                      response[0].should.have.property('properties');
                      // response[0].should.have.property('tags');
                      response[0].properties.should.have.property('action');
                      response[0].properties.should.have.property('condition');
              }

              done();
            });
          });
        });

        describe('set', function () {
          it('should work for metric rules', function (done) {
            suite.execute('insights alerts rule set Metric chiricutin %s mytestrg005 -o GreaterThan --threshold 2 --windowSize %s --resourceId %s --metricName Requests --description %s --timeAggregationOperator Total --json', location, windowSize, resourceId, description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);

              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(201);
              response.requestId.should.equal('9d77e298-b3ac-4b1a-b3d8-54f6cb6776cd');

              done();
            });
          });

          it('should disable a rule', function (done) {
            suite.execute('insights alerts rule set Metric chiricutin %s mytestrg005 -o GreaterThan --threshold 2 --windowSize %s --resourceId %s --metricName Requests --description %s --timeAggregationOperator Total --disable --json', location, windowSize, resourceId, description, function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');
              
              response.statusCode.should.equal(200);
              response.requestId.should.equal('ce9ed823-9658-4d5e-bca8-8a261d042522');

              done();
            });
          });
        });

        describe('delete', function () {
          it('should work', function (done) {
            suite.execute('insights alerts rule delete mytestrg005 chiricutin --json', function (result) {
              result.exitStatus.should.equal(0);
              
              var response = JSON.parse(result.text);
              
              response.should.have.property('statusCode');
              response.should.have.property('requestId');

              response.statusCode.should.equal(200);
              response.requestId.should.equal('dc7d8d22-2eeb-4d8d-9469-a92b7476fdfd');

              done();
            });
          });
        });
      });
    });
  });
});