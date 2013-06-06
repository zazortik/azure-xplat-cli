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

var utils = require('../utils');
var interaction = require('../util/interaction');

var allowAzureRuleName = 'AllowAllWindowsAzureIps';
var allowAzureRuleIp = '0.0.0.0';

exports.init = function (cli) {
  var log = cli.output;

  var hdInsight = cli.category('hdinsight')
    .description('Commands to manage your HDInsight accounts');

  var cluster = hdInsight.category('cluster')
    .description('Commands to manage your HDInsight clusters');

  cluster.command('create')
    .description('Create a new cluster')
    .execute(function () {
    });

  function promptIfNotGiven(message, value, _) {
    return interaction.promptIfNotGiven(cli, message, value, _);
  }

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

      clusterName = promptIfNotGiven("Cluster name: ", params.values.clusterName, _);

      var progress = cli.progress('Removing HDInsight Cluster');
      var hdInsight = createHDInsightManagementService(options.subscription);
      hdInsight.deleteCluster(_);
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

      clusterName = promptIfNotGiven("Cluster name: ", params.values.clusterName, _);

      var progress = cli.progress('Getting HDInsight Cluster');
      var result = listClusters(options, _);
      progress.end();

      var cluster = result.clusters.filter(function (cluster) {
        return utils.ignoreCaseEquals(cluster.Name, clusterName);
      })[0];

      interaction.formatOutput(cli, cluster, function(outputData) {
        if(!outputData) {
          log.error('Cluster not found');
        } else {
          interaction.logEachData(cli, 'HDInsight Cluster', cluster);
        }
      });
    });  

  cluster.command('list')
    .description('Get the list of clusters')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var progress = cli.progress('Listing HDInsight Servers');
      var result = listClusters(options, _);
      progress.end();

      interaction.formatOutput(cli, result.clusters, function(outputData) {
        if(outputData.length === 0) {
          log.info('No HDInsight clusters exist');
        } else {
          log.table(result.clusters, function (row, item) {
            row.cell('Name', item.Name);
            row.cell('Location', item.Location);
          });
        }
      });
    });    

  // NOTE: This code will move to the SDK project (as a function of HDInsight service) 
  // with our next PR.
  function registerGeoLocation() {

  }

  // NOTE: This code will move to the SDK project (inside list clusters) with
  // it's next PR.
  function listClusters(options, _) {
    var hdInsight = createHDInsightManagementService(options.subscription);
    var result = hdInsight.listClusters(_);

    var cloudService = result.body.CloudServices.CloudService;
    var clusters = [];
    for (var i = 0; i < cloudService.length; i++) {
      if (cloudService[i].Name &&
          cloudService[i].Name.indexOf('hdinsight') === 0) {
        if (cloudService[i].Resources && cloudService[i].Resources.Resource) {
          if (!__.isArray(cloudService[i].Resources.Resource)) {
            cloudService[i].Resources.Resource = [ cloudService[i].Resources.Resource ];
          }

          var resource = cloudService[i].Resources.Resource;
          for (var j = 0; j < resource.length; j++) {
            if (resource[j].ResourceProviderNamespace == 'hdinsight') {
              var cluster = {
                Name : resource[j].Name,
                Location : cloudService[i].GeoRegion,
                State : resource[j].SubState
              }
              for (var k = 0; k < resource[j].OutputItems.OutputItem.length; k++) {
                var outputItem = resource[j].OutputItems.OutputItem[k];
                if (outputItem.Key === 'CreatedDate') {
                  cluster.CreatedDate = outputItem.Value;
                }
                if (outputItem.Key === 'NodesCount') {
                  cluster.Nodes = outputItem.Value;
                }
                if (outputItem.Key === 'ConnectionURL') {
                  cluster.ConnectionURL = outputItem.Value;
                }
                if (outputItem.Key === 'ClusterUsername') {
                  cluster.Username = outputItem.Value;
                }
              }
              clusters.push(cluster);
            }
          }
        }
      }
    }

    var response = {
      clusters : clusters
    }
    return response;
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

    // .usage('<administratorLogin> <administratorPassword> <location> [options]')
    // .option('--administratorLogin <administratorLogin>', 'The new administrator login')
    // .option('--administratorPassword <administratorPassword>', 'The new administrator password')
    // .option('--location <location>', 'The location')
    // .option('-s, --subscription <id>', 'use the subscription id')
    // .option('--defaultFirewallRule', 'Add a firewall rule allowing access from Windows Azure')
}