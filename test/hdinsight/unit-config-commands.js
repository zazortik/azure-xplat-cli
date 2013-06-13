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

describe('HDInsight config commands (under unit test)', function() {
  it('create should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.createConfigCommand('test.json', {});
    should.not.exist(command.user.startProgress.firstCall)
    done();
  });

  it('create should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.createConfigCommand('test.json', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('create should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.createConfigCommand(undefined, {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('create should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.createConfigCommand(undefined, { file : 'test.json' });
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('create should call writeConfig with a new config object', function(done) {
    var command = new GetCommand();
    command.hdinsight.createConfigCommand(undefined, { file : 'test.json' });
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    command.user.writeConfig.firstCall.args[1].should.be.eql({ version : 1.0 });
    done();
  });


  it('show should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.showConfigCommand('test.json', {});
    should.not.exist(command.user.startProgress.firstCall)
    done();
  });

  it('show should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.showConfigCommand('test.json', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('show should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.showConfigCommand(undefined, {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('show should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.showConfigCommand(undefined, { file : 'test.json' });
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('show should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    command.hdinsight.showConfigCommand(undefined, { file : 'test.json' });
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('show should call logData with the config object returned', function(done) {
    var command = new GetCommand();
    command.hdinsight.showConfigCommand(undefined, { file : 'test.json' });
    command.user.logData.firstCall.args[0].should.be.equal('HDInsight Config');
    command.user.logData.firstCall.args[1].should.be.equal(command.user.config);
    done();
  });

  it('show should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    command.hdinsight.showConfigCommand(undefined, { file : 'test.json' });
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('set should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.setConfigCommand('test.json', {});
    should.not.exist(command.user.startProgress.firstCall);
    done();
  });

  it('set should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.setConfigCommand('test.json', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('set should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand(undefined, {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('set should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand(undefined, { file : 'test.json' });
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('set should prompt for the clusterName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Cluster name: ');
    done();
  });

  it('set should use the options for the clusterName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { clusterName : 'test1' });
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal('test1');
    done();
  });

  it('set should prompt for the nodes if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(1));
    command.user.promptIfNotGiven.getCall(2).args[0].should.be.equal('Nodes: ');
    done();
  });

  it('set should use the options for the nodes if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { nodes : 4 });
    command.user.promptIfNotGiven.getCall(2).args[1].should.be.equal(4);
    done();
  });

  it('set should prompt for the location if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(2));
    command.user.promptIfNotGiven.getCall(3).args[0].should.be.equal('Location: ');
    done();
  });

  it('set should use the options for the location if not supplied positionaly', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { location : 'East US' });
    command.user.promptIfNotGiven.getCall(3).args[1].should.be.equal('East US');
    done();
  });

  it('set should prompt for the storageAccountName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(4).args[0].should.be.equal('Storage acount name: ');
    done();
  });

  it('set should use the options for the storageAccountName if supplied', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { storageAccountName : 'testAccount' });
    command.user.promptIfNotGiven.getCall(4).args[1].should.be.equal('testAccount');
    done();
  });

  it('set should prompt for the storageAccountKey if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(5).args[0].should.be.equal('Storage account key: ');
    done();
  });

  it('set should use the options for the storageAccountKey if supplied', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { storageAccountKey : 'testAccountKey' });
    command.user.promptIfNotGiven.getCall(5).args[1].should.be.equal('testAccountKey');
    done();
  });

  it('set should prompt for the storageContainer if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(6).args[0].should.be.equal('Storage container: ');
    done();
  });

  it('set should use the options for the storageContainer if supplied', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { storageContainer : 'testAccountContainer' });
    command.user.promptIfNotGiven.getCall(6).args[1].should.be.equal('testAccountContainer');
    done();
  });

  it('set should prompt for the username if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(7).args[0].should.be.equal('Username: ');
    done();
  });

  it('set should use the options for the username if supplied', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { username : 'username' });
    command.user.promptIfNotGiven.getCall(7).args[1].should.be.equal('username');
    done();
  });

  it('set should prompt for the password if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', {});
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(8).args[0].should.be.equal('Password: ');
    done();
  });

  it('set should use the options for the password if supplied', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand('test.json', { clusterPassword : 'password' });
    command.user.promptIfNotGiven.getCall(8).args[1].should.be.equal('password');
    done();
  });

  it('set should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand(undefined, { file : 'test.json' });
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('set should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    command.hdinsight.setConfigCommand(undefined, { file : 'test.json' });
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('set should call verifyCompat command', function (){
    var command = new GetCommand();
    command.hdinsight.setConfigCommand(undefined, { file : 'test2.json' });
    command.user.verifyCompat.firstCall.args[1].should.be.equal(1.0);
  });

  it('set should report an error if verifyCompat returns false', function (){
    var command = new GetCommand();
    command.user.compatResult = false;
    command.hdinsight.setConfigCommand(undefined, { file : 'test2.json' });
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('The version of this configuration is not compatable with this version of the tools.');
  });

  it('set should call writeConfig once it has set the config values', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigCommand(undefined, { file : 'test.json' });
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    var expected = { version: 1,
      name: 'test1',
      location: 'East US',
      defaultStorageAccountName: 'storageAccount',
      defaultStorageAccountKey: 'storageAccountKey',
      defaultStorageContainer: 'storageContainer',
      user: 'username',
      password: 'password',
      nodes: 4
    };
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });

  it('set metastore should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.setConfigMetastoreCommand('test.json', 'type', 'server', 'database', 'user', 'password', {});
    should.not.exist(command.user.startProgress.firstCall);
    done();
  });

  it('set metastore should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.setConfigMetastoreCommand('test.json', 'type', 'server', 'database', 'user', 'password', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('set metastore should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigMetastoreCommand(undefined, 'type', 'server', 'database', 'user', 'password', {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('set metastore should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.setConfigMetastoreCommand(undefined, 'type', 'server', 'database', 'user', 'password', options);
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('set metastore should prompt for the type if not given', function(done) {
    var command = new GetCommand();
    var options = {
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', undefined, 'server', 'database', 'user', 'password', options);
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Metastore Type: ');
    done();
  });

  it('set metastore should use the options for the type if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      type : 'hive'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', undefined, 'server', 'database', 'user', 'password', options);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal('hive');
    done();
  });

  it('set metastore should prompt for the server if not given', function(done) {
    var command = new GetCommand();
    var options = {
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', undefined, 'database', 'user', 'password', options);
    should.exist(command.user.promptIfNotGiven.getCall(1));
    command.user.promptIfNotGiven.getCall(2).args[0].should.be.equal('Metastore Server: ');
    done();
  });

  it('set metastore should use the options for the server if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      server : 'server1'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', undefined, 'database', 'user', 'password', options);
    command.user.promptIfNotGiven.getCall(2).args[1].should.be.equal('server1');
    done();
  });

  it('set metastore should prompt for the database if not given', function(done) {
    var command = new GetCommand();
    var options = {
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', undefined, 'user', 'password', options);
    should.exist(command.user.promptIfNotGiven.getCall(2));
    command.user.promptIfNotGiven.getCall(3).args[0].should.be.equal('Metastore Database: ');
    done();
  });

  it('set metastore should use the options for the database if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      database : 'db1'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', undefined, 'user', 'password', options);
    command.user.promptIfNotGiven.getCall(3).args[1].should.be.equal('db1');
    done();
  });

  it('set metastore should prompt for the user if not given', function(done) {
    var command = new GetCommand();
    var options = {
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', undefined, 'password', options);
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(4).args[0].should.be.equal('Metastore user: ');
    done();
  });

  it('set metastore should use the options for the user if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      user : 'user1'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', undefined, 'password', options);
    command.user.promptIfNotGiven.getCall(4).args[1].should.be.equal('user1');
    done();
  });

  it('set metastore should prompt for the metastorePassword if not given', function(done) {
    var command = new GetCommand();
    var options = {
      metastorePassword : 'password'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, options);
    should.exist(command.user.promptIfNotGiven.getCall(3));
    command.user.promptIfNotGiven.getCall(5).args[0].should.be.equal('Metastore password: ');
    done();
  });

  it('set metastore should use the options for the metastorePassword if supplied', function(done) {
    var command = new GetCommand();
    var options = {
      metastorePassword : 'password'
    };
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, options);
    command.user.promptIfNotGiven.getCall(5).args[1].should.be.equal('password');
    done();
  });

  it('set metastore should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, {});
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('set metastore should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, {});
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('set metastore should call verifyCompat command', function (){
    var command = new GetCommand();
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, {});
    command.user.verifyCompat.firstCall.args[1].should.be.equal(1.0);
  });

  it('set metastore should report an error if verifyCompat returns false', function (){
    var command = new GetCommand();
    command.user.compatResult = false;
    command.hdinsight.setConfigMetastoreCommand('test.json', 'hive', 'server', 'database', 'user', undefined, {});
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('The version of this configuration is not compatable with this version of the tools.');
  });

  it('set metastore should call writeConfig once it has set the config values', function(done) {
    var command = new GetCommand();
    command.hdinsight.setConfigMetastoreCommand('test.json', 'oozie', 'server', 'database', 'user', 'password', {});
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    var expected = { version: 1,
      oozieMetastore : {
        server : 'server',
        database : 'database',
        user : 'user',
        password : 'password'
      }
    };
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });

  it('remove metastore should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'type', {});
    should.not.exist(command.user.startProgress.firstCall);
    done();
  });

  it('remove metastore should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'type', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('remove metastore should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.removeConfigMetastoreCommand(undefined, 'type', {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('remove metastore should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.removeConfigMetastoreCommand(undefined, 'type', options);
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('remove metastore should prompt for the type if not given', function(done) {
    var command = new GetCommand();
    var options = {
    };
    command.hdinsight.removeConfigMetastoreCommand('test.json', undefined, options);
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Metastore Type: ');
    done();
  });

  it('remove metastore should use the options for the type if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      type : 'hive'
    };
    command.hdinsight.removeConfigMetastoreCommand('test.json', undefined, options);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal('hive');
    done();
  });

  it('remove metastore should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'hive', {});
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('remove metastore should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'hive', {});
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('remove metastore should call verifyCompat command', function (){
    var command = new GetCommand();
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'hive', {});
    command.user.verifyCompat.firstCall.args[1].should.be.equal(1.0);
  });

  it('remove metastore should report an error if verifyCompat returns false', function (){
    var command = new GetCommand();
    command.user.compatResult = false;
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'hive', {});
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('The version of this configuration is not compatable with this version of the tools.');
  });

  it('remove metastore should call writeConfig once it has set the config values', function(done) {
    var command = new GetCommand();
    command.hdinsight.removeConfigMetastoreCommand('test.json', 'oozie', {});
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    var expected = command.user.config;
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });


  it('add storage should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.addConfigStorageCommand('test.json', 'account', 'key', {});
    should.not.exist(command.user.startProgress.firstCall);
    done();
  });

  it('add storage should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.addConfigStorageCommand('test.json', 'account', 'key', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('add storage should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.addConfigStorageCommand(undefined, 'account', 'key', {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('add storage should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.addConfigStorageCommand(undefined, 'account', 'key', options);
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('add storage should prompt for the storageAccount if not given', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, 'key', options);
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Storage Account Name: ');
    done();
  });

  it('add storage should use the options for the storageAccount if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, 'key', options);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal('account');
    done();
  });


  it('add storage should prompt for the storageAccountKey if not given', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(2).args[0].should.be.equal('Storage Account Key: ');
    done();
  });

  it('add storage should use the options for the storageAccountKey if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.promptIfNotGiven.getCall(2).args[1].should.be.equal('key');
    done();
  });

  it('add storage should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('add storage should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('add storage should call verifyCompat command', function (){
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.verifyCompat.firstCall.args[1].should.be.equal(1.0);
  });

  it('add storage should report an error if verifyCompat returns false', function (){
    var command = new GetCommand();
    command.user.compatResult = false;
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('The version of this configuration is not compatable with this version of the tools.');
  });

  it('add storage should call writeConfig once it has set the config values', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
      storageAccountKey : 'key'
    };
    var expected = {
      version : 1,
      additionalStorageAccounts : [{
        name : 'account',
        key : 'key'
      }]
    }
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });

  it('add storage should replace a config when it already exists', function(done) {
    var command = new GetCommand();
    command.user.config = {
      version : 1,
      additionalStorageAccounts : [{
        name : 'account1',
        key : 'key1'
      }, {
        name : 'account2',
        key : 'key2'
      }]
    };
    var options = {
      file : 'test.json',
      storageAccountName : 'account1',
      storageAccountKey : 'key5'
    };
    var expected = {
      version : 1,
      additionalStorageAccounts : [{
        name : 'account2',
        key : 'key2'
      }, {
        name : 'account1',
        key : 'key5'
      }]
    }
    command.hdinsight.addConfigStorageCommand(undefined, undefined, undefined, options);
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });


  it('remove storage should not call startProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.createConfigCommand);
    command.hdinsight.removeConfigStorageCommand('test.json', 'account', {});
    should.not.exist(command.user.startProgress.firstCall);
    done();
  });

  it('remove storage should not call endProgress', function(done) {
    var command = new GetCommand();
    should.exist(command.hdinsight.listClustersCommand);
    command.hdinsight.removeConfigStorageCommand('test.json', 'account', {});
    should.not.exist(command.user.endProgress.firstCall);
    done();
  });

  it('remove storage should prompt for the fileName if not given', function(done) {
    var command = new GetCommand();
    command.hdinsight.removeConfigStorageCommand(undefined, 'account', {});
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.firstCall.args[0].should.be.equal('Config File Path: ');
    done();
  });

  it('remove storage should use the options for the fileName if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.removeConfigStorageCommand(undefined, 'account', options);
    command.user.promptIfNotGiven.firstCall.args[1].should.be.equal('test.json');
    done();
  });

  it('remove storage should prompt for the storageAccount if not given', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json'
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    should.exist(command.user.promptIfNotGiven.firstCall);
    command.user.promptIfNotGiven.getCall(1).args[0].should.be.equal('Storage Account Name: ');
    done();
  });

  it('remove storage should use the options for the storageAccount if not supplied positionaly', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account'
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    command.user.promptIfNotGiven.getCall(1).args[1].should.be.equal('account');
    done();
  });

  it('remove storage should call readConfig with the file path', function(done) {
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    command.user.readConfig.firstCall.args[0].should.be.equal('test.json');
    done();
  });

  it('remove storage should call logError if no config object is returned', function(done) {
    var command = new GetCommand();
    command.user.config = undefined;
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    command.user.logError.firstCall.args[0].should.be.equal('Could not read config data');
    done();
  });

  it('remove storage should call verifyCompat command', function (){
    var command = new GetCommand();
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    command.user.verifyCompat.firstCall.args[1].should.be.equal(1.0);
  });

  it('remove storage should report an error if verifyCompat returns false', function (){
    var command = new GetCommand();
    command.user.compatResult = false;
    var options = {
      file : 'test.json',
      storageAccountName : 'account',
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    should.exist(command.user.logError.firstCall);
    command.user.logError.firstCall.args[0].should.be.equal('The version of this configuration is not compatable with this version of the tools.');
  });

  it('remove storage should call writeConfig once it has set the config values', function(done) {
    var command = new GetCommand();
    command.user.config = {
      version : 1,
      additionalStorageAccounts : [{
        name : 'account1',
        key : 'key1'
      }, {
        name : 'account2',
        key : 'key2'
      }]
    };
    var options = {
      file : 'test.json',
      storageAccountName : 'account1'
    };
    var expected = {
      version : 1,
      additionalStorageAccounts : [{
        name : 'account2',
        key : 'key2'
      }]
    };
    command.hdinsight.removeConfigStorageCommand(undefined, undefined, options);
    command.user.writeConfig.firstCall.args[0].should.be.equal('test.json');
    command.user.writeConfig.firstCall.args[1].should.be.eql(expected);
    done();
  });

});