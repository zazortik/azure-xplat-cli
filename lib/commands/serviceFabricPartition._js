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
var serviceFabricClient = require('azure-servicefabric');
var $ = utils.getLocaleString;


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var partition = serviceFabric.category('partition')
    .description($('Commands to manage your partition'));
  
  partition.command('show [serviceName] [partitionId]')
    .description($('Show partition'))
    .option('-n --service-name <serviceName>', $('the name of the service'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .option('--select <fields>', $('select fields to show, call without this parameter to see all fields'))
    .execute(function (serviceName, partitionId, options, _) {
      var progress = cli.interaction.progress($('Show partition'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        serviceName = serviceFabricUtils.parseUrl(serviceName, _);
        var res = null;
        if (!partitionId) {
          res = client.partitions.list(serviceName, options, _);
        }
        else {
          res = client.partitions.get(serviceName, partitionId, options, _);
        }
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPartitionEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  partition.command('repair [serviceName] [partitionId]')
    .description($('Repair partition'))
    .option('-n --service-name <serviceName>', $('the name of the service'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .execute(function (serviceName, partitionId, options, _) {
      if (!serviceName && !partitionId) {
        log.info($('The serviceName or partitionId is required'));
        return;
      }
      
      var progress = cli.interaction.progress($('Repair partition'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        
        var res = null;
        if (!partitionId) {
          serviceName = serviceFabricUtils.parseUrl(serviceName, _);
          res = client.partitionLists.repair(serviceName, options, _);
        }
        else if (!serviceName) {
          res = client.partitions.repair(partitionId, options, _);
        }
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var partitionHealth = partition.category('health')
    .description($('Commands to manage your partition health'));
  
  partitionHealth.command('show [partitionId] [eventsHealthStateFilter] [replicasHealthStateFilter]')
    .description($('Show partition health'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .option('-f --events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .option('-r --replicas-health-state-filter <replicasHealthStateFilter>', $('the filter of the replicas health state'))
    .option('--select <fields>', $('select fields to show, call without this parameter to see all fields'))
    .execute(function (partitionId, eventsHealthStateFilter, replicasHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show partition health'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
        if (replicasHealthStateFilter) options.replicasHealthStateFilter = replicasHealthStateFilter;
        var res = client.partitionHealths.get(partitionId, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPartitionEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  partitionHealth.command('send [partitionId] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send partition health, Example: azure servicefabric partition health send --partition-id 1234 fabric:app --source-id monitor --property pc --health-state Ok --description healthy'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .option('-o --source-id <sourceId>', $('the id of the source'))
    .option('-p --property <property>', $('the property'))
    .option('-e --health-state <healthState>', $('the state of the health, values are [Ok|Warning|Error|Unknown]'))
    .option('-d --description <description>', $('the description'))
    .option('-m --time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('-n --sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('-w --remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (partitionId, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send partition health'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var partitionHealthReport = {};
        if (sourceId) partitionHealthReport.sourceId = sourceId;
        if (property) partitionHealthReport.property = property;
        if (healthState) partitionHealthReport.healthState = serviceFabricUtils.getEnumVal('healthState', healthState);
        if (description) partitionHealthReport.description = description;
        if (timeToLiveInMilliseconds) partitionHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
        if (sequenceNumber) partitionHealthReport.sequenceNumber = sequenceNumber;
        if (removeWhenExpired) {
          if (removeWhenExpired === 'true') {
            partitionHealthReport.removeWhenExpired = true;
          }
          else if (removeWhenExpired === 'false') {
            partitionHealthReport.removeWhenExpired = false;
          }
        }
        var res = client.partitionHealthReports.send(partitionId, partitionHealthReport, options, _);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var partitionLoad = partition.category('load')
  .description($('Commands to manage your partition load information'));
  
  partitionLoad.command('show [partitionId]')
    .description($('Show partition load information'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .option('--select <fields>', $('select fields to show, call without this parameter to see all fields'))
    .execute(function (partitionId, options, _) {
      var progress = cli.interaction.progress($('Show partition load information'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var res = client.partitionLoadInformations.get(partitionId, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setPartitionEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  partitionLoad.command('reset [partitionId]')
    .description($('Reset partition'))
    .option('-i --partition-id <partitionId>', $('the id of the partition'))
    .execute(function (partitionId, options, _) {
      partitionId = cli.interaction.promptIfNotGiven($('partitionId:'), partitionId, _);
      
      var progress = cli.interaction.progress($('Reset partition'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var res = client.partitionLoads.reset(partitionId, options, _);
        
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
