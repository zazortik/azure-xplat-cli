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
  
  var replica = serviceFabric.category('replica')
    .description($('Commands to manage your replica'));
  
  replica.command('show [partitionId] [replicaId]')
    .description($('Show replica'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (partitionId, replicaId, options, _) {
      var progress = cli.interaction.progress($('Show replica'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var res = null;
        if (!replicaId) {
          res = client.getReplicaList(partitionId, options, _);
        }
        else {
          res = client.getReplica(partitionId, replicaId, options, _);
        }
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setReplicaEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var replicaDeployed = replica.category('deployed')
    .description($('Commands to manage your deployed replica'));
  
  replicaDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed replica'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedReplica'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        var res = client.getDeployedReplica(nodeName, applicationName, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setReplicaEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  replicaDeployed.command('detail [nodeName] [partitionName] [replicaId]')
    .description($('Show deployed replica detail'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--partition-name <partitionName>', $('the name of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (nodeName, partitionName, replicaId, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedReplicaDetail'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var res = client.getDeployedReplicaDetail(nodeName, partitionName, replicaId, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setReplicaEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var replicaHealth = replica.category('health')
    .description($('Commands to manage your replica health'));
  
  replicaHealth.command('show [partitionId] [replicaId] [eventsHealthStateFilter]')
    .description($('Show replica health'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replicas'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the events health state'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (partitionId, replicaId, eventsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show partition health'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
        var res = client.getReplicaHealth(partitionId, replicaId, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setReplicaEnumVal(res);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  replicaHealth.command('send [partitionId] [replicaId] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send replica health'))
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
      var progress = cli.interaction.progress($('Send replica health'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var replicaHealthReport = {};
        if (sourceId) replicaHealthReport.sourceId = sourceId;
        if (property) replicaHealthReport.property = property;
        if (healthState) replicaHealthReport.healthState = serviceFabricUtils.getEnumVal('healthState', healthState);
        if (description) replicaHealthReport.description = description;
        if (timeToLiveInMilliseconds) replicaHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
        if (sequenceNumber) replicaHealthReport.sequenceNumber = sequenceNumber;
        if (removeWhenExpired) {
          if (removeWhenExpired === 'true') {
            replicaHealthReport.removeWhenExpired = true;
          }
          else if (removeWhenExpired === 'false') {
            replicaHealthReport.removeWhenExpired = false;
          }
        }
        var res = client.sendReplicaHealth(partitionId, replicaId, replicaHealthReport, options, _);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  var replicaLoad = replica.category('load')
    .description($('Commands to manage your replica load information'));
  
  replicaLoad.command('show [partitionId] [replicaId]')
    .description($('Show replica load information'))
    .option('--partition-id <partitionId>', $('the id of the partition'))
    .option('--replica-id <replicaId>', $('the id of the replica'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (partitionId, replicaId, options, _) {
      var progress = cli.interaction.progress($('Show replica load information'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var client = new serviceFabricClient('3.0-preview', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getClientOptions(config, _));
        var res = client.getReplicaLoadInformation(partitionId, replicaId, options, _);
        if (options.select) {
          res = serviceFabricUtils.pick(res, options.select, _);
        }
        serviceFabricUtils.setReplicaEnumVal(res);
        
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
