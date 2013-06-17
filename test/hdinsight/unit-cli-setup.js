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

var mocha = require('mocha');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

// Test includes
var testutil = require('../util/util');

var CliStub = require('./stub-cli.js');

// Lib includes
var util = testutil.libRequire('util/utils');
var hdInsightCli = require('../../lib/commands/hdinsight._js');

describe('HDInsight command line (under unit test)', function() {

  it('should define the correct categories', function(done) {
    var cli = new CliStub();
    should.exist(cli);
    hdInsightCli.init(cli);
    should.exist(cli.categories['hdinsight']);
    should.exist(cli.categories['hdinsight'].categories['cluster']);
    done();
  });

  it('should define the correct description for the hdinsight category', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    hdinsight = cli.categories['hdinsight'];
    hdinsight.description.firstCall.args[0].should.be.equal('Commands to manage your HDInsight accounts');
    done();
  });

  it('should define the correct description for the cluster category', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    cluster.description.firstCall.args[0].should.be.equal('Commands to manage your HDInsight clusters');
    done();
  });

  it('should define the correct commands for the cluster category', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    should.exist(cluster.commands['list']);
    should.exist(cluster.commands['show']);
    should.exist(cluster.commands['create']);
    should.exist(cluster.commands['delete']);
    done();
  });

  it('should define the correct positional arguments for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.positionalParams.should.be.equal('');
    done();
  });

  it('should define the correct description for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.description.firstCall.args[0].should.be.equal('Get the list of clusters');
    done();
  });

  it('should define the correct usage for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    should.not.exist(command.usage.firstCall);
    done();
  });

  it('should define the correct options for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.optionCount.should.be.equal(1);
    should.exist(command.options['-s, --subscription <id>']);
    command.options['-s, --subscription <id>'].should.be.equal('use the subscription id')
    done();
  });

  it('should define the correct positional arguments for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.positionalParams.should.be.equal('[clusterName]');
    done();
  });

  it('should define the correct description for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.description.firstCall.args[0].should.be.equal('Display cluster details');
    done();
  });

  it('should define the correct usage for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.usage.firstCall.args[0].should.be.equal('<clusterName> [options]');
    done();
  });

  it('should define the correct options for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.optionCount.should.be.equal(2);
    should.exist(command.options['-s, --subscription <id>']);
    command.options['-s, --subscription <id>'].should.be.equal('use the subscription id')
    should.exist(command.options['--clusterName <clusterName>']);
    command.options['--clusterName <clusterName>'].should.be.equal('The HdInsight cluster name')
    done();
  });

  it('should define the correct positional arguments for the delete command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.positionalParams.should.be.equal('[clusterName]');
    done();
  });

  it('should define the correct description for the delete command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.description.firstCall.args[0].should.be.equal('Delete a cluster');
    done();
  });

  it('should define the correct usage for the delete command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.usage.firstCall.args[0].should.be.equal('<clusterName> [options]');
    done();
  });

  it('should define the correct options for the delete command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.optionCount.should.be.equal(2);
    should.exist(command.options['-s, --subscription <id>']);
    command.options['-s, --subscription <id>'].should.be.equal('use the subscription id')
    should.exist(command.options['--clusterName <clusterName>']);
    command.options['--clusterName <clusterName>'].should.be.equal('The HdInsight cluster name')
    done();
  });

  it('should define the correct positional arguments for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.positionalParams.should.be.equal('[config]');
    done();
  });

  it('should define the correct description for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.description.firstCall.args[0].should.be.equal('Create a new cluster');
    done();
  });

  it('should define the correct usage for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.usage.firstCall.args[0].should.be.equal('[config] [options]');
    done();
  });

  it('should define the correct options for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.optionCount.should.be.equal(10);
    should.exist(command.options['--config <config>']);
    command.options['--config <config>'].should.be.equal('The config file for cluster creation');
    should.exist(command.options['-s, --subscription <id>']);
    command.options['-s, --subscription <id>'].should.be.equal('use the subscription id');
    should.exist(command.options['--clusterName <clusterName>']);
    command.options['--clusterName <clusterName>'].should.be.equal('The HdInsight cluster name');
    should.exist(command.options['--storageAccountName <storageAccountName>']);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('The Azure storage account to use for HDInsight storage');
    should.exist(command.options['--storageAccountKey <storageAccountKey>']);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('The key to the Azure storage account to use for HDInsight storage');
    should.exist(command.options['--storageContainer <storageContainer>']);
    command.options['--storageContainer <storageContainer>'].should.be.equal('The container in the Azure storage account to use for HDInsight default storage');
    should.exist(command.options['--nodes <nodes>']);
    command.options['--nodes <nodes>'].should.be.equal('The number of data nodes to use for the cluster');
    should.exist(command.options['--location <location>']);
    command.options['--location <location>'].should.be.equal('The Azure location for the cluster');
    should.exist(command.options['--username <username>']);
    command.options['--username <username>'].should.be.equal('The user name to use for the cluster');
    should.exist(command.options['--clusterPassword <clusterPassword>']);
    command.options['--clusterPassword <clusterPassword>'].should.be.equal('The password to use for the cluster');

    done();
  });

  it('should define the correct positional arguments for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.positionalParams.should.be.equal('[file]');
    done();
  });

  it('should define the correct description for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.description.firstCall.args[0].should.be.equal('Shows the contents of an HDInsight configuration file.');
    done();
  });

  it('should define the correct usage for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.usage.firstCall.args[0].should.be.equal('[file] [options]');
    done();
  });

  it('should define the correct options for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.optionCount.should.be.equal(1);
    should.exist(command.options['--file <path>']);
    command.options['--file <path>'].should.be.equal('The path to the config file for cluster creation');
    done();
  });

  it('should define the correct positional arguments for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.positionalParams.should.be.equal('[file]');
    done();
  });

  it('should define the correct description for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.description.firstCall.args[0].should.be.equal('Creates an HDInsight configuration file');
    done();
  });

  it('should define the correct usage for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.usage.firstCall.args[0].should.be.equal('[file] [options]');
    done();
  });

  it('should define the correct options for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.optionCount.should.be.equal(1);
    should.exist(command.options['--file <path>']);
    command.options['--file <path>'].should.be.equal('The path to the config file for cluster creation');
    done();
  });

  it('should define the correct positional arguments for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.positionalParams.should.be.equal('[file]');
    done();
  });

  it('should define the correct description for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.description.firstCall.args[0].should.be.equal('Sets the basic parameters for a cluster configuration.');
    done();
  });

  it('should define the correct usage for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.usage.firstCall.args[0].should.be.equal('[file] [options]');
    done();
  });

  it('should define the correct options for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.optionCount.should.be.equal(9);
    should.exist(command.options['--file <path>']);
    command.options['--file <path>'].should.be.equal('The path to the config file for cluster creation');
    should.exist(command.options['--clusterName <clusterName>']);
    command.options['--clusterName <clusterName>'].should.be.equal('The HdInsight cluster name');
    should.exist(command.options['--storageAccountName <storageAccountName>']);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('The Azure storage account to use for HDInsight storage');
    should.exist(command.options['--storageAccountKey <storageAccountKey>']);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('The key to the Azure storage account to use for HDInsight storage');
    should.exist(command.options['--storageContainer <storageContainer>']);
    command.options['--storageContainer <storageContainer>'].should.be.equal('The container in the Azure storage account to use for HDInsight default storage');
    should.exist(command.options['--nodes <nodes>']);
    command.options['--nodes <nodes>'].should.be.equal('The number of data nodes to use for the cluster');
    should.exist(command.options['--location <location>']);
    command.options['--location <location>'].should.be.equal('The Azure location for the cluster');
    should.exist(command.options['--username <username>']);
    command.options['--username <username>'].should.be.equal('The user name to use for the cluster');
    should.exist(command.options['--clusterPassword <clusterPassword>']);
    command.options['--clusterPassword <clusterPassword>'].should.be.equal('The password to use for the cluster');

    done();
  });

  it('should define the correct positional arguments for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.positionalParams.should.be.equal('[file] [storageAccountName] [storageAccountKey]');
    done();
  });

  it('should define the correct description for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.description.firstCall.args[0].should.be.equal('Adds a storage account to the cluster configuration.');
    done();
  });

  it('should define the correct usage for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.usage.firstCall.args[0].should.be.equal('[file] [storageAccountName] [storageAccountKey] [options]');
    done();
  });

  it('should define the correct options for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.optionCount.should.be.equal(2);
    should.exist(command.options['--storageAccountName <storageAccountName>']);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('The Azure storage account to use for HDInsight storage');
    should.exist(command.options['--storageAccountKey <storageAccountKey>']);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('The key to the Azure storage account to use for HDInsight storage');

    done();
  });

  it('should define the correct positional arguments for the remove config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.positionalParams.should.be.equal('[file] [storageAccountName]');
    done();
  });

  it('should define the correct description for the remove config storage  command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.description.firstCall.args[0].should.be.equal('Removes a storage account to the cluster configuration.');
    done();
  });

  it('should define the correct usage for the remove config storage  command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.usage.firstCall.args[0].should.be.equal('[file] [storageAccountName] [options]');
    done();
  });

  it('should define the correct options for the remove config storage  command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.optionCount.should.be.equal(1);
    should.exist(command.options['--storageAccountName <storageAccountName>']);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('The Azure storage account to use for HDInsight storage');

    done();
  });

  it('should define the correct positional arguments for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.positionalParams.should.be.equal('[file] [metastoreType] [server] [database] [user] [metastorePassword]');
    done();
  });

  it('should define the correct description for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.description.firstCall.args[0].should.be.equal('Sets a metastore in the cluster configuration.');
    done();
  });

  it('should define the correct usage for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.usage.firstCall.args[0].should.be.equal('[file] [metastoreType] [server] [database] [user] [metastorePassword] [options]');
    done();
  });

  it('should define the correct options for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.optionCount.should.be.equal(5);
    should.exist(command.options['--type <metastoreType>']);
    command.options['--type <metastoreType>'].should.be.equal('The type of metastore to set. (example: hive, oozie)');
    should.exist(command.options['--server <server>']);
    command.options['--server <server>'].should.be.equal('The name of the sql server for the metastore');
    should.exist(command.options['--database <database>']);
    command.options['--database <database>'].should.be.equal('The name of the database on the sql server');
    should.exist(command.options['--user <userName>']);
    command.options['--user <userName>'].should.be.equal('The user name to use when connecting to the sql server');
    should.exist(command.options['--metastorePassword <metastorePassword>']);
    command.options['--metastorePassword <metastorePassword>'].should.be.equal('The password to use when connecting to the sql server');

    done();
  });

  it('should define the correct positional arguments for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.positionalParams.should.be.equal('[file] [metastoreType]');
    done();
  });

  it('should define the correct description for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.description.firstCall.args[0].should.be.equal('Clears a metastore in the cluster configuration.');
    done();
  });

  it('should define the correct usage for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.usage.firstCall.args[0].should.be.equal('[file] [metastoreType] [options]');
    done();
  });

  it('should define the correct options for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.optionCount.should.be.equal(1);
    should.exist(command.options['--type <metastoreType>']);
    command.options['--type <metastoreType>'].should.be.equal('The type of metastore to clear. (example: hive, oozie)');
    done();
  });
});