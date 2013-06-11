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

var url = require('url');
var azure = require('azure');
var __ = require('underscore');
var util = require('util');

var utils = require('../util/utils.js');
var interaction = require('../util/interaction._js');

var allowAzureRuleName = 'AllowAllWindowsAzureIps';
var allowAzureRuleIp = '0.0.0.0';

var hdInsightCommandLine = function(cli) {
  this.cli = cli;
  this.log = cli.output;
  self = this;

  // <0: No debug Logging 
  // 1: Basic Logging
  // 2: Normal Logging
  // 3: detailed Logging
  // 4: diagnostic Logging
  // 5: just plain noisy 
  this.debugLevel = 0;
  this.progress = null;
  this.errorCount = 0;
};

hdInsightCommandLine.prototype.logErrorAndData = function(err, data) {
  interaction.formatOutput(self.cli, data, function(outputData) {
    self.log.error(err);
    interaction.logEachData(self.cli, 'HDInsight Cluster', data);
  });
};

hdInsightCommandLine.prototype.logError = function (err) {
  interaction.formatOutput(self.cli, err, function(outputData) {
    self.log.error(err);
  });
};

hdInsightCommandLine.prototype.logData = function (data) {
  interaction.formatOutput(self.cli, data, function(outputData) {
    interaction.logEachData(self.cli, 'HDInsight Cluster', data);
  });
};

hdInsightCommandLine.prototype.logList = function (list) {
  interaction.formatOutput(self.cli, list, function(outputData) {
    if(outputData.length === 0) {
      self.log.info('No HDInsight clusters exist');
    } else {
      self.log.table(list, function (row, item) {
        row.cell('Name', item.Name);
        row.cell('Location', item.Location);
        row.cell('State', item.State);
      });
    }
  });
};

hdInsightCommandLine.prototype.promptIfNotGiven = function (message, value, _) {
  return interaction.promptIfNotGiven(self.cli, message, value, _);
}

// <0: No debug Logging 
// 1: Basic Logging
// 2: Normal Logging
// 3: detailed Logging
// 4: diagnostic Logging
// 5: just plain noisy 
hdInsightCommandLine.prototype.debugLog = function (level, message) {
  if (self.debugLevel > 0 && self.debugLevel >= level) {
    console.log(message + '\r');
  }
};

hdInsightCommandLine.prototype.startProgress = function(message) {
  if (self.debugLevel <= 0) {
    self.progress = self.cli.progress(message);
  }
  else {
    console.log('START Progress: ' + message + '\r');
  }
};

hdInsightCommandLine.prototype.endProgress = function () {
  if (self.debugLevel <= 0 && self.progress) {
    self.progress.end();
  }
  else {
    console.log('END PROGRESS\r');
  }
};

hdInsightCommandLine.prototype.filterCluster = function (response) {
  if (errorCount > 25) {
    // Basic Log Level (stop for errors)
    self.debugLog(1, 'filterCluster (error count exceeded): ' + errorCount);
    return true;
  }
  if (!response) {
    errorCount++;
    self.debugLog(2, 'filterCluster (no response)');
    self.debugLog(1, 'filterCluster (bad response, increasing error count): ' + errorCount);
    return false;
  }
  self.debugLog(5, 'filterCluster (found cluster): ' + response);
  if (response.State == 'Operational' || response.State == 'Running' || response.State == 'Error' || (response.Error && response.Error != 'None'))  {
    // Diagnostic Log Level
    self.debugLog(4, 'filterCluster (cluster in terminal state)')
    return true;
  }
  // Diagnostic Log Level
  self.debugLog(5, 'filterCluster (cluster in non terminal state)' + response);
  return false;
};

hdInsightCommandLine.prototype.processCreateCluster = function (creationObject, subscriptionId, _) {
  self.createCluster(creationObject, subscriptionId);
  self.doPollRequest(creationObject.name, subscriptionId, _);
};

