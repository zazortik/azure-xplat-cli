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
var https = require('https');

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

  test('create ' + servicename + ' tjanczuk FooBar#12 --json (create new service)', function(done) {
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

  test('list --json (contains healthy service)', function(done) {
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

  test('show ' + servicename + ' --json (contains healthy service)', function(done) {
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

  test('config list ' + servicename + ' --json (default config)', function(done) {
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

  test('config get ' + servicename + ' facebookClientId --json (value was set)', function(done) {
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

  test('table list ' + servicename + ' --json (no tables by default)', function(done) {
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

  test('table create ' + servicename + ' table1 --json (add first table)', function(done) {
    var cmd = ('node cli.js mobile table create ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });    

  test('table list ' + servicename + ' --json (contains one table)', function(done) {
    var cmd = ('node cli.js mobile table list ' + servicename + ' --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      response[0].name.should.equal('table1')
      done();
    });
  });      

  test('table show ' + servicename + ' table1 --json (default table config)', function(done) {
    var cmd = ('node cli.js mobile table show ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      ['insert', 'read', 'update', 'delete'].forEach(function (permission) {
        response.permissions[permission].should.equal('application');
      });
      response.table.name.should.equal('table1');
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(1);
      response.columns[0].name.should.equal('id');
      done();
    });
  });

  test('table update ' + servicename + ' table1 -p *=admin,insert=public --json (update permissions)', function(done) {
    var cmd = ('node cli.js mobile table update ' + servicename + ' table1 -p *=admin,insert=public --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });   

  test('table show ' + servicename + ' table1 --json (updated permissions)', function(done) {
    var cmd = ('node cli.js mobile table show ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      ['read', 'update', 'delete'].forEach(function (permission) {
        response.permissions[permission].should.equal('admin');
      });
      response.permissions.insert.should.equal('public');
      response.table.name.should.equal('table1');
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(1);
      response.columns[0].name.should.equal('id');
      done();
    });
  });  

  test('(add 5 rows of data to table with public insert permission)', function(done) {
    var success = 0;
    var failure = 0;

    function tryFinish() {
      if ((success + failure) < 5) {
        return;
      }

      failure.should.equal(0);
      done();
    }

    for (var i = 0; i < 5; i++) {
      var options = {
        host: servicename + '.azure-mobile.net',
        port: 443,
        path: '/tables/table1',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      var req = https.request(options, function (res) {
        res.statusCode >= 400 ? failure++ : success++;
        tryFinish();
      });

      req.on('error', function () {
        failure++;
        tryFinish();
      });

      req.end(JSON.stringify({ rowNumber: i, foo: 'foo', bar: 7, baz: true }));
    }
  });    

  test('table show ' + servicename + ' table1 --json (new rows and columns)', function(done) {
    var cmd = ('node cli.js mobile table show ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.table.metrics.recordCount.should.equal(5);
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(5);
      [ { name: 'id', indexed: true },
        { name: 'rowNumber', indexed: false },
        { name: 'foo', indexed: false },
        { name: 'bar', indexed: false },
        { name: 'baz', indexed: false } ].forEach(function (column, columnIndex) {
          response.columns[columnIndex].name.should.equal(column.name);
          response.columns[columnIndex].indexed.should.equal(column.indexed);
        });
      done();
    });
  });    

  test('table data ' + servicename + ' table1 --json (show 5 rows of data)', function(done) {
    var cmd = ('node cli.js mobile table data ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(5);
      done();
    });
  });    

  test('table data ' + servicename + ' table1 --top 1 --json (show top 1 row of data)', function(done) {
    var cmd = ('node cli.js mobile table data ' + servicename + ' table1 --top 1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      done();
    });
  });    

  test('table update ' + servicename + ' table1 --deleteColumn foo --addIndex bar,baz -q --json (delete column, add indexes)', function(done) {
    var cmd = ('node cli.js mobile table update ' + servicename + ' table1  --deleteColumn foo --addIndex bar,baz -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });   

  test('table show ' + servicename + ' table1 --json (fewer columns, more indexes)', function(done) {
    var cmd = ('node cli.js mobile table show ' + servicename + ' table1 --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(4);
      [ { name: 'id', indexed: true },
        { name: 'rowNumber', indexed: false },
        { name: 'bar', indexed: true },
        { name: 'baz', indexed: true } ].forEach(function (column, columnIndex) {
          response.columns[columnIndex].name.should.equal(column.name);
          response.columns[columnIndex].indexed.should.equal(column.indexed);
        });
      done();
    });
  });    

  test('table delete ' + servicename + ' table1 -q --json (delete existing table)', function(done) {
    var cmd = ('node cli.js mobile table delete ' + servicename + ' table1 -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });    

  test('table list ' + servicename + ' --json (no tables after table deletion)', function(done) {
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

  test('table delete ' + servicename + ' table1 -q --json (delete nonexisting table)', function(done) {
    var cmd = ('node cli.js mobile table delete ' + servicename + ' table1 -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.exitStatus.should.equal(1);
      result.stderrText.should.include('The table \'table1\' was not found');
      done();
    });
  });    

  test('delete ' + servicename + ' -a -q --json (delete existing service)', function(done) {
    var cmd = ('node cli.js mobile delete ' + servicename + ' -a -q --json').split(' ');
    capture(function() {
      cli.parse(cmd);
    }, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });  

  test('list --json (no services exist)', function(done) {
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

  test('delete ' + servicename + ' -a -q --json (delete nonexisting service)', function(done) {
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
