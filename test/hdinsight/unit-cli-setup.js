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

describe('HDInsight command line (under unit test)', function () {

  it('should define the correct categories', function (done) {
    var cli = new CliStub();
    cli.should.not.equal(null);
    hdInsightCli.init(cli);
    cli.categories['hdinsight'].should.not.equal(null);
    cli.categories['hdinsight'].categories['cluster'].should.not.equal(null);
    done();
  });

  it('should define the correct description for the hdinsight category', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    hdinsight = cli.categories['hdinsight'];
    hdinsight.description.firstCall.args[0].should.be.equal('Commands to manage HDInsight clusters and jobs');
    done();
  });

  it('should define the correct description for the cluster category', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    cluster.description.firstCall.args[0].should.be.equal('Commands to manage HDInsight clusters');
    done();
  });

  it('should define the correct commands for the cluster category', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    cluster.commands['list'].should.not.equal(null);
    cluster.commands['show'].should.not.equal(null);
    cluster.commands['create'].should.not.equal(null);
    cluster.commands['delete'].should.not.equal(null);
    done();
  });

  it('should define the correct positional arguments for the list command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.positionalParams.should.be.equal('');
    done();
  });

  it('should define the correct description for the list command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    command.description.firstCall.args[0].should.be.equal('List the clusters');
    done();
  });

  it('should define the correct usage for the list command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['list'];
    (command.usage.firstCall === null).should.equal(true);
    done();
  });

  it('should define the correct positional arguments for the show command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.positionalParams.should.be.equal('[clusterName] [osType]');
    done();
  });

  it('should define the correct description for the show command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.description.firstCall.args[0].should.be.equal('Show cluster details');
    done();
  });

  it('should define the correct usage for the show command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.usage.firstCall.args[0].should.be.equal('[options] <clusterName> <osType>');
    done();
  });

  it('should define the correct options for the show command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['show'];
    command.optionCount.should.be.equal(3);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id');
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('the HdInsight cluster name');
    command.options['--osType <osType>'].should.not.equal(null);
    command.options['--osType <osType>'].should.be.equal('the HdInsight cluster operating system: windows OR linux');
    done();
  });

  it('should define the correct positional arguments for the delete command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.positionalParams.should.be.equal('[clusterName] [location] [osType]');
    done();
  });

  it('should define the correct description for the delete command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.description.firstCall.args[0].should.be.equal('Delete a cluster');
    done();
  });

  it('should define the correct usage for the delete command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.usage.firstCall.args[0].should.be.equal('[options] <clusterName> <location> <osType>');
    done();
  });

  it('should define the correct options for the delete command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['delete'];
    command.optionCount.should.be.equal(4);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id');
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('Cluster name');
    command.options['--osType <osType>'].should.not.equal(null);
    command.options['--osType <osType>'].should.be.equal('Cluster OS type');
    done();
  });

  it('should define the correct positional arguments for the create command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.positionalParams.should.be.equal('[clusterName] [osType] [storageAccountName] [storageAccountKey] [storageContainer] [dataNodeCount] [headNodeSize] [dataNodeSize] [location] [userName] [password] [sshUserName] [sshPassword]');
    done();
  });

  it('should define the correct description for the create command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.description.firstCall.args[0].should.be.equal('Create a cluster');
    done();
  });

  it('should define the correct usage for the create command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.usage.firstCall.args[0].should.be.equal('[options] <clusterName> <osType> <storageAccountName> <storageAccountKey> <storageContainer> <dataNodeCount> <headNodeSize> <dataNodeSize> <location> <userName> <password> <sshUserName> <sshPassword>');
    done();
  });

  it('should define the correct options for the create command', function (done) {
    var cli = new CliStub();
    hdInsightCli.init(cli);
    var cluster = cli.categories['hdinsight'].categories['cluster'];
    var command = cluster.commands['create'];
    command.optionCount.should.be.equal(14);
    command.options['-s, --subscription <id>'].should.not.equal(null);
    command.options['-s, --subscription <id>'].should.be.equal('the subscription id');
    command.options['--clusterName <clusterName>'].should.not.equal(null);
    command.options['--clusterName <clusterName>'].should.be.equal('HDInsight cluster name');
    command.options['--storageAccountName <storageAccountName>'].should.not.equal(null);
    command.options['--storageAccountName <storageAccountName>'].should.be.equal('Storage account url to use for default HDInsight storage');
    command.options['--storageAccountKey <storageAccountKey>'].should.not.equal(null);
    command.options['--storageAccountKey <storageAccountKey>'].should.be.equal('Key to the storage account to use for default HDInsight storage');
    command.options['--storageContainer <storageContainer>'].should.not.equal(null);
    command.options['--storageContainer <storageContainer>'].should.be.equal('Container in the storage account to use for HDInsight default storage');
    command.options['--location <location>'].should.not.equal(null);
    command.options['--location <location>'].should.be.equal('Data center location for the cluster');
    command.options['--userName <userName>'].should.not.equal(null);
    command.options['--userName <userName>'].should.be.equal('Cluster username');
    command.options['--password <password>'].should.not.equal(null);
    command.options['--password <password>'].should.be.equal('Cluster password');

    done();
  });
});