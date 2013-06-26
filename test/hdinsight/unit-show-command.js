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

// Lib includes
var util = testutil.libRequire('util/utils');
var GetCommand = require('./util-GetCommand.js');

describe('HDInsight show command (under unit test)', function() {
  it('should call startProgress with the correct statement', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand('test1', {});
    command.user.startProgress.firstCall.args[0].should.be.equal('Getting HDInsight Cluster');
    done();
  });

  it('should call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.showClusterCommand('test1', {});
    should.exist(command.user.endProgress.firstCall);
    done();
  });

  it('should prompt for the clusterName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand(undefined, {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Cluster name: ');
    done();
  });

  it('should use the options for the clusterName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand(undefined, { clusterName : 'test1' });
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test1');
    done();
  });

  it('should call getCluster with the supplied cluster Name', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand('test1', {});
    should.exist(command.processor.getCluster.firstCall);
    command.processor.getCluster.firstCall.args[0].should.be.equal('test1');
    done();
  });

  it('should call logData with the received result', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand('test1', {});
    var expected = command.processor.listResultsForEachCall[0].body.clusters[0];
    should.exist(command.user.logData.firstCall);
    command.user.logData.firstCall.args[0].should.be.equal('HDInsight Cluster');
    command.user.logData.firstCall.args[1].should.be.equal(expected);
    done();
  });

  it('should call logError when the cluster is not found', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand('test2', {});
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('Cluster not found');
    done();
  });

  it('should call getCluster with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.showClusterCommand('test1', {});
    should.exist(command.processor.getCluster.firstCall);
    should.not.exist(command.processor.getCluster.firstCall.args[1]);
    done();
  });

  it('should call getCluster with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.showClusterCommand('test1', { subscription: 'testId' });
    should.exist(command.processor.getCluster.firstCall);
    should.exist(command.processor.getCluster.firstCall.args[1]);
    command.processor.getCluster.firstCall.args[1].should.be.equal('testId');
    done();
  });
});