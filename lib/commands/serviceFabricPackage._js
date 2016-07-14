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

var utils = require('../util/utils');
var serviceFabricUtils = require('./serviceFabricUtils');
var serviceFabricClient = require('./serviceFabricClient');
var util = require('util');
var $ = utils.getLocaleString;


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var application = serviceFabric.category('application')
    .description($('Commands to manage your application'));
  
  var applicationPackage = application.category('package')
    .description($('Commands to manage your application package'));
  
  applicationPackage.command('copy [applicationPackagePath] [imageStoreConnectionString] [applicationPackagePathInImageStore]')
    .description($('Copy application package, Example: azure servicefabric application package copy --application-package-path /tmp/Package1 --image-store-connection-string fabric:ImageStore'))
    .option('--application-package-path <applicationPackagePath>', $('the path of the application package'))
    .option('--image-store-connection-string <imageStoreConnectionString>', $('the string of the image store connection'))
    .option('--application-package-path-in-image-store <applicationPackagePathInImageStore>', $('the path of the application package in image store'))
    .execute(function (applicationPackagePath, imageStoreConnectionString, applicationPackagePathInImageStore, options, _) {
      applicationPackagePath = cli.interaction.promptIfNotGiven($('applicationPackagePath:'), applicationPackagePath, _);
      imageStoreConnectionString = cli.interaction.promptIfNotGiven($('imageStoreConnectionString:'), imageStoreConnectionString, _);
      
      var progress = cli.interaction.progress($('Copy application package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var command = util.format('copyapplicationpackage "%s" "%s" "%s" "%s"', config.tcpConnectionEndpoint, applicationPackagePath, imageStoreConnectionString, applicationPackagePathInImageStore ? applicationPackagePathInImageStore : '');
        var res = serviceFabricUtils.runChildProcess(command, _);
        // Check for error
        if (res[0]) {
          throw res;
        }
        
        progress.end();
        
        cli.interaction.formatOutput(res[1], function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  applicationPackage.command('test [applicationPackagePath] [imageStoreConnectionString] [applicationPackagePathInImageStore]')
    .description($('Test application package'))
    .option('--application-package-path <applicationPackagePath>', $('the path of the application package'))
    .option('--image-store-connection-string <imageStoreConnectionString>', $('the string of the image store connection'))
    .option('--application-package-path-in-image-store <applicationPackagePathInImageStore>', $('the path of the application package in image store'))
    .execute(function (applicationPackagePath, applicationParameter, imageStoreConnectionString, options, _) {
      applicationPackagePath = cli.interaction.promptIfNotGiven($('applicationPackagePath:'), applicationPackagePath, _);
      
      var progress = cli.interaction.progress($('Test application package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var command = util.format('testapplicationpackage "%s" "%s" "%s" "%s"', config.tcpConnectionEndpoint, applicationPackagePath, applicationParameter ? applicationParameter : '', imageStoreConnectionString ? imageStoreConnectionString : '');
        var res = serviceFabricUtils.runChildProcess(command, _);
        // Check for error
        if (res[0]) {
          throw res;
        }
        
        progress.end();
        
        cli.interaction.formatOutput(res[1], function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  applicationPackage.command('remove [imageStoreConnectionString] [applicationPackagePathInImageStore]')
    .description($('Remove application package'))
    .option('--image-store-connection-string <imageStoreConnectionString>', $('the string of the image store connection'))
    .option('--application-package-path-in-image-store <applicationPackagePathInImageStore>', $('the path of the application package in image store'))
    .execute(function (imageStoreConnectionString, applicationPackagePathInImageStore, options, _) {
      imageStoreConnectionString = cli.interaction.promptIfNotGiven($('imageStoreConnectionString:'), imageStoreConnectionString, _);
      applicationPackagePathInImageStore = cli.interaction.promptIfNotGiven($('applicationPackagePathInImageStore:'), applicationPackagePathInImageStore, _);
      
      var progress = cli.interaction.progress($('Remove application package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var command = util.format('removeapplicationpackage "%s" "%s" "%s"', config.tcpConnectionEndpoint, imageStoreConnectionString, applicationPackagePathInImageStore);
        var res = serviceFabricUtils.runChildProcess(command, _);
        // Check for error
        if (res[0]) {
          throw res;
        }
        
        progress.end();
        
        cli.interaction.formatOutput(res[1], function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var code = serviceFabric.category('code')
    .description($('Commands to manage your code'));
  
  var codePackage = code.category('package')
    .description($('Commands to manage your code package'));
  
  var codePackageDeployed = codePackage.category('deployed')
    .description($('Commands to manage your deployed code package'));
  
  codePackageDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed application health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('Show deployed code package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        var res = client.getDeployedCodePackage(nodeName, applicationName, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPackageEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var service = serviceFabric.category('service')
    .description($('Commands to manage your service'));
  
  var servicePackage = service.category('package')
    .description($('Commands to send your service package'));
  
  var servicePackageDeployed = servicePackage.category('deployed')
    .description($('Commands to send your service package health report'));
  
  servicePackageDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed service package'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('Show deployed service package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        var res = client.getDeployedServicePackage(nodeName, applicationName, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPackageEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var servicePackageDeployedHealth  = servicePackageDeployed.category('health')
    .description($('Commands to manage your deployed service package health'));
  
  servicePackageDeployedHealth.command('show [nodeName] [applicationName] [servicePackageName] [eventsHealthStateFilter]')
    .description($('Show deployed service package health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-package-name <servicePackageName>', $('the name of the service package'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, applicationName, servicePackageName, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show deployed service package'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        if (servicePackageName) options.servicePackageName = servicePackageName;
        if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
        var res = client.getDeployedServicePackage(nodeName, applicationName, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPackageEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  servicePackageDeployedHealth.command('send [nodeName] [applicationName] [serviceManifestName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send deployed service package health report'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-manifest-name <serviceManifestName>', $('the name of the service manifest'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (nodeName, applicationName, serviceManifestName, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send deployed service package health report'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        var applicationHealthReport = {};
        if (sourceId) applicationHealthReport.sourceId = sourceId;
        if (property) applicationHealthReport.property = property;
        if (healthState) applicationHealthReport.healthState = Number(serviceFabricUtils.getEnumVal('healthState', healthState));
        if (description) applicationHealthReport.description = description;
        if (timeToLiveInMilliseconds) applicationHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
        if (sequenceNumber) applicationHealthReport.sequenceNumber = sequenceNumber;
        if (removeWhenExpired) {
          if (removeWhenExpired === 'true') {
            applicationHealthReport.removeWhenExpired = true;
          }
          else if (removeWhenExpired === 'false') {
            applicationHealthReport.removeWhenExpired = false;
          }
        }
        var res = client.sendDeployedServicePackageHealthReport(nodeName, applicationName, serviceManifestName, applicationHealthReport, options, _);
        serviceFabricUtils.setPackageEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
};