hdInsightCommandLine.prototype.createCluster = function (creationObject, subscriptionId, _) {
  var hdInsight = self.createHDInsightManagementService(subscriptionId);
  return hdInsight.createCluster(creationObject, _);
};

hdInsightCommandLine.prototype.getCluster = function (clusterName, subscriptionId, _) {
  self.debugLog(5, 'getCluster (clusterName param): ' + clusterName);
  self.debugLog(5, 'getCluster (subscriptionId param): ' + subscriptionId);
  var result = self.listClusters(subscriptionId, _);
  var cluster = result.body.clusters.filter(function (cluster) {
    if (!cluster || !cluster.Name) {
      self.debugLog(1, 'getCluster (cluster not defined or no cluster name)')
      return false;
    }
    return utils.ignoreCaseEquals(cluster.Name, clusterName);
  })[0];
  return cluster;
};

hdInsightCommandLine.prototype.deleteCluster = function (clusterName, subscriptionId, _) {
  var hdInsight = self.createHDInsightManagementService(subscriptionId);
  var cluster = self.getCluster(clusterName, subscriptionId, _);
  hdInsight.deleteCluster(clusterName, cluster.Location, _);
};

hdInsightCommandLine.prototype.listClusters = function(subscriptionId, _) {
  var hdInsight = self.createHDInsightManagementService(subscriptionId);
  var result = hdInsight.listClusters(_);

  return result;
};

hdInsightCommandLine.prototype.doPollRequest = function doPollRequest(name, subscriptionId, _) {
  self.errorCount = 0;
  self.debugLog(5, 'doPollRequest (name param): ' + name);
  self.debugLog(5, 'doPollRequest (subscriptionId param): ' + subscriptionId);
  var result = self.getCluster(name, subscriptionId, _);
  var done = self.filterCluster(result);
  // Diagnostic Log Level
  self.debugLog(4, 'doPollRequest (validation): ' + done);
  while (!done) {
    result = self.getCluster(name, subscriptionId, _);
    done = self.filterCluster(result);
    // Diagnostic Log Level
    self.debugLog(4, 'doPollRequest (validation): ' + done);
    setTimeout(_, 1000);
  }
  // Detailed Log Level
  self.debugLog(3, 'doPollRequest (done)');
};

hdInsightCommandLine.prototype.createHDInsightManagementService = function (subscription) {
  var account = self.cli.category('account');
  var subscriptionId = account.lookupSubscriptionId(subscription);
  self.debugLog(5, 'createHDInsightManagmentService (subscriptionId): ' + subscriptionId);
  var pem = account.managementCertificate();
  var auth = {
    keyvalue: pem.key,
    certvalue: pem.cert
  };

  return azure.createHDInsightService(subscriptionId, auth);
};

module.exports = hdInsightCommandLine;

