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
  
  var node = serviceFabric.category('node')
    .description($('Commands to manage your node'));
  
  node.command('show [nodeName]')
    .description($('Show node'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .execute(function (nodeName, options, _) {
      var progress = cli.interaction.progress($('ShowNode'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = null;
      if (!nodeName) {
        res = client.getNodeList(options, _);
      }
      else {
        res = [client.getNode(nodeName, options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No node'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('IpAddressOrFQDN'), item.ipAddressOrFQDN);
            row.cell($('Type'), item.type);
            row.cell($('CodeVersion'), item.codeVersion);
            row.cell($('NodeStatus'), item.nodeStatus);
            row.cell($('NodeUpTimeInSeconds'), item.nodeUpTimeInSeconds);
            row.cell($('HealthState'), item.healthState);
            row.cell($('IsSeedNode'), item.isSeedNode);
            row.cell($('UpgradeDomain'), item.upgradeDomain);
            row.cell($('FaultDomain'), item.faultDomain);
            row.cell($('Id'), item.id);
            row.cell($('InstanceId'), item.instanceId);
            row.cell($('NodeDeactivationInfo'), item.nodeDeactivationInfo);
          });
        }
      });
    });
  
  var nodeLoad = node.category('load')
    .description($('Commands to manage your node load information'));
  
  nodeLoad.command('show [nodeName]')
    .description($('Show node load information'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .execute(function (nodeName, options, _) {
      var progress = cli.interaction.progress($('ShowNodeLoadInformation'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getNodeLoadInformation(nodeName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var nodeHealth = node.category('health')
    .description($('Commands to manage your node load information'));
  
  nodeHealth.command('show [nodeName] [eventsHealthStateFilter]')
    .description($('Show node health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the event health state'))
    .execute(function (nodeName, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('ShowNodeHealth'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      if (eventsHealthStateFilter) options.eventsHealthStateFilter;
      var res = client.getNodeHealth(nodeName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  nodeHealth.command('send [nodeName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send cluster health report'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequenceNumber <sequenceNumber>', $('the number of the sequence'))
    .option('--removeWhenExpired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (nodeName, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send cluster health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var nodeHealthReport = {};
      if (sourceId) nodeHealthReport.sourceId = sourceId;
      if (property) nodeHealthReport.property = property;
      if (healthState) nodeHealthReport.healthState = Number(healthState);
      if (description) nodeHealthReport.description = description;
      if (timeToLiveInMilliseconds) nodeHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) nodeHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) nodeHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendNodeHealthReport(nodeName, nodeHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};
