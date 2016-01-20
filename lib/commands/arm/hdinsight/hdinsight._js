//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

'use strict';

var fs = require('fs');
var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var HdiClient = require('./hdiClient');

var $ = utils.getLocaleString;

var UserInteractor = function(cli) {
  var self = this;
  this.cli = cli;
  this.log = cli.output;
  this.progress = null;

  function logErrorAndData(err, data) {
    self.cli.interaction.formatOutput(data, function(outputData) {
      self.log.error(err);
      self.cli.interaction.logEachData('HDInsight Cluster', outputData);
    });
  }

  this.logErrorAndData = logErrorAndData;

  this.checkpoint = function() {};

  function logError(err) {
    self.cli.interaction.formatOutput(err, function() {
      self.log.error(err);
    });
  }

  this.logError = logError;

  function logData(msg, data) {
    self.cli.interaction.formatOutput(data, function(outputData) {
      self.cli.interaction.logEachData(msg, outputData);
    });
  }

  this.logData = logData;

  function logList(list) {
    self.cli.interaction.formatOutput(list, function(outputData) {
      if (outputData.length === 0) {
        self.log.info('No HDInsight clusters exist');
      } else {
        self.log.table(list, function(row, item) {
          row.cell('Name', item.Name);
          row.cell('Location', item.Location);
          row.cell('State', item.State);
        });
      }
    });
  }

  this.logList = logList;

  function promptIfNotGiven(message, value, _) {
    return self.cli.interaction.promptIfNotGiven(message, value, _);
  }

  this.promptIfNotGiven = promptIfNotGiven;

  function startProgress(message) {
    self.progress = self.cli.interaction.progress(message);
  }

  this.startProgress = startProgress;

  function endProgress() {
    self.progress.end();
  }

  this.endProgress = endProgress;

  function writeConfig(filePath, config) {
    var data = JSON.stringify(config);
    fs.writeFileSync(filePath, data);
  }

  this.writeConfig = writeConfig;

  function readConfig(filePath) {
    var data = fs.readFileSync(filePath);
    return JSON.parse(data);
  }

  this.readConfig = readConfig;

  function logClusterOperationInfo(result) {

    if (result === null || result === undefined) {
      self.log.info('Cluster not found.');
    } else {
      if (self.log.format().json) {
        self.log.json(result);
      } else {
        self.log.data($('Operation Info '));
        self.log.data($('---------------'));
        self.log.data($('Operation status: '), result.status);
        self.log.data($('Operation ID: '), result.requestId);
      }
    }
  }

  this.logClusterOperationInfo = logClusterOperationInfo;
};

var ExecutionProcessor = function(cli) {
  var self = this;
  this.cli = cli;
  this.errorCount = 0;

  this.createHdiClient = function(cli, subscription) {
    return new HdiClient(cli, subscription);
  };

  this.createCluster = function(resourceGroupName, clusterName, createParams, options, _) {
    var hdInsight = this.createHdiClient(cli, options.subscription);
    var result = hdInsight.createCluster(resourceGroupName, clusterName, createParams, _);
    return result;
  };

  this.getCluster = function(resourceGroupName, clusterName, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.getCluster(resourceGroupName, clusterName, _);
    return result;
  };

  this.deleteCluster = function(resourceGroupName, clusterName, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.deleteCluster(resourceGroupName, clusterName, _);
    return result;
  };

  this.listClusters = function(resourceGroupName, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.listClusters(resourceGroupName, _);
    return result;
  };

  this.resizeCluster = function(resourceGroupName, clusterName, targetInstanceCount, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.resizeCluster(resourceGroupName, clusterName, targetInstanceCount, _);
    return result;
  };

  this.enableHttp = function(resourceGroupName, clusterName, userName, password, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.enableHttp(resourceGroupName, clusterName, userName, password, _);
    return result;
  };

  this.disableHttp = function(resourceGroupName, clusterName, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.disableHttp(resourceGroupName, clusterName, _);
    return result;
  };

  this.enableRdp = function(resourceGroupName, clusterName, rdpUserName, rdpPassword, rdpExpiryDate, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.enableRdp(resourceGroupName, clusterName, rdpUserName, rdpPassword, rdpExpiryDate, _);
    return result;
  };

  this.disableRdp = function(resourceGroupName, clusterName, options, _) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.disableRdp(resourceGroupName, clusterName, _);
    return result;
  };

  this.createConfigFile = function(configFilePath, options) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.createConfigFile(configFilePath, options);
    return result;
  };

  this.addConfigValue = function(configFilePath, options) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.addConfigValue(configFilePath, options);
    return result;
  };

  this.addScriptAction = function(configFilePath, options) {
    var hdInsight = self.createHdiClient(cli, options.subscription);
    var result = hdInsight.addScriptAction(configFilePath, options);
    return result;
  };
};