hdInsightCommandLine.init = function (cli) {
  var self = new hdInsightCommandLine(cli);

  var hdInsight = self.cli.category('hdinsight')
    .description('Commands to manage your HDInsight accounts');

  var cluster = hdInsight.category('cluster')
    .description('Commands to manage your HDInsight clusters');

  cluster.command('create [clusterName] [nodes] [location]')
    .description('Create a new cluster')
    .usage('<clusterName> <nodes> <location> [options]')
    .option('--clusterName <clusterName>', 'The HdInsight cluster name')
    .option('--storageAccountName <storageAccountName>', 'The Azure storage account to use for HDInsight storage')
    .option('--storageAccountKey <storageAccountKey>', 'The key to the Azure storage account to use for HDInsight storage')
    .option('--storageContainer <storageContainer>', 'The container in the Azure storage account to use for HDInsight default storage')
    .option('--nodes <nodes>', 'The number of data nodes to use for the cluster')
    .option('--location <location>', 'The Azure location for the cluster')
    .option('--username <username>', 'The user name to use for the cluster')
    .option('--clusterPassword <clusterPassword>', 'The password to use for the cluster')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (clusterName, storageAccountName, storageAccountKey, storageContainer, nodes, location, username, clusterPassword, options, _) {
      var params = utils.normalizeParameters({
        clusterName: [clusterName, options.clusterName],
        storageAccountName: [storageAccountName, options.storageAccountName],
        storageAccountKey: [storageAccountKey, options.storageAccountKey],
        storageContainer: [storageContainer, options.storageContainer],
        nodes: [nodes, options.nodes],
        location: [location, options.location],
        username: [username, options.username],
        clusterPassword: [clusterPassword, options.clusterPassword]
      });

      if (params.err) { throw params.err; }

      clusterName = self.promptIfNotGiven('Cluster name: ', params.values.clusterName, _);
      storageAccountName = self.promptIfNotGiven('Storage acount name: ', params.values.storageAccountName, _);
      storageAccountKey = self.promptIfNotGiven('Storage account key: ', params.values.storageAccountKey, _);
      storageContainer = self.promptIfNotGiven('Storage container: ', params.values.storageContainer, _);
      nodes = self.promptIfNotGiven('Nodes: ', params.values.nodes, _);
      location = self.promptIfNotGiven('Location: ', params.values.location, _);
      username = self.promptIfNotGiven('Username: ', params.values.username, _);
      clusterPassword = self.promptIfNotGiven('Password: ', params.values.clusterPassword, _);

      var creationObject = {
        // the following are required fields
        name: clusterName,
        location: location,
        defaultStorageAccountName: storageAccountName,
        defaultStorageAccountKey: storageAccountKey,
        defaultStorageContainer: storageContainer,
        user: username,
        password: clusterPassword,
        nodes: parseInt(nodes, 10) // The number of nodes to use
      };

      self.startProgress('Creating HDInsight Cluster');
      var existing = self.getCluster(clusterName, options.subscription, _);
      if (existing) {
        self.endProgress();
        self.logErrorAndData('The requested cluster already exists.', existing);
        return;
      }

      self.processCreateCluster(creationObject, options.subscription, _);
      var cluster = self.getCluster(creationObject.name, options.subscription, _);
      self.endProgress();
      if (cluster.Error && cluster.Error != 'None') {
        self.logErrorAndData('Unable to create cluster.', cluster);
        return;
      }
      if (!cluster) {
        self.logError('The cluster could not be created');
        self.logError('The request failed. Please contact support for more information.');
        return;
      }
      else {
        self.logData(cluster);
      }
    });

  cluster.command('delete [clusterName]')
    .description('Delete a cluster')
    .usage('<clusterName> [options]')
    .option('--clusterName <clusterName>', 'The HdInsight cluster name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (clusterName, options, _) {
      var params = utils.normalizeParameters({
        clusterName: [clusterName, options.clusterName]
      });

      if (params.err) { throw params.err; }

      clusterName = self.promptIfNotGiven('Cluster name: ', params.values.clusterName, _);

      self.startProgress('Removing HDInsight Cluster');
      self.deleteCluster(clusterName, options.subscriptionId, _);
      self.endProgress();
    });

  cluster.command('show [clusterName]')
    .description('Display cluster details')
    .usage('<clusterName> [options]')
    .option('--clusterName <clusterName>', 'The HdInsight cluster name')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (clusterName, options, _) {
      var params = utils.normalizeParameters({
        clusterName: [clusterName, options.clusterName]
      });

      if (params.err) { throw params.err; }

      clusterName = self.promptIfNotGiven('Cluster name: ', params.values.clusterName, _);
      self.startProgress('Getting HDInsight Cluster');
      var cluster = self.getCluster(clusterName, options.subscription, _);
      self.endProgress();

      if (!cluster) {
        self.logError('Cluster not found');
      }
      else {
        self.logData(cluster);
      }
    });

  cluster.command('list')
    .description('Get the list of clusters')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      self.startProgress('Listing HDInsight Servers');
      var result = self.listClusters(options.subscription, _);
      self.endProgress();

      self.logList(result.body.clusters);
    });
};