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
var url = require('url');
var uuid = require('node-uuid');
var GitHubApi = require('github');
var util = require('util');
var cli = require('../../lib/cli');

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var LinkedRevisionControlClient = require('../../lib/util/git/linkedrevisioncontrol').LinkedRevisionControlClient;

var githubUsername = process.env['AZURE_GITHUB_USERNAME'];
var githubPassword = process.env['AZURE_GITHUB_PASSWORD'];
var githubRepositoryFullName = process.env['AZURE_GITHUB_REPOSITORY'];
var gitUsername = process.env['AZURE_GIT_USERNAME'];
var githubClient = new GitHubApi({ version: "3.0.0" });

var suiteUtil;
var testPrefix = 'cli.site-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
}

githubClient.authenticate({
  type: "basic",
  username: githubUsername,
  password: githubPassword
});

describe('cli', function(){
  describe('site', function() {
    before(function (done) {
      suiteUtil = new MockedTestUtils(testPrefix);
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
      };

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

    it('create a site', function(done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      // Create site
      var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
      cmd.push('East US');

      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        cmd = 'node cli.js site list --json'.split(' ');
        executeCmd(cmd, function (result) {
          var siteList = JSON.parse(result.text);

          var siteExists = siteList.some(function (site) {
            return site.Name.toLowerCase() === siteName.toLowerCase()
          });

          siteExists.should.be.ok;

          // Delete created site
          cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
          executeCmd(cmd, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            // List sites
            cmd = 'node cli.js site list --json'.split(' ');
            executeCmd(cmd, function (result) {
              if (result.text != '') {
                siteList = JSON.parse(result.text);

                siteExists = siteList.some(function (site) {
                  return site.Name.toLowerCase() === siteName.toLowerCase()
                });

                siteExists.should.not.be.ok;
              }

              done();
            });
          });
        });
      });
    });

    it('create a site with github', function(done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      // Create site
      var cmd = ('node cli.js site create ' + siteName + ' --github --json --location').split(' ');
      cmd.push('East US');
      cmd.push('--githubusername');
      cmd.push(githubUsername);
      cmd.push('--githubpassword');
      cmd.push(githubPassword);
      cmd.push('--githubrepository');
      cmd.push(githubRepositoryFullName);

      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        cmd = 'node cli.js site list --json'.split(' ');
        executeCmd(cmd, function (result) {
          var siteList = JSON.parse(result.text);

          var siteExists = siteList.some(function (site) {
            return site.Name.toLowerCase() === siteName.toLowerCase()
          });

          siteExists.should.be.ok;

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
                result.exitStatus.should.equal(0);

                // List sites
                cmd = 'node cli.js site list --json'.split(' ');
                executeCmd(cmd, function (result) {
                  if (result.text != '') {
                    siteList = JSON.parse(result.text);

                    siteExists = siteList.some(function (site) {
                      return site.Name.toLowerCase() === siteName.toLowerCase()
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

    it('create a site with github rerun scenario', function(done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      // Create site
      var cmd = ('node cli.js site create ' + siteName + ' --json --location').split(' ');
      cmd.push('East US');

      executeCmd(cmd, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        cmd.push('--github');
        cmd.push('--githubusername');
        cmd.push(githubUsername);
        cmd.push('--githubpassword');
        cmd.push(githubPassword);
        cmd.push('--githubrepository');
        cmd.push(githubRepositoryFullName);

        // Rerun to make sure update hook works properly
        executeCmd(cmd, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          // List sites
          cmd = 'node cli.js site list --json'.split(' ');
          executeCmd(cmd, function (result) {
            var siteList = JSON.parse(result.text);

            var siteExists = siteList.some(function (site) {
              return site.Name.toLowerCase() === siteName.toLowerCase()
            });

            siteExists.should.be.ok;

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

    it('restarts a running site', function (done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      // Create site for testing
      var cmd = util.format('node cli.js site create %s --json --location', siteName).split(' ');
      cmd.push('East US');
      executeCmd(cmd, function (result) {

        // Restart site, it's created running
        cmd = util.format('node cli.js site restart %s', siteName).split(' ');
        executeCmd(cmd, function (result) {

          // Delete test site
          cmd = util.format('node cli.js site delete %s --quiet', siteName).split(' ');
          executeCmd(cmd, function (result) {
            done();
          });
        });
      });
    });

    it('restarts a stopped site', function (done) {
      var siteName = suiteUtil.generateId(siteNamePrefix, siteNames);

      // Create site for testing
      var cmd = util.format('node cli.js site create %s --json --location', siteName).split(' ');
      cmd.push('East US');
      executeCmd(cmd, function (result) {
        // Stop the site
        cmd = util.format('node cli.js site stop %s', siteName).split(' ');
        executeCmd(cmd, function (result) {
          // Restart site
          cmd = util.format('node cli.js site restart %s', siteName).split(' ');
          executeCmd(cmd, function (result) {
            
            // Delete test site
            cmd = util.format('node cli.js site delete %s --quiet', siteName).split(' ');
            executeCmd(cmd, function (result) {
              done();
            });
          });
        });
      });
    });
  });
});
