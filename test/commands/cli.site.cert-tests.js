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
var path = require('path');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.site.cert-tests';

var siteName = 'myfakesite';
var siteCertPath = path.join(__dirname, '../data/fakecert.pfx');
var siteCertPassword = 'fakepass';
var siteThumbprint = 'MYFAKETHUMBPRINT';

describe('cli', function(){
  describe('site cert', function() {
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

    it('should add, list and show certificates', function(done) {
      suite.execute('site cert list %s --json', siteName, function (result) {
        result.exitStatus.should.equal(0);

        // add a setting
        suite.execute('site cert add %s --key %s %s --json', siteCertPath, siteCertPassword, siteName, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          suite.execute('site cert list %s --json', siteName, function (result) {
            var certificates = JSON.parse(result.text);

            // Listing should return 1 setting now
            certificates.length.should.equal(1);

            suite.execute('site cert show %s %s --json', siteThumbprint, siteName, function (result) {
              result.exitStatus.should.equal(0);

              var certificate = JSON.parse(result.text);
              certificate.should.not.equal(null);

              done();
            });
          });
        });
      });
    });

    it('should delete certificate', function(done) {
      suite.execute('site cert delete %s %s --quiet --json', siteThumbprint, siteName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('site cert list %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          var certificates = JSON.parse(result.text);
          certificates.length.should.equal(0);

          done();
        });
      });
    });
  });
});