var hdInsightCommandLine = function(cli, userInteractor, executionProcessor) {
  this.cli = cli;
  this.log = cli.output;
  var self = this;
  if (userInteractor) {
    this.user = userInteractor;
  } else {
    this.user = new UserInteractor(this.cli);
  }

  if (executionProcessor) {
    this.processor = executionProcessor;
  } else {
    this.processor = new ExecutionProcessor(this.cli);
  }

  this.createClusterCommand = function(clusterName, options, _) {

    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);
    options.osType = self.user.promptIfNotGiven($('OS type: '), options.osType, _);
    options.location = self.user.promptIfNotGiven($('Data center location: '), options.location, _);
    options.defaultStorageAccountName = self.user.promptIfNotGiven($('storage account url: '), options.defaultStorageAccountName, _);
    options.defaultStorageAccountKey = self.user.promptIfNotGiven($('storage account key: '), options.defaultStorageAccountKey, _);
    options.defaultStorageContainer = self.user.promptIfNotGiven($('storage container name: '), options.defaultStorageContainer, _);
    options.workerNodeCount = self.user.promptIfNotGiven($('Number of worker nodes: '), options.workerNodeCount, _);
    options.userName = self.user.promptIfNotGiven($('User name: '), options.userName, _);
    options.password = self.user.promptIfNotGiven($('Password: '), options.password, _);

    // Set defaults
    if (utils.stringIsNullOrEmpty(options.osType)) {
      options.osType = 'Windows';
    }

    if (utils.stringIsNullOrEmpty(options.version)) {
      options.version = 'default';
    }

    if (utils.ignoreCaseEquals(options.osType, 'windows')) {
      options.headNodeSize = self.user.promptIfNotGiven($('Head node size (string): '), options.headNodeSize, _);
      options.workerNodeSize = self.user.promptIfNotGiven($('Data node size (string): '), options.workerNodeSize, _);

    } else if (utils.ignoreCaseEquals(options.osType, 'linux')) {
      options.sshUserName = self.user.promptIfNotGiven($('SSH user name: '), options.sshUserName, _);
      options.sshPassword = self.user.promptIfNotGiven($('SSH password: '), options.sshPassword, _);
    }

    if (!utils.stringIsNullOrEmpty(options.additionalStorageAccounts)) {
      var additionalStorageAccountsList = [];
      options.additionalStorageAccounts.split(';').forEach(function(account) {
        var kvp = account.split('#');
        var item = {
          key: kvp[0],
          value: kvp[1]
        };
        additionalStorageAccountsList.push(item);
      });
      options.additionalStorageAccounts = additionalStorageAccountsList;
    }

    if (!utils.stringIsNullOrEmpty(options.hiveMetastoreServerName) || !utils.stringIsNullOrEmpty(options.hiveMetastoreDatabaseName) || !utils.stringIsNullOrEmpty(options.hiveMetastoreUserName) || !utils.stringIsNullOrEmpty(options.hiveMetastorePassword)) {
      options.hiveMetastoreServerName = self.user.promptIfNotGiven($('Hive metastore Server name: '), options.hiveMetastoreServerName, _);
      options.hiveMetastoreDatabaseName = self.user.promptIfNotGiven($('Hive metastore database name: '), options.hiveMetastoreDatabaseName, _);
      options.hiveMetastoreUserName = self.user.promptIfNotGiven($('Hive metastore database username: '), options.hiveMetastoreUserName, _);
      options.hiveMetastorePassword = self.user.promptIfNotGiven($('Hive metastore database password: '), options.hiveMetastorePassword, _);

      options.hiveMetastore = {
        server: options.hiveMetastoreServerName,
        database: options.hiveMetastoreDatabaseName,
        user: options.hiveMetastoreUserName,
        password: options.hiveMetastorePassword
      };
    }

    if (!utils.stringIsNullOrEmpty(options.oozieMetastoreServerName) || !utils.stringIsNullOrEmpty(options.oozieMetastoreDatabaseName) || !utils.stringIsNullOrEmpty(options.oozieMetastoreUserName) || !utils.stringIsNullOrEmpty(options.oozieMetastorePassword)) {
      options.oozieMetastoreServerName = self.user.promptIfNotGiven($('Oozie metastore Server name: '), options.oozieMetastoreServerName, _);
      options.oozieMetastoreDatabaseName = self.user.promptIfNotGiven($('Oozie metastore database name: '), options.oozieMetastoreDatabaseName, _);
      options.oozieMetastoreUserName = self.user.promptIfNotGiven($('Oozie metastore database username: '), options.oozieMetastoreUserName, _);
      options.oozieMetastorePassword = self.user.promptIfNotGiven($('Oozie metastore database password: '), options.oozieMetastorePassword, _);

      options.oozieMetastore = {
        server: options.oozieMetastoreServerName,
        database: options.oozieMetastoreDatabaseName,
        user: options.oozieMetastoreUserName,
        password: options.oozieMetastorePassword
      };
    }

    if (!utils.stringIsNullOrEmpty(options.configurationPath)) {
      var configurationsFileContent = self.user.readConfig(options.configurationPath);
      options.configurations = configurationsFileContent['configurations'];
      options.scriptActions = configurationsFileContent['scriptActions'];
    }

    self.user.startProgress($('Submitting the request to create cluster...'));

    var clusterCreateParameters = {
      location: options.location,
      defaultStorageAccountName: options.defaultStorageAccountName,
      defaultStorageAccountKey: options.defaultStorageAccountKey,
      defaultStorageContainer: options.defaultStorageContainer,
      userName: options.userName,
      password: options.password,
      rdpUserName: options.rdpUserName,
      rdpPassword: options.rdpPassword,
      rdpAccessExpiry: options.rdpAccessExpiry,
      clusterSizeInNodes: options.workerNodeCount,
      version: options.version,
      headNodeSize: options.headNodeSize,
      workerNodeSize: options.workerNodeSize,
      zookeeperNodeSize: options.zookeeperNodeSize,
      clusterType: options.clusterType,
      virtualNetworkId: options.virtualNetworkId,
      subnetName: options.subnetName,
      osType: options.osType,
      sshUserName: options.sshUserName,
      sshPassword: options.sshPassword,
      sshPublicKey: options.sshPublicKey,
      oozieMetastore: options.oozieMetastore,
      hiveMetastore: options.hiveMetastore,
      additionalStorageAccounts: options.additionalStorageAccounts,
      configurations: options.configurations,
      scriptActions: options.scriptActions
    };

    var result = self.processor.createCluster(options.resourceGroup, clusterName, clusterCreateParameters, options, _);
    self.user.endProgress();

    if (self.log.format().json) {
      self.log.json(result);
    } else {

      if (result !== null && result !== undefined) {
        self.log.data($('Cluster ID  :'), result.id);
        self.log.data($('Status      :'), result.status);
      } else {
        self.log.data($('Cluster creation response is empty.'));
      }
    }
  };

  this.showClusterCommand = function(clusterName, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);

    self.user.startProgress($('Getting HDInsight cluster details'));

    var result = self.processor.getCluster(options.resourceGroup, clusterName, options, _);

    var cluster = null;
    if (result !== null && result !== undefined) {
      cluster = result.cluster;
    }
    self.user.endProgress();

    if (cluster === undefined || cluster === null) {
      self.log.data($('Cluster could not be found.'));
    } else {
      var clusterInfo = cluster;
      if (self.log.format().json) {
        self.log.json(clusterInfo);
      } else {
        self.log.data($('HDInsight Cluster Info'));
        self.log.data($('----------------------'));
        self.log.data($('Name          :'), clusterInfo.id || clusterInfo.dnsName);
        self.log.data($('State         :'), clusterInfo.state);
        self.log.data($('Location      :'), clusterInfo.location);
        self.log.data($('Version       :'), clusterInfo.version || clusterInfo.hdiVersion);
      }
    }
  };

  this.listClustersCommand = function(options, _) {
    self.user.startProgress($('Getting HDInsight servers'));
    var result = self.processor.listClusters(options.resourceGroup, options, _);
    self.user.endProgress();

    if (result.length === 0) {
      self.log.data($('No clusters found.'));
    } else if (self.log.format().json) {
      self.log.json(result);
    } else {
//construct the object to display
      var clusters = [];
      result.clusters.forEach(function(c) {
          var cluster = {};
          cluster.eTag = c.eTag;
          cluster.id = c.id;
          cluster.location = c.location;
          cluster.name = c.name;
          cluster.clusterState = c.properties.clusterState;
          cluster.clusterVersion = c.properties.clusterVersion;
          cluster.createdDate = c.properties.createdDate;
          cluster.osType = c.properties.operatingSystemType;
          cluster.provisioningState = c.properties.provisioningState;
          clusters.push(cluster);
        }
      );
      self.cli.interaction.formatOutput(clusters, function(outputData) {
        self.log.table(outputData, function(row, item) {
          row.cell('Name', item.name);
          row.cell('ETag', item.eTag);
          row.cell('ID', item.id);
          row.cell('State', item.clusterState);
          row.cell('ProvisioningState', item.provisioningState);
          row.cell('CreatedDate', item.createdDate);
          row.cell('Location', item.location);
          row.cell('Version', item.clusterVersion);
          row.cell('OsType', item.osType || 'Windows Server 2012');
        });
      });
    }
  };

  this.deleteClusterCommand = function(clusterName, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);

    self.user.startProgress($('Deleting HDInsight Cluster'));

    self.processor.deleteCluster(options.resourceGroup, clusterName, options, _);

    self.user.endProgress();
  };

  this.resizeClusterCommand = function(clusterName, targetInstanceCount, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);
    options.targetInstanceCount = self.user.promptIfNotGiven($('TargetInstanceCount: '), clusterName, _);
    self.user.startProgress($('Resizing HDInsight Cluster'));

    var result = self.processor.resizeCluster(options.resourceGroup, clusterName, targetInstanceCount, options, _);

    self.user.logClusterOperationInfo(result);

    self.user.endProgress();
  };

  this.enableHttpAccessCommand = function(clusterName, userName, password, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);
    userName = self.user.promptIfNotGiven($('Http username: '), userName, _);
    password = self.user.promptIfNotGiven($('Http password: '), password, _);

    self.user.startProgress($('Enabling HTTP access for HDInsight cluster'));

    var result = self.processor.enableHttp(options.resourceGroup, clusterName, userName, password, options, _);

    self.user.endProgress();

    self.user.logClusterOperationInfo(result);

  };

  this.disableHttpAccessCommand = function(clusterName, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);

    self.user.startProgress($('Disabling HTTP access for HDInsight cluster'));

    var result = self.processor.disableHttp(options.resourceGroup, clusterName, options, _);

    self.user.endProgress();

    self.user.logClusterOperationInfo(result);

  };

  this.enableRdpAccessCommand = function(clusterName, rdpUserName, rdpPassword, rdpExpiryDate, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);
    rdpUserName = self.user.promptIfNotGiven($('RDP username: '), rdpUserName, _);
    rdpPassword = self.user.promptIfNotGiven($('RDP password: '), rdpPassword, _);
    rdpExpiryDate = self.user.promptIfNotGiven($('RDP expiry date: '), rdpExpiryDate, _);

    var rdpAccessExpiryDate = new Date();
    var parsedExpiryDate = Date.parse(rdpExpiryDate);
    if (__.isNaN(parsedExpiryDate)) {
      throw new Error(util.format($('%s parameter is not a valid Date \"%s\"'), 'rdpExpiryDate', rdpExpiryDate));
    }
    rdpAccessExpiryDate = new Date(parsedExpiryDate);

    self.user.startProgress($('Enabling RDP access for HDInsight cluster'));

    var result = self.processor.enableRdp(options.resourceGroup, clusterName, rdpUserName, rdpPassword, rdpAccessExpiryDate, options, _);

    self.user.endProgress();

    self.user.logClusterOperationInfo(result);
  };

  this.disableRdpAccessCommand = function(clusterName, options, _) {
    options.resourceGroup = self.user.promptIfNotGiven($('Resource Group name: '), options.resourceGroup, _);
    clusterName = self.user.promptIfNotGiven($('Cluster name: '), clusterName, _);

    self.user.startProgress($('Disabling RDP access for HDInsight cluster'));

    var result = self.processor.disableRdp(options.resourceGroup, clusterName, options, _);

    self.user.endProgress();

    self.user.logClusterOperationInfo(result);
  };

  this.createClusterConfigCommand = function(configFilePath, options, _) {
    configFilePath = self.user.promptIfNotGiven($('Config file path: '), configFilePath, _);

    if (fs.existsSync(configFilePath)) {
      if (!options.overwrite) {
        self.user.logError($('File already exists. Choose overwrite option to overwrite the file.'));
      } else {
        self.user.logData($('File already exists and overwrite option is specified. Overwriting file.'));
        self.processor.createConfigFile(configFilePath);
      }
    } else {
      self.user.startProgress($('Creates a new HDInsight cluster config file.'));
      self.processor.createConfigFile(configFilePath);
    }
  };

  this.addConfigValue = function(configFilePath, options, _) {
    configFilePath = self.user.promptIfNotGiven($('Config file path: '), configFilePath, _);

    if (!fs.existsSync(configFilePath)) {
      self.user.logError($('Config file does not exist'));
    } else {
      self.user.startProgress($('Adding config value to HDInsight cluster config file.'));
      self.processor.addConfigValue(configFilePath, options);
    }
    self.user.endProgress();
  };

  this.addScriptAction = function(configFilePath, options, _) {
    configFilePath = self.user.promptIfNotGiven($('Config file path: '), configFilePath, _);
    options.nodeType = self.user.promptIfNotGiven($('Node type (Example: HeadNode, WorkerNode, ZookeeperNode): '), options.nodeType, _);
    options.name = self.user.promptIfNotGiven($('Name: '), options.name, _);
    options.uri = self.user.promptIfNotGiven($('Uri: '), options.uri, _);
    options.parameters = self.user.promptIfNotGiven($('Parameters: '), options.parameters, _);

    if (!fs.existsSync(configFilePath)) {
      self.user.logError($('Config file does not exist'));
    } else {
      self.user.startProgress($('Adding script action to HDInsight cluster config file.'));
      self.processor.addScriptAction(configFilePath, options);
    }

    self.user.endProgress();
  };
};

