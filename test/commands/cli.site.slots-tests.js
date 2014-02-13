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
var url = require('url');
var GitHubApi = require('github');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.site.slot-tests';

var createdSitesPrefix = 'slots';
var createdSites = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

describe('cli', function () {
  describe('slot', function() {
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
      function removeSite(callback) {
        if (createdSites.length === 0) {
          return callback();
        }

        var siteName = createdSites.pop();
        suite.execute('site delete %s --json --quiet', siteName, function () {
          removeSite(callback);
        });
      }

      removeSite(function () {
        suite.teardownTest(function () {
          done();
        });
      });
    });

    it('creates a slot for a site', function (done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites);
      var slot = 'staging';

      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('site scale mode standard %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site create %s --slot %s --json', siteName, slot, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });

    it('deletes a slot for a site', function (done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites);
      var slot = 'staging';

      suite.execute('site create %s --location %s --json', siteName, location, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('site scale mode standard %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site create %s --slot %s --json', siteName, slot, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('site delete %s --slot %s --json --quiet', siteName, slot, function (result) {
              result.exitStatus.should.equal(0);

              suite.execute('site show %s --json', siteName, function (result) {
                result.exitStatus.should.equal(0);

                done();
              });
            });
          });
        });
      });
    });

    it('swaps a slot for a site', function (done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites);
      var slot = 'staging';

      suite.execute('site create %s --location %s --json', siteName, location, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('site scale mode standard %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site create %s --slot %s --json', siteName, slot, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('site swap %s --json --quiet', siteName, function (result) {
              result.exitStatus.should.equal(0);

              done();
            });
          });
        });
      });
    });
  });
});