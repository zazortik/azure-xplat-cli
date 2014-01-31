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
var fs = require('fs');
var url = require('url');
var path = require('path');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.site.job-tests';

var createdSitesPrefix = 'utr';
var createdSites = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';
var gitUsername = process.env['AZURE_GIT_USERNAME'];

describe('cli', function () {
  describe('job', function() {
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
      suite.teardownTest(done);
    });

    it('creates a triggered web job for a site', function (done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites, suite.isMocked);

      suite.execute('site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, location, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('site job upload myjob triggered %s %s --json', path.join(__dirname, '../data/samplewebjob.zip'), siteName, function (result) {
          result.exitStatus.should.equal(0);

          done();
        });
      });
    });

    it('creates a triggered web job for a site with switches', function (done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites, suite.isMocked);

      suite.execute('site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, location, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('site job upload --job-name myjob --job-type triggered %s %s --json', path.join(__dirname, '../data/samplewebjob.zip'), siteName, function (result) {
          result.exitStatus.should.equal(0);

          done();
        });
      });
    });

    describe('list, show and delete a continuous web job for a site', function () {
      var siteName;

      beforeEach(function (done) {
        siteName = suite.generateId(createdSitesPrefix, createdSites, suite.isMocked);

        suite.execute('site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, location, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site job upload myjob1 continuous %s %s --json', path.join(__dirname, '../data/samplewebjob.zip'), siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should list a continuous web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site job list %s --job-type continuous --json', siteName, function (result) {
            result.exitStatus.should.equal(0);

            var jobs = JSON.parse(result.text);
            jobs.length.should.equal(1);

            done();
          });
        });
      });

      it('should show a continuous web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job show %s %s %s --json', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should stop and start a continuous web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job stop %s %s --json', jobs[0].name, siteName, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('site job start %s %s %s --json', jobs[0].name, jobs[0].type, siteName, function (result) {
              result.exitStatus.should.equal(0);

              done();
            });
          });
        });
      });

      it('should delete a continuous web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job delete %s %s %s --json --quiet', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });

    describe('list, show and delete a triggered web job for a site', function () {
      var siteName;

      beforeEach(function (done) {
        siteName = suite.generateId(createdSitesPrefix, createdSites, suite.isMocked);

        suite.execute('site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, location, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('site job upload myjob triggered %s %s --json', path.join(__dirname, '../data/samplewebjob.zip'), siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should list a triggered web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          done();
        });
      });

      it('should show a triggered web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job show %s %s %s --json', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should delete a triggered web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job delete %s %s %s --json --quiet', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should start a triggered web job for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job start %s %s %s --json', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      it('should list and show triggered web job history for a site', function (done) {
        suite.execute('site job list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var jobs = JSON.parse(result.text);

          suite.execute('site job start %s %s %s --json', jobs[0].name, jobs[0].type, siteName, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('site job history list %s %s --json', jobs[0].name, siteName, function (result) {
              result.exitStatus.should.equal(0);

              var runs = JSON.parse(result.text);

              suite.execute('site job history show %s %s %s --json', jobs[0].name, runs[0].id, siteName, function (result) {
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