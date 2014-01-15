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

var createdSites = [];

var suite;
var testPrefix = 'cli.site.config-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

describe('cli', function(){
  describe('config', function() {

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
      function removeSite() {
        if (createdSites.length === 0) {
          return suite.teardownTest(done);
        }

        var siteName = createdSites.pop();
        suite.execute('site delete %s --json --quiet', siteName, function () {
          removeSite();
        });
      }

      removeSite();
    });

    it('should list site config', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site config list %s --json ', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site config add mysetting=myvalue %s --json', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site config list %s --json', siteName, function (result) {
              var settingsList = JSON.parse(result.text);

              // Listing should return 1 setting now
              settingsList.length.should.equal(1);

              // add another setting
              suite.execute('site config add mysetting2=myvalue %s --json', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site config list  %s --json', siteName, function (result) {
                  var settingsList = JSON.parse(result.text);

                  // Listing should return 2 setting now
                  settingsList.length.should.equal(2);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should add get and clear site config', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site config list %s --json ', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site config add mysetting=myvalue %s --json', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site config get mysetting %s --json', siteName, function (result) {
              result.text.should.equal('"myvalue"\n');
              result.exitStatus.should.equal(0);

              // add another setting
              suite.execute('site config clear mysetting %s --json', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site config list %s --json', siteName, function (result) {
                  result.text.should.equal('');
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