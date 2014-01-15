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

var AFFINITYGROUP_NAME_PREFIX = 'xplat-afg-';
var AFFINITYGROUP_LOCATION = process.env.AZURE_SITE_TEST_LOCATION || 'West US';

var createdAffinityGroups = [];

var testPrefix = 'cli.affinitygroup-tests';

describe('cli', function () {
  describe('account affinity-group', function () {
    var suite;
    var affinityGroupName;

    before(function (done) {
      suite = new CLITest(testPrefix);
      affinityGroupName = suite.generateId(AFFINITYGROUP_NAME_PREFIX, createdAffinityGroups);

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

    describe('account affinity-group create', function () {
      it('should succeed', function (done) {
        suite.execute('account affinity-group create %s --location %s --description AG-DESC --json',
          affinityGroupName,
          AFFINITYGROUP_LOCATION,
          function (result) {

          result.exitStatus.should.equal(0);
          result.text.should.be.empty;

          done();
        });
      });
    });

    describe('account affinity-group show', function () {
      it('should fail if name is invalid', function (done) {
        suite.execute('account affinity-group show !NotValid$ --json', function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.not.be.empty;
          result.text.should.be.empty;

          done();
        });
      });

      it('should succeed', function (done) {
        suite.execute('account affinity-group show %s --json', affinityGroupName, function (result) {
          result.exitStatus.should.equal(0);

          var affinityGroup = JSON.parse(result.text);

          affinityGroup.name.should.equal(affinityGroupName);
          affinityGroup.description.should.equal('AG-DESC');
          affinityGroup.location.should.equal(AFFINITYGROUP_LOCATION);
          affinityGroup.label.should.equal(affinityGroupName);

          done();
        });
      });
    });

    describe('account affinity-group list', function () {
      it('should succeed', function (done) {
        suite.execute('account affinity-group list --json', function (result) {
          result.exitStatus.should.equal(0);

          var found = false;
          JSON.parse(result.text).forEach(function (affinityGroup) {
            if(affinityGroup.name === affinityGroupName) {
              found = true;

              affinityGroup.name.should.equal(affinityGroupName);
              affinityGroup.description.should.equal('AG-DESC');
              affinityGroup.location.should.equal(AFFINITYGROUP_LOCATION);
              affinityGroup.label.should.equal(affinityGroupName);
            }
          });
          found.should.equal(true);

          done();
        });
      });
    });

    describe('account affinity-group delete', function () {
      it('should fail if name is invalid', function (done) {
        suite.execute('account affinity-group delete !NotValid$ --quiet --json', function (result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.not.be.empty;
          result.text.should.be.empty;

          done();
        });
      });

      it('should succeed', function (done) {
        suite.execute('account affinity-group delete %s --quiet --json', affinityGroupName, function (result) {
          result.exitStatus.should.equal(0);
          result.text.should.be.empty;

          done();
        });
      });
    });
  });
});