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
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, options, _) {
      var progress = cli.interaction.progress($('Show node'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = null;
      if (!nodeName) {
        res = client.getNodeList(options, _);
      }
      else {
        res = client.getNode(nodeName, options, _);
      }
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      serviceFabricUtils.setNodeEnumVal(res);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  node.command('enable [nodeName]')
    .description($('Enable node'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .execute(function (nodeName, options, _) {
      nodeName = cli.interaction.promptIfNotGiven($('nodeName: '), nodeName, _);
      
      var progress = cli.interaction.progress($('Enable node'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = client.enableNode(nodeName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  node.command('disable [nodeName] [deactivationIntent]')
    .description($('Disable node'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--deactivation-intent <deactivationIntent>', $('the intent of the deactivation'))
    .execute(function (nodeName, deactivationIntent, options, _) {
      nodeName = cli.interaction.promptIfNotGiven($('nodeName: '), nodeName, _);
      deactivationIntent = cli.interaction.promptIfNotGiven($('deactivationIntent: '), deactivationIntent, _);
      
      var progress = cli.interaction.progress($('Disable node'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var disableNode = {};
      if (deactivationIntent) disableNode.deactivationIntent = Number(deactivationIntent);
      var res = client.disableNode(nodeName, disableNode, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var nodeState = node.category('state')
    .description($('Commands to manage your node load state'));
  
  nodeState.command('remove [nodeName]')
    .description($('Remove node state'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .execute(function (nodeName, options, _) {
      nodeName = cli.interaction.promptIfNotGiven($('nodeName: '), nodeName, _);
      
      var progress = cli.interaction.progress($('Remove node state'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null, config);
      var res = client.removeNodeState(nodeName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var nodeLoad = node.category('load')
    .description($('Commands to manage your node load information'));
  
  nodeLoad.command('show [nodeName]')
    .description($('Show node load information'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, options, _) {
      var progress = cli.interaction.progress($('ShowNodeLoadInformation'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = client.getNodeLoadInformation(nodeName, options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      serviceFabricUtils.setNodeEnumVal(res);
      
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
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('ShowNodeHealth'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      var res = client.getNodeHealth(nodeName, options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      serviceFabricUtils.setNodeEnumVal(res);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  nodeHealth.command('send [nodeName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send node health report'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequenceNumber <sequenceNumber>', $('the number of the sequence'))
    .option('--removeWhenExpired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (nodeName, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send node health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var nodeHealthReport = {};
      if (sourceId) nodeHealthReport.sourceId = sourceId;
      if (property) nodeHealthReport.property = property;
      if (healthState) nodeHealthReport.healthState = Number(serviceFabricUtils.getEnumVal('healthState', healthState));
      if (description) nodeHealthReport.description = description;
      if (timeToLiveInMilliseconds) nodeHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) nodeHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) {
        if (removeWhenExpired === 'true') {
          nodeHealthReport.removeWhenExpired = true;
        }
        else if (removeWhenExpired === 'false') {
          nodeHealthReport.removeWhenExpired = false;
        }
      }
      var res = client.sendNodeHealthReport(nodeName, nodeHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};
