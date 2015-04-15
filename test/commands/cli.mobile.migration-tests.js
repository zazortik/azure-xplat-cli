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

/*
 INSTRUCTIONS FOR RE-GENERATING THE NOCK FILE:

  1. Make sure the tests are passing against live Microsoft Azure endpoints:
  1.0. Remember to register your Microsoft Azure credentials with `azure account import`
  1.1. Set the NOCK_OFF environment variable to `true`
  1.2. Run tests with `npm test`

  2. Re-run the tests against the live Microsoft Azure endpints while capturing the
     HTTP traffic:
  2.1. set NOCK_OFF=
  2.2  set AZURE_NOCK_RECORD=true  
  2.3. Run the tests with `npm test`. The new cli.mobile.domain-tests.nock.js will be generated.

  3. Validate the new mocks:
  3.1. set NOCK_OFF=
  3.2. set AZURE_NOCK_RECORD=
  3.3. Run the tests with `npm test`.
*/

var should = require('should');
var path = require('path');
var async = require('async');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.mobile.migration-tests';

var migrateFromLocation = 'West US';
var migrateToLocation = 'East US';

var primaryServiceName = 'brettsam-west-test';
var secondaryServiceName = 'brettsam-east-test';

function createService(serviceName, region, callback) {
  suite.execute('mobile create %s brettsam FooBar#12 -p legacy -l %s --json', serviceName, region, function(result) {
    result.exitStatus.should.equal(0);
    var response = JSON.parse(result.text);
    response.should.have.property('Name', serviceName + 'mobileservice');
    response.should.have.property('Label', serviceName);
    response.should.have.property('State', 'Healthy');

    callback();
  });
}

function scaleToBasic(serviceName, callback) {
  suite.execute('mobile scale change %s -t basic -i 1 --json', serviceName, function (result) {
    result.exitStatus.should.equal(0);
    result.text.should.equal('');

    callback();
  });
}

function deleteService(serviceName, callback) {
  suite.execute('mobile delete %s -a -q -n --json', serviceName, function (result) {
    // don't check for success here; this is used for cleanup and it may return 404.
    callback();
  });
}

describe('cli', function () {
  describe('mobile', function() {
    before(function (done) {
      suite = new CLITest(testPrefix);
      suite.setupSuite(function() {
        if (!suite.isPlayback()) {
          async.series([
              function(callback) {
                  createService(primaryServiceName, migrateFromLocation, callback);
              },
              function(callback) {
                  createService(secondaryServiceName, migrateToLocation, callback);
              },
              function(callback) {
                  scaleToBasic(primaryServiceName, callback);
              },
              function(callback) {
                  scaleToBasic(secondaryServiceName, callback);
              }
              ],
              function() {
                  done();
              }
          );
        } else {
          done();
        }
      });
    });

    after(function (done) {
      suite.teardownSuite(function() {
        if (!suite.isPlayback()) {
          async.series([
              function(callback) {
                  deleteService(primaryServiceName, callback);
              },
              function(callback) {
                  deleteService(secondaryServiceName, callback);
              }
              ],
              function() {
                  done();
              }
          );
        } else {
          done();
        }
      });
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('migrate ' + primaryServiceName + ' to ' + secondaryServiceName, function (done) {
      suite.execute('mobile migrate %s %s -q --json', primaryServiceName, secondaryServiceName, function (result) {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        result.errorText.should.equal('');
        
        done();
      });
    });

  });
});