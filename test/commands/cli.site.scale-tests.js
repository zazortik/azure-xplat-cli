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

var createdSitesPrefix = 'clisitescale-';
var createdSites = [];

var suite;
var testPrefix = 'cli.site.scale-tests';

var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'West US' }
];

describe('cli', function () {
  var location;
  describe('site scale', function () {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      function deleteSite(siteName, done) {
        suite.execute('site delete %s --json --quiet', siteName, done);
      }

      if (!suite.isMocked || suite.isRecording) {
        suite.forEachName(createdSites, deleteSite, function () {
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('should be able to set the scale mode', function(done) {
      var siteName = suite.generateId(createdSitesPrefix, createdSites);

      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('site scale mode shared %s --json ', siteName, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          suite.execute('site scale mode standard %s --json', siteName, function (result) {
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
        siteName = suite.generateId(createdSitesPrefix, createdSites);

        suite.execute('node cli.js site create %s --json --location %s', siteName, location, function () {
          done();
        });
      });

      it('should not be able to set instances on a free site', function (done) {
        suite.execute('site scale instances 2 --size small %s --json ', siteName, function (result) {
          result.errorText.indexOf('Instances cannot be changed for sites in a Free or Shared SKU.').should.not.equal(-1);
          result.exitStatus.should.equal(1);

          done();
        });
      });

      it('should be able to set the instances number and size', function(done) {
        suite.execute('site scale mode standard %s --json', siteName, function () {
          suite.execute('site scale instances 2 --size small %s --json ', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });
  });
});