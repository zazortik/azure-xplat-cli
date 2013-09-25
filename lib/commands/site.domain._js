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
  var siteDomain = site.category('domain')
    .description($('Commands to manage your Web Site domains'));

  siteDomain.command('list [name]')
    .usage('[options] [name]')
    .description($('Show your site domains'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.HostNames = getHostNames(siteConfigurations.HostNames);
      cli.interaction.formatOutput(siteConfigurations.HostNames['a:string'], function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name'), item);
          });
        } else {
          log.info($('No host names defined yet'));
        }
      });
    });

  siteDomain.command('add [domain] [name]')
    .usage('[options] <dn> [name]')
    .description($('Add a site domain'))
    .option('-d, --dn <dn>', $('the new domain name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (dn, name, options, _) {
      if (options.dn) {
        name = dn;
        dn = undefined;
      }

      var params = utils.normalizeParameters({
        dn: [dn, options.dn]
      });

      if (params.err) { throw params.err; }

      dn = cli.interaction.promptIfNotGiven($('Domain name: '), params.values.dn, _);

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      siteConfigurations.HostNames = getHostNames(siteConfigurations.HostNames);
      siteConfigurations.HostNames['a:string'].push(dn);
      site.doSitePUT(context,  {
        HostNames: siteConfigurations.HostNames
      }, _);
    });

  siteDomain.command('delete [dn] [name]')
    .usage('[options] <dn> [name]')
    .description($('Delete a site domain'))
    .option('-d, --dn <dn>', $('the domain name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (dn, name, options, _) {
      if (options.dn) {
        name = dn;
        dn = undefined;
      }

      var params = utils.normalizeParameters({
        dn: [dn, options.dn]
      });

      if (params.err) { throw params.err; }

      dn = cli.interaction.promptIfNotGiven($('Domain name: '), params.values.dn, _);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete domain name %s? [y/n] '), dn), _)) {
        return;
      }

      var context = {
        subscription: cli.category('account').getCurrentSubscription(options.subscription).Id,
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteGet(context, _);
      var found = false;
      if (siteConfigurations.HostNames && siteConfigurations.HostNames['a:string']) {
        siteConfigurations.HostNames = getHostNames(siteConfigurations.HostNames);

        for (var i = 0; i < siteConfigurations.HostNames['a:string'].length; i++) {
          if (utils.ignoreCaseEquals(siteConfigurations.HostNames['a:string'][i], dn)) {
            siteConfigurations.HostNames['a:string'].splice(i, 1);
            found = true;
            i--;
          }
        }

        if (found) {
          if (siteConfigurations.HostNames['a:string'].length === 0) {
            siteConfigurations.HostNames = { };
          }

          site.doSitePUT(context, {
            HostNames: siteConfigurations.HostNames
          }, _);
        }
      }

      if (!found) {
        throw new Error(util.format($('Domain "%s" does not exist'), dn));
      }
    });

  function getHostNames(domains) {
    if (!domains) {
      domains = {
        '$': {
          'xmlns:a': 'http://schemas.microsoft.com/2003/10/Serialization/Arrays'
        }
      };
    }

    if (!domains['a:string']) {
      domains['a:string'] = [ ];
    } else if (!__.isArray(domains['a:string'])) {
      domains['a:string'] = [ domains['a:string'] ];
    }

    return domains;
  }
};