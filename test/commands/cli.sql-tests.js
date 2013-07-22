/**
* Copyright (c) Microsoft.  All rights reserved.
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

var _ = require('underscore');

var should = require('should');
var mocha = require('mocha');

var util = require('util');
var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var suiteUtil;
var testPrefix = 'cli.sql-tests';

var location = process.env.AZURE_SQL_TEST_LOCATION || 'West US';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('CLI', function () {
  describe('SQL', function () {
    var administratorLogin = 'azuresdk';
    var administratorLoginPassword = 'SQLR0cks!999';

    before(function (done) {
      if (process.env.AZURE_TEST_MC) {
        suiteUtil = new MockedTestUtils(testPrefix);
      } else {
        suiteUtil = new MockedTestUtils(testPrefix, true);
      }

      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      suiteUtil.teardownTest(done);
    });

    describe('server cmdlets', function () {
      var oldServerNames;

      beforeEach(function (done) {
        var cmd = ('node cli.js sql server list --json').split(' ');
        executeCmd(cmd, function (result) {
          oldServerNames = JSON.parse(result.text).map(function (server) {
            return server.Name;
          });

          done();
        });
      });

      afterEach(function (done) {
        function deleteUsedServers (serverNames) {
          if (serverNames.length > 0) {
            var serverName = serverNames.pop();

            var cmd = ('node cli.js sql server delete ' + serverName + ' --quiet --json').split(' ');
            executeCmd(cmd, function () {
              deleteUsedServers(serverNames);
            });
          } else {
            done();
          }
        }

        var cmd = ('node cli.js sql server list --json').split(' ');
        executeCmd(cmd, function (result) {
          var servers = JSON.parse(result.text);

          var usedServers = [ ];
          _.each(servers, function (server) {
            if (!_.contains(oldServerNames, server.Name)) {
              usedServers.push(server.Name);
            }
          });

          deleteUsedServers(usedServers);
        });
      });

      describe('Create SQL Server', function () {
        it('should create a server', function (done) {
          var cmd = ('node cli.js sql server create').split(' ');
          cmd.push('--administratorLogin');
          cmd.push(administratorLogin);
          cmd.push('--administratorPassword');
          cmd.push(administratorLoginPassword);
          cmd.push('--location');
          cmd.push(location);
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var serverName = JSON.parse(result.text).Name;
            serverName.should.not.be.null;
            serverName.should.match(/[0-9a-zA-Z]*/);

            done();
          });
        });
      });

      describe('Create SQL Server with azure firewall rule', function () {
        it('should create a server with firewall rule', function (done) {
          var cmd = ('node cli.js sql server create').split(' ');
          cmd.push('--administratorLogin');
          cmd.push(administratorLogin);
          cmd.push('--administratorPassword');
          cmd.push(administratorLoginPassword);
          cmd.push('--location');
          cmd.push(location);
          cmd.push('--defaultFirewallRule');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            try {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              var serverName = JSON.parse(result.text).Name;
              serverName.should.not.be.null;
              serverName.should.match(/[0-9a-zA-Z]*/);

              var cmd = util.format('node cli.js sql firewallrule show %s AllowAllWindowsAzureIps', serverName).split(' ');
              cmd.push('--json');

              executeCmd(cmd, function (result) {
                result.text.should.not.be.null;
                result.exitStatus.should.equal(0);

                done();
              });
            } catch (err) {
              done(err);
            }
          });
        });
      });

      describe('List and show SQL Server', function () {
        var serverName;

        beforeEach(function (done) {
          var cmd = ('node cli.js sql server create').split(' ');
          cmd.push('--administratorLogin');
          cmd.push(administratorLogin);
          cmd.push('--administratorPassword');
          cmd.push(administratorLoginPassword);
          cmd.push('--location');
          cmd.push(location);
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            serverName = JSON.parse(result.text).Name;

            done();
          });
        });

        it('should show the server', function (done) {
          var cmd = ('node cli.js sql server show ' + serverName).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var server = JSON.parse(result.text);
            server.Name.should.equal(serverName);
            server.AdministratorLogin.should.equal(administratorLogin);
            server.Location.should.equal(location);

            done();
          });
        });

        it('should list the server', function (done) {
          var cmd = ('node cli.js sql server list').split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var servers = JSON.parse(result.text);

            should.exist(servers.filter(function (server) {
              return server.Name === serverName;
            }));

            done();
          });
        });
      });
    });

    describe('firewallrule cmdlets', function () {
      var startIPAddress = '192.168.0.1';
      var endIPAddress = '192.168.0.255';
      var ruleName = 'rule1';

      var serverName;

      beforeEach(function (done) {
        var cmd = ('node cli.js sql server create').split(' ');
        cmd.push('--administratorLogin');
        cmd.push(administratorLogin);
        cmd.push('--administratorPassword');
        cmd.push(administratorLoginPassword);
        cmd.push('--location');
        cmd.push(location);
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          serverName = JSON.parse(result.text).Name;

          done();
        });
      });

      afterEach(function (done) {
        var cmd = ('node cli.js sql server delete ' + serverName).split(' ');
        cmd.push('--quiet');
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          done();
        });
      });

      describe('Create a firewall Rule', function () {
        it('should create a firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule create %s %s %s %s', serverName, ruleName, startIPAddress, endIPAddress).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      describe('Delete a firewall rule', function () {
        beforeEach(function (done) {
          var cmd = util.format('node cli.js sql firewallrule create %s %s %s %s', serverName, ruleName, startIPAddress, endIPAddress).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function () {
            done();
          });
        });

        it('should delete a firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule delete %s %s', serverName, ruleName).split(' ');
          cmd.push('--quiet');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      describe('List and show Firewall Rule', function () {
        beforeEach(function (done) {
          var cmd = util.format('node cli.js sql firewallrule create %s %s %s %s', serverName, ruleName, startIPAddress, endIPAddress).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });

        it('should show firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule show %s %s', serverName, ruleName).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });

        it('should list firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule list %s', serverName).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });
    });

    describe('Database cmdlets', function () {
      var serverName;

      var DATABASE_NAME = 'mydb';
      var RULE_NAME = 'dbrule';

      beforeEach(function (done) {
        // create a new server
        var cmd = ('node cli.js sql server create').split(' ');
        cmd.push(administratorLogin);
        cmd.push(administratorLoginPassword);
        cmd.push(location);
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          serverName = JSON.parse(result.text).Name;

          var cmd = util.format('node cli.js sql firewallrule create %s %s %s %s', serverName, RULE_NAME, '0.0.0.0', '255.255.255.255').split(' ');
          cmd.push('--json');

          executeCmd(cmd, function () {
            // let firewall rule create
            setTimeout(function () {
              done();
            }, (suiteUtil.isMocked && !suiteUtil.isRecording) ? 0 : 5000);
          });
        });
      });

      afterEach(function (done) {
        var cmd = ('node cli.js sql server delete ' + serverName).split(' ');
        cmd.push('--quiet');
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          done();
        });
      });

      describe('List and show databases', function () {
        it('should list master database', function (done) {
          var cmd = util.format('node cli.js sql db list %s %s %s', serverName, administratorLogin, administratorLoginPassword).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.be.null;
            result.exitStatus.should.equal(0);

            var databases = JSON.parse(result.text);
            databases.length.should.equal(1);

            done();
          });
        });

        describe('when a database is created', function () {
          beforeEach(function (done) {
            var cmd = util.format('node cli.js sql db create %s %s %s %s', serverName, DATABASE_NAME, administratorLogin, administratorLoginPassword).split(' ');
            cmd.push('--json');

            executeCmd(cmd, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              done();
            });
          });

          it('should list new database plus master', function (done) {
            var cmd = util.format('node cli.js sql db list %s %s %s', serverName, administratorLogin, administratorLoginPassword).split(' ');
            cmd.push('--json');

            executeCmd(cmd, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              var databases = JSON.parse(result.text);
              databases.length.should.equal(2);

              done();
            });
          });
        });

        describe('when a database is created without credentials', function () {
          var DATABASE_NAME_2 = DATABASE_NAME + '2';

          beforeEach(function (done) {
            var cmd = util.format('node cli.js sql db create %s %s', serverName, DATABASE_NAME_2).split(' ');
            cmd.push('--json');

            executeCmd(cmd, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);
              done();
            });
          });

          it('should list new database', function (done) {
            var cmd = util.format('node cli.js sql db list %s %s %s', serverName, administratorLogin, administratorLoginPassword).split(' ');
            cmd.push('--json');

            executeCmd(cmd, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              var databases = JSON.parse(result.text);
              var myDb = databases.filter(function (db) { return db.Name === DATABASE_NAME_2; });
              myDb.length.should.equal(1);

              done();
            });
          });
        });
      });
    });
  });
});