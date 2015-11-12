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

var should = require('should');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var svcPrefix = 'clitestcert';
var testPrefix = 'cli.service.cert-tests';
var svcNames = [];
var certFile = './test/commands/mobile/cert.pfx';
var password = 'password';
var thumbprint = '8824022CB382CADD9E19290449B893A839140962';
var thumbprintAlgorithm = 'sha1';

var requiredEnvironment = [
  { name: 'AZURE_CLOUD_SERVICE_TEST_LOCATION', defaultValue: 'West US'}
];

describe('cli', function() {
  describe('service', function() {
    var location, timeout, retry = 5;
    testUtils.TIMEOUT_INTERVAL = 10000;

    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        svcName = suite.generateId(svcPrefix, svcNames);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        location = process.env.AZURE_CLOUD_SERVICE_TEST_LOCATION;
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //create a image
    describe('certificate:', function() {

      it('create service', function(done) {
        suite.execute('node cli.js service create --serviceName %s --location %s --json', svcName, location, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('create certificate', function(done) {
        suite.execute('node cli.js service cert create %s %s %s --json', svcName, certFile, password, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('list certificates', function(done) {
        suite.execute('node cli.js service cert list --json', function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('list service certificates', function(done) {
        suite.execute('node cli.js service cert list --serviceName %s --json', svcName, function (result) {
          result.exitStatus.should.equal(0);
          var certs = JSON.parse(result.text);
          thumbprint = certs[0].thumbprint;
          thumbprintAlgorithm = certs[0].thumbprintAlgorithm;
          done();
        });
      });

      it('get certificate', function(done) {
        suite.execute('node cli.js service cert get --service-name %s --thumbprint %s --thumbprint-algorithm %s --json', svcName, thumbprint, thumbprintAlgorithm, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete', function(done) {
        suite.execute('node cli.js service cert delete %s %s --json', svcName, thumbprint, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete service', function(done) {
        suite.execute('node cli.js service delete %s -q --json', svcName, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

  });
});