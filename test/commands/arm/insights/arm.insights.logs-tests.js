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

var __ = require("underscore");
var should = require('should');

var util = require('util');
var fs = require('fs');
var path = require('path');
var writeLogFile = function(text, name) { 
  var parameterFile = path.join(__dirname, '../../../data/' + name + '.txt');
  fs.writeFileSync(parameterFile, text); 
};

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-insights-logs-tests';
var utils = require('../../../../lib/util/utils');

var insightsUtils = require('../../../../lib/commands/arm/insights/insights.utils');

var requiredEnvironment = [
  { requiresToken: true }
];

var createdGroups = [];
var createdResources = [];

describe('arm', function () {
  describe('insights', function() {
    describe('logs', function() {
      var suite;
      var resourceId;

      before(function(done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        suite.setupSuite(done);
      });

      after(function(done) {
        suite.teardownSuite(done);
      });

      beforeEach(function(done) {
        suite.setupTest(function() {
          resourceId = '/subscriptions/b67f7fec-69fc-4974-9099-a26bd6ffeda3/resourceGroups/Default-Web-brazilsouth/providers/microsoft.web/serverFarms/Default1/events/2fc383ab-a60b-4334-abb2-ef47ce36f112/ticks/635635968009558815';
          done();
        });
      });

      afterEach(function(done) {
        suite.teardownTest(done);
      });

      describe('list', function () {
        // Testing retrieval by subscriptionId
        it('should work without params', function (done) {
          suite.execute('insights logs list --json', function (result) {
            result.exitStatus.should.equal(0);
              
            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(2);
            }

            __.each(response, function(record) {
              ((record["correlationId"] === 'da3210d1-3abc-48bd-99ea-abb4ece57ef7') ||
                 (record["correlationId"] === 'da3210d1-3abc-48bd-99ea-abb4ece57ef7') ||
                 (record["correlationId"] === 'a8690cfc-2b1d-40eb-8464-a9567609ca0b')).should.be.true;
              (record["subscriptionId"] === 'b67f7fec-69fc-4974-9099-a26bd6ffeda3').should.be.true;

              // Because the query does not ask for details
              var expectedFieldsCase = insightsUtils.selectedFields.split(",");
              var expectedFields = [];
              __.each(expectedFieldsCase, function (fieldName) { expectedFields.push(fieldName.toLowerCase()); });
              for (var field in record) {
                if (field !== "id" && field !== "properties" && field !== "claims") {
                  expectedFields.indexOf(field.toLowerCase()).should.be.above(-1);
                }
              }
            });
            done();
          });
        });

        it('should work', function(done) {
          suite.execute('insights logs list -b %s -e %s -d --json', '2015-04-02T11:06:00', '2015-04-02T12:06:00', function(result) {
            result.exitStatus.should.equal(0);
              
            // The query must succeed, but the response must be empty
            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(0);
            }
      
            done();
          });
        });

        it('should fail if the start date is later than Now', function(done) {
          suite.execute('insights logs list -b %s -d --json', '2100-01-01T01:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('Start date is later than Now');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail if the end date is earlier than the start date', function(done) {
          suite.execute('insights logs list -b %s -e %s -d --json', '2015-03-02T13:00:00', '2015-03-01T13:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('End date is earlier than start date');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        it('should fail if the end date and the start date are too far apart', function(done) {
          suite.execute('insights logs list -b %s -e %s -d --json', '2015-03-01T13:00:00', '2015-04-01T13:00:00', function(result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('Time range exceeds maximum allowed');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        // Testing mutually exclusive parameters
        it('should fail if the end date and the start date are too far apart', function (done) {
          suite.execute('insights logs list -c %s -g %s -b %s -e %s -d --json', '2ad3397d-8120-4754-ad47-d2ca058330fc', 'Default-Web-brazilsouth','2015-03-01T13:00:00', '2015-04-01T13:00:00', function (result) {
            result.exitStatus.should.equal(1);
            var expectedError = util.format('The switches correlationId, resourceGroup, resourceId, and resourceProvider are optional and mutually exclusive.');
            result.errorText.should.include(expectedError);
            done();
          });
        });

        // Testing for correlationId
        it('correlationId should work without options', function (done) {
          suite.execute('insights logs list -c %s --json', '8ca345e1-409c-4183-930f-8150396513ed', function (result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(0);
            }
            
            done();
          });
        });
        
        it('correlationId should work', function (done) {
          suite.execute('insights logs list -c %s -b %s -e %s --json', 'a8690cfc-2b1d-40eb-8464-a9567609ca0b', '2015-04-20T20:15:44.547Z', '2015-04-20T21:15:44.547Z', function (result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(2);
            }
            
            __.each(response, function (record) {
              (record["correlationId"] === 'a8690cfc-2b1d-40eb-8464-a9567609ca0b').should.be.true;
              (record["subscriptionId"] === 'b67f7fec-69fc-4974-9099-a26bd6ffeda3').should.be.true;
              
              // Because the query does not ask for details
              var expectedFieldsCase = insightsUtils.selectedFields.split(",");
              var expectedFields = [];
              __.each(expectedFieldsCase, function (fieldName) { expectedFields.push(fieldName.toLowerCase()); });
              for (var field in record) {
                if (field !== "id" && field !== "properties" && field !== "claims") {
                  expectedFields.indexOf(field.toLowerCase()).should.be.above(-1);
                }
              }
            });
            
            done();
          });
        });

        // Testing for resource group
        it('resource group should work without options', function (done) {
          suite.execute('insights logs list -g %s --json', 'Default-Web-brazilsouth', function (result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(1);
            }
            
            __.each(response, function (record) {
              (record["resourceGroupName"].toLowerCase() === 'default-web-brazilsouth').should.be.true;
              (record["subscriptionId"] === 'b67f7fec-69fc-4974-9099-a26bd6ffeda3').should.be.true;
              
              // Because the query does not ask for details
              var expectedFieldsCase = insightsUtils.selectedFields.split(",");
              var expectedFields = [];
              __.each(expectedFieldsCase, function (fieldName) { expectedFields.push(fieldName.toLowerCase()); });
              for (var field in record) {
                if (field !== "id" && field !== "properties" && field !== "claims") {
                  expectedFields.indexOf(field.toLowerCase()).should.be.above(-1);
                }
              }
            });
            
            done();
          });
        });
        
        it('resource group should work', function (done) {
          suite.execute('insights logs list -g %s -b %s -e %s -d --json', 'Default-Web-brazilsouth', '2015-04-02T11:06:00', '2015-04-02T12:06:00', function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });

        // Testing for resource provider
        it('resource provider should work without options', function (done) {
          suite.execute('insights logs list -p %s --json', 'microsoft.web', function (result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(1);
            }

            __.each(response, function (record) {
              record["resourceId"].indexOf("/providers/microsoft.web/").should.be.above(-1);
              (record["subscriptionId"] === 'b67f7fec-69fc-4974-9099-a26bd6ffeda3').should.be.true;
              
              // Because the query does not ask for details
              var expectedFieldsCase = insightsUtils.selectedFields.split(",");
              var expectedFields = [];
              __.each(expectedFieldsCase, function (fieldName) { expectedFields.push(fieldName.toLowerCase()); });
              for (var field in record) {
                if (field !== "id" && field !== "properties" && field !== "claims") {
                  expectedFields.indexOf(field.toLowerCase()).should.be.above(-1);
                }
              }
            });
            
            done();
          });
        });
        
        it('resource provider should work', function (done) {
          suite.execute('insights logs list -p %s -b %s -e %s -d --json', 'microsoft.web', '2015-04-02T11:06:00', '2015-04-02T12:06:00', function (result) {
            result.exitStatus.should.equal(0);

            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(0);
            }
            
            done();
          });
        });

        // Testing for resource
        it('resource should work without options', function (done) {
          suite.execute('insights logs list -i %s --json', resourceId, function (result) {
            result.exitStatus.should.equal(0);
            
            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(0);
            }
            
            done();
          });
        });
        
        it('resource should work', function (done) {
          suite.execute('insights logs list -i %s -b %s -e %s -d --json', resourceId, '2015-04-02T11:06:00', '2015-04-02T12:06:00', function (result) {
            result.exitStatus.should.equal(0);
            
            var response = JSON.parse(result.text);
            if (suite.isPlayback()) {
              response.length.should.equal(0);
            }
            
            done();
          });
        });
      });
    });
  });
});