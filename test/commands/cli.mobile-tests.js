/**
* Copyright 2012 Microsoft Corporation
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

var should = require('should');
var url = require('url');
var uuid = require('node-uuid');
var util = require('util');
var cli = require('../cli');
var capture = require('../util').capture;

suite('azure mobile', function(){

  var servicename = 'clitest' + uuid();

  after(function (done) {
    //make best effort to remove the service in case of a test failure
    var cmd = ('node cli.js mobile delete ' + servicename + ' -a -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      done();
    });
  });

  test('create ' + servicename + ' tjanczuk FooBar#12 --json', function(done) {
    var cmd = ('node cli.js mobile create ' + servicename + ' tjanczuk FooBar#12 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.have.property('Name', servicename + 'mobileservice');
      response.should.have.property('Label', servicename);
      response.should.have.property('State', 'Healthy');
      done();
    });
  });

  test('list --json (contains service)', function(done) {
    var cmd = ('node cli.js mobile list --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.some(function (service) { 
        return service.name === servicename && service.state === 'Ready'; 
      }).should.be.ok;
      done();
    });
  });  

  test('show ' + servicename + ' --json', function(done) {
    var cmd = ('node cli.js mobile show ' + servicename + ' --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.service.name.should.equal(servicename);
      response.service.state.should.equal('Ready');
      response.application.Name.should.equal(servicename + 'mobileservice');
      response.application.Label.should.equal(servicename);
      response.application.State.should.equal('Healthy');
      done();
    });
  });  

  test('config list ' + servicename + ' --json', function(done) {
    var cmd = ('node cli.js mobile config list ' + servicename + ' --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.include({
        "apns": {
          "mode": "none"
        },
        "live": {},
        "service": {
          "dynamicSchemaEnabled": true
        },
        "auth": []
      });
      done();
    });
  });    

  test('config set ' + servicename + ' facebookClientId 123 --json', function(done) {
    var cmd = ('node cli.js mobile config set ' + servicename + ' facebookClientId 123 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });     

  test('config get ' + servicename + ' facebookClientId --json', function(done) {
    var cmd = ('node cli.js mobile config get ' + servicename + ' facebookClientId --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.facebookClientId.should.equal('123');
      done();
    });
  });     

  test('table list ' + servicename + ' --json', function(done) {
    var cmd = ('node cli.js mobile table list ' + servicename + ' --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });      

  test('delete ' + servicename + ' -a -q --json', function(done) {
    var cmd = ('node cli.js mobile delete ' + servicename + ' -a -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });  

  test('list --json (does not contain service)', function(done) {
    var cmd = ('node cli.js mobile list --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.some(function (service) { 
        return service.name === servicename; 
      }).should.not.be.ok;
      done();
    });
  });      

  test('delete ' + servicename + ' -a -q --json (nonexistent service)', function(done) {
    var cmd = ('node cli.js mobile delete ' + servicename + ' -a -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(1);
      result.stderrText.should.include('The application name was not found');
      done();
    });
  });  

});
