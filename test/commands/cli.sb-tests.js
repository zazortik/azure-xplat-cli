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

//
// Notes on running this test suite:
// When running these tests live (either unmocked or recording)
// service bus namespaces take time to activate. The activation
// can take a significant amount of time, and until activation
// is complete you cannot delete the namespace.
//
// These tests clean up the created namespaces at the end of
// test run to avoid leaving test artifacts behind. However,
// they will complete before the namespace starts activating.
// As such, when running live you will see several messages that say:
//
//   error: Error
//   error: Error information has been recorder to azure.err
//   delete failed, waiting to retry
//
// on the console. This is NORMAL AND EXPECTED during live runs.
//
// If you see more than a dozen or so of these something's gotten stuck
// on the server side unfortunately.
//

var _ = require('underscore');
var should = require('should');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.sb-tests';

var namespacePrefix = 'xpltsbtst';
var namespaces = [];

var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'West US' }
];
var location;

describe('cli', function () {
  describe('sb', function() {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      function deleteNamespaces(namespaces, callback) {
        if (namespaces.length === 0) {
          return callback();
        }
        console.log('Deleting namespace', namespaces[0]);
        suite.execute('sb namespace delete %s -q --json', namespaces[0], function (result) {
          if (result.exitStatus !== 0) {
            console.log('delete failed, waiting to retry');
            setTimeout(function () {
              deleteNamespaces(namespaces, callback);
            }, suite.isPlayback() ? 0 : 5000);
          } else {
            deleteNamespaces(namespaces.slice(1), callback);
          }
        });
      }

      if (!suite.isMocked || suite.isRecording) {
        deleteNamespaces(namespaces, function () {
          suite.teardownSuite(done);
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function (done) {
      suite.setupTest(function() {
        location = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('location', function () {
      it('should work', function (done) {
        suite.execute('sb namespace location list --json', function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          var locations = _.pluck(JSON.parse(result.text), 'code');
          locations.should.containEql('East Asia');
          locations.should.containEql('West Europe');
          locations.should.containEql('North Europe');
          locations.should.containEql('East US');
          locations.should.containEql('Southeast Asia');
          locations.should.containEql('North Central US');
          locations.should.containEql('West US');
          locations.should.containEql('South Central US');

          done();
        });
      });
    });

    describe('namespace', function () {
      describe('check', function () {
        var namespaceName;

        beforeEach(function (done) {
          namespaceName = suite.generateId(namespacePrefix, namespaces);
          suite.execute('sb namespace create %s --json --region %s', namespaceName, location, function () {
            done();
          });
        });

        it('should detect non available namespace name', function (done) {
          suite.execute('sb namespace check %s --json', namespaceName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            JSON.parse(result.text).available.should.be.false;

            done();
          });
        });

        it('should detect available namespace name', function (done) {
          var namespaceName = suite.generateId(namespacePrefix, namespaces);
          suite.execute('sb namespace check %s --json', namespaceName, function (result) {

            // Remove extra namespace name so we don't get an error on cleanup
            namespaces.pop();

            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            JSON.parse(result.text).available.should.be.true;

            done();
          });
        });
      });
    });
  });
});