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


// Lib includes
var util = testutil.libRequire('util/utils');
var GetCommand = require('./util-GetCommand.js');

describe('HDInsight create command (under unit test)', function() {
  it('should call startProgress with the correct statement', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.startProgress.firstCall.args[0].should.be.equal('Creating HDInsight Cluster');
    done();
  });

  it('should call endProgress', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.endProgress.firstCall.should.not.equal(null);
    done();
  });

  it('should prompt for the clusterName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.createClusterCommand(undefined, {});
    command.user.promptIfNotGiven.firstCall.should.not.equal(null);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Cluster name: ');
    done();
  });

  it('should prompt for the nodes if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.createClusterCommand(undefined,  { clusterName : 'test1' });
    command.user.promptIfNotGiven.getCall(1).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Nodes: ');
    done();
  });

  it('should use the options for the nodes', function(done) {
    var command = new GetCommand();
    var options = {
      nodes : 4
    };
    command.hdinsight.createClusterCommand('test1', options);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal(4);
    done();
  });

  it('should prompt for the location if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(2).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(2).args[0].should.be.equal('Location: ');
    done();
  });

  it('should use the options for the location if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(2).args[1].should.be.equal('East US');
    done();
  });

  it('should prompt for the storageAccountName if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(3).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(3).args[0].should.be.equal('Storage acount name: ');
    done();
  });

  it('should use the options for the storageAccountName if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(3).args[1].should.be.equal('testAccount');
    done();
  });

  it('should prompt for the storageAccountKey if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(4).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(4).args[0].should.be.equal('Storage account key: ');
    done();
  });

  it('should use the options for the storageAccountKey if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(4).args[1].should.be.equal('testAccountKey');
    done();
  });

  it('should prompt for the storageContainer if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(5).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(5).args[0].should.be.equal('Storage container: ');
    done();
  });

  it('should use the options for the storageContainer if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(5).args[1].should.be.equal('testAccountContainer');
    done();
  });

  it('should prompt for the username if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(6).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(6).args[0].should.be.equal('Username: ');
    done();
  });

  it('should use the options for the username if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(6).args[1].should.be.equal('username');
    done();
  });

  it('should prompt for the password if not given', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(7).should.not.equal(null);
    command.user.promptIfNotGiven.getCall(7).args[0].should.be.equal('Password: ');
    done();
  });

  it('should use the options for the password if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username',
      clusterPassword : 'password'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.promptIfNotGiven.getCall(7).args[1].should.be.equal('password');
    done();
  });

  it('should call getCluster (first call) with the supplied cluster Name', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username',
      clusterPassword : 'password'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.firstCall.should.not.equal(null);
    command.processor.getCluster.firstCall.args[0].should.be.equal('test1');
    done();
  });

  it('should call getCluster (first call) with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username',
      clusterPassword : 'password'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.firstCall.should.not.equal(null);
    (command.processor.getCluster.firstCall.args[1] === undefined).should.equal(true);
    done();
  });

  it('should call getCluster (first call) with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username',
      clusterPassword : 'password',
      subscription : 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.firstCall.should.not.equal(null);
    command.processor.getCluster.firstCall.args[1].should.not.equal(null);
    command.processor.getCluster.firstCall.args[1].should.be.equal('testId');
    done();
  });

  it('should call logErrorAndData if the cluster already exists', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    var expected = command.processor.listResultsForEachCall[0].body.clusters[0];
    command.user.logErrorAndData.firstCall.should.not.equal(null);
    command.user.logErrorAndData.firstCall.args[0].should.be.equal('The requested cluster already exists');
    command.user.logErrorAndData.firstCall.args[1].should.be.equal(expected);
    done();
  });

  it('should call endProgress if the cluster already exists', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test1',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.endProgress.firstCall.should.not.equal(null);
    done();
  });

  it('should call createCluster if the cluster does not already exists', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      storageAccountName : 'testAccount',
      storageAccountKey : 'testAccountKey',
      storageContainer : 'testAccountContainer',
      username : 'username',
      clusterPassword : 'password'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.createCluster.firstCall.should.not.equal(null);
    done();
  });

  it('should read the values from the config if one is provided', function(done) {
    var command = new GetCommand();
    var config = {
      name : 'test10',
      nodes : 40,
      location : 'North Europe',
      defaultStorageAccountName : 'account_1',
      defaultStorageAccountKey : 'account_key_1',
      defaultStorageContainer : 'account_container_1',
      user : 'user_name_one',
      password : 'clusterPassord'
    };
    var options = {};
    command.user.config = config;
    command.hdinsight.createClusterCommand('test.json', options);
    command.user.promptIfNotGiven.getCall(0).args[1].should.be.equal(config.name);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal(config.nodes);
    command.user.promptIfNotGiven.getCall(2).args[1].should.be.equal(config.location);
    command.user.promptIfNotGiven.getCall(3).args[1].should.be.equal(config.defaultStorageAccountName);
    command.user.promptIfNotGiven.getCall(4).args[1].should.be.equal(config.defaultStorageAccountKey);
    command.user.promptIfNotGiven.getCall(5).args[1].should.be.equal(config.defaultStorageContainer);
    command.user.promptIfNotGiven.getCall(6).args[1].should.be.equal(config.user);
    command.user.promptIfNotGiven.getCall(7).args[1].should.be.equal(config.password);
    command.processor.createCluster.firstCall.args[0].should.not.equal(null);
    command.processor.createCluster.firstCall.args[0].name.should.be.equal('test10');
    command.processor.createCluster.firstCall.args[0].nodes.should.be.equal(40);
    command.processor.createCluster.firstCall.args[0].location.should.be.equal('North Europe');
    command.processor.createCluster.firstCall.args[0].defaultStorageAccountName.should.be.equal('account_1');
    command.processor.createCluster.firstCall.args[0].defaultStorageAccountKey.should.be.equal('account_key_1');
    command.processor.createCluster.firstCall.args[0].defaultStorageContainer.should.be.equal('account_container_1');
    command.processor.createCluster.firstCall.args[0].user.should.be.equal('user_name_one');
    command.processor.createCluster.firstCall.args[0].password.should.be.equal('clusterPassord');
    done();
  });

  it('should call validateLocation before attempting to create the cluster', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.validateLocation.firstCall.should.not.equal(null);
    command.processor.validateLocation.firstCall.args[0].should.be.equal('East US');
    done();
  });

  it('should call pass the subscriptionId into validateLocation if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription : '1234'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.validateLocation.firstCall.should.not.equal(null);
    command.processor.validateLocation.firstCall.args[1].should.be.equal('1234');
    done();
  });

  it('should call registerLocation before attempting to create the cluster if validateLocation returned 404', function(done) {
    var command = new GetCommand();
    command.processor.validateLocationResults = 404;
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.registerLocation.firstCall.should.not.equal(null);
    done();
  });

  it('should pass the correct creationObject into createCluster', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.createCluster.firstCall.args[0].should.not.equal(null);
    command.processor.createCluster.firstCall.args[0].name.should.be.equal('test2');
    command.processor.createCluster.firstCall.args[0].nodes.should.be.equal(4);
    command.processor.createCluster.firstCall.args[0].location.should.be.equal('East US');
    // NOTE: The following values are pulled from the proptIfNotSupplied mock
    command.processor.createCluster.firstCall.args[0].defaultStorageAccountName.should.be.equal('storageAccount');
    command.processor.createCluster.firstCall.args[0].defaultStorageAccountKey.should.be.equal('storageAccountKey');
    command.processor.createCluster.firstCall.args[0].defaultStorageContainer.should.be.equal('storageContainer');
    command.processor.createCluster.firstCall.args[0].user.should.be.equal('username');
    command.processor.createCluster.firstCall.args[0].password.should.be.equal('password');
    done();
  });

  it('should call createCluster with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.createCluster.firstCall.should.not.equal(null);
    (command.processor.createCluster.firstCall.args[1] === undefined).should.equal(true);
    done();
  });

  it('should call createCluster with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.createCluster.firstCall.should.not.equal(null);
    command.processor.createCluster.firstCall.args[1].should.not.equal(null);
    command.processor.createCluster.firstCall.args[1].should.be.equal('testId');
    done();
  });

  it('should call doPollRequest with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.doPollRequest.firstCall.should.not.equal(null);
    (command.processor.doPollRequest.firstCall.args[1] === undefined).should.equal(true);
    done();
  });

  it('should call doPollRequest with the supplied clusterName', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.doPollRequest.firstCall.should.not.equal(null);
    command.processor.doPollRequest.firstCall.args[0].should.not.equal(null);
    command.processor.doPollRequest.firstCall.args[0].should.be.equal('test2');
    done();
  });

  it('should call doPollRequest with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.doPollRequest.firstCall.should.not.equal(null);
    command.processor.doPollRequest.firstCall.args[1].should.not.equal(null);
    command.processor.doPollRequest.firstCall.args[1].should.be.equal('testId');
    done();
  });

  it('should call getCluster (second call) with the supplied cluster Name', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.secondCall.should.not.equal(null);
    command.processor.getCluster.secondCall.args[0].should.be.equal('test2');
    done();
  });

  it('should call getCluster (second call) with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.secondCall.should.not.equal(null);
    (command.processor.getCluster.secondCall.args[1] === undefined).should.equal(true);
    done();
  });

  it('should call getCluster (second call) with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.processor.getCluster.secondCall.should.not.equal(null);
    command.processor.getCluster.secondCall.args[1].should.not.equal(null);
    command.processor.getCluster.secondCall.args[1].should.be.equal('testId');
    done();
  });

  it('should call endProgress when done', function(done) {
    var command = new GetCommand();
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.endProgress.firstCall.should.not.equal(null);
    done();
  });

  it('should call logData when done with a success', function(done) {
    var command = new GetCommand();
    var expected = command.processor.listResultsForEachCall[1].body.clusters[1];
    var options = {
      clusterName : 'test2',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.logData.firstCall.should.not.equal(null);
    command.user.logData.firstCall.args[0].should.be.equal('HDInsight Cluster');
    command.user.logData.firstCall.args[1].should.be.equal(expected);
    done();
  });

  it('should call logErrorAndData when the cluster reports to be in an error state', function(done) {
    var command = new GetCommand();
    command.processor.listClustersCallCount = 1;
    var expected = command.processor.listResultsForEachCall[2].body.clusters[1];
    var options = {
      clusterName : 'test3',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.logErrorAndData.firstCall.should.not.equal(null);
    command.user.logErrorAndData.firstCall.args[0].should.be.equal('Unable to create cluster');
    command.user.logErrorAndData.firstCall.args[1].should.be.equal(expected);
    done();
  });

  it('should call logError (twice) when the cluster can not be returned after create completed', function(done) {
    var command = new GetCommand();
    var expected = command.processor.listResultsForEachCall[2].body.clusters[1];
    var options = {
      clusterName : 'test4',
      nodes : 4,
      location : 'East US',
      subscription: 'testId'
    };
    command.hdinsight.createClusterCommand(undefined, options);
    command.user.logError.firstCall.should.not.equal(null);
    command.user.logError.firstCall.args[0].should.be.equal('The cluster could not be created');
    command.user.logError.secondCall.should.not.equal(null);
    command.user.logError.secondCall.args[0].should.be.equal('The request failed. Please contact support for more information');
    done();
  });
});