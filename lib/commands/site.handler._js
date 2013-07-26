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

var interaction = require('../util/interaction');
var utils = require('../util/utils');

exports.init = function (cli) {

  var log = cli.output;
  var site = cli.category('site');
  var siteDomain = site.category('handler')
    .description('Commands to manage your Web Site handler mappings');

  siteDomain.command('list [name]')
    .usage('[options] [name]')
    .description('Show your site handler mappings documents')
    .option('-s, --subscription <id>', 'The subscription id')
    .execute(function (name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.HandlerMappings = getHandlerMappings(siteConfigurations.HandlerMappings);
      interaction.formatOutput(cli, siteConfigurations.HandlerMappings.HandlerMapping, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell('Extension', item.Extension);
            row.cell('Script Processor Path', item.ScriptProcessor);
            row.cell('Additional Arguments', item.Arguments);
          });
        } else {
          log.info('No handler mappings defined yet.');
        }
      });
    });

  siteDomain.command('add [extension] [processor] [name]')
    .usage('[options] [extension] [processor] [name]')
    .description('Add a handler mapping')
    .option('-e, --extension <extension>', 'The handler mapping extension')
    .option('-p, --processor <processor>', 'The path to the script processor (executable that will process the file given by the extension)')
    .option('-a, --arguments <arguments>', 'The additional arguments')
    .option('-s, --subscription <id>', 'The subscription id')
    .execute(function (extension, processor, name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      var params = utils.normalizeParameters({
        extension: [extension, options.extension],
        processor: [processor, options.processor]
      });

      if (params.err) { throw params.err; }

      extension = interaction.promptIfNotGiven(cli, 'Extension: ', params.values.extension, _);
      processor = interaction.promptIfNotGiven(cli, 'Script Processor Path: ', params.values.processor, _);

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteConfigGet(context, _);
      siteConfigurations.HandlerMappings = getHandlerMappings(siteConfigurations.HandlerMappings);
      var handler = {
        Extension: extension,
        ScriptProcessor: processor
      };

      if (options.arguments) {
        handler.Arguments = options.arguments;
      }

      siteConfigurations.HandlerMappings.HandlerMapping.push(handler);

      site.doSiteConfigPUT(siteConfigurations, context, _);
    });

  siteDomain.command('delete [extension] [name]')
    .usage('[options] [extension] [name]')
    .description('Deletes a site handler mapping')
    .option('-d, --extension <extension>', 'The extension')
    .option('-q, --quiet', 'quiet mode, do not ask for delete confirmation')
    .option('-s, --subscription <id>', 'The subscription id')
    .execute(function (extension, name, options, _) {
      var context = {
        subscription: cli.category('account').lookupSubscriptionId(options.subscription),
        site: { name: name }
      };

      var params = utils.normalizeParameters({
        extension: [extension, options.extension]
      });

      if (params.err) { throw params.err; }

      extension = interaction.promptIfNotGiven(cli, 'Extension: ', params.values.extension, _);

      if (!options.quiet && !interaction.confirm(cli, util.format('Delete handler mapping with %s extension? (y/n) ', extension), _)) {
        return;
      }

      site.lookupSiteNameAndWebSpace(context, _);

      var siteConfigurations = site.doSiteConfigGet(context, _);
      var found = false;
      if (siteConfigurations.HandlerMappings && siteConfigurations.HandlerMappings.HandlerMapping) {
        siteConfigurations.HandlerMappings = getHandlerMappings(siteConfigurations.HandlerMappings);

        for (var i = 0; i < siteConfigurations.HandlerMappings.HandlerMapping.length; i++) {
          if (utils.ignoreCaseEquals(siteConfigurations.HandlerMappings.HandlerMapping[i].Extension, extension)) {
            siteConfigurations.HandlerMappings.HandlerMapping.splice(i, 1);
            found = true;
            i--;
          }
        }

        if (found) {
          if (siteConfigurations.HandlerMappings.HandlerMapping.length === 0) {
            siteConfigurations.HandlerMappings = { };
          }

          site.doSiteConfigPUT(siteConfigurations, context, _);
        }
      }

      if (!found) {
        throw new Error(util.format('Handler mapping for extension "%s" does not exist.', extension));
      }
    });

  function getHandlerMappings(handlers) {
    if (!handlers) {
      handlers = {};
    }

    if (!handlers.HandlerMapping) {
      handlers.HandlerMapping = [ ];
    } else if (!__.isArray(handlers.HandlerMapping)) {
      handlers.HandlerMapping = [ handlers.HandlerMapping ];
    }

    delete handlers['$'];
    return handlers;
  }
};