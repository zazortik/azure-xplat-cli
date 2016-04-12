//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var _ = require('underscore');
var should = require('should');
var sinon = require('sinon');
var util = require('util');
var applicationInsights = require('applicationinsights');

describe('cli', function() {
  describe('telemetry', function() {
    var sandbox = sinon.sandbox.create();
    var telemetry = require('../../lib/util/telemetry');
    var testInstrumentationKey = "1234";

    beforeEach(function (done) {
      var client = applicationInsights.setup(testInstrumentationKey).client;
            
      // stub AppInsights functions.
      sandbox.stub(applicationInsights, 'setup', function(ikey) {
        return applicationInsights;
      });

      sandbox.stub(applicationInsights, 'start', function() {
        return applicationInsights;
      });

      sandbox.stub(applicationInsights, 'setAutoCollectExceptions', function(enabled) {
        return applicationInsights;
      });

      sandbox.stub(applicationInsights, 'setAutoCollectPerformance', function(enabled) {
        return applicationInsights;
      });

      sandbox.stub(applicationInsights, 'setAutoCollectRequests', function(enabled) {
        return applicationInsights;
      });

      sandbox.stub(client, 'sendPendingData', function(callback) {
        if (typeof callback === 'function') {
          callback();
        }
      });

      done();
    });

    afterEach(function (done) {
      sandbox.restore();
      done();
    });

    it('should not send out event if data-collection is not enabled', function(done){
      var track = sandbox.spy(applicationInsights.client, 'track');

      telemetry.init(false)
      telemetry.start(['foo', 'bar', 'azure', 'login']);
      telemetry.currentCommand({
        fullName: function() {
          return 'azure login';
        }
      });
      telemetry.onFinish(function() {});

      (track.called).should.be.false;
      done();
    });

    it('should encrypt user sensitive data', function(done) {
      var eventData;
      sandbox.stub(applicationInsights.client, 'track', function(data) {
        eventData = data;
      });

      telemetry.setAppInsights(applicationInsights);
      telemetry.init(true);
      telemetry.start(['foo', 'bar', 'azure', 'login', '-u', 'foo', '-p', 'bar']);
      telemetry.currentCommand({
        fullName: function() {
          return 'azure login';
        }
      });
      telemetry.onFinish(function() {});

      (eventData.baseData.properties.command === 'azure login -u *** -p ***').should.be.true;
      done();
    });

    it('should catch exception and encrypt exception data', function(done) {
      var eventData;
      sandbox.stub(applicationInsights.client, 'track', function(data) {
        eventData = data;
      });

      telemetry.setAppInsights(applicationInsights);
      telemetry.init(true)
      telemetry.start(['foo', 'bar', 'azure', 'login', '-u', 'foo', '-p', 'bar']);
      telemetry.currentCommand({
        fullName: function() {
          return 'azure login';
        }
      });
      var err = new Error('error');
      telemetry.onError(err, function() {});
      (eventData.baseData.properties.isSuccess).should.be.false;
      //(eventData.baseData.properties.stacktrace).should.be.true;
      (eventData.baseData.properties.command === 'azure login -u *** -p ***').should.be.true;
      done();
    });

  })
});
