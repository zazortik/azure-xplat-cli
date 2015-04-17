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
// The following environment variables must be set in order for the test to
// run against live.
//
// AZURE_GITHUB_USERNAME   - user name used to access github
// AZURE_GITHUB_REPOSITORY - full name of github repository to change, in form of "user/repo"
// AZURE_GITHUB_PASSWORD   - password or access token for github.
//

var should = require('should');
var GitHubApi = require('github');
var url = require('url');

var CLITest = require('../framework/cli-test');

var LinkedRevisionControlClient = require('../../lib/util/git/linkedrevisioncontrol').LinkedRevisionControlClient;

var suite;
var testPrefix = 'cli.site.deployment-tests';

var siteNames = [];

var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  'AZURE_GITHUB_USERNAME',
  'AZURE_GITHUB_REPOSITORY',
  { name: 'AZURE_GITHUB_PASSWORD', secure: true }
];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';
var scmSite = process.env.AZURE_SCM_SITE_SUFFIX || '.scm.azurewebsites.net';

var githubUsername;
var githubPassword;
var githubRepositoryFullName;
var githubClient;

describe('cli', function () {
  describe('site deployment', function() {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_SITE_TEST_LOCATION;
        githubUsername = process.env.AZURE_GITHUB_USERNAME;
        githubPassword = process.env.AZURE_GITHUB_PASSWORD;
        githubRepositoryFullName = process.env.AZURE_GITHUB_REPOSITORY;

        githubClient = new GitHubApi({ version: '3.0.0' });

        githubClient.authenticate({
          type: 'basic',
          username: githubUsername,
          password: githubPassword
        });

        done();
      });
    });

    afterEach(function (done) {
      function getUserRepositories(callback) {
        githubClient.repos.getFromUser({ user: githubUsername }, callback);
      }

      function getTestRepoName(err, repositories, callback) {
        if (err) { return callback(err); }
        var repositoryName = LinkedRevisionControlClient._getRepository(repositories, githubRepositoryFullName).name;
        callback(null, repositoryName);
      }

      function getHooksFromRepo(err, repositoryName, callback) {
        if (err) { return callback(err); }
        githubClient.repos.getHooks({
          user: githubUsername,
          repo: repositoryName
        }, function (err, hooks) {
          callback(err, { repositoryName: repositoryName, hooks: hooks});
        });
      }

      function deleteHooks(err, hookInfo, callback) {
        if (err) { return callback(err); }
        if (hookInfo.hooks.length === 0) {
          return callback();
        }
        var hook = hookInfo.hooks[0];
        hook.user = githubUsername;
        hook.repo = hookInfo.repositoryName;
        githubClient.repos.deleteHook(hook, function () {
          deleteHooks(null, { repositoryName: hookInfo.repositoryName, hooks: hookInfo.hooks.slice(1)}, callback);
        });
      }

      getUserRepositories(function (err, repositories) {
        getTestRepoName(err, repositories, function(err, name) {
          getHooksFromRepo(err, name, function (err, hookInfo) {
            deleteHooks(err, hookInfo, function (err) {
              suite.teardownTest(done);
            });
          });
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
                  return parsedUrl.hostname === (siteName + scmSite);
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