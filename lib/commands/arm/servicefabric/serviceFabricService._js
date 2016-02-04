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
  
  service.command('show [applicationName] [serviceName]')
    .description($('Show service'))
    .option('--application-name <serviceName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .execute(function (applicationName, serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = null;
      if (!serviceName) {
        res = client.getServiceList(applicationName, '1.0', options, _);
      }
      else {
        serviceName = serviceFabricUtils.parseUrl(serviceName, _);
        res = [client.getService(applicationName, serviceName, '1.0', options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No service'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Id'), item.id);
            row.cell($('ServiceKind'), item.serviceKind);
            row.cell($('Name'), item.name);
            row.cell($('TypeName'), item.typeName);
            row.cell($('ManifestVersion'), item.manifestVersion);
            row.cell($('HasPersistedState'), item.hasPersistedState);
            row.cell($('HealthState'), item.healthState);
            row.cell($('ServiceStatus'), item.serviceStatus);
            row.cell($('IsServiceGroup'), item.isServiceGroup);
          });
        }
      });
    });
  
  service.command('create [applicationName] [serviceName] [serviceTypeName] [serviceKind] [instanceCount] [targetReplicaSetSize] [minReplicaSetSize] [hasPersistedState] [partitionScheme] [partitionCount] [partitionNames] [partitionLowKey] [partitionHighKey] [placementConstraints] [correlationSchema] [serviceLoadMetrics]')
    .description($('Create service'))
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
    .option('--placement-constraints <placementConstraints>', $('the constraints of the placement'))
    .option('--correlation-schema <correlationSchema>', $('the schema of the correlation'))
    .option('--service-load-metrics <serviceLoadMetrics>', $('the metrics of the service load'))
    .execute(function (applicationName, serviceName, serviceTypeName, serviceKind, instanceCount, targetReplicaSetSize, minReplicaSetSize, hasPersistedState, partitionScheme, partitionCount, partitionNames, partitionLowKey, partitionHighKey, placementConstraints, correlationSchema, serviceLoadMetrics, options, _) {
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
      
      var progress = cli.interaction.progress($('Create service'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      var serviceDescription = {};
      if (applicationName) serviceDescription.applicationName = applicationName;
      if (serviceName) serviceDescription.serviceName = serviceName;
      if (serviceTypeName) serviceDescription.serviceTypeName = serviceTypeName;
      if (serviceKind) serviceDescription.ServiceKind = serviceKind;// bug in autorest, needs capital
      if (serviceKind === '1') {
        serviceDescription.instanceCount = Number(instanceCount);
      }
      else if (serviceKind === '2') {
        serviceDescription.targetReplicaSetSize = Number(targetReplicaSetSize);
        serviceDescription.minReplicaSetSize = Number(minReplicaSetSize);
        if (hasPersistedState === 'true') {
          serviceDescription.hasPersistedState = true;
        }
        else if (hasPersistedState === 'false') {
          serviceDescription.hasPersistedState = false;
        }
      }
      serviceDescription.partitionDescription = {
        partitionScheme: Number(partitionScheme)
      };
      if (partitionCount) serviceDescription.partitionDescription.count = Number(partitionCount);
      if (partitionNames) serviceDescription.partitionDescription.names = JSON.parse(partitionNames);
      if (partitionLowKey) serviceDescription.partitionDescription.lowKey = partitionLowKey;
      if (partitionHighKey) serviceDescription.partitionDescription.highKey = partitionHighKey;
      if (placementConstraints) serviceDescription.placementConstraints = placementConstraints;
      if (correlationSchema) serviceDescription.correlationSchema = JSON.parse(correlationSchema);
      if (serviceLoadMetrics) serviceDescription.serviceLoadMetrics = JSON.parse(serviceLoadMetrics);
      var res = client.newService(serviceFabricUtils.parseUrl(applicationName, _), serviceDescription, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var serviceTemplate = service.category('template')
    .description($('Commands to manage your service template'));
  
  serviceTemplate.command('create [applicationName] [serviceName] [serviceTypeName]')
    .description($('Create service from template'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .option('--service-type-name <serviceTypeName>', $('the name of the service type'))
    .execute(function (applicationName, serviceName, serviceTypeName, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName', applicationName, _);
      serviceName = cli.interaction.promptIfNotGiven('serviceName', serviceName, _);
      serviceTypeName = cli.interaction.promptIfNotGiven('serviceTypeName', serviceTypeName, _);
      
      var progress = cli.interaction.progress($('Create service from template'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _)
      var serviceTemplate = {};
      if (serviceName) serviceTemplate.serviceName = serviceName;
      if (serviceTypeName) serviceTemplate.serviceTypeName = serviceTypeName;
      var res = client.newServiceFromTemplate(applicationName, serviceTemplate, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var serviceType = service.category('type')
    .description($('Commands to manage your service manifest'));
  
  serviceType.command('show [applicationTypeName] [applicationTypeVersion]')
    .description($('Show service type'))
    .option('--application-type-name <applicationTypeName>', $('the type of the application type'))
    .option('--application-type-version <applicationTypeVersion>', $('the version of the application type'))
    .execute(function (applicationTypeName, applicationTypeVersion, options, _) {
      var progress = cli.interaction.progress($('Show service type'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getServiceType(applicationTypeName, applicationTypeVersion, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No service type'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('ServiceTypeDescription'), item.serviceTypeDescription);
            row.cell($('ServiceManifestVersion'), item.serviceManifestVersion);
            row.cell($('ServiceManifestName'), item.serviceManifestName);
            row.cell($('IsServiceGroup'), item.isServiceGroup);
          });
        }
      });
    });
  
  var serviceTypeDeployed  = serviceType.category('deployed')
    .description($('Commands to manage your deployed service type'));
  
  // TODO: document missing
  serviceTypeDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed service type'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--service-package-name <servicePackageName>', $('the name of the service package'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('ShowDeployedServicePackage'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.getDeployedServicePackage(nodeName, applicationName, '1.0', options, _);
      
      progress.end();
      
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
    });
  
  var serviceManifest = service.category('manifest')
    .description($('Commands to manage your service manifest'));
  
  serviceManifest.command('show [applicationTypeName] [applicationTypeVersion] [serviceManifestName]')
    .description($('Show service manifest'))
    .option('--application-type-name <applicationTypeName>', $('the type of the application type'))
    .option('--application-type-version <applicationTypeVersion>', $('the version of the application type'))
    .option('--service-manifest-name <serviceManifestName>', $('the name of the service manifest'))
    .execute(function (applicationTypeName, applicationTypeVersion, serviceManifestName, options, _) {
      var progress = cli.interaction.progress($('Show service manifest'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getServiceManifest(applicationTypeName, applicationTypeVersion, serviceManifestName, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
          log.json(data);
      });
    });
  
  var serviceDescription = service.category('description')
    .description($('Commands to manage your service'));
  
  serviceDescription.command('show [serviceName]')
    .description($('Show service description'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .execute(function (serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service description'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = null;
      if (!serviceName) {
        res = client.getServiceDescription(serviceName, '1.0', options, _);
      }
      else {
        serviceName = serviceFabricUtils.parseUrl(serviceName, _);
        res = [client.getServiceDescription(serviceName, '1.0', options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed service package'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('ServiceKind'), item.serviceKind);
            row.cell($('ApplicationName'), item.applicationName);
            row.cell($('ServiceName'), item.serviceName);
            row.cell($('ServiceTypeName'), item.serviceTypeName);
            row.cell($('PartitionDescription'), item.partitionDescription);
            row.cell($('TargetReplicaSetSize'), item.targetReplicaSetSize);
            row.cell($('MinReplicaSetSize'), item.minReplicaSetSize);
            row.cell($('HasPersistedState'), item.hasPersistedState);
            row.cell($('PlacementConstraints'), item.placementConstraints);
            row.cell($('Flags'), item.flags);
            row.cell($('ReplicaRestartWaitDurationSeconds'), item.replicaRestartWaitDurationSeconds);
            row.cell($('QuorumLossWaitDurationSeconds'), item.quorumLossWaitDurationSeconds);
            row.cell($('StandByReplicaKeepDurationSeconds'), item.standByReplicaKeepDurationSeconds);
            row.cell($('DefaultMoveCost'), item.defaultMoveCost);
            row.cell($('IsDefaultMoveCostSpecified'), item.isDefaultMoveCostSpecified);
          });
        }
      });
    });
  
  var serviceHealth = service.category('health')
    .description($('Commands to manage your service'));
  
  serviceHealth.command('show [serviceName]')
    .description($('Show service health'))
    .option('--service-name <serviceName>', $('the name of the service'))
    .execute(function (serviceName, options, _) {
      var progress = cli.interaction.progress($('Show service description'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var res = client.getServiceHealth(serviceName, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(res);
      });
    });
  
  serviceHealth.command('send [serviceName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send service health report'))
    .option('--service-name <serviceName>', $('the id of the partition'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliSeconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (serviceName, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send service health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient(config.connectionEndpoint ? config.connectionEndpoint : null);
      serviceName = serviceFabricUtils.parseUrl(serviceName, _);
      var serviceHealthReport = {};
      if (sourceId) serviceHealthReport.sourceId = sourceId;
      if (property) serviceHealthReport.property = property;
      if (healthState) serviceHealthReport.healthState = Number(healthState);
      if (description) serviceHealthReport.description = description;
      if (timeToLiveInMilliseconds) serviceHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) serviceHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) serviceHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendServiceHealth(serviceName, serviceHealthReport, '1.0', options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};