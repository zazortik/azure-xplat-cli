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
var testPrefix = 'cli.site.appsetting-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'}
];

describe('cli', function () {
  var location;

  describe('site appsetting', function() {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      function removeSite() {
        if (siteNames.length === 0) {
          return suite.teardownTest(done);
        }

        var siteName = siteNames.pop();
        suite.execute('site delete %s --json --quiet', siteName, function () {
          removeSite();
        });
      }

      removeSite();
    });

    it('should list site appsetting', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site appsetting list %s --json ', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site appsetting add mysetting=myvalue %s --json', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site appsetting list %s --json', siteName, function (result) {
              var settingsList = JSON.parse(result.text);

              // Listing should return 2 setting now
              settingsList.length.should.equal(2);

              // add another setting
              suite.execute('site appsetting add mysetting2=myvalue %s --json', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site appsetting list %s --json', siteName, function (result) {
                  var settingsList = JSON.parse(result.text);

                  // Listing should return 3 setting now
                  settingsList.length.should.equal(3);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should add get and clear site appsetting', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site appsetting list %s --json ', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site appsetting add mysetting=myvalue %s --json', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site appsetting show mysetting %s --json', siteName, function (result) {
              result.text.should.equal('"myvalue"\n');
              result.exitStatus.should.equal(0);

              // add another setting
              suite.execute('site appsetting delete mysetting %s --quiet --json', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site appsetting list %s --json', siteName, function (result) {
                  result.exitStatus.should.equal(0);

                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});