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

var sinon = require('sinon');
var should = require('should');
var _ = require('underscore');

var UserInteractor = function() {
  var self = this;


  this.logErrorAndData = sinon.spy();
  this.logError = sinon.spy();
  this.logData = sinon.spy();
  this.logList = sinon.spy();

  this.config = { version : 1.0 };
  this.readConfig = function(path) {
    return this.config;
  };

  sinon.spy(this, 'readConfig');
  this.writeConfig = sinon.spy();

  this.compatResult = true;
  this.verifyCompat = function(creationObject, version) {
    creationObject.should.be.eql(this.config);
    return this.compatResult;
  };

  sinon.spy(this, 'verifyCompat');

  this.checkpoint = sinon.spy();

  this.promptResults = {
    'Config File Path: ' : 'test.json',
    'Storage Account Name: ' : 'account1',
    'Storage Account Key: ' : 'key1',
    'Cluster name: ' : 'test1',
    'Nodes: ' : 4,
    'Location: ' : 'East US',
    'Storage acount name: ' : 'storageAccount',
    'Storage account key: ' : 'storageAccountKey',
    'Storage container: ' : 'storageContainer',
    'Username: ' : 'username',
    'Password: ' : 'password',
    'Metastore Type: ' : 'hive',
    'Metastore Server: ' : 'server1',
    'Metastore Database: ' : 'database1',
    'Metastore user: ' : 'user1',
    'Metastore password: ' : 'password'
  };
  this.promptIfNotGiven = function(name, value, callback) {
    var retval;
    if (!_.isUndefined(value)) {
      retval = value;
    }
    else {
      retval = this.promptResults[name];
      if (!retval) {
        throw new Error('mocker was unable to locate a parameter return value for ' + name);
      }
    }
    if (callback) {
      callback(null, retval);
    }
    else {
      return retval;
    }
  };
  sinon.spy(this, 'promptIfNotGiven');

  this.debugLog = sinon.spy();
  this.startProgress = sinon.spy();
  this.endProgress = sinon.spy();
};

module.exports = UserInteractor;