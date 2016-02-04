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
  
  var replica = serviceFabric.category('replica')
    .description($('Commands to manage your replica'));
  
  replica.command('show [partitionId] [replicaId]')
    .description($('Show replica'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .execute(function (partitionId, replicaId, options, _) {
      var progress = cli.interaction.progress($('Show replica'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = null;
      if (!replicaId) {
        res = client.getReplicaList(partitionId, options, _);
      }
      else {
        res = [client.getReplica(partitionId, replicaId, options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No replica'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('ServiceKind'), item.serviceKind);
            row.cell($('ReplicaId'), item.replicaId);
            row.cell($('ReplicaRole'), item.replicaRole);
            row.cell($('ReplicaStatus'), item.replicaStatus);
            row.cell($('HealthState'), item.healthState);
            row.cell($('Address'), item.address);
            row.cell($('NodeName'), item.nodeName);
            row.cell($('LastInBuildDurationInSeconds'), item.lastInBuildDurationInSeconds);
          });
        }
      });
    });
  
  var replicaDeployed = replica.category('deployed')
    .description($('Commands to manage your deployed replica'));
  
  replicaDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed replica'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedReplica'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.getDeployedReplica(nodeName, applicationName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed replica'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('ServiceKind'), item.serviceKind);
            row.cell($('ServiceName'), item.serviceName);
            row.cell($('ServiceTypeName'), item.serviceTypeName);
            row.cell($('ServiceManifestVersion'), item.serviceManifestVersion);
            row.cell($('ServiceManifestName'), item.serviceManifestName);
            row.cell($('CodePackageName'), item.codePackageName);
            row.cell($('PartitionId'), item.partitionId);
            row.cell($('ReplicaId'), item.replicaId);
            row.cell($('ReplicaRole'), item.replicaRole);
            row.cell($('ReplicaStatus'), item.replicaStatus);
            row.cell($('Address'), item.address);
          });
        }
      });
    });
  
  replicaDeployed.command('detail [nodeName] [partitionName] [replicaId]')
    .description($('Show deployed replica detail'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--partition-name <partitionName>', $('the name of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .execute(function (nodeName, partitionName, replicaId, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedReplicaDetail'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getDeployedReplicaDetail(nodeName, partitionName, replicaId, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var replicaHealth = replica.category('health')
    .description($('Commands to manage your replica health'));
  
  replicaHealth.command('show [partitionId] [replicaId] [eventsHealthStateFilter]')
    .description($('Show replica health'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replicas'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .execute(function (partitionId, replicaId, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show partition health'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      var res = client.getReplicaHealth(partitionId, replicaId, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  replicaHealth.command('send [partitionId] [replicaId] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send replica health report'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (partitionId, replicaId, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send replica health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var replicaHealthReport = {};
      if (sourceId) replicaHealthReport.sourceId = sourceId;
      if (property) replicaHealthReport.property = property;
      if (healthState) replicaHealthReport.healthState = Number(healthState);
      if (description) replicaHealthReport.description = description;
      if (timeToLiveInMilliseconds) replicaHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) replicaHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) replicaHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendReplicaHealth(partitionId, replicaId, replicaHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var replicaLoad = replica.category('load')
    .description($('Commands to manage your replica load information'));
  
  replicaLoad.command('show [partitionId] [replicaId]')
    .description($('Show replica load information'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .execute(function (partitionId, replicaId, options, _) {
      var progress = cli.interaction.progress($('Show replica load information'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getReplicaLoadInformation(partitionId, replicaId, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};