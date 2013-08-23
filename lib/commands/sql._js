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

var util = require('util');

var utils = require('../util/utils');

var allowAzureRuleName = 'AllowAllWindowsAzureIps';
var allowAzureRuleIp = '0.0.0.0';

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  cli.category('account').registerResourceType('sqlserver');

  var sql = cli.category('sql')
    .description($('Commands to manage your SQL Server accounts'));

  var server = sql.category('server')
    .description($('Commands to manage your SQL Server database servers'));

  server.command('create [administratorLogin] [administratorPassword] [location]')
    .description($('Create a new database server'))
    .usage('[options] <administratorLogin> <administratorPassword> <location>')
    .option('--administratorLogin <administratorLogin>', $('the new administrator login'))
    .option('--administratorPassword <administratorPassword>', $('the new administrator password'))
    .option('--location <location>', $('the location'))
    .option('--defaultFirewallRule', $('Add a firewall rule allowing access from Windows Azure'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (administratorLogin, administratorPassword, location, options, _) {
      var sqlService = createSqlManagementService(options.subscription);
      var serviceManagementService = createServiceManagementService(options.subscription);

      var params = utils.normalizeParameters({
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword],
        location: [location, options.location]
      });

      if (params.err) { throw params.err; }

      administratorLogin = cli.interaction.promptIfNotGiven($('New Administrator login: '), params.values.administratorLogin, _);
      administratorPassword = cli.interaction.promptPasswordIfNotGiven($('New administrator password: '), params.values.administratorPassword, _);
      location = cli.interaction.chooseIfNotGiven($('Location: '), $('Getting locations'), params.values.location,
          function (cb) {
            serviceManagementService.listLocations(function (err, result) {
              if (err) { return cb(err); }

              cb(null, result.body.map(function (location) { return location.Name; }));
            });
          }, _);

      var progress = cli.interaction.progress($('Creating SQL Server'));
      var serverName;
      try {
        serverName = sqlService.createServer(administratorLogin, administratorPassword, location, _);
      } finally {
        progress.end();
      }

      if (options.defaultFirewallRule) {
        progress = cli.interaction.progress(util.format($('Creating %s firewall rule'), allowAzureRuleName));
        sqlService.createServerFirewallRule(serverName, allowAzureRuleName, allowAzureRuleIp, allowAzureRuleIp, _);
        progress.end();
      }
      cli.interaction.formatOutput({ Name: serverName }, function(outputData) {
        log.data($('Server Name'), outputData.Name);
      });
    });

  server.command('show [serverName]')
    .description($('Show server details'))
    .usage('[options] <serverName>')
    .option('--serverName <serverName>', $('the SQL Server name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);

      var progress = cli.interaction.progress($('Getting SQL server'));
      var servers;
      try {
        servers = sqlService.listServers(_);
      } finally {
        progress.end();
      }

      var server = servers.filter(function (server) {
        return utils.ignoreCaseEquals(server.Name, serverName);
      })[0];

      cli.interaction.formatOutput(server, function(outputData) {
        if(!outputData) {
          log.error($('Server not found'));
        } else {
          cli.interaction.logEachData('SQL Server', server);
        }
      });
    });

  server.command('list')
    .description($('List the servers'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var sqlService = createSqlManagementService(options.subscription);
      var progress = cli.interaction.progress($('Getting SQL server'));
      var servers;
      try {
        servers = sqlService.listServers(_);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(servers, function(outputData) {
        if(outputData.length === 0) {
          log.info($('No SQL Servers exist'));
        } else {
          log.table(servers, function (row, item) {
            row.cell($('Name'), item.Name);
            row.cell($('Location'), item.Location);
          });
        }
      });
    });

  server.command('delete [serverName]')
    .description($('Delete a server'))
    .usage('[options] <serverName>')
    .option('--serverName <serverName>', $('the SQL Server name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete server %s? [y/n] '), serverName), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Removing SQL Server'));
      try {
        sqlService.deleteServer(serverName, _);
      } finally {
        progress.end();
      }
    });

  var firewallrule = sql.category('firewallrule')
    .description($('Commands to manage your SQL Server firewall rules'));

  firewallrule.command('create [serverName] [ruleName] [startIPAddress] [endIPAddress]')
    .description($('Create a new firewall rule for a SQL Server'))
    .usage('[options] <serverName> <ruleName> <startIPAddress> <endIPAddress>')
    .option('--serverName <serverName>', $('the SQL Server name'))
    .option('--ruleName <ruleName>', $('the firewall rule name'))
    .option('--startIPAddress <startIPAddress>', $('the starting IP address for the firewall rule'))
    .option('--endIPAddress <endIPAddress>', $('the ending IP address for the firewall rule'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, ruleName, startIPAddress, endIPAddress, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName],
        startIPAddress: [startIPAddress, options.startIPAddress],
        endIPAddress: [endIPAddress, options.endIPAddress]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), params.values.ruleName, _);
      startIPAddress = cli.interaction.promptIfNotGiven($('Start IP address: '), params.values.startIPAddress, _);

      if (params.values.endIPAddress || !params.values.startIPAddress) {
        endIPAddress = cli.interaction.promptIfNotGiven($('End IP Address: '), params.values.endIPAddress, _);
      } else {
        // Assume end ip address matches start ip address if the later was explicitly passed but not the former
        endIPAddress = startIPAddress;
      }

      try {
        var progress = cli.interaction.progress($('Creating Firewall Rule'));
        try {
          sqlService.createServerFirewallRule(serverName, ruleName, startIPAddress, endIPAddress, _);
        } finally {
          progress.end();
        }
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| utils.stringStartsWith(e.message, 'Resource with the name')) {
          throw new Error($('SQL Server and/or firewall rule not found'));
        } else {
          // rethrow
          throw e;
        }
      }
    });

  firewallrule.command('show [serverName] [ruleName]')
    .description($('Show firewall rule details'))
    .usage('[options] <serverName> <ruleName>')
    .option('--serverName <serverName>', $('the SQL Server name'))
    .option('--ruleName <ruleName>', $('the firewall rule name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), params.values.ruleName, _);

      try {
        var progress = cli.interaction.progress($('Getting firewall rule'));
        var rules;
        try {
          rules = sqlService.listServerFirewallRules(serverName, _);
        } finally {
          progress.end();
        }

        var rule = rules.filter(function (rule) {
          return utils.ignoreCaseEquals(rule.Name, ruleName);
        })[0];

        cli.interaction.formatOutput(rule, function(outputData) {
          if(!outputData) {
            log.error($('Firewall Rule not found'));
          } else {
            cli.interaction.logEachData($('Firewall rule'), rule);
          }
        });
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| utils.stringStartsWith(e.message, 'Resource with the name')) {
          throw new Error($('SQL Server and/or firewall rule not found'));
        } else {
          // rethrow
          throw e;
        }
      }
    });

  firewallrule.command('list [serverName]')
    .description($('List the firewall rules'))
    .usage('[options] <serverName>')
    .option('--serverName <serverName>', $('the SQL Server name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);

      var progress = cli.interaction.progress($('Getting firewall rules'));
      try {
        var rules = sqlService.listServerFirewallRules(serverName, _);
        cli.interaction.formatOutput(rules, function(outputData) {
          if(outputData.length === 0) {
            log.info($('No Firewall Rules exist'));
          } else {
            log.table(outputData, function (row, item) {
              row.cell($('Name'), item.Name);
              row.cell($('Start IP address'), item.StartIPAddress);
              row.cell($('End IP address'), item.EndIPAddress);
            });
          }
        });
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| utils.stringStartsWith(e.message, 'Resource with the name')) {
          throw new Error($('SQL Server and/or firewall rule not found'));
        } else {
          // rethrow
          throw e;
        }
      } finally {
        progress.end();
      }
    });

  firewallrule.command('delete [serverName] [ruleName]')
    .description($('Delete a firewall rule'))
    .usage('[options] <serverName> <ruleName>')
    .option('--serverName <serverName>', $('the SQL server name'))
    .option('--ruleName <ruleName>', $('the firewall rule name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, ruleName, options, _) {
      var sqlService = createSqlManagementService(options.subscription);

      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        ruleName: [ruleName, options.ruleName]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), params.values.ruleName, _);

      if (!options.quiet && !interaction.confirm(util.format($('Delete rule %s? [y/n] '), ruleName), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Removing firewall rule'));
      try {
        sqlService.deleteServerFirewallRule(serverName, ruleName, _);
      } catch (e) {
        if (e.code == 'ResourceNotFound'|| utils.stringStartsWith(e.message, 'Resource with the name')) {
          throw new Error($('SQL Server and/or firewall rule not found'));
        } else {
          // rethrow
          throw e;
        }
      } finally {
        progress.end();
      }
    });

  var db = sql.category('db')
    .description($('Commands to manage your SQL Server databases'));

  db.command('create [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description($('Create a new database'))
    .usage('[options] <serverName> <databaseName> <administratorLogin> <administratorPassword>')
    .option('--serverName <serverName>', $('the SQL server name'))
    .option('--databaseName <databaseName>', $('the database name'))
    .option('--administratorLogin <administratorLogin>', $('the administrator login'))
    .option('--administratorPassword <administratorPassword>', $('the administrator password'))
    .option('--collationName <collationName>', $('the database collation name'))
    .option('--edition <edition>', $('the database edition'))
    .option('--maxSizeInGB <maxSizeInGB>', $('the database maximum size in GB'))
    .option('--location <location>', $('the location'))
    .option('-s, --subscription <id>', $('the subscription id'))
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

      var useAdminCredentials = params.values.administratorLogin || params.values.administratorPassword;

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      databaseName = cli.interaction.promptIfNotGiven($('Database name: '), params.values.databaseName, _);
      if (useAdminCredentials) {
        administratorLogin = cli.interaction.promptIfNotGiven($('Administrator login: '), params.values.administratorLogin, _);
        administratorPassword = cli.interaction.promptPasswordOnceIfNotGiven($('Administrator password: '), params.values.administratorPassword, _);
      }
      collationName = params.values.collationName;
      edition = params.values.edition;
      maxSizeInGB = params.values.maxSizeInGB;

      var createFunc;

      if (useAdminCredentials) {
        var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);
        createFunc = function (callback) {
          sqlService.createServerDatabase(databaseName, { collation: collationName, edition: edition, maxSizeInGB: maxSizeInGB }, callback);
        };
      } else {
        createFunc = function (callback) {
          sqlManagementService.createDatabase(serverName, databaseName, {
            edition: edition,
            maxsize: maxSizeInGB,
            collation: collationName
          }, callback);
        };
      }

      var progress = cli.interaction.progress($('Creating SQL Server Database'));
      try {
        createFunc(_);
      } catch (e) {
        if (e.code == 'ENOTFOUND') {
          throw new Error($('SQL Server not found'));
        } else {
          // rethrow
          throw e;
        }
      } finally {
        progress.end();
      }
    });

  db.command('list [serverName] [administratorLogin] [administratorPassword]')
    .description($('List the databases'))
    .usage('[options] <serverName> <administratorLogin> <administratorPassword>')
    .option('--serverName <serverName>', $('the SQL server name'))
    .option('--administratorLogin <administratorLogin>', $('the administrator login'))
    .option('--administratorPassword <administratorPassword>', $('the administrator password'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, administratorLogin, administratorPassword, options, _) {
      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      administratorLogin = cli.interaction.promptIfNotGiven($('Administrator login: '), params.values.administratorLogin, _);
      administratorPassword = cli.interaction.promptPasswordOnceIfNotGiven($('Administrator password: '), params.values.administratorPassword, _);

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);

      var progress = cli.interaction.progress($('Getting SQL server databases'));
      var databases;
      try {
        databases = sqlService.listServerDatabases(_);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(databases, function(outputData) {
        if(outputData.length === 0) {
          log.info($('No SQL Server Databases exist'));
        } else {
          log.table(outputData, function (row, item) {
            row.cell($('Name'), item.Name);
            row.cell($('Edition'), item.Edition);
            row.cell($('Collation'), item.CollationName);
            row.cell($('MaxSizeInGB'), item.MaxSizeGB);
          });
        }
      });
    });

  db.command('show [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description($('Show database details'))
    .usage('[options] <serverName> <databaseName> <administratorLogin> <administratorPassword>')
    .option('--serverName <serverName>', $('the SQL server name'))
    .option('--databaseName <databaseName>', $('the database name'))
    .option('--administratorLogin <administratorLogin>', $('the administrator login'))
    .option('--administratorPassword <administratorPassword>', $('the administrator password'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, databaseName, administratorLogin, administratorPassword, options, _) {
      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        databaseName: [databaseName, options.databaseName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      databaseName = cli.interaction.promptIfNotGiven($('Database name: '), params.values.databaseName, _);
      administratorLogin = cli.interaction.promptIfNotGiven($('Administrator login: '), params.values.administratorLogin, _);
      administratorPassword = cli.interaction.promptPasswordOnceIfNotGiven($('Administrator password: '), params.values.administratorPassword, _);

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);
      var database = getDatabase(sqlService, databaseName, _);

      cli.interaction.formatOutput(database, function(outputData) {
        if(!outputData) {
          log.error($('Database not found'));
        } else {
          cli.interaction.logEachData('Database', outputData);
        }
      });
    });

  db.command('delete [serverName] [databaseName] [administratorLogin] [administratorPassword]')
    .description($('Delete a database'))
    .usage('[options] <serverName> <databaseName> <administratorPassword>')
    .option('--serverName <serverName>', $('the SQL server name'))
    .option('--databaseName <databaseName>', $('the database name'))
    .option('--administratorLogin <administratorLogin>', $('the administrator login'))
    .option('--administratorPassword <administratorPassword>', $('the administrator password'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (serverName, databaseName, administratorLogin, administratorPassword, options, _) {
      var params = utils.normalizeParameters({
        serverName: [serverName, options.serverName],
        databaseName: [databaseName, options.databaseName],
        administratorLogin: [administratorLogin, options.administratorLogin],
        administratorPassword: [administratorPassword, options.administratorPassword]
      });

      if (params.err) { throw params.err; }

      serverName = cli.interaction.promptIfNotGiven($('Server name: '), params.values.serverName, _);
      databaseName = cli.interaction.promptIfNotGiven($('Database name: '), params.values.databaseName, _);
      administratorLogin = cli.interaction.promptIfNotGiven($('Administrator login: '), params.values.administratorLogin, _);
      administratorPassword = cli.interaction.promptPasswordOnceIfNotGiven($('Administrator password: '), params.values.administratorPassword, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete database %s? [y/n] '), databaseName), _)) {
        return;
      }

      var sqlService = createSqlService(serverName, administratorLogin, administratorPassword);
      var database = getDatabase(sqlService, databaseName, _);

      if (database) {
        var progress = cli.interaction.progress($('Removing database'));
        sqlService.deleteServerDatabase(database.Id, _);
        progress.end();
      } else {
        throw new Error(util.format($('Database with name "%s" does not exist'), databaseName));
      }
    });

  function createServiceManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    return utils.createServiceManagementService(subscriptionId, account, log);
  }

  function createSqlManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    return utils.createSqlManagementService(subscriptionId, account, log);
  }

  function createSqlService(serverName, administratorLogin, administratorPassword) {
    return utils.createSqlService(serverName, administratorLogin, administratorPassword);
  }

  function getDatabase(sqlService, databaseName, _) {
    var progress = cli.interaction.progress($('Getting SQL server databases'));
    var databases;

    try {
      databases = sqlService.listServerDatabases(_);
    } finally {
      progress.end();
    }

    return databases.filter(function (database) {
      return utils.ignoreCaseEquals(database.Name, databaseName);
    })[0];
  }
};