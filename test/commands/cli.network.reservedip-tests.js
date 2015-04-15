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
var should = require('should');
var CLITest = require('../framework/cli-test');
var suite;
var testPrefix = 'cli.network.reservedip-tests';
var requiredEnvironment = [{
  name: 'AZURE_SITE_TEST_LOCATION',
  defaultValue: 'West US'
}];
describe('cli', function() {
  describe('network', function() {
    var ripname = 'clitestrip',
      location, ripcreated = false;
    before(function(done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });
    after(function(done) {
      suite.teardownSuite(done);
    });
    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env['AZURE_SITE_TEST_LOCATION'];
        done();
      });
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });
    describe('reserved ip:', function() {
      it('create list and show', function(done) {
        suite.execute('network reserved-ip create %s %s --json', ripname, location, function(result) {
          result.exitStatus.should.equal(0);
          suite.execute('network reserved-ip list --json', function(result) {
            result.exitStatus.should.equal(0);
            var ripList = JSON.parse(result.text);
            ripList.length.should.above(0);
            var ripObj;
            var exists = ripList.some(function(v) {
              if (v.name === ripname) {
                ripObj = v;
                return true;
              }
            });
            exists.should.equal(true);
            suite.execute('network reserved-ip show %s --json', ripObj.name, function(result) {
              result.exitStatus.should.equal(0);
              var rip = JSON.parse(result.text);
              rip.location.should.equal(location);
              ripcreated = true;
              done();
            });
          });
        });
      });
      it('delete', function(done) {
        if (ripcreated) {
          suite.execute('network reserved-ip delete %s -q --json', ripname, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        } else {
          console.log('no reserved-ip to delete');
          done();
        }
      });
    });
  });
});