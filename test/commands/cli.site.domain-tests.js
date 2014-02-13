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
var testPrefix = 'cli.site.domain-tests';

/**
* Note: to rerecord this test, an azure website and a cname domain pointing to
* it must be created and specified in the variables below.
*/
var domainName = 'armarmt.mooo.com';
var fakeDomainName = 'fake.mooo.com';
var siteName = 'asdqweq';

describe('cli', function () {
  describe('site domain', function() {
    before(function (done) {
      suite = new CLITest(testPrefix, true);
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

    it('should list, add and delete site domain', function(done) {
      suite.execute('site domain list %s --json ', siteName, function (result) {
        result.exitStatus.should.equal(0);

        var domainList = JSON.parse(result.text);

        domainList.some(function (d) {
          return d === domainName;
        }).should.equal(false);

        suite.execute('site domain add %s %s --json', domainName, siteName, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          suite.execute('site domain list %s --json', siteName, function (result) {
            var domainList = JSON.parse(result.text);

            domainList.some(function (d) {
              return d === domainName;
            }).should.equal(true);

            suite.execute('site domain delete %s %s --quiet --json', domainName, siteName, function (result) {
              result.text.should.equal('');
              result.exitStatus.should.equal(0);

              suite.execute('site domain list %s --json', siteName, function (result) {
                var domainList = JSON.parse(result.text);

                domainList.some(function (d) {
                  return d === domainName;
                }).should.equal(false);

                done();
              });
            });
          });
        });
      });
    });

    it('should give decent error for invalid domain', function(done) {
      suite.execute('site domain add %s %s --json', fakeDomainName, siteName, function (result) {
        result.errorText.should.include('No CNAME pointing from ' + fakeDomainName + ' to ' + siteName + '.azurewebsites.net. Please create a CNAME record and execute the operation again.');
        result.exitStatus.should.not.equal(0);

        done();
      });
    });
  });
});