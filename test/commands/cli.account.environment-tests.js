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

var _ = require('underscore');
var profile = require('../../lib/util/profile');

var CLITest = require('../framework/cli-test');
var testPrefix = 'cli.account.environment-tests';
var suite = new CLITest(null, testPrefix);

describe('cli', function () {
  describe('account env', function () {
    var originalProfile;

    before(function (done) {
      originalProfile = profile.current;
      profile.current = new profile.Profile();
      profile.current.save = _.identity;
      done();
    });

    after(function () {
      profile.current = originalProfile;
    });

    var envCreateOptions = {
      '--publishing-profile-url': 'http://url1.com',
      '--portal-url': 'http://url2.com',
      '--management-endpoint-url': 'http://url3.com',
      '--sql-management-endpoint-url': 'http://url5.com'
    };

    var envCreateCommandLine = 'account env add newenv ' +
       _.pairs(envCreateOptions)
      .map(function (pair) { return pair[0] + ' ' + pair[1]; })
      .join(' ') + ' --json';

    it('should add and show', function (done) {
      suite.execute(envCreateCommandLine, function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('account env show newenv --json', function (result) {
          result.exitStatus.should.equal(0);

          var environment = JSON.parse(result.text);
          environment['publishingProfileUrl'].should.equal('http://url1.com');
          environment['portalUrl'].should.equal('http://url2.com');
          environment['managementEndpointUrl'].should.equal('http://url3.com');
          environment['sqlManagementEndpointUrl'].should.equal('http://url5.com');

          done();
        });
      });
    });

    it('should list', function (done) {
      suite.execute('account env list --json', function (result) {
        result.exitStatus.should.equal(0);

        var environments = JSON.parse(result.text);
        Object.keys(environments).some(function (e) {
          return e === 'AzureCloud';
        }).should.equal(true);

        Object.keys(environments).some(function (e) {
          return e === 'AzureChinaCloud';
        }).should.equal(true);

        Object.keys(environments).some(function (e) {
          return e === 'newenv';
        }).should.equal(true);

        done();
      });
    });

    it('should delete', function (done) {
      suite.execute('account env delete newenv --json', function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('account env list --json', function (result) {
          result.exitStatus.should.equal(0);

          var environments = JSON.parse(result.text);
          Object.keys(environments).some(function (e) {
            return e === 'newenv';
          }).should.equal(false);

          done();
        });
      });
    });

    it('should modify a predefined environment setting', function (done) {
      suite.execute('account env set AzureCloud --publishing-profile-url http://test.com --json', function (result) {
        result.exitStatus.should.equal(0);

        suite.execute('account env show AzureCloud --json', function (result) {
          result.exitStatus.should.equal(0);

          var properties = JSON.parse(result.text);
          properties.publishingProfileUrl.should.equal('http://test.com');

          done();
        });
      });
    });
  });
});