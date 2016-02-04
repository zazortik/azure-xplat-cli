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
      
      var progress = cli.interaction.progress($('Create service group'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var serviceGroupDescription = {};
      if (applicationName) serviceGroupDescription.applicationName = applicationName;
      if (serviceName) serviceGroupDescription.serviceName = serviceName;
      if (serviceTypeName) serviceGroupDescription.serviceTypeName = serviceTypeName;
      if (serviceKind) serviceGroupDescription.ServiceKind = serviceKind;// bug in autorest, needs capital
      if (serviceKind === '1') {
        serviceGroupDescription.instanceCount = Number(instanceCount);
      }
      else if (serviceKind === '2') {
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
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _)
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
    .execute(function (serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service group description'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.getServiceGroupDescription('_', serviceName, options, _);
      
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
    .execute(function (applicationName, serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service group member'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.getServiceGroupMember(applicationName, serviceName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};