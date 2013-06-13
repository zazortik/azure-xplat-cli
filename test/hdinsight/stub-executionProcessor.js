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

var sinon = require('sinon');
var should = require('should');

var ExecutionProcessor = function() {
  var self = this;
  this.filterCluster = sinon.spy();
  this.createClusterResults = 200;
  this.createCluster = function(creationObject, subscriptionId) {
    return { statusCode : self.validateLocationResults };
  };
  sinon.spy(this, 'createCluster');

  this.getCluster = function(clusterName, subscriptionId) {
    var list = this.listClusters(subscriptionId);
    var retval;
    list.body.clusters.forEach(function (cluster) {
      if (cluster.Name === clusterName) {
        retval = cluster;
      }
    });
    return retval;
  };
  sinon.spy(this, 'getCluster');

  this.validateLocationResults = 200;
  this.validateLocation = function (location, subscriptionId) {
    return { statusCode : self.validateLocationResults };
  };
  sinon.spy(this, 'validateLocation');

  this.registerLocation = sinon.spy();

  this.deleteCluster = sinon.spy();
  this.createHDInsightManagementService = sinon.spy();
  this.doPollRequest = sinon.spy();

  this.listClustersCallCount = 0;
  // Specifies an array of results to return for each call attempt.
  this.listResultsForEachCall = [];

  this.listClusters = function(subscriptionId) {
    return this.listResultsForEachCall[this.listClustersCallCount++];
  };

  sinon.spy(this, 'listClusters');
};

module.exports = ExecutionProcessor;