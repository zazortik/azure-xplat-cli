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

var __ = require('underscore');
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
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.ConnectionStrings = getConnectionStrings(siteConfigurations.ConnectionStrings);
      cli.interaction.formatOutput(siteConfigurations.ConnectionStrings.ConnStringInfo, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.Name);
            row.cell($('Type'), item.Type);
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
            cb(null, [ 'SQLAzure', 'SQLServer', 'Custom', 'MySQL' ]);
          }, _);

      if (type !== 'SQLAzure' && type !== 'SQLServer' && type !== 'Custom' && type !== 'MySQL') {
        throw new Error($('Invalid connection string type. Valid types are: SQLAzure, SQLServer, Custom or MySQL'));
      }

      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.ConnectionStrings = getConnectionStrings(siteConfigurations.ConnectionStrings);
      siteConfigurations.ConnectionStrings.ConnStringInfo.push({
        ConnectionString: value,
        Name: connectionname,
        Type: type
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
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);

      var found = false;
      if (siteConfigurations.ConnectionStrings && siteConfigurations.ConnectionStrings.ConnStringInfo) {
        siteConfigurations.ConnectionStrings = getConnectionStrings(siteConfigurations.ConnectionStrings);

        for (var i = 0; i < siteConfigurations.ConnectionStrings.ConnStringInfo.length; i++) {
          if (utils.ignoreCaseEquals(siteConfigurations.ConnectionStrings.ConnStringInfo[i].Name, connectionname)) {
            siteConfigurations.ConnectionStrings.ConnStringInfo.splice(i, 1);
            found = true;
            i--;
          }
        }

        if (found) {
          if (siteConfigurations.ConnectionStrings.ConnStringInfo.length === 0) {
            siteConfigurations.ConnectionStrings = { };
          }

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
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);
      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.ConnectionStrings = getConnectionStrings(siteConfigurations.ConnectionStrings);
      var match = siteConfigurations.ConnectionStrings.ConnStringInfo.filter(function (c) {
        return utils.ignoreCaseEquals(c.Name, connectionname);
      })[0];

      if (match) {
        cli.interaction.formatOutput(match, function (data) {
          cli.interaction.logEachData($('Connection String'), data);
        });
      } else {
        throw new Error(util.format($('Connection string with name "%s" does not exist'), connectionname));
      }
    });

  function getConnectionStrings(connectionStrings) {
    if (!connectionStrings) {
      connectionStrings = {};
    }

    if (!connectionStrings.ConnStringInfo) {
      connectionStrings.ConnStringInfo = [ ];
    } else if (!__.isArray(connectionStrings.ConnStringInfo)) {
      connectionStrings.ConnStringInfo = [ connectionStrings.ConnStringInfo ];
    }

    return connectionStrings;
  }
};