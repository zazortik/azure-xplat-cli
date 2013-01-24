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

var _ = require('underscore');

var should = require('should');
var mocha = require('mocha');

var util = require('util');
var executeCmd = require('../framework/cli-executor').execute;

describe('CLI', function () {
  describe('SQL', function () {
    var administratorLogin = 'azuresdk';
    var administratorLoginPassword = 'PassWord!1';
    var location = 'West US';

    describe('server cmdlets', function () {
      var oldServerNames;

      before(function (done) {
        var cmd = ('node cli.js sql server list --json').split(' ');
        executeCmd(cmd, function (result) {

          oldServerNames = JSON.parse(result.text).map(function (server) {
            return server.Name;
          });

          done();
        });
      });

      after(function (done) {
        function deleteUsedServers (serverNames) {
          if (serverNames.length > 0) {
            var serverName = serverNames.pop();

            var cmd = ('node cli.js sql server remove ' + serverName + ' --json').split(' ');
            executeCmd(cmd, function (result) {
              deleteUsedServers(serverNames);
            });
          } else {
            done();
          }
        };

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
          cmd.push(administratorLogin);
          cmd.push(administratorLoginPassword);
          cmd.push(location);
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var serverName = JSON.parse(result.text);
            serverName.should.not.be.null;
            serverName.should.match(/[0-9a-zA-Z]*/);

            done();
          });
        });
      });

      describe('List and show SQL Server', function () {
        var serverName;

        before(function (done) {
          var cmd = ('node cli.js sql server create').split(' ');
          cmd.push(administratorLogin);
          cmd.push(administratorLoginPassword);
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

      before(function (done) {
        var cmd = ('node cli.js sql server create').split(' ');
        cmd.push(administratorLogin);
        cmd.push(administratorLoginPassword);
        cmd.push(location);
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          serverName = JSON.parse(result.text).Name;

          done();
        });
      });

      after(function (done) {
        var cmd = ('node cli.js sql server remove ' + serverName).split(' ');
        cmd.push('--json');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          done();
        });
      });

      describe('Create and remove firewall Rule', function () {
        it('should create a firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule create %s %s %s %s', serverName, ruleName, startIPAddress, endIPAddress).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });

        it('should remove a firewall rule', function (done) {
          var cmd = util.format('node cli.js sql firewallrule remove %s %s', serverName, ruleName).split(' ');
          cmd.push('--json');

          executeCmd(cmd, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            done();
          });
        });
      });

      describe('List and show Firewall Rule', function () {
        before(function (done) {
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
  });
});