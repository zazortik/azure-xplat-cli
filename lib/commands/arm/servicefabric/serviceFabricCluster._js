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
var url = require('url');
var util = require('util');
var xml2js = require('xml2js');


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var cluster = serviceFabric.category('cluster')
    .description($('Commands to manage your cluster'));
  
  cluster.command('connect [connectionEndpoint] [caCertPath] [clientKeyPath] [clientCertPath]')
    .description($('Connect cluster'))
    .option('--connection-endpoint <connectionEndpoint>', $('the url of the connection endpoint'))
    .option('--ca-cert-path <caCertPath>', $('the path of the ca cert'))
    .option('--client-key-path <clientKeyPath>', $('the path of the client key'))
    .option('--client-cert-path <clientCertPath>', $('the path of the client cert'))
    .execute(function (connectionEndpoint, caCertPath, clientKeyPath, clientCertPath, options, _) {
      var progress = cli.interaction.progress($('Connect cluster'));
      
      var data = {};
      var urlObj = null;
      if (!connectionEndpoint) {
        urlObj = url.parse('http://localhost:10550');
      }
      else {
        urlObj = url.parse(connectionEndpoint);
      }
      if (!urlObj.protocol || !urlObj.hostname || !urlObj.port) {
        progress.end();
        throw util.format('Invalid url %s', connectionEndpoint);
      }
      data.connectionEndpoint = url.format(urlObj);
      if ((caCertPath && !serviceFabricUtils.isFileExist(caCertPath, _)) ||
        (clientKeyPath && !serviceFabricUtils.isFileExist(clientKeyPath, _)) ||
        (clientCertPath && !serviceFabricUtils.isFileExist(clientCertPath, _))) {
        progress.end();
        throw 'Certificate file does not exist.';
      }
      if (caCertPath) {
        data.caCertPath = caCertPath;
      }
      if (clientKeyPath) {
        data.clientKeyPath = clientKeyPath;
      }
      if (clientCertPath) {
        data.clientCertPath = clientCertPath;
      }
      serviceFabricUtils.writeConfigFile(data, _);
      
      // Test connect to cluster
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = null;
      try {
        res = client.getClusterManifest(options, _);
      }
      catch (e) {
        progress.end();
        log.data(util.format('Error connecting to the cluster %s. Please check the connection.', config.connectionEndpoint));
        throw e;
      }
      var parser = new xml2js.Parser();
      var clusterManifest = parser.parseString(res.Manifest, _);
      var tcpHost = clusterManifest.Infrastructure.WindowsServer.NodeList.Node[0]['@'].IPAddressOrFQDN;
      var tcpPort = clusterManifest.NodeTypes.NodeType[0].Endpoints.ClientConnectionEndpoint['@'].Port;
      data.tcpConnectionEndpoint = tcpHost + ':' + tcpPort;
      serviceFabricUtils.writeConfigFile(data, _);
      
      progress.end();
    });
  
  cluster.command('show')
    .description($('Show cluster'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show cluster'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      if (options.select) {
        config = serviceFabricUtils.pick(config, options.select, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(config, function (data) {
        log.json(data);
      });
    });
  
  var clusterManifest = cluster.category('manifest')
    .description($('Commands to manage your cluster manifest'));
  
  clusterManifest.command('show')
    .description($('Show cluster manifest'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show cluster manifest'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = client.getClusterManifest(options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterHealth = cluster.category('health')
    .description($('Commands to manage your cluster health'));
  
  clusterHealth.command('show [eventsHealthStateFilter] [nodesHealthStateFilter] [applicationsHealthStateFilter]')
    .description($('Show cluster health'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (eventsHealthStateFilter, nodesHealthStateFilter, applicationsHealthStateFilter, options, _) {
      var progress = cli.interaction.progress($('Show cluster health'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      if (eventsHealthStateFilter) options.eventsHealthStateFilter = eventsHealthStateFilter;
      if (nodesHealthStateFilter) options.nodesHealthStateFilter = nodesHealthStateFilter;
      if (applicationsHealthStateFilter) options.applicationsHealthStateFilter = applicationsHealthStateFilter;
      var res = client.getClusterHealth(options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  clusterHealth.command('send [sourceId] [property] [healthState] [description] [timeToLiveInMilliSeconds] [sequenceNumber] [removeWhenExpired]')
    .description($('Send cluster health report'))
    .option('--source-id <sourceId>', $('the id of the source'))
    .option('--property <property>', $('the property'))
    .option('--health-state <healthState>', $('the state of the health'))
    .option('--description <description>', $('the description'))
    .option('--time-to-live-in-milliseconds <timeToLiveInMilliseconds>', $('the time in milliseconds for live'))
    .option('--sequence-number <sequenceNumber>', $('the number of the sequence'))
    .option('--remove-when-expired <removeWhenExpired>', $('the boolean of the remove when expired'))
    .execute(function (sourceId, property, healthState, description, timeToLiveInMilliseconds, sequenceNumber, removeWhenExpired, options, _) {
      var progress = cli.interaction.progress($('Send cluster health report'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var clusterHealthReport = {};
      if (sourceId) clusterHealthReport.sourceId = sourceId;
      if (property) clusterHealthReport.property = property;
      if (healthState) clusterHealthReport.healthState = healthState;
      if (description) clusterHealthReport.description = description;
      if (timeToLiveInMilliseconds) clusterHealthReport.timeToLiveInMilliSeconds = timeToLiveInMilliseconds;
      if (sequenceNumber) clusterHealthReport.sequenceNumber = sequenceNumber;
      if (removeWhenExpired) clusterHealthReport.removeWhenExpired = removeWhenExpired;
      var res = client.sendClusterHealthReport(clusterHealthReport, options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterLoad = cluster.category('load')
    .description($('Commands to manage your cluster load information'));
  
  clusterLoad.command('show')
    .description($('Show load information'))
    .option('-s --select <fields>', $('select fields to show'))
    .execute(function (options, _) {
      var progress = cli.interaction.progress($('Show load information'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = client.getClusterLoadInformation(options, _);
      if (options.select) {
        res = serviceFabricUtils.pick(res, options.select, _);
      }
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
  
  var clusterUpgrade = cluster.category('upgrade')
    .description($('Commands to manage your cluster upgrade'));
  
  clusterUpgrade.command('show')
    .description($('Show cluster upgrade'))
    .execute(function (applicationName, options, _) {
      var progress = cli.interaction.progress($('Show cluster upgrade'));
      
      var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
      
      var client = new serviceFabricClient('1.0', serviceFabricUtils.createConnectionUrl(config, _), serviceFabricUtils.getOptions(_));
      var res = client.getUpgradeProgress(options, _);
      
      progress.end();
      
      cli.interaction.formatOutput(res, function (data) {
        log.json(data);
      });
    });
};