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
  
  var partition = serviceFabric.category('partition')
    .description($('Commands to manage your partition'));
  
  partition.command('show [serviceName] [partitionId]')
    .description($('Show partition'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .execute(function (serviceName, partitionId, options, _) {
      var progress = cli.interaction.progress($('Show partition'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = null;
      if (!partitionId) {
        res = client.getPartitionList(serviceName, options, _);
      }
      else {
        res = [client.getPartition(serviceName, partitionId, options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (!(data instanceof Array)) {
          log.json(data);
        } else if (data.length === 0) {
          log.info($('No partition'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('ServiceKind'), item.serviceKind);
            row.cell($('PartitionInformation'), item.partitionInformation);
            row.cell($('TargetReplicaSetSize'), item.targetReplicaSetSize);
            row.cell($('MinReplicaSetSize'), item.minReplicaSetSize);
            row.cell($('HealthState'), item.healthState);
            row.cell($('PartitionStatus'), item.partitionStatus);
            row.cell($('CurrentConfigurationEpoch'), item.currentConfigurationEpoch);
          });
        }
      });
    });
  
  var partitionHealth = partition.category('health')
  .description($('Commands to manage your partition health'));
  
  partitionHealth.command('show [partitionId] [eventsHealthStateFilter] [replicasHealthStateFilter]')
    .description($('Show partition health'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .option('--replicas-health-state-filter <replicasHealthStateFilter>', $('the filter of the replicas health state'))
    .execute(function (partitionId, eventsHealthStateFilter, replicasHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show partition health'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      if (replicasHealthStateFilter) options.replicasHealthStateFilter = replicasHealthStateFilter;
      var res = client.getPartitionHealth(partitionId, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  partitionHealth.command('send [partitionId] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send partition health report'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (partitionId, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send partition health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var partitionHealthReport = {};
      if (sourceId) partitionHealthReport.sourceId = sourceId;
      if (property) partitionHealthReport.property = property;
      if (healthState) partitionHealthReport.healthState = Number(healthState);
      if (description) partitionHealthReport.description = description;
      if (timeToLiveInMilliseconds) partitionHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) partitionHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) partitionHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendPartitionHealthReport(partitionId, partitionHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var partitionLoad = partition.category('load')
  .description($('Commands to manage your partition load information'));
  
  partitionLoad.command('show [partitionId]')
    .description($('Show partition load information'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .execute(function (partitionId, options, _) {
      var progress = cli.interaction.progress($('Show partition load information'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getPartitionLoadInformation(partitionId, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};

