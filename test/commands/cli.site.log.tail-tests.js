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
var testPrefix = 'cli.site.log.tail-tests';

var siteNamePrefix = 'clitest';

var requiredEnvironment = [
  'AZURE_GIT_USERNAME',
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'}
];
describe('cli', function () {
  describe('site log', function () {
    var siteNames = [];
    var location;
    var gitUsername;

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_SITE_TEST_LOCATION;
        gitUsername = process.env.AZURE_GIT_USERNAME;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(function () {
        siteNames.forEach(function (site) {
          deleteSite(site, function () {
          });
        });
        done();
      });
    });

    it('should show tail', function (done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      createSite(siteName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        showSite(siteName, function (result) {
          result.exitStatus.should.equal(0);

          connectLogStream(siteName, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    });

    function createSite(siteName, callback) {
      suite.execute('site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, 'East US', callback);
    }

    function showSite(siteName, callback) {
      suite.execute('site show %s --json', siteName, callback);
    }

    function deleteSite(siteName, callback) {
      suite.execute('site delete %s --json --quiet', siteName, callback);
    }

    function connectLogStream(siteName, callback) {
      setTimeout(function () { process.exit(0); }, suite.isPlayback() ? 0 : 5000);
      suite.execute('node cli.js site log tail %s --log', siteName, callback);
    }
  });
});