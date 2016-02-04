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
  
  var application = serviceFabric.category('application')
    .description($('Commands to manage your application'));
  
  application.command('show [applicationName]')
    .description($('Show application'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (applicationName, options, _) {
      var progress = cli.interaction.progress($('Show application'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = null;
      if (!applicationName) {
        res = client.getApplicationList(options, _);
      }
      else {
        res = [client.getApplication(applicationName, options, _)];
      }
            
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No application'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Id'), item.id);
            row.cell($('Name'), item.name);
            row.cell($('TypeName'), item.typeName);
            row.cell($('TypeVersion'), item.typeVersion);
            row.cell($('Status'), item.status);
            // row.cell($('Parameters'), item.Parameters);
            row.cell($('HealthState'), item.healthState);
          });
        }
      });
    });
  
  application.command('create [applicationName] [applicationTypeName] [applicationTypeVersion] [applicationParameter]')
    .description($('Create application'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--application-type-name <applicationTypeName>', $('the name of the application type'))
    .option('--application-typeversion <applicationTypeVersion>', $('the version of the application type'))
    .option('--application-parameter <applicationParameter>', $('the parameter of the application'))
    .execute(function (applicationName, applicationTypeName, applicationTypeVersion, applicationParameter, options, _) {
      var progress = cli.interaction.progress($('Create application'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var applicationDescription = {};
      if (applicationName) applicationDescription.name = applicationName;
      if (applicationTypeName) applicationDescription.typeName = applicationTypeName;
      if (applicationTypeVersion) applicationDescription.typeVersion = applicationTypeVersion;
      if (applicationParameter) applicationDescription.parameterList = JSON.parse(applicationParameter);
      var res = client.newApplication(applicationDescription, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  application.command('remove [applicationName]')
    .description($('Remove application'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (applicationName, options, _) {
      var progress = cli.interaction.progress($('Remove application'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.removeApplication(applicationName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var applicationManifest = application.category('manifest')
    .description($('Commands to manage your application manifest'));
  
  applicationManifest.command('show [applicationTypeName] [applicationTypeVersion]')
    .description($('Show application manifest'))
    .option('--application-type-name <applicationTypeName>', $('the name of the application type'))
    .option('--application-type-version <applicationTypeVersion>', $('the type of the application version'))
    .execute(function (applicationTypeName, applicationTypeVersion, options, _) {
      var progress = cli.interaction.progress($('Show application manifest'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = client.getApplicationManifest(applicationTypeName, applicationTypeVersion, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var applicationType  = application.category('type')
    .description($('Commands to manage your deployed service type'));
  
  applicationType.command('show [applicationName]')
    .description($('Show application type'))
    .option('--application-type-name <applicationTypeName>', $('the type of the application'))
    .execute(function (applicationTypeName, options, _) {
      var progress = cli.interaction.progress($('Show application type'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = null;
      if (!applicationTypeName) {
        res = client.getApplicationTypeList(options, _);
      }
      else {
        res = client.getApplicationType(applicationTypeName, options, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No application type'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Version'), item.version);
            // row.cell($('DefaultParameterList'), item.DefaultParameterList);
          });
        }
      });
    });
  
  applicationType.command('register [applicationTypeBuildPath]')
    .description($('Register application type'))
    .option('--application-type-build-path <applicationTypeBuildPath>', $('the path of the application type build'))
    .execute(function (applicationTypeBuildPath, options, _) {
      applicationTypeBuildPath = cli.interaction.promptIfNotGiven('applicationTypeBuildPath:', applicationTypeBuildPath, _);
      
      var progress = cli.interaction.progress($('Register application type'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var registerApplicationType = {};
      registerApplicationType.applicationTypeBuildPath = applicationTypeBuildPath;
      var res = client.registerApplicationType(registerApplicationType, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationType.command('unregister [applicationTypeName] [applicationTypeVersion]')
    .description($('Unregister application type'))
    .option('--application-type-name <applicationTypeName>', $('the name of the application type'))
    .option('--application-type-version <applicationTypeVersion>', $('the version of the application type'))
    .execute(function (applicationTypeName, applicationTypeVersion, options, _) {
      applicationTypeName = cli.interaction.promptIfNotGiven('applicationTypeName:', applicationTypeName, _);
      applicationTypeVersion = cli.interaction.promptIfNotGiven('applicationTypeVersion:', applicationTypeVersion, _);
      
      var progress = cli.interaction.progress($('Unregister application type'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var unregisterApplicationType = {};
      unregisterApplicationType.applicationTypeVersion = applicationTypeVersion;
      var res = client.unregisterApplicationType(applicationTypeName, unregisterApplicationType, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var applicationHealth = application.category('health')
    .description($('Commands to send your application health report'));
  
  applicationHealth.command('send [applicationName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send application health report'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliSeconds <timeToLiveInMilliSeconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (applicationName, sourceId, property, healthState, description, timeToLiveInMilliSeconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send application health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var applicationHealthReport = {};
      if (sourceId) applicationHealthReport.sourceId = sourceId;
      if (property) applicationHealthReport.property = property;
      if (healthState) applicationHealthReport.healthState = healthState;
      if (description) applicationHealthReport.description = description;
      if (timeToLiveInMilliSeconds) applicationHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliSeconds;
      if (sequenceNumber) applicationHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) applicationHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendApplicationHealthReport(applicationName, applicationHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var applicationDeployed = application.category('deployed')
    .description($('Commands to manage your deployed application'));
  
  applicationDeployed.command('show [nodeName] [applicationName]')
    .description($('Show deployed application'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (nodeName, applicationName, options, _) {
      var progress = cli.interaction.progress($('Show deployed application'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var res = null;;
      if (!applicationName) {
        res = client.getDeployedApplicationList(nodeName, options, _);
      }
      else {
        applicationName = serviceFabricUtils.parseUrl(applicationName, _);
        res = [client.getDeployedApplication(nodeName, applicationName, options, _)];
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        if (data.length === 0) {
          log.info($('No deployed application'));
        } else {
          log.table(data, function (row, item) {
            row.cell($('Id'), item.id);
            row.cell($('Name'), item.name);
            row.cell($('TypeName'), item.typeName);
            row.cell($('Status'), item.status);
            row.cell($('WorkDirectory'), item.workDirectory);
            row.cell($('LogDirectory'), item.logDirectory);
            row.cell($('TempDirectory'), item.tempDirectory);
          });
        }
      });
    });
  
  var applicationDeployedHealth = applicationDeployed.category('health')
    .description($('Commands to manage your deployed application health report'));
  
  applicationDeployedHealth.command('show [nodeName] [applicationName] [eventsHealthStateFilter] [deployedServicePackagesHealthStateFilter]')
    .description($('Show deployed application health'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--events-health-state-filter <eventsHealthStateFilter>', $('the filter of the event health state'))
    .option('--deployed-service-packages-health-state-filter <deployedServicePackagesHealthStateFilter>', $('the filter of the deployed service packages health state'))
    .execute(function (nodeName, applicationName, eventsHealthStateFilter, deployedServicePackagesHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show deployed application health'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      if (deployedServicePackagesHealthStateFilter) options.deployedServicePackagesHealthStateFilter = deployedServicePackagesHealthStateFilter;
      var res = client.getDeployedApplicationHealth(nodeName, applicationName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationDeployedHealth.command('send [nodeName] [applicationName] [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send cluster health report'))
    .option('--node-name <nodeName>', $('the name of the node'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (nodeName, applicationName, sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send cluster health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var applicationHealthReport = {};
      if (sourceId) applicationHealthReport.sourceId = sourceId;
      if (property) applicationHealthReport.property = property;
      if (healthState) applicationHealthReport.healthState = Number(healthState);
      if (description) applicationHealthReport.description = description;
      if (timeToLiveInMilliseconds) applicationHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) applicationHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) applicationHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendDeployedApplicationHealthReport(nodeName, applicationName, applicationHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var applicationUpgrade = application.category('upgrade')
    .description($('Commands to manage your application upgrade'));
  
  applicationUpgrade.command('show [applicationName]')
    .description($('Show application upgrade'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (applicationName, options, _) {
      var progress = cli.interaction.progress($('Show application upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.getApplicationUpgrade(applicationName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationUpgrade.command('start [applicationName] [targetApplicationTypeVersion] [parameters] [upgradeKind] [rollingUpgradeMode] [upgradeReplicaSetCheckTimeoutInSeconds] [forceRestart] [monitoringPolicy] [applicationHealthPolicy]')
    .description($('Start application upgrade'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--target-application-type-version <targetApplicationTypeVersion>', $('the version of the target application type'))
    .option('--parameters <parameters>', $('the parameters'))
    .option('--upgrade-kind <upgradeKind>', $('the kind of the upgrade'))
    .option('--rolling-upgrade-mode <rollingUpgradeMode>', $('the mode of the rolling upgrade'))
    .option('--upgrade-replica-set-check-timeout-in-seconds <upgradeReplicaSetCheckTimeoutInSeconds>', $('the name of the upgrade domain'))
    .option('--force-restart <forceRestart>', $('the force restart'))
    .option('--monitoring-policy <monitoringPolicy>', $('the policy of the monitoring'))
    .option('--application-health-policy <applicationHealthPolicy>', $('the policy of the health application'))
    .execute(function (applicationName, targetApplicationTypeVersion, parameters, upgradeKind, rollingUpgradeMode, upgradeReplicaSetCheckTimeoutInSeconds, forceRestart, monitoringPolicy, applicationHealthPolicy, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName:', applicationName, _);
      targetApplicationTypeVersion = cli.interaction.promptIfNotGiven('targetApplicationTypeVersion:', targetApplicationTypeVersion, _);
      parameters = cli.interaction.promptIfNotGiven('parameters:', parameters, _);
      upgradeKind = cli.interaction.promptIfNotGiven('upgradeKind:', upgradeKind, _);
      rollingUpgradeMode = cli.interaction.promptIfNotGiven('rollingUpgradeMode:', rollingUpgradeMode, _);
      
      var progress = cli.interaction.progress($('Start application upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var startApplicationUpgradeDescription = {};
      startApplicationUpgradeDescription.name = applicationName;
      startApplicationUpgradeDescription.targetApplicationTypeVersion = targetApplicationTypeVersion;
      startApplicationUpgradeDescription.parameters = JSON.parse(parameters);
      startApplicationUpgradeDescription.upgradeKind = Number(upgradeKind);
      startApplicationUpgradeDescription.rollingUpgradeMode = Number(rollingUpgradeMode);
      if (upgradeReplicaSetCheckTimeoutInSeconds) {
        startApplicationUpgradeDescription.upgradeReplicaSetCheckTimeoutInSeconds = Number(upgradeReplicaSetCheckTimeoutInSeconds);
      }
      if (forceRestart === 'true') {
        startApplicationUpgradeDescription.forceRestart = true;
      }
      else if (forceRestart === 'false') {
        startApplicationUpgradeDescription.forceRestart = false;
      }
      if (monitoringPolicy) {
        startApplicationUpgradeDescription.monitoringPolicy = JSON.parse(monitoringPolicy);
      }
      if (applicationHealthPolicy) {
        startApplicationUpgradeDescription.applicationHealthPolicy = JSON.parse(applicationHealthPolicy);
      }
      var res = client.startApplicationUpgrade(serviceFabricUtils.parseUrl(applicationName, _), startApplicationUpgradeDescription, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationUpgrade.command('update [applicationName] [upgradeKind] [rollingUpgradeMode] [forceRestart] [failureAction] [upgradeReplicaSetCheckTimeoutInSeconds] [healthCheckWaitDurationInMilliseconds] [healthCheckStableDurationInMilliseconds] [healthCheckRetryTimeoutInMilliseconds] [upgradeTimeoutInMilliseconds] [upgradeDomainTimeoutInMilliseconds] [applicationHealthPolicy]')
    .description($('Update application upgrade'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--upgrade-kind <upgradeKind>', $('the kind of the upgrade'))
    .option('--rolling-upgrade-mode <rollingUpgradeMode>', $('the mode of the rolling upgrade'))
    .option('--force-restart <forceRestart>', $('the mode of the rolling upgrade'))
    .option('--failure-action <failureAction>', $('the mode of the rolling upgrade'))
    .option('--upgrade-replica-set-check-timeout-in-seconds <upgradeReplicaSetCheckTimeoutInSeconds>', $('the mode of the rolling upgrade'))
    .option('--health-check-wait-duration-in-milliseconds <healthCheckWaitDurationInMilliseconds>', $('the mode of the rolling upgrade'))
    .option('--health-check-stable-duration-in-milliseconds <healthCheckStableDurationInMilliseconds>', $('the mode of the rolling upgrade'))
    .option('--health-check-retry-timeout-in-milliseconds <healthCheckRetryTimeoutInMilliseconds>', $('the mode of the rolling upgrade'))
    .option('--upgrade-timeout-in-milliseconds <upgradeTimeoutInMilliseconds>', $('the mode of the rolling upgrade'))
    .option('--upgrade-domain-timeout-in-milliseconds <upgradeDomainTimeoutInMilliseconds>', $('the mode of the rolling upgrade'))
    .option('--application-health-policy <applicationHealthPolicy>', $('the policy of the health application'))
    .execute(function (applicationName, upgradeKind, rollingUpgradeMode, forceRestart, failureAction, upgradeReplicaSetCheckTimeoutInSeconds, healthCheckWaitDurationInMilliseconds, healthCheckStableDurationInMilliseconds, healthCheckRetryTimeoutInMilliseconds, upgradeTimeoutInMilliseconds, upgradeDomainTimeoutInMilliseconds, applicationHealthPolicy, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName:', applicationName, _);
      upgradeKind = cli.interaction.promptIfNotGiven('upgradeKind:', upgradeKind, _);
      
      var progress = cli.interaction.progress($('Update application upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      var updateApplicationUpgradeDescription = {};
      updateApplicationUpgradeDescription.name = applicationName;
      updateApplicationUpgradeDescription.upgradeKind = Number(upgradeKind);
      updateApplicationUpgradeDescription.updateDescrption = {};
      if (rollingUpgradeMode) {
        updateApplicationUpgradeDescription.updateDescrption.rollingUpgradeMode = Number(rollingUpgradeMode);
      }
      if (forceRestart === 'true') {
        updateApplicationUpgradeDescription.updateDescrption.forceRestart = true;
      }
      else if (forceRestart === 'false') {
        updateApplicationUpgradeDescription.updateDescrption.forceRestart = false;
      }
      if (failureAction) {
        updateApplicationUpgradeDescription.updateDescrption.failureAction = Number(failureAction);
      }
      if (upgradeReplicaSetCheckTimeoutInSeconds) {
        updateApplicationUpgradeDescription.upgradeReplicaSetCheckTimeoutInSeconds = Number(upgradeReplicaSetCheckTimeoutInSeconds);
      }
      if (healthCheckWaitDurationInMilliseconds) {
        updateApplicationUpgradeDescription.updateDescrption.failureAction = healthCheckWaitDurationInMilliseconds;
      }
      if (healthCheckStableDurationInMilliseconds) {
        updateApplicationUpgradeDescription.updateDescrption.failureAction = healthCheckStableDurationInMilliseconds;
      }
      if (healthCheckRetryTimeoutInMilliseconds) {
        updateApplicationUpgradeDescription.updateDescrption.failureAction = healthCheckRetryTimeoutInMilliseconds;
      }
      if (upgradeTimeoutInMilliseconds) {
        updateApplicationUpgradeDescription.updateDescrption.failureAction = upgradeTimeoutInMilliseconds;
      }
      if (upgradeDomainTimeoutInMilliseconds) {
        updateApplicationUpgradeDescription.updateDescrption.upgradeDomainTimeoutInMilliseconds = upgradeDomainTimeoutInMilliseconds;
      }
      if (applicationHealthPolicy) {
        updateApplicationUpgradeDescription.applicationHealthPolicy = JSON.parse(applicationHealthPolicy);
      }
      var res = client.updateApplicationUpgrade(serviceFabricUtils.parseUrl(applicationName, _), updateApplicationUpgradeDescription, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationUpgrade.command('resume [applicationName] [upgradeDomainName]')
    .description($('Resume application upgrade'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .option('--upgrade-domain-name <upgradeDomainName>', $('the name of the upgrade domain'))
    .execute(function (applicationName, upgradeDomainName, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName:', applicationName, _);
      upgradeDomainName = cli.interaction.promptIfNotGiven('upgradeDomainName:', upgradeDomainName, _);
      
      var progress = cli.interaction.progress($('Resume application upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var resumeApplicationUpgrade = {};
      resumeApplicationUpgrade.upgradeDomainName = upgradeDomainName;
      var res = client.resumeApplicationUpgrade(applicationName, resumeApplicationUpgrade, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  applicationUpgrade.command('rollback [applicationName]')
    .description($('Start application upgrade rollback'))
    .option('--application-name <applicationName>', $('the name of the application'))
    .execute(function (applicationName, options, _) {
      applicationName = cli.interaction.promptIfNotGiven('applicationName:', applicationName, _);
      
      var progress = cli.interaction.progress($('Start application upgrade rollback'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', config.connectionEndpoint ? config.connectionEndpoint : null);
      applicationName = serviceFabricUtils.parseUrl(applicationName, _);
      var res = client.startApplicationRollback(applicationName, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};