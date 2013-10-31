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

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var site = cli.category('site');
  var siteConnectionStrings = site.category('connectionstring')
    .description($('Commands to manage your Web Site connection strings'));

  siteConnectionStrings.command('list [name]')
    .usage('[options] [name]')
    .description($('Show your site application settings'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteConfigGet(context, _);
      cli.interaction.formatOutput(siteConfigurations.connectionStrings, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Type'), item.type);
          });
        } else {
          log.info($('No connection strings defined yet'));
        }
      });
    });

  siteConnectionStrings.command('add [connectionname] [value] [type] [name]')
    .usage('[options] <connectionname> <value> <type> [name]')
    .description($('Add a connection string to your site'))
    .option('-c, --connectionname <connectionname>', $('the connection string name'))
    .option('-v, --value <value>', $('the connection string value'))
    .option('-t, --type <type>', $('the connection string type'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (connectionname, value, type, name, options, _) {
      if (options.connectionname) {
        name = type;
        type = value;
        value = connectionname;
        connectionname = undefined;
      }

      if (options.value) {
        name = type;
        type = value;
        value = undefined;
      }

      if (options.type) {
        name = type;
        type = undefined;
      }

      var params = utils.normalizeParameters({
        connectionname: [connectionname, options.connectionname],
        value: [value, options.value],
        type: [type, options.type]
      });

      if (params.err) { throw params.err; }

      connectionname = cli.interaction.promptIfNotGiven($('Connection String Name: '), params.values.connectionname, _);
      value = cli.interaction.promptIfNotGiven($('Connection String Value: '), params.values.value, _);
      type = cli.interaction.chooseIfNotGiven($('Connection String Type: '), $('Getting types'), params.values.type,
          function (cb) {
            cb(null, [ 'SQLAzure', 'SQLServer', 'Custom', 'MySql' ]);
          }, _);

      if (utils.ignoreCaseEquals(type, 'SQLAzure')) {
        type = 'SQLAzure';
      } else if (utils.ignoreCaseEquals(type, 'SQLServer')) {
        type = 'SQLServer';
      } else if (utils.ignoreCaseEquals(type, 'Custom')) {
        type = 'Custom';
      } else if (utils.ignoreCaseEquals(type, 'MySql')) {
        type = 'MySql';
      } else {
        throw new Error($('Invalid connection string type. Valid types are: SQLAzure, SQLServer, Custom or MySql'));
      }

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.connectionStrings.push({
        connectionString: value,
        name: connectionname,
        type: type
      });

      site.doSiteConfigPUT(siteConfigurations, context, _);
    });

  siteConnectionStrings.command('delete [connectionname] [name]')
    .usage('[options] <connectionname> [name]')
    .description($('Delete a connection string for your site'))
    .option('-c, --connectionname <connectionname>', $('the connection string name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (connectionname, name, options, _) {
      if (options.connectionname) {
        name = connectionname;
        connectionname = undefined;
      }

      var params = utils.normalizeParameters({
        connectionname: [connectionname, options.connectionname]
      });

      if (params.err) { throw params.err; }

      connectionname = cli.interaction.promptIfNotGiven($('Connection String Name: '), params.values.connectionname, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Deleteconnection string %s? [y/n] '), connectionname), _)) {
        return;
      }

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);

      var found = false;
      if (siteConfigurations.connectionStrings) {
        for (var i = 0; i < siteConfigurations.connectionStrings.length; i++) {
          if (utils.ignoreCaseEquals(siteConfigurations.connectionStrings[i].name, connectionname)) {
            siteConfigurations.connectionStrings.splice(i, 1);
            found = true;
            i--;
          }
        }

        if (found) {
          site.doSiteConfigPUT(siteConfigurations, context, _);
        }
      }

      if (!found) {
        throw new Error(util.format($('Connection string with name "%s" does not exist'), connectionname));
      }
    });

  siteConnectionStrings.command('show [connectionname] [name]')
    .usage('[options] <connectionname> [name]')
    .description($('Show a connection string for your site'))
    .option('-c, --connectionname <connectionname>', $('the connection string name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (connectionname, name, options, _) {
      if (options.connectionname) {
        name = connectionname;
        connectionname = undefined;
      }

      var params = utils.normalizeParameters({
        connectionname: [connectionname, options.connectionname]
      });

      if (params.err) { throw params.err; }

      connectionname = cli.interaction.promptIfNotGiven($('Connection String Name: '), params.values.connectionname, _);

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);

      var match = siteConfigurations.connectionStrings.filter(function (c) {
        return utils.ignoreCaseEquals(c.name, connectionname);
      })[0];

      if (match) {
        cli.interaction.formatOutput(match, function (data) {
          cli.interaction.logEachData($('Connection String'), data);
        });
      } else {
        throw new Error(util.format($('Connection string with name "%s" does not exist'), connectionname));
      }
    });
};