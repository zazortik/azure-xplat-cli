/**
* Copyright 2012 Microsoft Corporation
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var should = require('should');

var GitHubApi = require('github');
var url = require('url');

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var LinkedRevisionControlClient = require('../../lib/util/git/linkedrevisioncontrol').LinkedRevisionControlClient;

var suiteUtil;
var testPrefix = 'cli.deployment-tests';

var siteNames = [];

var location = process.env.AZURE_SITE_TEST_LOCATION || 'East US';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

var githubUsername = process.env['AZURE_GITHUB_USERNAME'];
var githubPassword = process.env['AZURE_GITHUB_PASSWORD'];
var githubRepositoryFullName = process.env['AZURE_GITHUB_REPOSITORY'];
var githubClient = new GitHubApi({ version: '3.0.0' });

githubClient.authenticate({
  type: 'basic',
  username: githubUsername,
  password: githubPassword
});

describe('cli', function(){
  describe('deployment', function() {
    before(function (done) {
      suiteUtil = new MockedTestUtils(testPrefix, true);
      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      var repositoryName;

      function deleteAllHooks (hooks, callback) {
        if (hooks.length === 0) {
          suiteUtil.teardownTest(done);
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

    it('should set git credentials', function(done) {
      // Create site
      var cmd = ('node cli.js site deployment user set mygituser 12345Qwerty --json').split(' ');
      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should deploy to github', function(done) {
      var siteName = suiteUtil.generateId('cliuttestdeploy1', siteNames);

      // Create site
      var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
      cmd.push(location);

      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        cmd = 'node cli.js site list --json'.split(' ');
        executeCmd(cmd, function (result) {
          var siteList = JSON.parse(result.text);

          var siteExists = siteList.some(function (site) {
            return site.Name.toLowerCase() === siteName.toLowerCase();
          });

          siteExists.should.be.ok;

          // Create the hook using deployment github cmdlet
          cmd = ('node cli.js site deployment github ' + siteName + ' --json').split(' ');
          cmd.push('--githubusername');
          cmd.push(githubUsername);
          cmd.push('--githubpassword');
          cmd.push(githubPassword);
          cmd.push('--githubrepository');
          cmd.push(githubRepositoryFullName);

          executeCmd(cmd, function (result) {
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
                cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
                executeCmd(cmd, function (result) {
                  result.text.should.equal('');
                  result.errorText.should.equal('');
                  result.exitStatus.should.equal(0);

                  // List sites
                  cmd = 'node cli.js site list --json'.split(' ');
                  executeCmd(cmd, function (result) {
                    if (result.text != '') {
                      siteList = JSON.parse(result.text);

                      siteExists = siteList.some(function (site) {
                        return site.Name.toLowerCase() === siteName.toLowerCase();
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