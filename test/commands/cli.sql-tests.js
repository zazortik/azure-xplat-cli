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

var _ = require('underscore');

var should = require('should');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.sql-tests';

var location = process.env.AZURE_SQL_TEST_LOCATION || 'West US';

describe('cli', function () {
  describe('sql', function () {
    var administratorLogin = 'azuresdk';
    var administratorLoginPassword = 'SQLR0cks!999';

    before(function (done) {
      if (process.env.AZURE_TEST_MC) {
        suite = new CLITest(testPrefix);
      } else {
        suite = new CLITest(testPrefix, true);
      }

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

    describe('server cmdlets', function () {
      var oldServerNames;

      beforeEach(function (done) {
        suite.execute('sql server list --json', function (result) {
          oldServerNames = JSON.parse(result.text).map(function (server) {
            return server.name;
          });

          done();
        });
      });

      afterEach(function (done) {
        function deleteUsedServers (serverNames) {
          if (serverNames.length > 0) {
            var serverName = serverNames.pop();

            suite.execute('sql server delete %s --quiet --json', serverName, function () {
              deleteUsedServers(serverNames);
            });
          } else {
            done();
          }
        }

        suite.execute('sql server list --json', function (result) {
          var servers = JSON.parse(result.text);

          var usedServers = [ ];
          _.each(servers, function (server) {
            if (!_.contains(oldServerNames, server.Name)) {
              usedServers.push(server.name);
            }
          });

          deleteUsedServers(usedServers);
        });
      });

      describe('Create SQL Server', function () {
        it('should create a server', function (done) {
          suite.execute('sql server create --administratorLogin %s --administratorPassword %s --location %s --json',
            administratorLogin,
            administratorLoginPassword,
            location,
            function (result) {

            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var serverName = JSON.parse(result.text).name;
            serverName.should.not.be.null;
            serverName.should.match(/[0-9a-zA-Z]*/);

            done();
          });
        });
      });

      describe('Create SQL Server with azure firewall rule', function () {
        it('should create a server with firewall rule', function (done) {
          suite.execute('sql server create --administratorLogin %s --administratorPassword %s --location %s --defaultFirewallRule --json',
            administratorLogin,
            administratorLoginPassword,
            location,
            function (result) {
            try {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              var serverName = JSON.parse(result.text).name;
              serverName.should.not.be.null;
              serverName.should.match(/[0-9a-zA-Z]*/);

              suite.execute('sql firewallrule show %s AllowAllWindowsAzureIps --json', serverName, function (result) {
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
          suite.execute('sql server create --administratorLogin %s --administratorPassword %s --location %s --json',
            administratorLogin,
            administratorLoginPassword,
            location,
            function (result) {

            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            serverName = JSON.parse(result.text).name;

            done();
          });
        });

        it('should show the server', function (done) {
          suite.execute('sql server show %s --json', serverName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var server = JSON.parse(result.text);
            server.name.should.equal(serverName);
            server.administratorUserName.should.equal(administratorLogin);
            server.location.should.equal(location);

            done();
          });
        });

        it('should list the server', function (done) {
          suite.execute('sql server list --json', function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var servers = JSON.parse(result.text);

            servers.some(function (server) {
              return server.name === serverName;
            }).should.equal(true);

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
        suite.execute('sql server create --administratorLogin %s --administratorPassword %s --location %s --json',
          administratorLogin,
          administratorLoginPassword,
          location,
          function (result) {

          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          serverName = JSON.parse(result.text).name;

          done();
        });
      });

      afterEach(function (done) {
        suite.execute('sql server delete %s --quiet --json', serverName, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          done();
        });
      });

      describe('Create a firewall Rule', function () {
        it('should create a firewall rule', function (done) {
          suite.execute('sql firewallrule create %s %s %s %s --json',
            serverName,
            ruleName,
            startIPAddress,
            endIPAddress,
            function (result) {

            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      describe('Delete a firewall rule', function () {
        beforeEach(function (done) {
          suite.execute('sql firewallrule create %s %s %s %s --json', serverName, ruleName, startIPAddress, endIPAddress, function () {
            done();
          });
        });

        it('should delete a firewall rule', function (done) {
          suite.execute('sql firewallrule delete %s %s --quiet --json', serverName, ruleName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      describe('List and show Firewall Rule', function () {
        beforeEach(function (done) {
          suite.execute('sql firewallrule create %s %s %s %s --json', serverName, ruleName, startIPAddress, endIPAddress, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });

        it('should show firewall rule', function (done) {
          suite.execute('sql firewallrule show %s %s --json', serverName, ruleName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });

        it('should list firewall rule', function (done) {
          suite.execute('sql firewallrule list %s --json', serverName, function (result) {
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
        suite.execute('sql server create %s %s %s --json', administratorLogin, administratorLoginPassword, location, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          serverName = JSON.parse(result.text).name;
          suite.execute('sql firewallrule create %s %s %s %s --json', serverName, RULE_NAME, '0.0.0.0', '255.255.255.255', function () {
            // let firewall rule create
            setTimeout(function () {
              done();
            }, (suite.isMocked && !suite.isRecording) ? 0 : 5000);
          });
        });
      });

      afterEach(function (done) {
        suite.execute('sql server delete %s --quiet --json', serverName, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          done();
        });
      });

      describe('List and show databases', function () {
        it('should list master database', function (done) {
          suite.execute('sql db list %s %s %s --json', serverName, administratorLogin, administratorLoginPassword, function (result) {
            result.exitStatus.should.equal(0);

            var databases = JSON.parse(result.text);
            databases.length.should.equal(1);

            done();
          });
        });

        describe('when a database is created', function () {
          beforeEach(function (done) {
            suite.execute('sql db create %s %s %s %s --json', serverName, DATABASE_NAME, administratorLogin, administratorLoginPassword, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              done();
            });
          });

          it('should list new database plus master', function (done) {
            suite.execute('sql db list %s %s %s --json', serverName, administratorLogin, administratorLoginPassword, function (result) {
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
            suite.execute('sql db create %s %s --json', serverName, DATABASE_NAME_2, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);
              done();
            });
          });

          it('should list new database', function (done) {
            suite.execute('sql db list %s %s %s --json', serverName, administratorLogin, administratorLoginPassword, function (result) {
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