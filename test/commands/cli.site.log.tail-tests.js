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

var gitUsername = process.env['AZURE_GIT_USERNAME'];

var suite;
var testPrefix = 'cli.site.log.tail-tests';

var siteNamePrefix = 'clitest';
var siteNames = [];

describe('cli', function () {
  describe('site log', function () {
    var createdSites = [];

    before(function (done) {
      suite = new CLITest(testPrefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      var deleteSites = function () {
        if (createdSites.length > 0) {
          deleteSite(createdSites.pop(), deleteSites);
        } else {
          return suite.teardownTest(done);
        }
      };

      deleteSites();
    });

    it('should show tail', function (done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      createSite(siteName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        showSite(siteName, function (result) {
          result.exitStatus.should.equal(0);

          connectLogStream(siteName, function (result) {
            result.text.replace(/\n/g, '').should.include('Welcome, you are now connected to log-streaming service.');

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
      setTimeout(function () { process.exit(0); }, 5000);
      suite.execute('node cli.js site log tail %s --log', siteName, callback);
    }
  });
});