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

'use strict';

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var webappUtils = require('./webappUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var webapp = cli.category('webapp')
    .description($('Commands to manage your Azure webapps'));

  var config = webapp.category('config')
    .description($('Commands to manage your Azure webapps configurations'));

  var publish = webapp.category('publishprofile')
    .description($('Command to get your Azure webapps publishing profile'));

  config.command('show [resource-group] [name]')
    .description($('Get webapp configuration'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to show'))
    .option('--slot <slot>', $('the name of the slot to show'))
    .option('--propertiesToInclude <propertiesToInclude>', $('comma separate property names to include'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      
      var progress = cli.interaction.progress($('Getting webapp configuration'));
      
      var getProp = options.propertiesToInclude;
      var result;
      try {
        result = client.sites.getSiteConfig(resourceGroup, name, getProp, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
        if (!data) {
          log.info($('No webapp information available'));
        } else {
          log.data($('Web app Name             :'), data.name);
          log.data($('Location                 :'), data.location);
          log.data($('Php version              :'), data.phpVersion);
          log.data($('Node version             :'), data.nodeVersion);
          log.data($('App Command Line         :'), data.appCommandLine);
          log.data($('Python version           :'), data.pythonVersion);
          log.data($('Java version             :'), data.javaVersion);
          log.data($('Java Container           :'), data.javaContainer);
          log.data($('Java Container Version   :'), data.javaContainerVersion);
          log.data($('AlwaysOn                 :'), data.alwaysOn);
          log.data($('WebSockets Enabled       :'), data.webSocketsEnabled);
          log.data($('AppSettings              :'), data.appSettings);
          log.data($('Use 32bit Worker Process :'), data.use32BitWorkerProcess);
          log.data('');
        }
      });
    });
	  
  config.command('set [resource-group] [name]')
    .description($('set webapp configuration (1 setting at a time)'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to update'))
    .option('-l --location <location>', $('the location of the webapp to update, , \n\t\t\t\t\t\t   locations found at https://azure.microsoft.com/en-us/status/'))
    .option('-j --jsonInput <jsonInput>', $('the json config object string'))
    .option('--phpversion <phpversion>', $('phpversion of webapp'))
    .option('--pythonversion <pythonversion>', $('pythonversion of webapp'))
    .option('--nodeversion <nodeversion>', $('nodeversion of webapp'))
    .option('--appcommandline <appcommandline>', $('app command line for webapp'))
    .option('--javaversion <javaversion>', $('javaversion of webapp'))
    .option('--javacontainer <javacontainer>', $('javacontainer of webapp'))
    .option('--javacontainerversion <javacontainerversion>', $('javacontainerversion of webapp'))
    .option('--appsettings <appsettings>', $('webapp appsettings'))
    .option('--slot <slot>', $('the name of the slot to update'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      var webSiteSlotName = name;
      if (Boolean(options.slot)) {
        webSiteSlotName = name.concat('/', options.slot);
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Updating webapp configuration'));
      var jsonObj = {};
      if (options.jsonInput !== null && options.jsonInput !== undefined) {
        jsonObj = JSON.parse(options.jsonInput);
      }
      if (options.phpversion !== null && options.phpversion !== undefined) {
        jsonObj['phpVersion'] = options.phpversion;
      }
      if (options.pythonversion !== null && options.pythonversion !== undefined) {
        jsonObj['pythonVersion'] = options.pythonversion;
      }
      if (options.nodeversion !== null && options.nodeversion !== undefined) {
        jsonObj['nodeVersion'] = options.nodeversion;
      }
      if (options.javaversion !== null && options.javaversion !== undefined) {
        jsonObj['javaVersion'] = options.javaversion;
      }
      if (options.javacontainer !== null && options.javacontainer !== undefined) {
        jsonObj['javaContainer'] = options.javacontainer;
      }
      if (options.javacontainerversion !== null && options.javacontainerversion !== undefined) {
        jsonObj['javaContainerVersion'] = options.javacontainerversion;
      }
      if (options.appcommandline !== null && options.appcommandline !== undefined) {
        jsonObj['appCommandLine'] = options.appcommandline;
      }
      var result;
      if (options.location !== null && options.location !== undefined) {
        jsonObj['location'] = options.location;
      }
	  else
	  {
	    try {
          result = client.sites.getSite(resourceGroup, name, _);
        } finally {
          progress.end();
        }
	    jsonObj['location'] = result.location;
	  }
      try {
        result = client.sites.createOrUpdateSiteConfig(resourceGroup, name, jsonObj, _);
      } finally {
        progress.end();
      }
      log.info('Webapp ' + webSiteSlotName + ' configuration has been updated ');
    });

  publish.command('show [resource-group] [name]')
    .description($('Get webapp publish profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to show'))
    .option('--slot <slot>', $('the name of the slot to show'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting webapp configuration'));
      var result;
      try {
        result = client.sites.listSitePublishingCredentials(resourceGroup, name, options, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
	    log.data('');
        if (!data) {
          log.info($('No webapp publishing profile information available'));
        } else {
          log.info('data: ' + JSON.stringify(data));
        }
        log.data('');
      });
    });
};