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
var testPrefix = 'cli.site.defaultdocument-tests';

var siteNamePrefix = 'contests';
var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';
var defaultDocument = 'index.js';
var defaultDocument2 = 'other.js';

describe('cli', function(){
  describe('defaultdocument', function() {

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
        var cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
        executeCmd(cmd, function () {
          removeSite();
        });
      }

      removeSite();
    });

    it('should add and list defaultdocument', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site defaultdocument list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site defaultdocument add %s %s --json', defaultDocument, siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site defaultdocument list %s --json', siteName, function (result) {
              var documents = JSON.parse(result.text);

              // Listing should return 1 setting now
              documents.some(function (d) {
                return d === defaultDocument;
              }).should.equal(true);

              // add another setting
              suite.execute('site defaultdocument add %s %s --json', defaultDocument2, siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('site defaultdocument list %s --json', siteName, function (result) {
                  var documents = JSON.parse(result.text);

                  // Listing should return 2 setting now
                  documents.some(function (d) {
                    return d === defaultDocument2;
                  }).should.equal(true);

                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should delete defaultDocument', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site defaultdocument list %s --json', siteName, function (result) {
          // there should be not settings yet as the site was just created
          result.exitStatus.should.equal(0);

          // add a setting
          suite.execute('site defaultdocument add %s %s --json', defaultDocument, siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            // add another setting
            suite.execute('site defaultdocument delete %s %s --quiet --json', defaultDocument, siteName, function (result) {
              result.text.should.equal('');
              result.exitStatus.should.equal(0);

              suite.execute('site defaultdocument list %s --json', siteName, function (result) {
                result.exitStatus.should.equal(0);

                var documents = JSON.parse(result.text);

                documents.some(function (d) {
                  return d === defaultDocument;
                }).should.equal(false);

                done();
              });
            });
          });
        });
      });
    });
  });
});