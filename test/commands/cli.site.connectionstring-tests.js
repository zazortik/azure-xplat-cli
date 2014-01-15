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
var testPrefix = 'cli.site.connectionstring-tests';

var siteNamePrefix = 'contests';
var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';
var serviceBusConnectionString = 'Endpoint=sb://gongchen1.servicebus.windows.net/;SharedSecretIssuer=owner;SharedSecretValue=fake=';
var SqlConnectionString = 'Server=tcp:gpg5beafeq.database.windows.net,1433;Database=testasdasd;User ID=andrerod@gpg5beafeq;Password={your_password_here};Trusted_Connection=False;Encrypt=True;Connection Timeout=30;';

describe('cli', function(){
  describe('site connectionstring', function() {

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

    it('should list site connectionstring', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site connectionstring list %s --json', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site connectionstring add param1 %s SQLAzure %s --json', serviceBusConnectionString, siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site connectionstring list %s --json', siteName, function (result) {
              var settingsList = JSON.parse(result.text);

              // Listing should return 1 setting now
              settingsList.length.should.equal(1);

              // add another setting
              suite.execute('site connectionstring add param2 %s SQLAzure %s --json', serviceBusConnectionString, siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site connectionstring list %s --json', siteName, function (result) {
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

    it('should add get and clear site connectionstring', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site connectionstring list %s --json', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site connectionstring add param3 myvalue SQLAzure %s --json', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site connectionstring show param3 %s --json', siteName, function (result) {
              result.exitStatus.should.equal(0);

              var value = JSON.parse(result.text);
              value.connectionString.should.equal('myvalue');

              // add another setting
              suite.execute('site connectionstring delete param3 %s --quiet --json', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site connectionstring list %s --json', siteName, function (result) {
                  result.exitStatus.should.equal(0);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should list site SQL connectionstring', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('site connectionstring list %s --json', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site connectionstring add conn1 %s SQLAzure %s --json', SqlConnectionString, siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site connectionstring list %s --json', siteName, function (result) {
              var settingsList = JSON.parse(result.text);

              // Listing should return 1 setting now
              settingsList.length.should.equal(1);

              // add another setting
              suite.execute('site connectionstring add conn2 %s SQLAzure %s --json', SqlConnectionString, siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site connectionstring list %s --json', siteName, function (result) {
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
  });
});