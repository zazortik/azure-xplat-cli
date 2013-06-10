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
var interaction = require('../util/interaction');

var allowAzureRuleName = 'AllowAllWindowsAzureIps';
var allowAzureRuleIp = '0.0.0.0';

exports.init = function (cli) {
  var log = cli.output;

  var hdInsight = cli.category('hdinsight')
    .description('Commands to manage your HDInsight accounts');

  var cluster = hdInsight.category('cluster')
    .description('Commands to manage your HDInsight clusters');

  function logErrorAndData(err, data) {
    interaction.formatOutput(cli, data, function(outputData) {
      log.error(err);
      interaction.logEachData(cli, 'HDInsight Cluster', data);
    });
  }

  function logError(err) {
    interaction.formatOutput(cli, cluster, function(outputData) {
      log.error(err);
    });
  }

  function logData(data) {
    interaction.formatOutput(cli, data, function(outputData) {
      interaction.logEachData(cli, 'HDInsight Cluster', data);
    });
  }

  function logList(list) {
    interaction.formatOutput(cli, list, function(outputData) {
      if(outputData.length === 0) {
        log.info('No HDInsight clusters exist');
      } else {
        log.table(list, function (row, item) {
          row.cell('Name', item.Name);
          row.cell('Location', item.Location);
          row.cell('State', item.State);
        });
      }
    });
  }

  function doPollRequest(operation, validation, callback) {
    var _callback = function(err, response) {
      if (!validation(err, response)) {
        setTimeout(function () {
          doPollRequest(operation, validation, callback);
        }, 5);
      }
      else {
        callback(err, response);
      }
    };
    operation(_callback);
  }

  function processCreateCluster(creationObject, options, callback) {
    var errors = 0;
    var hdInsight = createHDInsightManagementService(options.subscription);
    hdInsight.createCluster(creationObject, function(err, result) {
      if (result.statusCode === 200 || result.statusCode === 202) {
        // poll for the cluster until it's creation is accnowledged.      
        doPollRequest(function(callback) {
          // list the clusters
          hdInsight.listClusters(callback);
        }, function (err, response) {
          if (errors > 25) {
            return true;
          }
          // enumerate through the clusters...
          if (!response || ! response.body || !response.body.clusters) {
            errors++;
            return true;
          }

          var results = response.body;
          clusters = results.clusters;
          for (var i = 0; i < clusters.length; i++) {
            var cluster = clusters[i];
            if (cluster.Name == creationObject.name) {
              // now check the cluster state.
              debugLog(cluster);
              if (cluster.State == 'Operational' || cluster.State == 'Running' || cluster.State == 'Error' || (cluster.Error && cluster.Error != 'None'))  {
                return true;
              }
              return false;
            }
          }
          errors++;
          return false;
        }, function (err, response) {
          callback(err, result);
        });
      }
      else {
        callback(err, result);
      }
    });
  }

  function debugLog(message) {
    // console.log(message);
  }

  function promptIfNotGiven(message, value, _) {
    return interaction.promptIfNotGiven(cli, message, value, _);
  }

  function createCluster(creationObject, subscriptionId, _) {
      var hdInsight = createHDInsightManagementService(subscriptionId);
      return hdInsight.createCluster(creationObject, _);
  }

  function getCluster(clusterName, subscriptionId, _) {
      var result = listClusters(subscriptionId, _);
      var cluster = result.clusters.filter(function (cluster) {
        return utils.ignoreCaseEquals(cluster.Name, clusterName);
      })[0];
      return cluster;
  }

  function deleteCluster(clusterName, subscriptionId, _) {
      var hdInsight = createHDInsightManagementService(subscriptionId);
      var cluster = getCluster(clusterName, subscriptionId, _);
      hdInsight.deleteCluster(clusterName, cluster.Location, _);
  }

  function listClusters(subscriptionId, _) {
    var hdInsight = createHDInsightManagementService(subscriptionId);
    var result = hdInsight.listClusters(_);

    return result.body;
  }

  function createHDInsightManagementService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return azure.createHDInsightService(subscriptionId, auth);
  }

  cluster.command('create [clusterName] [storageAccountName] [storageAccountKey] [storageContainer] [nodes] [location] [username] [clusterPassword]')
    .description('Create a new cluster')
    .usage('<clusterName> <storageAccountName> <storageAccountKey> <storageContainer> <nodes> <location> <username> <clusterPassword> [options]')
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

      clusterName = promptIfNotGiven('Cluster name: ', params.values.clusterName, _);
      storageAccountName = promptIfNotGiven('Storage acount name: ', params.values.storageAccountName, _);
      storageAccountKey = promptIfNotGiven('Storage account key: ', params.values.storageAccountKey, _);
      storageContainer = promptIfNotGiven('Storage container: ', params.values.storageContainer, _);
      nodes = promptIfNotGiven('Nodes: ', params.values.nodes, _);
      location = promptIfNotGiven('Location: ', params.values.location, _);
      username = promptIfNotGiven('Username: ', params.values.username, _);
      clusterPassword = promptIfNotGiven('Password: ', params.values.clusterPassword, _);

      var creationObject = {
        // the following are required fields
        name: clusterName,
        location: location,
        defaultStorageAccountName: storageAccountName,
        defaultStorageAccountKey: storageAccountKey,
        defaultStorageContainer: storageContainer,
        user: username,
        password: clusterPassword,
        nodes: parseInt(nodes) // The number of nodes to use
      }

      var progress = cli.progress('Creating HDInsight Cluster');
      var existing = getCluster(clusterName, options.subscription, _);
      if (existing) {
        progress.end();
        logErrorAndData('The requested cluster already exists.', existing);
        return;
      }
      var requestSubmited = processCreateCluster(creationObject, options, _);
      var cluster = getCluster(clusterName, options.subscription, _);
      progress.end();
      if (cluster.Error && cluster.Error != 'None') {
        logErrorAndData('Unable to create cluster.', cluster);
        return;
      }
      if (!cluster) {
        logError('The cluster could not be created');
        logError('The request failed. Please contact support for more information.');
        return;
      }
      else {
        logData(cluster);
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

      clusterName = promptIfNotGiven('Cluster name: ', params.values.clusterName, _);

      var progress = cli.progress('Removing HDInsight Cluster');
      deleteCluster(options.subscriptionId, _)
      progress.end();
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

      clusterName = promptIfNotGiven('Cluster name: ', params.values.clusterName, _);
      var progress = cli.progress('Getting HDInsight Cluster');
      var cluster = getCluster(clusterName, options.subscription, _)
      progress.end();

      if (!cluster) {
        logError('Cluster not found');
      }
      else {
        logData(cluster);
      }
    });  

  cluster.command('list')
    .description('Get the list of clusters')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var progress = cli.progress('Listing HDInsight Servers');
      var result = listClusters(options.subscription, _);
      progress.end();

      logList(result.clusters);
    });    
}