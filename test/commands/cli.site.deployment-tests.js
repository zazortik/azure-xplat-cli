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
// Instructions for running this test
//
// The test will always run mocked, even if NOCK_OFF is set. To run against
// production, change the forceRunMocked variable to false.
//
// The following environment variables must be set in order for the test to
// run against live (and must match the settings when the mocks were recorded)
//
// AZURE_SUBSCRIPTION_ID   - subscription ID mocks were recorded against
// AZURE_CERTIFICATE       - value of certificate
// AZURE_CERTIFICATE_KEY   - value of certificate key
// AZURE_GITHUB_USERNAME   - user name used to access github
// AZURE_GITHUB_REPOSITORY - full name of github repository to change, in form of "user/repo"
// AZURE_GITHUB_PASSWORD   - password or access token for github.
//
// If you attempt to run against production and don't set forceRunMocked to false,
// you will get errors about not having credential.cert set.
//

var forceRunMocked = true;

var should = require('should');

var GitHubApi = require('github');
var url = require('url');

var CLITest = require('../framework/cli-test');

var LinkedRevisionControlClient = require('../../lib/util/git/linkedrevisioncontrol').LinkedRevisionControlClient;

var suite;
var testPrefix = 'cli.site.deployment-tests';

var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

var githubUsername = process.env['AZURE_GITHUB_USERNAME'];
var githubPassword = process.env['AZURE_GITHUB_PASSWORD'];
var githubRepositoryFullName = process.env['AZURE_GITHUB_REPOSITORY'];
var githubClient = new GitHubApi({ version: '3.0.0' });

githubClient.authenticate({
  type: 'basic',
  username: githubUsername,
  password: githubPassword
});

describe('cli', function () {
  describe('site deployment', function() {
    before(function (done) {
      suite = new CLITest(testPrefix, forceRunMocked);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      var repositoryName;

      function deleteAllHooks (hooks, callback) {
        if (hooks.length === 0) {
          suite.teardownTest(done);
        } else {
          var hook = hooks.pop();
          hook.user = githubUsername;
          hook.repo = repositoryName;

          githubClient.repos.deleteHook(hook, function () {
            deleteAllHooks(hooks, callback);
          });
        }
      }

      // Remove any existing repository hooks
      githubClient.repos.getFromUser({ user: githubUsername }, function (err, repositories) {
        repositoryName = LinkedRevisionControlClient._getRepository(repositories, githubRepositoryFullName).name;

        githubClient.repos.getHooks({
          user: githubUsername,
          repo: repositoryName
        }, function (err, hooks) {
          deleteAllHooks(hooks, done);
        });
      });
    });

    // TODO: fix. Failing for some reason.
/*
    it('should set git credentials', function(done) {
      suite.execute('site deployment user set mygituser2 12345Qwerty --json', function (result) {
        result.text.should.equal('');
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });
*/
    it('should deploy to github', function(done) {
      var siteName = suite.generateId('cliuttestdeploy1', siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site list --json', function (result) {
          var siteList = JSON.parse(result.text);

          var siteExists = siteList.some(function (site) {
            return site.name.toLowerCase() === siteName.toLowerCase();
          });

          siteExists.should.be.ok;

          // Create the hook using deployment github cmdlet
          suite.execute('site deployment github %s --json --githubusername %s --githubpassword %s --githubrepository %s',
            siteName,
            githubUsername,
            githubPassword,
            githubRepositoryFullName,
            function (result) {
            result.text.should.equal('');
            result.errorText.should.equal('');
            result.exitStatus.should.equal(0);

            // verify that the hook is in github
            githubClient.repos.getFromUser({ user: githubUsername }, function (err, repositories) {
              var repository = LinkedRevisionControlClient._getRepository(repositories, githubRepositoryFullName);

              githubClient.repos.getHooks({
                user: githubUsername,
                repo: repository.name
              }, function (err, hooks) {
                var hookExists = hooks.some(function (hook) {
                  var parsedUrl = url.parse(hook.config.url);
                  return parsedUrl.hostname === (siteName + '.scm.azurewebsites.net');
                });

                hookExists.should.be.ok;

                // Delete created site
                suite.execute('site delete %s --json --quiet', siteName, function (result) {
                  result.text.should.equal('');
                  result.errorText.should.equal('');
                  result.exitStatus.should.equal(0);

                  // List sites
                  suite.execute('site list --json', function (result) {
                    if (result.text != '') {
                      siteList = JSON.parse(result.text);

                      siteExists = siteList.some(function (site) {
                        return site.name.toLowerCase() === siteName.toLowerCase();
                      });

                      siteExists.should.not.be.ok;
                    }

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
});