module.exports = hdInsightCommandLine;

hdInsightCommandLine.init = function(cli) {
  var self = new hdInsightCommandLine(cli);

  var hdInsight = cli.category('hdinsight')
    .description($('Commands to manage HDInsight clusters and jobs'));

  var cluster = hdInsight.category('cluster')
    .description($('Commands to manage HDInsight clusters'));

  cluster.command('create [clusterName]')
    .description($('Create a cluster in a resource group'))
    .usage('[options] <clusterName>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('-l, --location <location>', $('Data center location for the cluster'))
    .option('-y, --osType <osType>', $('HDInsight cluster operating system - \'Windows\' or \'Linux\''))
    .option('--version <version>', $('HDInsight cluster version'))
    .option('--clusterType <clusterType>', $('HDInsight cluster type. Hadoop | HBase | Spark | Storm'))
    .option('--defaultStorageAccountName <storageAccountName>', $('Storage account url to use for default HDInsight storage'))
    .option('--defaultStorageAccountKey <storageAccountKey>', $('Key to the storage account to use for default HDInsight storage'))
    .option('--defaultStorageContainer <storageContainer>', $('Container in the storage account to use for HDInsight default storage'))
    .option('--headNodeSize <headNodeSize>', $('(Optional) Head node size for the cluster'))
    .option('--workerNodeCount <workerNodeCount>', $('Number of worker nodes to use for the cluster'))
    .option('--workerNodeSize <workerNodeSize>', $('(Optional) Worker node size for the cluster)'))
    .option('--zookeeperNodeSize <zookeeperNodeSize>', $('(Optional) Zookeeper node size for the cluster'))
    .option('--userName <userName>', $('Cluster username'))
    .option('--password <password>', $('Cluster password'))
    .option('--sshUserName <sshUserName>', $('SSH username (only for Linux clusters)'))
    .option('--sshPassword <sshPassword>', $('SSH password (only for Linux clusters)'))
    .option('--sshPublicKey <sshPublicKey>', $('SSH public key (only for Linux clusters)'))
    .option('--rdpUserName <rdpUserName>', $('RDP username (only for Windows clusters)'))
    .option('--rdpPassword <rdpPassword>', $('RDP password (only for Windows clusters)'))
    .option('--rdpAccessExpiry <rdpAccessExpiry>', $('RDP access expiry. For example 12/12/2015 (only for Windows clusters)'))
    .option('--virtualNetworkId <virtualNetworkId>', $('(Optional) Virtual network ID for the cluster. ' +
      'Value is a GUID for Windows cluster and ARM resource ID for Linux cluster) '))
    .option('--subnetName <subnetName>', $('(Optional) Subnet for the cluster'))
    .option('--additionalStorageAccounts <additionalStorageAccounts>', $('(Optional) Additional storage accounts. Can be multiple. ' +
      'In the format of \'accountName#accountKey\'. For example, --additionalStorageAccounts "acc1#key1;acc2#key2"'))
    .option('--hiveMetastoreServerName <hiveMetastoreServerName>', $('(Optional) SQL Server name for the external metastore for Hive'))
    .option('--hiveMetastoreDatabaseName <hiveMetastoreDatabaseName>', $('(Optional) Database name for the external metastore for Hive'))
    .option('--hiveMetastoreUserName <hiveMetastoreUserName>', $('(Optional) Database username for the external metastore for Hive'))
    .option('--hiveMetastorePassword <hiveMetastorePassword>', $('(Optional) Database password for the external metastore for Hive'))
    .option('--oozieMetastoreServerName <oozieMetastoreServerName>', $('(Optional) SQL Server name for the external metastore for Oozie'))
    .option('--oozieMetastoreDatabaseName <oozieMetastoreDatabaseName>', $('(Optional) Database name for the external metastore for Oozie'))
    .option('--oozieMetastoreUserName <oozieMetastoreUserName>', $('(Optional) Database username for the external metastore for Oozie'))
    .option('--oozieMetastorePassword <oozieMetastorePassword>', $('(Optional) Database password for the external metastore for Oozie'))
    .option('--configurationPath <configurationPath>', $('(Optional) HDInsight cluster configuration file path'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .option('--tags <tags>', $('Tags to set to the cluster. Can be multiple. ' +
      'In the format of \'name=value\'. Name is required and value is optional. For example, --tags tag1=value1;tag2'))
    .execute(function(clusterName, options, _) {
      self.createClusterCommand(clusterName, options, _);
    });

  cluster.command('delete [clusterName]')
    .description($('Delete a cluster'))
    .usage('[options] <clusterName>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('--clusterName <clusterName>', $('Cluster name'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, options, _) {
      self.deleteClusterCommand(clusterName, options, _);
    });

  cluster.command('show [clusterName]')
    .description($('Show cluster details'))
    .usage('[options] <clusterName>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, options, _) {
      self.showClusterCommand(clusterName, options, _);
    });

  cluster.command('list')
    .description($('List all the clusters (in a specific resource group if provided) .'))
    .usage('[options]')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(options, _) {
      self.listClustersCommand(options, _);
    });

  cluster.command('resize [clusterName] [targetInstanceCount]')
    .description($('Resizes the cluster'))
    .usage('[options] <clusterName> <targetInstanceCount>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('--targetInstanceCount <targetInstanceCount>', $('Target instance count.'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, targetInstanceCount, options, _) {
      self.resizeClusterCommand(clusterName, targetInstanceCount, options, _);
    });

  cluster.command('enable-http-access [clusterName] [userName] [password]')
    .description($('Enable HTTP access for cluster'))
    .usage('[options] <clusterName> <userName> <password>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('--userName <userName>', $('Cluster username'))
    .option('--password <password>', $('Cluster password'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, userName, password, options, _) {
      self.enableHttpAccessCommand(clusterName, userName, password, options, _);
    });

  cluster.command('disable-http-access [clusterName]')
    .description($('Disable HTTP access for cluster'))
    .usage('[options] <clusterName>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, options, _) {
      self.disableHttpAccessCommand(clusterName, options, _);
    });

  cluster.command('enable-rdp-access [clusterName] [rdpUserName] [rdpPassword] [rdpExpiryDate]')
    .description($('Enable RDP access for cluster'))
    .usage('[options] <clusterName> <rdpUserName> <rdpPassword> <rdpExpiryDate>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('--rdpUserName <rdpUserName>', $('RDP username'))
    .option('--rdpPassword <rdpPassword>', $('RDP password'))
    .option('--rdpExpiryDate <rdpExpiryDate>', $('RDP access expiry date'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, rdpUserName, rdpPassword, rdpExpiryDate, options, _) {
      self.enableRdpAccessCommand(clusterName, rdpUserName, rdpPassword, rdpExpiryDate, options, _);
    });

  cluster.command('disable-rdp-access [clusterName]')
    .description($('Disable HTTP access for cluster'))
    .usage('[options] <clusterName>')
    .option('-g --resource-group <resource-group>', $('The name of the resource group'))
    .option('-c, --clusterName <clusterName>', $('HDInsight cluster name'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(clusterName, options, _) {
      self.disableRdpAccessCommand(clusterName, options, _);
    });

  var config = hdInsight.category('config')
    .description($('Commands to manage HDInsight cluster configuration'));

  config.command('create [configFilePath]')
    .description($('Creates a persisted Azure HDInsight cluster configuration file.'))
    .usage('[options] <configFilePath> <overwrite>')
    .option('--configFilePath <configFilePath>', $('HdInsight configuration file path'))
    .option('--overwrite <overwrite>', $('Overwrites existing configuration file'))
    .execute(function(configFilePath, options, _) {
      self.createClusterConfigCommand(configFilePath, options, _);
    });

  config.command('add-config-values [configFilePath]')
    .description($('Adds a Hadoop configuration value customization or a Hive shared library customization to an HDInsight cluster configuration. Each component config is in the format of \'name=value\'. For example, parameter1=value1;parameter2=value2'))
    .usage('[options] <configFilePath>')
    .option('--configFilePath <configFilePath>', $('Configuration file path'))
    .option('--core-site <core-site>', $('Config values in the format of \'name=value\''))
    .option('--hive-site <hive-site>', $('Config values in the format of \'name=value\''))
    .option('--hive-env <hive-env>', $('Config values in the format of \'name=value\''))
    .option('--hdfs-site <hdfs-site>', $('Config values in the format of \'name=value\''))
    .option('--hbase-env <hbase-env>', $('Config values in the format of \'name=value\''))
    .option('--hbase-site <hbase-site>', $('Config values in the format of \'name=value\''))
    .option('--mapred-site <mapred-site>', $('Config values in the format of \'name=value\''))
    .option('--oozie-env <oozie-env>', $('Config values in the format of \'name=value\''))
    .option('--oozie-site <oozie-site>', $('Config values in the format of \'name=value\''))
    .option('--storm-site <storm-site>', $('Config values in the format of \'name=value\''))
    .option('--tez-site <tez-site>', $('Config values in the format of \'name=value\''))
    .option('--webhcat-site <webhcat-site>', $('Config values in the format of \'name=value\''))
    .option('--gateway <gateway>', $('Config values in the format of \'name=value\''))
    .option('--yarn <yarn>', $('Config values in the format of \'name=value\''))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(configFilePath, options, _) {
      self.addConfigValue(configFilePath, options, _);
    });

  config.command('add-script-action [configFilePath]')
    .description($('Adds a HDInsight script action.'))
    .usage('[options] <configFilePath>')
    .option('--configFilePath <configFilePath>', $('Configuration file path'))
    .option('--nodeType <nodeType>', $('Specifies the node on which this cmdlet applies the action. Supported node types: HeadNode | WorkerNode | ZookeeperNode'))
    .option('--uri <uri>', $('Specifies the URI for the action'))
    .option('--name <name>', $('Specifies the name of the action'))
    .option('--parameters <parameters>', $('Specifies the parameters for the action'))
    .option('-s, --subscription <id>', $('The subscription id'))
    .execute(function(configFilePath, options, _) {
      self.addScriptAction(configFilePath, options, _);
    });
};