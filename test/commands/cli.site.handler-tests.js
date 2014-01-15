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
var testPrefix = 'cli.site.handler-tests';

var createdSites = [];
var siteNamePrefix = 'cli';
var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

describe('cli', function () {
  describe('site handler', function() {

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

    it('should list, add and delete site handler', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);
      var extension = '.js';

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('site handler list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site handler add %s c: %s --json', extension, siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            suite.execute('site handler list %s --json', siteName, function (result) {
              var handlers = JSON.parse(result.text);

              handlers.some(function (d) {
                return d.extension === extension;
              }).should.equal(true);

              suite.execute('node cli.js site handler delete %s %s --quiet --json', extension, siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                suite.execute('node cli.js site handler list %s --json', siteName, function (result) {
                  handlers = JSON.parse(result.text);

                  handlers.some(function (d) {
                    return d.extension === extension;
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
});