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
var url = require('url');


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var cluster = serviceFabric.category('cluster')
    .description($('Commands to manage your cluster'));
  
  cluster.command('connect [connectionEndpoint]')
    .description($('Connect cluster'))
    .option('--connection-endpoint <connectionEndpoint>', $('the url of the connection endpoint'))
    .execute(function (connectionEndpoint, options, _) {
      var progress = cli.interaction.progress($('Connect cluster'));
      
      var data = {};
      var urlObj = null;
      if (!connectionEndpoint) {
        urlObj = url.parse('localhost:19007');
      }
      else {
        urlObj = url.parse(connectionEndpoint);
      }
      data.connectionEndpoint = url.format(urlObj);
      
      serviceFabricUtils.writeConfigFile(data, _);
      
      progress.end();
    });
  
  cluster.command('show')
    .description($('Show cluster'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show cluster'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      progress.end();
      
      cli.interaction.formatOutput(config, function (data) {
        log.json(data);
      });
    });
  
  var clusterManifest = cluster.category('manifest')
    .description($('Commands to manage your cluster manifest'));
  
  clusterManifest.command('show')
    .description($('Show cluster manifest'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show cluster manifest'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _));
      var res = client.getClusterManifest(options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterHealth = cluster.category('health')
    .description($('Commands to manage your cluster health'));
  
  clusterHealth.command('show [eventsHealthStateFilter] [nodesHealthStateFilter] [applicationsHealthStateFilter]')
    .description($('Show cluster health'))
    .execute(function (eventsHealthStateFilter, nodesHealthStateFilter, applicationsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show cluster health'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _));
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      if (nodesHealthStateFilter) options.nodesHealthStateFilter = nodesHealthStateFilter;
      if (applicationsHealthStateFilter) options.applicationsHealthStateFilter = applicationsHealthStateFilter;
      var res = client.getClusterHealth(options, _);
      
      progress.end();
      
      res.aggregatedHealthState = serviceFabricUtils.getEnumValue('health', res.aggregatedHealthState);
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  clusterHealth.command('send [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send cluster health report'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send cluster health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _));
      var clusterHealthReport = {};
      if (sourceId) clusterHealthReport.sourceId = sourceId;
      if (property) clusterHealthReport.property = property;
      if (healthState) clusterHealthReport.healthState = serviceFabricUtils.getEnumValue('health', healthState);
      if (description) clusterHealthReport.description = description;
      if (timeToLiveInMilliseconds) clusterHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) clusterHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) clusterHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendClusterHealthReport(clusterHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterLoad = cluster.category('load')
    .description($('Commands to manage your cluster load information'));
  
  clusterLoad.command('show')
    .description($('Show load information'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show load information'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _));
      var res = client.getClusterLoadInformation(options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterUpgrade = cluster.category('upgrade')
    .description($('Commands to manage your cluster upgrade'));
  
  clusterUpgrade.command('show')
    .description($('Show cluster upgrade'))
    .execute(function (applicationName, options, _) {
      var progress = cli.interaction.progress($('Show cluster upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _));
      var res = client.getUpgradeProgress(options, _);
      
      progress.end();
      
      res.upgradeState = serviceFabricUtils.getEnumValue('upgradeState', res.upgradeState);
      res.rollingUpgradeMode = serviceFabricUtils.getEnumValue('rollingUpgradeMode', res.rollingUpgradeMode);
      res.failureReason = serviceFabricUtils.getEnumValue('failureReason', res.failureReason);
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};