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
var serviceFabricClient = require('azure-arm-servicefabric');
var $ = utils.getLocaleString;


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var service = serviceFabric.category('service')
    .description($('Commands to manage your service'));
  
  var serviceGroup = service.category('group')
    .description($('Commands to manage your service group'));
  
  serviceGroup.command('create [applicationName] [serviceName] [serviceTypeName] [serviceKind] [instanceCount] [targetReplicaSetSize] [minReplicaSetSize] [hasPersistedState] [partitionScheme] [partitionCount] [partitionNames] [partitionLowKey] [partitionHighKey] [serviceGroupMemberDescription] [placementConstraints] [correlationSchema] [serviceLoadMetrics]')
    .description($('Create service group'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('--service-type-name <serviceTypeName>', $('the name of the service type'))
    .option('--service-kind <serviceKind>', $('the kind of the service'))
    .option('--instance-count <instanceCount>', $('the count of the instance'))
    .option('--target-replica-set-size <targetReplicaSetSize>', $('the size of the target replica set'))
    .option('--min-replica-set-size <minReplicaSetSize>', $('the size of the min replica set'))
    .option('--has-persisted-state <hasPersistedState>', $('the state of the persisted'))
    .option('--partition-scheme <partitionScheme>', $('the scheme of the partition'))
    .option('--partition-count <partitionCount>', $('the count of the partition'))
    .option('--partition-names <partitionNames>', $('the names of the partition'))
    .option('--partition-low-key <partitionLowKey>', $('the key of the partition low'))
    .option('--partition-high-key <partitionHighKey>', $('the key of the partition high'))
    .option('--service-group-member-description <serviceGroupMemberDescription>', $('the description of the service group member'))
    .option('--placement-constraints <placementConstraints>', $('the constraints of the placement'))
    .option('--correlation-schema <correlationSchema>', $('the schema of the correlation'))
    .option('--service-load-metrics <serviceLoadMetrics>', $('the metrics of the service load'))
    .execute(function (applicationName, serviceName, serviceTypeName, serviceKind, instanceCount, targetReplicaSetSize, minReplicaSetSize, hasPersistedState, partitionScheme, partitionCount, partitionNames, partitionLowKey, partitionHighKey, serviceGroupMemberDescription, placementConstraints, correlationSchema, serviceLoadMetrics, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName', applicationName, _);
      serviceName = cli.interaction.promptIfNotGiven('serviceName', serviceName, _);
      serviceTypeName = cli.interaction.promptIfNotGiven('serviceTypeName', serviceTypeName, _);
      serviceKind = cli.interaction.promptIfNotGiven('serviceKind', serviceKind, _);
      if (serviceKind === '1') {
        instanceCount = cli.interaction.promptIfNotGiven('instanceCount', instanceCount, _);
      }
      else if (serviceKind === '2') {
        targetReplicaSetSize = cli.interaction.promptIfNotGiven('targetReplicaSetSize', targetReplicaSetSize, _);
        minReplicaSetSize = cli.interaction.promptIfNotGiven('minReplicaSetSize', minReplicaSetSize, _);
        hasPersistedState = cli.interaction.promptIfNotGiven('hasPersistedState', hasPersistedState, _);
      }
      partitionScheme = cli.interaction.promptIfNotGiven('partitionScheme', partitionScheme, _);
      serviceGroupMemberDescription = cli.interaction.promptIfNotGiven('serviceGroupMemberDescription', serviceGroupMemberDescription, _);
      if (!serviceFabricUtils.isSubPath(applicationName, serviceName, _)) {
        throw 'ServiceName is not a sub-path of the applicationName';
      }
      
      var progress = cli.interaction.progress($('Create service group'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var serviceGroupDescription = {};
      if (applicationName) serviceGroupDescription.applicationName = applicationName;
      if (serviceName) serviceGroupDescription.serviceName = serviceName;
      if (serviceTypeName) serviceGroupDescription.serviceTypeName = serviceTypeName;
      if (serviceKind) serviceGroupDescription.serviceKind = Number(serviceKind);
      if (serviceKind === '1') {
        serviceGroupDescription.ServiceKindEnum = 'StatelessServiceGroupDescription';// bug in autorest, needs capital
        serviceGroupDescription.instanceCount = Number(instanceCount);
      }
      else if (serviceKind === '2') {
        serviceGroupDescription.ServiceKindEnum = 'StatefulServiceGroupDescription';// bug in autorest, needs capital
        serviceGroupDescription.targetReplicaSetSize = Number(targetReplicaSetSize);
        serviceGroupDescription.minReplicaSetSize = Number(minReplicaSetSize);
        if (hasPersistedState === 'true') {
          serviceGroupDescription.hasPersistedState = true;
        }
        else if (hasPersistedState === 'false') {
          serviceGroupDescription.hasPersistedState = false;
        }
      }
      serviceGroupDescription.partitionDescription = {
        partitionScheme: Number(partitionScheme)
      };
      
      if (partitionCount) serviceGroupDescription.partitionDescription.count = Number(partitionCount);
      if (partitionNames) serviceGroupDescription.partitionDescription.names = JSON.parse(partitionNames);
      if (partitionLowKey) serviceGroupDescription.partitionDescription.lowKey = partitionLowKey;
      if (partitionHighKey) serviceGroupDescription.partitionDescription.highKey = partitionHighKey;
      if (serviceGroupMemberDescription) serviceGroupDescription.serviceGroupMemberDescription = JSON.parse(serviceGroupMemberDescription);
      if (placementConstraints) serviceGroupDescription.placementConstraints = placementConstraints;
      if (correlationSchema) serviceGroupDescription.correlationSchema = JSON.parse(correlationSchema);
      if (serviceLoadMetrics) serviceGroupDescription.serviceLoadMetrics = JSON.parse(serviceLoadMetrics);
      var res = client.newServiceGroup(serviceFabricUtils.parseUrl(applicationName, _), serviceGroupDescription, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  serviceGroup.command('update [applicationName] [serviceName] [serviceKind] [flags] [instanceCount] [targetReplicaSetSize] [minReplicaSetSize] [replicaRestartWaitDurationInMilliseconds] [quorumLossWaitDurationInMilliseconds] [standByReplicaKeepDurationInMilliseconds]')
    .description($('Update service group'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('--service-kind <serviceKind>', $('the kind of the service'))
    .option('--flags <flags>', $('the flags'))
    .option('--instance-count <instanceCount>', $('the count of the instance'))
    .option('--target-replica-set-size <targetReplicaSetSize>', $('the size of the target replica set'))
    .option('--min-replica-set-size <minReplicaSetSize>', $('the size of the min replica set'))
    .option('--replica-restart-wait-duration-in-milliseconds <replicaRestartWaitDurationInMilliseconds>', $('the milliseconds of the replica restart wait duration'))
    .option('--quorum-loss-wait-duration-in-milliseconds <quorumLossWaitDurationInMilliseconds>', $('the milliseconds of the quorum loss wait duration'))
    .option('--stand-by-replica-keep-duration-in-milliseconds <standByReplicaKeepDurationInMilliseconds>', $('the milliseconds of the stand by replica keep duration'))
    .execute(function (applicationName, serviceName, serviceKind, flags, instanceCount, targetReplicaSetSize, minReplicaSetSize, replicaRestartWaitDurationInMilliseconds, quorumLossWaitDurationInMilliseconds, standByReplicaKeepDurationInMilliseconds, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName:', applicationName, _);
      serviceName = cli.interaction.promptIfNotGiven('serviceName:', serviceName, _);
      serviceKind = cli.interaction.promptIfNotGiven('serviceKind:', serviceKind, _);
      flags = cli.interaction.promptIfNotGiven('flags:', flags, _);
      
      var progress = cli.interaction.progress($('Update service group'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var serviceUpdateDescription = {};
      serviceUpdateDescription.serviceKind = Number(serviceKind);
      serviceUpdateDescription.flags = Number(flags);
      if (serviceKind === '1') {
        serviceUpdateDescription.ServiceKindEnum = 'StatelessServiceGroupUpdateDescription';// bug in autorest, needs capital
        serviceUpdateDescription.instanceCount = Number(instanceCount);
      }
      else if (serviceKind === '2') {
        serviceUpdateDescription.ServiceKindEnum = 'StatefulServiceGroupUpdateDescription';// bug in autorest, needs capital
        serviceUpdateDescription.targetReplicaSetSize = Number(targetReplicaSetSize);
        serviceUpdateDescription.minReplicaSetSize = Number(minReplicaSetSize);
      }
      if (replicaRestartWaitDurationInMilliseconds) serviceUpdateDescription.replicaRestartWaitDurationInMilliseconds = Number(replicaRestartWaitDurationInMilliseconds);
      if (quorumLossWaitDurationInMilliseconds) serviceUpdateDescription.quorumLossWaitDurationInMilliseconds = Number(quorumLossWaitDurationInMilliseconds);
      if (standByReplicaKeepDurationInMilliseconds) serviceUpdateDescription.standByReplicaKeepDurationInMilliseconds = Number(standByReplicaKeepDurationInMilliseconds);
      var res = client.updateServiceGroup(applicationName, serviceName, serviceUpdateDescription, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  serviceGroup.command('remove [applicationName] [serviceName]')
    .description($('Remove service group'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .execute(function (applicationName, serviceName, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName', applicationName, _);
      serviceName = cli.interaction.promptIfNotGiven('serviceName', serviceName, _);
      
      var progress = cli.interaction.progress($('Remove service group'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.removeServiceGroup(applicationName, serviceName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var serviceGroupTemplate = serviceGroup.category('template')
    .description($('Commands to manage your service group template'));
  
  serviceGroupTemplate.command('create [applicationName] [serviceName] [serviceTypeName]')
    .description($('Create service group from template'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('--service-type-name <serviceTypeName>', $('the name of the service type'))
    .execute(function (applicationName, serviceName, serviceTypeName, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName', applicationName, _);
      serviceName = cli.interaction.promptIfNotGiven('serviceName', serviceName, _);
      serviceTypeName = cli.interaction.promptIfNotGiven('serviceTypeName', serviceTypeName, _);
      
      var progress = cli.interaction.progress($('Create service group from template'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var serviceGroupTemplate = {};
      if (serviceName) serviceGroupTemplate.serviceName = serviceName;
      if (serviceTypeName) serviceGroupTemplate.serviceTypeName = serviceTypeName;
      var res = client.newServiceFromTemplate(applicationName, serviceGroupTemplate, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var serviceGroupDescription = serviceGroup.category('description')
    .description($('Commands to manage your service'));
  
  serviceGroupDescription.command('show [serviceName]')
    .description($('Show service group description'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service group description'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.getServiceGroupDescription('_', serviceName, options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var serviceGroupMember = serviceGroup.category('member')
    .description($('Commands to manage your service'));
  
  serviceGroupMember.command('show [applicationName] [serviceName]')
    .description($('Show service group member'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (applicationName, serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service group member'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.getServiceGroupMember(applicationName, serviceName, options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};