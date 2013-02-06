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
var __ = require('underscore');
var util = require('util');

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
    .option('--administratorLogin <administratorLogin>', 'The new administrator login')
    .option('--administratorPassword <administratorPassword>', 'The new administrator password')
    .option('--location <location>', 'The location')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (administratorLogin, administratorPassword, location, options, _) {
      var sqlService = createSqlManagementService(options.subscription);
      var serviceManagementService = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword],
        location: [location, options.location]
      });

      if (params.err) { throw params.err; }

      administratorLogin = interaction.promptIfNotGiven(cli, "New Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordIfNotGiven(cli, "New administrator password: ", params.values.administratorPassword, _);
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
        log.data('Server Name', outputData.Name);
      });
    });

  server.command('show [serverName]')
    .description('Display server details')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

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
          log.error('Server not found');
        } else {
          interaction.logEachData(cli, 'SQL Server', server);
        }
      });
    });

  server.command('list')
    .description('Get the list of servers')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var sqlService = createSqlManagementService(options.subscription);
      var progress = cli.progress('Listing SQL Servers');
      var servers = sqlService.listServers(_);
      progress.end();

      interaction.formatOutput(cli, servers, function(outputData) {
        if(outputData.length === 0) {
          log.info('No SQL Servers exist');
        } else {
          log.table(servers, function (row, item) {
            row.cell('Name', item.Name);
            row.cell('Location', item.Location);
          });
        }
      });
    });

  server.command('delete [serverName]')
    .description('Delete a server')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

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
      var sqlService = createSqlManagementService(options.subscription);

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

      if (params.values.endIPAddress || !params.values.startIPAddress) {
        endIPAddress = interaction.promptIfNotGiven(cli, "End IP Address: ", params.values.endIPAddress, _);
      } else {
        // Assume end ip address matches start ip address if the later was explicitly passed but not the former
        endIPAddress = startIPAddress;
      }

      try {
        var progress = cli.progress('Creating Firewall Rule');
        sqlService.createServerFirewallRule(serverName, ruleName, startIPAddress, endIPAddress, _);
        progress.end();
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| __.startsWith(e.message, 'Resource with the name')) {
          throw new Error('SQL Server and/or firewall rule not found');
        } else {
          // rethrow
          throw e;
        }
      }
    });

  firewallrule.command('show [serverName] [ruleName]')
    .description('Display firewall rule details')
    .usage('<serverName> <ruleName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--ruleName <ruleName>', 'The firewall rule name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      ruleName = interaction.promptIfNotGiven(cli, "Rule name: ", params.values.ruleName, _);

      try {
        var progress = cli.progress('Getting Firewall Rule');
        var rules = sqlService.listServerFirewallRules(serverName, _);
        progress.end();

        var rule = rules.filter(function (rule) {
          return utils.ignoreCaseEquals(rule.Name, ruleName);
        })[0];

        interaction.formatOutput(cli, rule, function(outputData) {
          if(!outputData) {
            log.error('Firewall Rule not found');
          } else {
            interaction.logEachData(cli, 'Firewall rule', rule);
          }
        });
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| __.startsWith(e.message, 'Resource with the name')) {
          throw new Error('SQL Server and/or firewall rule not found');
        } else {
          // rethrow
          throw e;
        }
      }
    });

  firewallrule.command('list [serverName]')
    .description('Get the list of firewall rules')
    .usage('<serverName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);

      try {
        var progress = cli.progress('Listing Firewall Rules');
        var rules = sqlService.listServerFirewallRules(serverName, _);
        progress.end();

        interaction.formatOutput(cli, rules, function(outputData) {
          if(outputData.length === 0) {
            log.info('No Firewall Rules exist');
          } else {
            log.table(outputData, function (row, item) {
              row.cell('Name', item.Name);
              row.cell('Start IP address', item.StartIPAddress);
              row.cell('End IP address', item.EndIPAddress);
            });
          }
        });
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| __.startsWith(e.message, 'Resource with the name')) {
          throw new Error('SQL Server and/or firewall rule not found');
        } else {
          // rethrow
          throw e;
        }
      }
    });

  firewallrule.command('delete [serverName] [ruleName]')
    .description('Delete a firewall rule')
    .usage('<serverName> <ruleName> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--ruleName <ruleName>', 'The firewall rule name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      ruleName = interaction.promptIfNotGiven(cli, "Rule name: ", params.values.ruleName, _);

      try {
        var progress = cli.progress('Removing firewall rule');

        sqlService.deleteServerFirewallRule(serverName, ruleName, _);

        progress.end();
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| __.startsWith(e.message, 'Resource with the name')) {
          throw new Error('SQL Server and/or firewall rule not found');
        } else {
          // rethrow
          throw e;
        }
      }
    });

  var db = sql.category('db')
    .description('Commands to manage your SQL Server databases');

  db.command('create [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description('Create a new database')
    .usage('<serverName> <databaseName> <administratorLogin> <administratorPassword> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--databaseName <databaseName>', 'The database name')
    .option('--administratorLogin <administratorLogin>', 'The administrator login')
    .option('--administratorPassword <administratorPassword>', 'The administrator password')
    .option('--collationName <collationName>', 'The database collation name')
    .option('--edition <edition>', 'The database edition')
    .option('--maxSizeInGB <maxSizeInGB>', 'The database maximum size in GB')
    .option('--location <location>', 'The location')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, databaseName, administratorLogin, administratorPassword, collationName, edition, maxSizeInGB, options, _) {
      var sqlManagementService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        databaseName: [databaseName, options.databaseName],
        collationName: [collationName, options.collationName],
        edition: [edition, options.edition],
        maxSizeInGB: [maxSizeInGB, options.maxSizeInGB],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      databaseName = interaction.promptIfNotGiven(cli, "Database name: ", params.values.databaseName, _);
      administratorLogin = interaction.promptIfNotGiven(cli, "Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordOnceIfNotGiven(cli, "Administrator password: ", params.values.administratorPassword, _);
      collationName = params.values.collationName;
      edition = params.values.edition;
      maxSizeInGB = params.values.maxSizeInGB;

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);

      try {
        var progress = cli.progress('Creating SQL Server Database');
        sqlService.createServerDatabase(databaseName, { collation: collationName, edition: edition, maxSizeInGB: maxSizeInGB }, _);
        progress.end();
      } catch (e) {
        if (e.code == 'ENOTFOUND') {
          throw new Error('SQL Server not found');
        } else {
          // rethrow
          throw e;
        }
      }
    });

  db.command('list [serverName] [administratorLogin] [administratorPassword]')
    .description('Get the list of databases')
    .usage('<serverName> <administratorLogin> <administratorPassword> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--administratorLogin <administratorLogin>', 'The administrator login')
    .option('--administratorPassword <administratorPassword>', 'The administrator password')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, administratorLogin, administratorPassword, options, _) {
      var sqlManagementService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      administratorLogin = interaction.promptIfNotGiven(cli, "Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordOnceIfNotGiven(cli, "Administrator password: ", params.values.administratorPassword, _);

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);

      var progress = cli.progress('Listing SQL Server Databases');
      var databases = sqlService.listServerDatabases(_);
      progress.end();

      interaction.formatOutput(cli, databases, function(outputData) {
        if(outputData.length === 0) {
          log.info('No SQL Server Databases exist');
        } else {
          log.table(outputData, function (row, item) {
            row.cell('Name', item.Name);
            row.cell('Edition', item.Edition);
            row.cell('Collation', item.CollationName);
            row.cell('MaxSizeInGB', item.MaxSizeGB);
          });
        }
      });
    });

  db.command('show [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description('Display database details')
    .usage('<serverName> <databaseName> <administratorLogin> <administratorPassword> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--databaseName <databaseName>', 'The database name')
    .option('--administratorLogin <administratorLogin>', 'The administrator login')
    .option('--administratorPassword <administratorPassword>', 'The administrator password')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, databaseName, administratorLogin, administratorPassword, options, _) {
      var sqlManagementService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        databaseName: [databaseName, options.databaseName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      databaseName = interaction.promptIfNotGiven(cli, "Database name: ", params.values.databaseName, _);
      administratorLogin = interaction.promptIfNotGiven(cli, "Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordOnceIfNotGiven(cli, "Administrator password: ", params.values.administratorPassword, _);

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);
      var database = getDatabase(sqlService, databaseName, _);

      interaction.formatOutput(cli, database, function(outputData) {
        if(!outputData) {
          log.error('Database not found');
        } else {
          interaction.logEachData(cli, 'Database', outputData);
        }
      });
    });

  db.command('delete [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description('Delete a database')
    .usage('<serverName> <databaseName> <administratorPassword> [options]')
    .option('--serverName <serverName>', 'The SQL server name')
    .option('--databaseName <databaseName>', 'The database name')
    .option('--administratorLogin <administratorLogin>', 'The administrator login')
    .option('--administratorPassword <administratorPassword>', 'The administrator password')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (serverName, databaseName, administratorLogin, administratorPassword, options, _) {
      var sqlManagementService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        databaseName: [databaseName, options.databaseName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = interaction.promptIfNotGiven(cli, "Server name: ", params.values.serverName, _);
      databaseName = interaction.promptIfNotGiven(cli, "Database name: ", params.values.databaseName, _);
      administratorLogin = interaction.promptIfNotGiven(cli, "Administrator login: ", params.values.administratorLogin, _);
      administratorPassword = interaction.promptPasswordOnceIfNotGiven(cli, "Administrator password: ", params.values.administratorPassword, _);

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);
      var database = getDatabase(sqlService, databaseName, _);

      if (database) {
        var progress = cli.progress('Removing database');
        sqlService.deleteServerDatabase(database.Id, _);
        progress.end();
      } else {
        throw new Error(util.format('Database with name "%s" does not exist', databaseName));
      }
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

  function createSqlManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return azure.createSqlManagementService(subscriptionId, auth);
  }

  function createSqlService(serverName, administratorLogin, administratorPassword) {
    return azure.createSqlService(serverName, administratorLogin, administratorPassword);
  }

  function getDatabase(sqlService, databaseName, _) {
    var progress = cli.progress('Listing SQL Server Databases');
    var databases = sqlService.listServerDatabases(_);
    progress.end();

    return databases.filter(function (database) {
      return utils.ignoreCaseEquals(database.Name, databaseName);
    })[0];
  };
};