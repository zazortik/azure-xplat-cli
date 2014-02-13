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

describe('HDInsight list command (under unit test)', function() {

  after(function (done) {
    done();
  });

  // NOTE: To Do, we should actually create new accounts for our tests
  //       So that we can work on any existing subscription.
  before (function (done) {
    done();
  });

  it('should call startProgress with the correct statement', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    command.hdinsight.listClustersCommand({});
    command.user.startProgress.firstCall.args[0].should.be.equal('Getting HDInsight servers');
    done();
  });

  it('should call endProgress', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    command.hdinsight.listClustersCommand({});
    command.user.endProgress.firstCall.should.not.equal(null);
    done();
  });

  it('should call logList with the received result', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    command.hdinsight.listClustersCommand({});
    command.user.logList.firstCall.should.not.equal(null);
    command.user.logList.firstCall.args[0].should.be.equal(command.processor.listResultsForEachCall[0].body.clusters);
    done();
  });

  it('should call listClusters with the supplied subscriptionId (when none is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    command.hdinsight.listClustersCommand({});
    command.processor.listClusters.firstCall.should.not.equal(null);
    (command.processor.listClusters.firstCall.args[0] === undefined).should.equal(true);
    done();
  });

  it('should call listClusters with the supplied subscriptionId (when one is supplied)', function(done) {
    var command = new GetCommand();
    command.hdinsight.listClustersCommand.should.not.equal(null);
    command.hdinsight.listClustersCommand({ subscription: 'test1' });
    command.processor.listClusters.firstCall.should.not.equal(null);
    command.processor.listClusters.firstCall.args[0].should.not.equal(null);
    command.processor.listClusters.firstCall.args[0].should.be.equal('test1');
    done();
  });
});