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

var url = require('url');
var azure = require('azure');

var utils = require('../utils');
var interaction = require('../util/interaction');

exports.init = function (cli) {
  var log = cli.output;

  var sql = cli.category('sql')
    .description('Commands to manage your SQL accounts');

  var server = sql.category('server')
    .description('Commands to manage your database servers');

  server.command('create [administratorLogin] [administratorPassword] [location]')
    .description('Create a new database server')
    .usage('<administratorLogin> <administratorPassword> <location> [options]')
    .option('--administratorLogin <administratorLogin>', 'The administrator login')
    .option('--administratorPassword <administratorPassword>', 'The administrator password')
    .option('--location <location>', 'The location')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (administratorLogin, administratorPassword, location, options, _) {
      var sqlService = createSqlService(options.subscription);
      var serviceManagementService = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword],
        location: [location, options.location]
      });

      if (params.err) { throw params.err; }

      administratorLogin = interaction.promptIfNotGiven(cli, "Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordIfNotGiven(cli, "Administrator login password: ", params.values.administratorPassword, _);
      location = interaction.chooseIfNotGiven(cli, "Location: ", "Getting locations", params.values.location, 
          function (cb) {
            serviceManagementService.listLocations(function (err, result) {
              if (err) { return cb(err); }

              cb(null, result.body.map(function (location) { return location.Name; }));
            });
          }, _);

      var progress = cli.progress('Creating SQL Server');
      var serverName = sqlService.createServer(administratorLogin, administratorPassword, location, _);
      progress.end();

      interaction.formatOutput(cli, { Name: serverName }, function(outputData) { 
        // only print if JSON output. Do nothing for normal printing.
      });
    });

  server.command('show [serverName]')
    .description('Display server details')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);

      var progress = cli.progress('Getting SQL Server');
      var servers = sqlService.listServers(_);
      progress.end();

      var server = servers.filter(function (server) {
        return utils.ignoreCaseEquals(server.Name, serverName);
      })[0];

      interaction.formatOutput(cli, server, function(outputData) {
        if(!outputData) {
          log.info('Server not found');
        } else {
          logEachData('SQL Server', server);
        }
      });
    });

  server.command('list')
    .description('Get the list of servers')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var sqlService = createSqlService(options.subscription);
      var progress = cli.progress('Listing SQL Servers');
      var servers = sqlService.listServers(_);
      progress.end();

      interaction.formatOutput(cli, servers, function(outputData) {
        if(outputData.length === 0) {
          log.info('No SQL Servers created');
        } else {
          log.table(servers, function (row, item) {
            row.cell('Name', item.Name);
            row.cell('Location', item.Location);
          });
        }
      });
    });

  server.command('remove [serverName]')
    .description('Remove a server')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);

      var progress = cli.progress('Removing SQL Server');
      sqlService.deleteServer(serverName, _);
      progress.end();
    });

  var firewallrule = sql.category('firewallrule')
    .description('Commands to manage your firewall rules for SQL Servers');

  firewallrule.command('create [serverName] [ruleName] [startIPAddress] [endIPAddress]')
    .description('Create a new firewall rule for a SQL server')
    .usage('<serverName> <ruleName> <startIPAddress> <endIPAddress> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--ruleName <ruleName>', 'The firewall rule name')
    .option('--startIPAddress <startIPAddress>', 'The starting IP address for the firewall rule')
    .option('--endIPAddress <endIPAddress>', 'The ending IP address for the firewall rule')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, ruleName, startIPAddress, endIPAddress, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName],
        startIPAddress: [startIPAddress, options.startIPAddress],
        endIPAddress: [endIPAddress, options.endIPAddress]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      ruleName = interaction.promptIfNotGiven(cli, "Rule name: ", params.values.ruleName, _);
      startIPAddress = interaction.promptIfNotGiven(cli, "Start IP address: ", params.values.startIPAddress, _);
      endIPAddress = interaction.promptIfNotGiven(cli, "End IP Address: ", params.values.endIPAddress, _);


      var progress = cli.progress('Creating Firewall Rule');
      sqlService.createServerFirewallRule(serverName, ruleName, startIPAddress, endIPAddress, _);
      progress.end();
    });

  firewallrule.command('show [serverName] [ruleName]')
    .description('Display firewall rule details')
    .usage('<serverName> <ruleName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--ruleName <ruleName>', 'The firewall rule name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      ruleName = interaction.promptIfNotGiven(cli, "Rule name: ", params.values.ruleName, _);

      var progress = cli.progress('Getting SQL Server');
      var rules = sqlService.listServerFirewallRules(serverName, _);
      progress.end();

      var rule = rules.filter(function (rule) {
        return utils.ignoreCaseEquals(rule.Name, ruleName);
      })[0];

      interaction.formatOutput(cli, rule, function(outputData) {
        if(!outputData) {
          log.info('Firewall Rule not found');
        } else {
          logEachData('Firewall rule', rule);
        }
      });
    });

  firewallrule.command('list [serverName]')
    .description('Get the list of firewall rules')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);

      var progress = cli.progress('Listing SQL Servers');
      var rules = sqlService.listServerFirewallRules(serverName, _);
      progress.end();

      interaction.formatOutput(cli, rules, function(outputData) {
        if(outputData.length === 0) {
          log.info('No Firewall Rules created');
        } else {
          log.table(rules, function (row, item) {
            // TODO: fix this
            row.cell('Name', item.Name);
            row.cell('Location', item.Location);
          });
        }
      });
    });

  firewallrule.command('remove [serverName] [ruleName]')
    .description('Remove a firewall rule')
    .usage('<serverName> <ruleName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--ruleName <ruleName>', 'The firewall rule name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      ruleName = interaction.promptIfNotGiven(cli, "Rule name: ", params.values.ruleName, _);

      var progress = cli.progress('Removing firewall rule');

      sqlService.deleteServerFirewallRule(serverName, ruleName, _);

      progress.end();
    });

  function createServiceManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return azure.createServiceManagementService(subscriptionId, auth);
  }

  function createSqlService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return azure.createSqlDatabaseService(subscriptionId, auth);
  }
};