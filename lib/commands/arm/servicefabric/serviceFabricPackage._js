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

var utils = require('../../../util/utils');
var serviceFabricUtils = require('./serviceFabricUtils');
var serviceFabricClient = require('./serviceFabricClient');
var $ = utils.getLocaleString;


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var codePackage = serviceFabric.category('code-package')
    .description($('Commands to manage your deployed code package'));
  
  var codePackageDeployed = codePackage.category('deployed')
    .description($('Commands to manage your deployed code package'));
  
  codePackageDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed application health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedCodePackage'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.getDeployedCodePackage(nodeName, applicationName, '1.0', options, _);
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed code package'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Version'), item.version);
            row.cell($('ServiceManifestName'), item.serviceManifestName);
            row.cell($('Status'), item.status);
            row.cell($('RunFrequencyInterval'), item.runFrequencyInterval);
            //row.cell($('SetupEntryPoint'), item.SetupEntryPoint);
            //row.cell($('MainEntryPoint'), item.MainEntryPoint);
            row.cell($('HasSetupEntryPoint'), item.hasSetupEntryPoint);
          });
        }
      });
      
      progress.end();
    });
  
  var servicePackage = serviceFabric.category('service-package')
    .description($('Commands to send your service package health report'));
  
  var servicePackageDeployed = servicePackage.category('deployed')
    .description($('Commands to send your service package health report'));
  
  servicePackageDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed service package'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedServicePackage'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.getDeployedServicePackage(nodeName, applicationName, '1.0', options, _);
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed service package'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Version'), item.version);
            row.cell($('Status'), item.status);
          });
        }
      });
      
      progress.end();
    });
  
  var servicePackageDeployedHealth  = servicePackageDeployed.category('health')
    .description($('Commands to manage your deployed service package health'));
  
  servicePackageDeployedHealth.command('show [nodeName] [applicationName] [servicePackageName] [eventsHealthStateFilter]')
    .description($('Show deployed service package health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-package-name <servicePackageName>', $('the name of the service package'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .execute(function (nodeName, applicationName, servicePackageName, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedServicePackage'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      if (servicePackageName) options.servicePackageName = servicePackageName;
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      var res = client.getDeployedServicePackage(nodeName, applicationName, '1.0', options, _);
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed service package'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Version'), item.version);
            row.cell($('Status'), item.status);
          });
        }
      });
      
      progress.end();
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
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var applicationHealthReport = {};
      if (sourceId) applicationHealthReport.sourceId = sourceId;
      if (property) applicationHealthReport.property = property;
      if (healthState) applicationHealthReport.healthState = Number(healthState);
      if (description) applicationHealthReport.description = description;
      if (timeToLiveInMilliseconds) applicationHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) applicationHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) applicationHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendDeployedServicePackageHealthReport(nodeName, applicationName, serviceManifestName, applicationHealthReport, '1.0', options, _);
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
      
      progress.end();
    });
};