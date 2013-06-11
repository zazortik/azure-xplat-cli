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

var CliStub = require('./hdinsight-cli-stub.js');

// Lib includes
var util = testutil.libRequire('util/utils');
var hdInsightCli = require('../../lib/commands/hdinsight._js')

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
    command.positionalParams.should.be.equal('[clusterName] [nodes] [location]');
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
    command.usage.firstCall.args[0].should.be.equal('<clusterName> <nodes> <location> [options]');
    done();
  });

  it('should define the correct options for the create command', function(done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.optionCount.should.be.equal(9);
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

});