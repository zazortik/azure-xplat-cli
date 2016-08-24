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

var util = require('util');

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


    config.command('get [resource-group] [name]')
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
                result = client.webSites.getConfiguration(resourceGroup, name, options.slot, getProp, _);
            } finally {
                progress.end();
            }

            cli.interaction.formatOutput(result, function (data) {
                if (!data) {
                    log.info($('No webapp information available'));
                } else {
                    log.data($('Web app Name             :'), data.resource.name);
                    log.data($('Location                 :'), data.resource.location);
                    log.data($('Php version              :'), data.resource.properties.phpVersion);
                    log.data($('Node version             :'), data.resource.properties.nodeVersion);
                    log.data($('App Command Line         :'), data.resource.properties.appCommandLine);
                    log.data($('Python version           :'), data.resource.properties.pythonVersion);
                    log.data($('Java version             :'), data.resource.properties.javaVersion);
                    log.data($('Java Container           :'), data.resource.properties.javaContainer);
                    log.data($('Java Container Version   :'), data.resource.properties.javaContainerVersion);
                    log.data($('AlwaysOn                 :'), data.resource.properties.alwaysOn);
                    log.data($('WebSockets Enabled       :'), data.resource.properties.webSocketsEnabled);
                    log.data($('AppSettings              :'), data.resource.properties.appSettings);
                    log.data($('Use 32bit Worker Process :'), data.resource.properties.use32BitWorkerProcess);
                    log.data('');
                }
            });
        });



    config.command('update [resource-group] [name]')
        .description($('Update webapp configuration'))
        .usage('[options] <resource-group> <name>')
        .option('-g --resource-group <resource-group>', $('the name of the resource group'))
        .option('-n --name <name>', $('the name of the webapp to update'))
        .option('-l --location <location>', $('the location of the webapp to update'))
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
            var progress = cli.interaction.progress($('Getting webapp configuration'));
            var jsonObj = {};
            var jsonProperties = {};
            jsonObj['properties'] = jsonProperties;

            if (options.jsonInput !== null && options.jsonInput !== undefined) {
                jsonObj = JSON.parse(options.jsonInput);
            }

            if (options.phpversion !== null && options.phpversion !== undefined) {
                jsonProperties['phpVersion'] = options.phpversion;
            }

            if (options.pythonversion !== null && options.pythonversion !== undefined) {
                jsonProperties['pythonVersion'] = options.pythonversion;
            }

            if (options.nodeversion !== null && options.nodeversion !== undefined) {
                jsonProperties['nodeVersion'] = options.nodeversion;
            }

            if (options.javaversion !== null && options.javaversion !== undefined) {
                jsonProperties['javaVersion'] = options.javaversion;
            }

            if (options.javacontainer !== null && options.javacontainer !== undefined) {
                jsonProperties['javaContainer'] = options.javacontainer;
            }

            if (options.javacontainerversion !== null && options.javacontainerversion !== undefined) {
                jsonProperties['javaContainerVersion'] = options.javacontainerversion;
            }

            if (options.appcommandline !== null && options.appcommandline !== undefined) {
                jsonProperties['appCommandLine'] = options.appcommandline;
            }

            if (options.location !== null && options.location !== undefined) {
                jsonObj['location'] = options.location;
            }

            if (options.appsettings !== null && options.appsettings !== undefined) {
                var appSettingObj = {};
                console.log('appsettings = ' + options.appsettings);
                var appSettingsSplit = options.appsettings.split(",");
                for (var i = 0; i < appSettingsSplit.length; i++) {
                    console.log(' appsettingStr = ' + appSettingsSplit[i]);
                    var appSettingStrSplt = appSettingsSplit[i].split("=");
                    appSettingObj[appSettingStrSplt[0]] = appSettingStrSplt[1];
                }
                jsonProperties['appSettings'] = appSettingObj;
            }

            var result;
            try {
                result = client.webSites.updateConfiguration(resourceGroup, name, options.slot, jsonObj, _);
            } finally {
                progress.end();
            }
            log.info('Webapp ' + webSiteSlotName + ' configuration has been updated ');
        });

	publish.command('get [resource-group] [name]')
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
        result = client.webSites.getPublishProfile(resourceGroup, name, options.slot, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
        if (!data) {
          log.info($('No webapp information available'));
        } else {
          console.log('data: ' + JSON.stringify(data));
          if (data.publishProfiles && data.publishProfiles.length > 0) {
            log.table(data.publishProfiles, function (row, s) {
              row.cell($('Profile name '), s.profileName);
              row.cell($('Username '), s.userName);
              row.cell($('Password '), s.userPassword);
              row.cell($('Publish URL '), s.publishUrl);
            });
          }
          log.data('');
        }
      });
    });
};

