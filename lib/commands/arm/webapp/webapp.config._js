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

  var appsetting = config.category('appsetting')
    .description($('Commands to manage your Azure webapps app setting configurations'));

  var publish = webapp.category('publishprofile')
    .description($('Command to get your Azure webapps publishing profile'));

  var hostnames = config.category('hostname')
    .description($('Commands to get your Azure webapps hostnames'));

  config.command('show [resource-group] [name]')
    .description($('Get webapp configuration \nexample:  webapp config show resroucegroup1 webapp1'))
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
      var publishingResult;
      var appSettingsResult;
      try {
        result = client.sites.getSiteConfig(resourceGroup, name, _);
        publishingResult = client.sites.listSitePublishingCredentials(resourceGroup, name, _);
        appSettingsResult = client.sites.listSiteAppSettings(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
        if (!data) {
          log.info($('No webapp information available'));
        } else {
          log.data($('Properties'));
          log.data($('--------------------------------'));
          log.data($('Web app Name                   :'), data.name);
          log.data($('Location                       :'), data.location);
          log.data($('Php version                    :'), data.phpVersion);
          log.data($('Python version                 :'), data.pythonVersion);
          log.data($('Node version                   :'), data.nodeVersion);
          log.data($('Number Of Workers              :'), data.numberOfWorkers);
          log.data($('Net Framework Version          :'), data.netFrameworkVersion);
          log.data($('Java version                   :'), data.javaVersion);
          log.data($('Java Container                 :'), data.javaContainer);
          log.data($('Java Container Version         :'), data.javaContainerVersion);
          log.data($('Http Logging Enabled           :'), data.httpLoggingEnabled);
          log.data($('Detailed Error Logging Enabled :'), data.detailedErrorLoggingEnabled);
          log.data($('Web Socket Enabled             :'), data.webSocketEnabled);
          log.data($('Always On                      :'), data.alwaysOn);
          log.data($('Use 32bit Worker Process       :'), data.use32BitWorkerProcess);
          log.data($('Auto Heal Enabled              :'), data.autoHealEnabled);
          log.data($('Remote Debugging Enabled       :'), data.remoteDebuggingEnabled);
          log.data($('Remote Debugging Version       :'), data.remoteDebuggingVersion);
          log.data($('Logs Directory Size Limit      :'), data.logsDirectorySizeLimit);
          log.data($('Load Balancing                 :'), data.loadBalancing);
          log.data($('Managed Pipeline Mode          :'), data.managedPipelineMode);
          log.data($('virtualApplications            :'), data.virtualApplications);
          log.data($('Request Tracing Expiration Time:'), data.requestTracingExpirationTime);
          log.data($('Request Tracing Enabled        :'), data.requestTracingEnabled);
          log.data($('Document Root                  :'), data.documentRoot);
          log.data($('Handler Mappings               :'), data.handlerMappings);
          log.data($('Metadata                       :'), data.Metadata);
          log.data($('Default Documents              :'), data.defaultDocuments);
        }
      });
      cli.interaction.formatOutput(publishingResult, function (data) {
        if (!data) {
          log.info($('No webapp publishing profile information available'));
        } else {
          log.data($('Publish Profile Username       :'), data.publishingUserName);
          log.data($('Publish Profile Password       :'), data.publishingPassword);
          log.data('');
        }
      });
      cli.interaction.formatOutput(appSettingsResult.properties, function (data) {
        if(appSettingsResult.properties !== null && appSettingsResult.properties !== undefined) {
           log.data($('App Settings (use webapp config appsetting to change)'));
           log.data($('--------------------------------'));
           log.data(data);
           log.data($(''));
          }
      });
    });
	  
  config.command('set [resource-group] [name]')
    .description($('Set webapp configuration\nexample:  webapp config set RGName SiteName --alwayson true --numberofworkers 1'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to update'))
    .option('-j --jsonInput <jsonInput>', $('the json config object string'))
    .option('--phpversion <phpversion>', $('php version of webapp'))
    .option('--pythonversion <pythonversion>', $('python version of webapp'))
    .option('--nodeversion <nodeversion>', $('node version of webapp'))
    .option('--numberofworkers <numberofworkers>', $('number of workers'))
    .option('--netframeworkversion <netframeworkversion>', $('net framwork version of webapp'))
    .option('--requesttracingenabled <requesttracingenabled>', $('request tracing enabled option'))
    .option('--remotedebuggingenabled <remotedebuggingenabled>', $('remote debugging enabled option'))
    .option('--httploggingenabled <httploggingenabled>', $('http logging enabled option'))
    .option('--detailederrorloggingenabled <detailederrorloggingenabled>', $('detailed error logging enabled option'))
    .option('--websocketenabled <websocketenabled>', $('web socket enabled option'))
    .option('--use32bitworkerprocess <use32bitworkerprocess>', $('use 32 bit process option'))
    .option('--alwayson <alwayson>', $('always on option'))
    .option('--autohealenabled <autohealenabled>', $('auto heal enabled option'))
    .option('--javaversion <javaversion>', $('java version of webapp'))
    .option('--javacontainer <javacontainer>', $('java container of webapp'))
    .option('--javacontainerversion <javacontainerversion>', $('java container version of webapp'))
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
      if (options.numberofworkers   !== null && options.numberofworkers !== undefined) {
        jsonObj['numberOfWorkers'] = Number(options.numberofworkers);
      }
      if (options.netframeworkversion !== null && options.netframeworkversion !== undefined) {
        jsonObj['netFrameworkVersion'] = options.netframeworkversion;
      }
      if (options.requesttracingenabled  !== null && options.requesttracingenabled !== undefined) {
        jsonObj['requestTracingEnabled'] = toBool(options.requesttracingenabled);
      }
      if (options.remotedebuggingenabled !== null && options.remotedebuggingenabled !== undefined) {
        jsonObj['remoteDebuggingEnabled'] = toBool(options.remotedebuggingenabled);
      }
      if (options.httploggingenabled !== null && options.httploggingenabled !== undefined) {
        jsonObj['httpLoggingEnabled'] = toBool(options.httploggingenabled);
      }
      if (options.detailederrorloggingenabled !== null && options.detailederrorloggingenabled !== undefined) {
        jsonObj['detailedErrorLoggingEnabled'] = toBool(options.detailederrorloggingenabled);
      }
      if (options.publishingusername  !== null && options.publishingusername !== undefined) {
        jsonObj['publishingUsername'] = options.publishingusername;
      }
      if (options.publishingpassword  !== null && options.publishingpassword !== undefined) {
        jsonObj['publishingPassword'] = options.publishingpassword;
      }
      if (options.websocketenabled !== null && options.websocketenabled !== undefined) {
        jsonObj['webSocketEnabled'] = toBool(options.websocketenabled);
      }
      if (options.use32bitworkerprocess !== null && options.use32bitworkerprocess !== undefined) {
        jsonObj['use32BitWorkerProcess'] = toBool(options.use32bitworkerprocess);
      }
      if (options.alwayson !== null && options.alwayson !== undefined) {
        jsonObj['alwaysOn'] = toBool(options.alwayson);
      }
      if (options.autohealenabled !== null && options.autohealenabled !== undefined) {
        jsonObj['autoHealEnabled'] = toBool(options.autohealenabled);
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
      if(Object.keys(jsonObj).length !== 0 ) {
        var result;
        try {
          result = client.sites.getSite(resourceGroup, name, _);
          jsonObj['location'] = result.location;
          result = client.sites.createOrUpdateSiteConfig(resourceGroup, name, jsonObj, _);
        } finally {
          progress.end();
        }
        log.info('Webapp ' + webSiteSlotName + ' configuration has been updated ');
      }
      else
      {
        log.info('No options selected');
        progress.end();
      }
    });

  function toBool(stringToParse) {
    var str = stringToParse.toUpperCase();
    if(str == 'TRUE') return true;
    if(str == 'FALSE') return false;
    if(str == 'ON') return true;
    if(str == 'OFF') return false;
    return stringToParse;
  }

  appsetting.command('set [resource-group] [name] [appsettings]')
    .description($('Set webapp app settings (using comma seperated key value pairs)\nexample:  webapp config appsetting set RGName SiteName KEY1=val1,KEY2=val2,KEY3=val3'))
    .usage('[options] <resource-group> <name> <appsettings>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to show'))
    .option('-a --appsettings <appsettings>', $('the appsettings of the webapp to add'))
    .option('--slot <slot>', $('the name of the slot to show'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, appsettings, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!appsettings) {
        return cli.missingArgument('appsettings');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting webapp configuration'));
      var currentAppSettings;
      try {
        currentAppSettings = client.sites.listSiteAppSettings(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      var appSettingsPrevious = currentAppSettings.properties;
      var appSettingsToAdd = appsettings;
      var appSettingsToAddSplit;
      var settingSplit;
      var result;
      var appSettingsProperties = {};
      var actualAppSettings = {};
      for (var attrname in appSettingsPrevious) { appSettingsProperties[attrname] = appSettingsPrevious[attrname]; }
      appSettingsToAddSplit = appSettingsToAdd.toString().split(',');
      settingSplit = [];
      for(var i = 0; i < appSettingsToAddSplit.length; i++) {
        var firstEqual = appSettingsToAddSplit[i].indexOf('=');
        if(firstEqual !== -1) {
          settingSplit = [appSettingsToAddSplit[i].substr(0, firstEqual), appSettingsToAddSplit[i].substr(firstEqual + 1)];
          appSettingsProperties[settingSplit[0]] = settingSplit[1];
        }
        else {
          log.info($(appSettingsToAddSplit[i] + ' does not contain an \'=\''));
        }
      }
      actualAppSettings.properties = appSettingsProperties;
      try {
        result = client.sites.getSite(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      actualAppSettings.location = result.location;
      try {
        result = client.sites.updateSiteAppSettings(resourceGroup, name, actualAppSettings, _);
      } finally {
        progress.end();
      }
      log.data($('Final App Settings'));
      log.data($('--------------------------------'));
      log.data(result.properties);
      log.data($(''));
    });

  appsetting.command('delete [resource-group] [name] [appsettings]')
    .description($('Delete webapp app settings (using comma seperated keys)\nexample:  webapp config appsetting add RGName SiteName KEY1,KEY2,KEY3'))
    .usage('[options] <resource-group> <name> <appsettings>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to show'))
    .option('-a --appsettings <appsettings>', $('the appsettings of the webapp to add'))
    .option('--slot <slot>', $('the name of the slot to show'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, appsettings, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!appsettings) {
        return cli.missingArgument('appsettings');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting webapp configuration'));
      var currentAppSettings;
      try {
        currentAppSettings = client.sites.listSiteAppSettings(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      var appSettingsFinal = currentAppSettings.properties;
      var appSettingsToDelete = appsettings;
      var appSettingsToDeleteSplit;
      var result;
      var appSettingsToDeleteProperties = {};
      var actualAppSettings = {};
      var settingExists;
      appSettingsToDeleteSplit = appSettingsToDelete.toString().split(',');
      for(var i = 0; i < appSettingsToDeleteSplit.length; i++) {
        appSettingsToDeleteProperties[appSettingsToDeleteSplit[i]] = '';
      }
      for (var attrname in appSettingsToDeleteProperties) { 
        settingExists = false;
        if(appSettingsFinal.hasOwnProperty(attrname)) {
          delete appSettingsFinal[attrname];
        }
        else {
          log.data(attrname + ' does not exist in current appsettings!');
        }
      }
      actualAppSettings.properties = appSettingsFinal;
      try {
        result = client.sites.getSite(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      actualAppSettings.location = result.location;
      try {
        result = client.sites.updateSiteAppSettings(resourceGroup, name, actualAppSettings, _);
      } finally {
        progress.end();
      }
      log.data($('Final App Settings'));
      log.data($('--------------------------------'));
      log.data(result.properties);
      log.data($(''));
    });

  appsetting.command('list [resource-group] [name]')
    .description($('Get webapp app settings'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the webapp to list'))
    .option('--slot <slot>', $('the name of the slot to list'))
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
        result = client.sites.listSiteAppSettings(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.properties, function (data) {
        if (result.properties !== null && result.properties !== undefined) {
          log.data($('App Settings'));
          log.data($('--------------------------------'));
          log.data(data);
          log.data($(''));
        }
        else {
          log.data($('No app setting set'));
        }
      });
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
        if (!data) {
          log.info($('No webapp publishing profile information available'));
        } else {
          log.data('');
          log.data('Publish Profile Username: ' + data.publishingUserName);
          log.data('Publish Profile Password: ' + data.publishingPassword);
          log.data('');
        }
      });
    });

   hostnames.command('add [resource-group] [name] [hostname]')
    .description($('Add a hostname bindings for a webapp (using comma seperated names)\nexample:  webapp config hostname add RGName SiteName www.site1.com,www.site2.co.uk'))
    .usage('[options] <resource-group> <name> <hostname>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the web app'))
    .option('-o --hostname <hostname>', $('the list of hostnames to bind'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, hostname, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!hostname) {
        return cli.missingArgument('hostname');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting webapp information'));
      var result;
      try {
        result = client.sites.getSite(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      var hostnamesToAddSplit = hostname.toString().split(',');
      for(var i = 0; i < hostnamesToAddSplit.length; i++) {
        var bindingOptions = {};
        bindingOptions.location = result.location;
        bindingOptions.siteName = name;
        bindingOptions.hostNameBindingName = hostnamesToAddSplit[i];
        try {
          result = client.sites.createOrUpdateSiteHostNameBinding(resourceGroup, name, hostnamesToAddSplit[i], bindingOptions, _);
        } finally {
          progress.end();
        }
      }
    });

  hostnames.command('delete [resource-group] [name] [hostname]')
    .description($('Delete a hostname binding for a webapp'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the web app'))
    .option('-o --hostname <hostname>', $('the list of hostnames to unbind'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, hostname, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!hostname) {
        return cli.missingArgument('hostname');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = webappUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting webapp information'));   
      var result;
      try {
        result = client.sites.deleteSiteHostNameBinding(resourceGroup, name, hostname, _);
      } finally {
        progress.end();
      }
    });

 hostnames.command('list [resource-group] [name]')
    .description($('List hostname bindings under a webapp'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the web app'))
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
        result = client.sites.getSiteHostNameBindings(resourceGroup, name, _);
      } finally {
        progress.end();
      }
       cli.interaction.formatOutput(result, function (data) {
       data = data.value;
       if (data.length > 0) {
          log.table(data, function (row, item) {
		        var hostnameIdArr = (item.name).split('/');
            row.cell($('HostName '), hostnameIdArr[1]);
            row.cell($('Type '), item.hostNameType);
          });
        } else {
          log.info($('No web app hostnames found.'));
        }
      });
    });
};