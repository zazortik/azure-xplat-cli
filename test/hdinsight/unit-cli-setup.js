//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var mocha = require('mocha');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

// Test includes
var testutil = require('../util/util');

var CliStub = require('./stub-cli.js');

// Lib includes
var util = testutil.libRequire('util/utils');
var hdInsightCli = require('../../lib/commands/asm/hdinsight._js');

describe('HDInsight command line (under unit test)', function() {

  it('should define the correct categories', function(done) {
    var cli = new CliStub();
    cli.should.not.equal(null);
    hdInsightCli.init(cli);
    cli.categories['hdinsight'].should.not.equal(null);
    cli.categories['hdinsight'].categories['cluster'].should.not.equal(null);
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
    cluster.commands['list'].should.not.equal(null);
    cluster.commands['show'].should.not.equal(null);
    cluster.commands['create'].should.not.equal(null);
    cluster.commands['delete'].should.not.equal(null);
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
    command.description.firstCall.args[0].should.be.equal('List the clusters');
    done();
  });

  it('should define the correct usage for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    (command.usage.firstCall === null).should.equal(true);
    done();
  });

  it('should define the correct options for the list command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.optionCount.should.be.equal(1);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id')
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
    command.description.firstCall.args[0].should.be.equal('Show cluster details');
    done();
  });

  it('should define the correct usage for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.usage.firstCall.args[0].should.be.equal('[options] <clusterName>');
    done();
  });

  it('should define the correct options for the show command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.optionCount.should.be.equal(2);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id')
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('the HdInsight cluster name')
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
    command.usage.firstCall.args[0].should.be.equal('[options] <clusterName>');
    done();
  });

  it('should define the correct options for the delete command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.optionCount.should.be.equal(2);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id')
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('the HdInsight cluster name')
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
    command.description.firstCall.args[0].should.be.equal('Create a cluster');
    done();
  });

  it('should define the correct usage for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.usage.firstCall.args[0].should.be.equal('[options] [config]');
    done();
  });

  it('should define the correct options for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.optionCount.should.be.equal(10);
    command.options['--config <config>'].should.not.equal(null);
    command.options['--config <config>'].should.be.equal('the config file for cluster creation');
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id');
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('the HdInsight cluster name');
    command.options['--storageAccountName <storageAccountName>'].should.not.equal(null);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('the storage account to use for HDInsight storage');
    command.options['--storageAccountKey <storageAccountKey>'].should.not.equal(null);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('the key to the storage account to use for HDInsight storage');
    command.options['--storageContainer <storageContainer>'].should.not.equal(null);
    command.options['--storageContainer <storageContainer>'].should.be.equal('the container in the storage account to use for HDInsight default storage');
    command.options['--nodes <nodes>'].should.not.equal(null);
    command.options['--nodes <nodes>'].should.be.equal('the number of data nodes to use for the cluster');
    command.options['--location <location>'].should.not.equal(null);
    command.options['--location <location>'].should.be.equal('the data center location for the cluster');
    command.options['--username <username>'].should.not.equal(null);
    command.options['--username <username>'].should.be.equal('the user name to use for the cluster');
    command.options['--clusterPassword <clusterPassword>'].should.not.equal(null);
    command.options['--clusterPassword <clusterPassword>'].should.be.equal('the password to use for the cluster');

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
    command.description.firstCall.args[0].should.be.equal('Show the contents of an HDInsight configuration file');
    done();
  });

  it('should define the correct usage for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file]');
    done();
  });

  it('should define the correct options for the show config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['show'];
    command.optionCount.should.be.equal(1);
    command.options['--file <path>'].should.not.equal(null);
    command.options['--file <path>'].should.be.equal('the path to the config file for cluster creation');
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
    command.description.firstCall.args[0].should.be.equal('Create an HDInsight configuration file');
    done();
  });

  it('should define the correct usage for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file]');
    done();
  });

  it('should define the correct options for the create config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['create'];
    command.optionCount.should.be.equal(1);
    command.options['--file <path>'].should.not.equal(null);
    command.options['--file <path>'].should.be.equal('the path to the config file for cluster creation');
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
    command.description.firstCall.args[0].should.be.equal('Update the basic parameters for a cluster configuration');
    done();
  });

  it('should define the correct usage for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file]');
    done();
  });

  it('should define the correct options for the set config command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var config = cli.categories['hdinsight'].categories['cluster'].categories['config'];
    var command = config.commands['set'];
    command.optionCount.should.be.equal(10);
    command.options['--file <path>'].should.not.equal(null);
    command.options['--file <path>'].should.be.equal('the path to the config file for cluster creation');
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('the HdInsight cluster name');
    command.options['--storageAccountName <storageAccountName>'].should.not.equal(null);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('the storage account to use for HDInsight storage');
    command.options['--storageAccountKey <storageAccountKey>'].should.not.equal(null);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('the key to the storage account to use for HDInsight storage');
    command.options['--storageContainer <storageContainer>'].should.not.equal(null);
    command.options['--storageContainer <storageContainer>'].should.be.equal('the container in the storage account to use for HDInsight default storage');
    command.options['--nodes <nodes>'].should.not.equal(null);
    command.options['--nodes <nodes>'].should.be.equal('the number of data nodes to use for the cluster');
    command.options['--location <location>'].should.not.equal(null);
    command.options['--location <location>'].should.be.equal('the data center location for the cluster');
    command.options['--username <username>'].should.not.equal(null);
    command.options['--username <username>'].should.be.equal('the user name to use for the cluster');
    command.options['--clusterPassword <clusterPassword>'].should.not.equal(null);
    command.options['--clusterPassword <clusterPassword>'].should.be.equal('the password to use for the cluster');

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
    command.description.firstCall.args[0].should.be.equal('Add a storage account to the cluster configuration');
    done();
  });

  it('should define the correct usage for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file] [storageAccountName] [storageAccountKey]');
    done();
  });

  it('should define the correct options for the add config storage command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['add'];
    command.optionCount.should.be.equal(2);
    command.options['--storageAccountName <storageAccountName>'].should.not.equal(null);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('the storage account to use for HDInsight storage');
    command.options['--storageAccountKey <storageAccountKey>'].should.not.equal(null);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('the key to the storage account to use for HDInsight storage');

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
    command.description.firstCall.args[0].should.be.equal('Remove a storage account from the cluster configuration');
    done();
  });

  it('should define the correct usage for the remove config storage  command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file] [storageAccountName]');
    done();
  });

  it('should define the correct options for the remove config storage  command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var storage = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['storage'];
    var command = storage.commands['remove'];
    command.optionCount.should.be.equal(1);
    command.options['--storageAccountName <storageAccountName>'].should.not.equal(null);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('the storage account to use for HDInsight storage');

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
    command.description.firstCall.args[0].should.be.equal('Update a metastore in the cluster configuration');
    done();
  });

  it('should define the correct usage for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file] [metastoreType] [server] [database] [user] [metastorePassword]');
    done();
  });

  it('should define the correct options for the set config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['set'];
    command.optionCount.should.be.equal(5);
    command.options['--type <metastoreType>'].should.not.equal(null);
    command.options['--type <metastoreType>'].should.be.equal('the type of metastore to set (example: hive, oozie)');
    command.options['--server <server>'].should.not.equal(null);
    command.options['--server <server>'].should.be.equal('the name of the sql server for the metastore');
    command.options['--database <database>'].should.not.equal(null);
    command.options['--database <database>'].should.be.equal('the name of the database on the sql server');
    command.options['--user <userName>'].should.not.equal(null);
    command.options['--user <userName>'].should.be.equal('the user name to use when connecting to the sql server');
    command.options['--metastorePassword <metastorePassword>'].should.not.equal(null);
    command.options['--metastorePassword <metastorePassword>'].should.be.equal('the password to use when connecting to the sql server');

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
    command.description.firstCall.args[0].should.be.equal('Clear a metastore in the cluster configuration');
    done();
  });

  it('should define the correct usage for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.usage.firstCall.args[0].should.be.equal('[options] [file] [metastoreType]');
    done();
  });

  it('should define the correct options for the clear config metastore command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var metastore = cli.categories['hdinsight'].categories['cluster'].categories['config'].categories['metastore'];
    var command = metastore.commands['clear'];
    command.optionCount.should.be.equal(1);
    command.options['--type <metastoreType>'].should.not.equal(null);
    command.options['--type <metastoreType>'].should.be.equal('the type of metastore to clear (example: hive, oozie)');
    done();
  });
});