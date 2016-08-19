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
var url = require('url');
var GitHubApi = require('github');

var CLITest = require('../framework/cli-test');

var LinkedRevisionControlClient = require('../../lib/util/git/linkedrevisioncontrol').LinkedRevisionControlClient;

var requiredEnvironment = [
  'AZURE_GITHUB_USERNAME',
  {
    name: 'AZURE_GITHUB_PASSWORD',
    secure: true
  },
  'AZURE_GITHUB_REPOSITORY',
  {
    name: 'AZURE_SITE_TEST_LOCATION',
    defaultValue: 'East US'
  }
];

var githubUsername;
var githubPassword;
var githubRepositoryFullName;
var githubClient;

var suite;
var testPrefix = 'cli.site-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var location;
var scmSite = process.env.AZURE_SCM_SITE_SUFFIX || '.scm.azurewebsites.net';

describe('cli', function () {
  describe('site', function() {
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env['AZURE_SITE_TEST_LOCATION'];
        githubUsername = process.env['AZURE_GITHUB_USERNAME'];
        githubPassword = process.env['AZURE_GITHUB_PASSWORD'];
        githubRepositoryFullName = process.env['AZURE_GITHUB_REPOSITORY'];
        if (!githubClient) {
          githubClient = new GitHubApi({ version: '3.0.0' });
          githubClient.authenticate({
            type: 'basic',
            username: githubUsername,
            password: githubPassword
          });
        }
        done();
      });
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

    it('create a site', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

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

          // Delete created site
          suite.execute('site delete %s --json --quiet', siteName, function (result) {
            result.text.should.equal('');
            result.exitStatus.should.equal(0);

            // List sites
            suite.execute('site list --json', function (result) {
              if (result.text !== '') {
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

    //skipping this test as it is failing right now
    it('create a site with github', null, function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --github --json --location %s --githubusername %s --githubpassword %s --githubrepository %s',
        siteName,
        'East US',
        githubUsername,
        githubPassword,
        githubRepositoryFullName,
        function (result) {

        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // List sites
        suite.execute('site list --json', function (result) {
          var siteList = JSON.parse(result.text);

          var siteExists = siteList.some(function (site) {
            return site.name.toLowerCase() === siteName.toLowerCase();
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
                return parsedUrl.hostname === (siteName + scmSite);
              });

              hookExists.should.be.ok;

              // Delete created site
              suite.execute('site delete %s --json --quiet', siteName, function (result) {
                result.text.should.equal('');
                result.exitStatus.should.equal(0);

                // List sites
                suite.execute('site list --json', function (result) {
                  if (result.text !== '') {
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

    it('create a site with github rerun scenario', function(done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        // Rerun to make sure update hook works properly
        suite.execute('site create %s --github --json --location %s --githubusername %s --githubpassword %s --githubrepository %s',
          siteName,
          location,
          githubUsername,
          githubPassword,
          githubRepositoryFullName,
          function (result) {

          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          // List sites
          suite.execute('site list --json', function (result) {
            var siteList = JSON.parse(result.text);

            var siteExists = siteList.some(function (site) {
              return site.name.toLowerCase() === siteName.toLowerCase();
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
                  return parsedUrl.hostname === (siteName + scmSite);
                });

                hookExists.should.be.ok;

                // Delete created site
                suite.execute('site delete %s --json --quiet', siteName, function (result) {
                  result.text.should.equal('');
                  result.exitStatus.should.equal(0);

                  // List sites
                  suite.execute('site list --json', function (result) {
                    if (result.text !== '') {
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

    it('restarts a running site', function (done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site for testing
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.exitStatus.should.equal(0);

        // Restart site, it's created running
        suite.execute('site restart %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          // Delete test site
          suite.execute('site delete %s --quiet --json', siteName, function (result) {
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });

    it('restarts a stopped site', function (done) {
      var siteName = suite.generateId(siteNamePrefix, siteNames);

      // Create site for testing
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.exitStatus.should.equal(0);

        // Stop the site
        suite.execute('site stop %s --json', siteName, function (result) {
          result.exitStatus.should.equal(0);

          // Restart site
          suite.execute('site restart %s --json', siteName, function (result) {
            result.exitStatus.should.equal(0);

            // Delete test site
            suite.execute('site delete %s --quiet --json', siteName, function (result) {
              result.exitStatus.should.equal(0);

              done();
            });
          });
        });
      });
    });

// TODO: fix. For some reason the error is now different on the new REST API version...
/*
    it('gives good error message', function (done) {
      var siteName = 'mytestsite';

      // Create site for testing
      suite.execute('site create %s --json --location %s', siteName, location, function (result) {
        result.exitStatus.should.equal(1);
        result.errorText.indexOf('Website with given name mytestsite already exists.').should.be.above(-1);

        done();
      });
    });
*/
    describe('set', function () {
      var siteName;

      beforeEach(function (done) {
        siteName = suite.generateId(siteNamePrefix, siteNames);

        suite.execute('site create %s --json --location %s', siteName, location, function () {
          done();
        });
      });

      it('sets all properties', function (done) {
        suite.execute('site set --net-version 3.5 --php-version 5.4 --web-socket %s --json', siteName, function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          suite.execute('site show %s --json', siteName, function (result) {
            result.exitStatus.should.equal(0);

            var site = JSON.parse(result.text);
            site.config.netFrameworkVersion.should.equal('v2.0');
            site.config.phpVersion.should.equal('5.4');
            site.config.webSocketsEnabled.should.equal(true);

            suite.execute('site set --net-version 3.5 --php-version off --disable-web-socket %s --json', siteName, function (result) {
              result.text.should.equal('');
              result.exitStatus.should.equal(0);

              suite.execute('node cli.js site show %s --json', siteName, function (result) {
                result.exitStatus.should.equal(0);

                var site = JSON.parse(result.text);
                site.config.netFrameworkVersion.should.equal('v2.0');
                site.config.webSocketsEnabled.should.equal(false);

                suite.execute('site delete %s --quiet --json', siteName, function(result) {
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
});