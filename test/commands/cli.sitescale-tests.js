/**
* Copyright 2012 Microsoft Corporation
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

var uuid = require('node-uuid');

var should = require('should');
var executeCmd = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var createdSitesPrefix = 'clisitescale-';
var createdSites = [];

var suiteUtil;
var testPrefix = 'cli.sitescale-tests';

describe('cli', function () {
  describe('SiteScale', function () {
    before(function (done) {
      process.env.AZURE_ENABLE_STRICT_SSL = false;

      suiteUtil = new MockedTestUtils(testPrefix, true);

      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(function () {
        delete process.env.AZURE_ENABLE_STRICT_SSL;
        done();
      });
    });

    afterEach(function (done) {
      function removeSite(callback) {
        if (createdSites.length === 0) {
          return callback();
        }

        var siteName = createdSites.pop();
        var cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
        executeCmd(cmd, function (result) {
          removeSite(callback);
        });
      }

      removeSite(function () {
        suiteUtil.teardownTest(function () {
          done();
        });
      });
    });

    it('should be able to set the scale mode', function(done) {
      var siteName = suiteUtil.generateId(createdSitesPrefix, createdSites);

      var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
      cmd.push('North Europe');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        cmd = ('node cli.js site scale mode ' + siteName + ' free --json ').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          var cmd = ('node cli.js site scale mode ' + siteName + ' shared --json').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });

    describe('instances', function() {
      var siteName;

      beforeEach(function (done) {
        siteName = suiteUtil.generateId(createdSitesPrefix, createdSites);

        var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
        cmd.push('North Europe');
        executeCmd(cmd, function (result) {
          done();
        });
      });

      it('should not be able to set instances on a free site', function (done) {
        var cmd = ('node cli.js site scale instances ' + siteName + ' 2 small --json ').split(' ');
        executeCmd(cmd, function (result) {
          result.errorText.indexOf('Instances can only be changed for sites in reserved mode').should.not.equal(-1);
          result.exitStatus.should.equal(1);

          done();
        });
      });

      it('should be able to set the instances number and size', function(done) {
        var cmd = ('node cli.js site scale mode ' + siteName + ' reserved --json').split(' ');
        executeCmd(cmd, function (result) {
          cmd = ('node cli.js site scale instances ' + siteName + ' 2 small --json ').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });
  });
});