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
var should = require('should');
var MobileTest = require('../util/mobileTest');
var utils = require('../../lib/util/utils');

var suite;
var servicename;
var knownRecords;

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();

mobileTest.createServicesAndRunForEach(tableTests);

function tableTests(service) {
  it('table list starts with no tables', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile table list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });

  it('table create adds table1', function (done) {
    suite.execute('mobile table create %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table list contains table1', function (done) {
    suite.execute('mobile table list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      response[0].name.should.equal('table1');
      done();
    });
  });

  it('table show table1 has default config', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      ['insert', 'read', 'update', 'delete'].forEach(function (permission) {
        response.permissions[permission].should.equal('application');
      });
      response.table.name.should.equal('table1');
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(4);
      response.columns[0].name.should.equal('id');
      response.columns[0].type.should.equal('string');
      done();
    });
  });

  it('table update insert permissions', function (done) {
    suite.execute('mobile table update %s table1 -p *=admin,insert=public --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table show table1 has updated insert permissions', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      ['read', 'update', 'delete'].forEach(function (permission) {
        response.permissions[permission].should.equal('admin');
      });
      response.permissions.insert.should.equal('public');
      response.table.name.should.equal('table1');
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(4);
      response.columns[0].name.should.equal('id');
      done();
    });
  });

  it('table create table2 with permissions', function (done) {
    suite.execute('mobile table create -p insert=public,update=public,read=user,delete=admin %s table2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table show table2 has correct permissions', function (done) {
    suite.execute('mobile table show %s table2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      ['insert', 'update'].forEach(function (permission) {
        response.permissions[permission].should.equal('public');
      });
      response.permissions.read.should.equal('user');
      response.permissions.delete.should.equal('admin');
      response.table.name.should.equal('table2');
      done();
    });
  });

  it('table delete table2', function (done) {
    suite.execute('mobile table delete %s table2 -q --json', servicename, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('add 5 rows to table1', function (done) {
    mobileTest.insert5Rows(servicename, 'table1', function (success, failure) {
      failure.should.equal(0);
      done();
    });
  });

  it('table show table1 has new columns', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(8);
      [{
        name: 'id',
        indexed: true
      }, {
        name: '__createdAt',
        indexed: true
      }, {
        name: '__updatedAt',
        indexed: false
      }, {
        name: '__version',
        indexed: false
      }, {
        name: 'rowNumber',
        indexed: false
      }, {
        name: 'foo',
        indexed: false
      }, {
        name: 'bar',
        indexed: false
      }, {
        name: 'baz',
        indexed: false
      }].forEach(function (column, columnIndex) {
        response.columns[columnIndex].name.should.equal(column.name);
        response.columns[columnIndex].indexed.should.equal(column.indexed);
      });
      done();
    });
  });

  it('data read table1 has 5 rows', function (done) {
    suite.execute('mobile data read %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      knownRecords = JSON.parse(result.text);
      Array.isArray(knownRecords).should.be.ok;
      knownRecords.length.should.equal(5);
      done();
    });
  });

  it('data read table1 top 1 row', function (done) {
    suite.execute('mobile data read %s table1 --top 1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      response[0].id.should.equal(knownRecords[0].id);
      done();
    });
  });

  it('data read table1 skip 3 rows', function (done) {
    suite.execute('node clis.js mobile data read %s table1 --skip 3 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(2);
      response[0].id.should.equal(knownRecords[3].id);
      response[1].id.should.equal(knownRecords[4].id);
      done();
    })
  });

  it('data read table1 skip 2 top 2', function (done) {
    suite.execute('mobile data read %s table1 --skip 2 --top 2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(2);
      response[0].id.should.equal(knownRecords[2].id);
      response[1].id.should.equal(knownRecords[3].id);
      done();
    });
  });

  it('data read node clis.js top 2', function (done) {
    suite.execute('node clis.js mobile data read %s table1 $top=2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(2);
      response[0].id.should.equal(knownRecords[0].id);
      response[1].id.should.equal(knownRecords[1].id);
      done();
    })
  });

  it('table update table1 delete foo index bar and baz', function (done) {
    suite.execute('mobile table update %s table1  --deleteColumn foo --addIndex bar,baz -q --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table show table1 no foo with bar baz indexes', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(7);
      [{
        name: 'id',
        indexed: true
      }, {
        name: '__createdAt',
        indexed: true
      }, {
        name: '__updatedAt',
        indexed: false
      }, {
        name: '__version',
        indexed: false
      }, {
        name: 'rowNumber',
        indexed: false
      }, {
        name: 'bar',
        indexed: true
      }, {
        name: 'baz',
        indexed: true
      }].forEach(function (column, columnIndex) {
        response.columns[columnIndex].name.should.equal(column.name);
        response.columns[columnIndex].indexed.should.equal(column.indexed);
      });
      done();
    });
  });

  it('table update table1 delete bar index add custom column', function (done) {
    suite.execute('mobile table update %s table1 --deleteIndex bar --addColumn custom=string -q --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table show table1 bar indexed removed and custom column', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.columns).should.be.ok;
      response.columns.length.should.equal(8);
      [{
        name: 'id',
        indexed: true
      }, {
        name: '__createdAt',
        indexed: true
      }, {
        name: '__updatedAt',
        indexed: false
      }, {
        name: '__version',
        indexed: false
      }, {
        name: 'rowNumber',
        indexed: false
      }, {
        name: 'bar',
        indexed: false
      }, {
        name: 'baz',
        indexed: true
      }, {
        name: 'custom',
        indexed: false
      }].forEach(function (column, columnIndex) {
        response.columns[columnIndex].name.should.equal(column.name);
        response.columns[columnIndex].indexed.should.equal(column.indexed);
      });
      done();
    });
  });

  it('data delete table1 record', function (done) {
    suite.execute('mobile data delete %s table1 %s -q --json', servicename, knownRecords[0].id, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('data read table1 shows 4 rows', function (done) {
    suite.execute('mobile data read %s table1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      knownRecords = JSON.parse(result.text);
      Array.isArray(knownRecords).should.be.ok;
      knownRecords.length.should.equal(4);
      done();
    });
  });

  it('data truncate table1 deletes all data', function (done) {
    suite.execute('mobile data truncate %s table1 -q --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.didTruncate.should.equal(true);
      response.rowCount.should.equal(4);
      done();
    });
  });

  // Verify we can create old style tables
  it('table create legacy table', function (done) {
    suite.execute('mobile table create %s table3 --integerId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('table show legacy table', function (done) {
    suite.execute('mobile table show %s table3 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.columns).should.be.ok;
      response.columns[0].name.should.equal('id');
      response.columns[0].indexed.should.equal(true);
      response.columns[0].type.should.equal('bigint (MSSQL)');
      done();
    });
  });

  it('table delete legacy table', function (done) {
    suite.execute('mobile table delete %s table3 -q --json', servicename, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('table delete table1', function (done) {
    suite.execute('mobile table delete %s table1 -q --json', servicename, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('table list ends with no tables', function (done) {
    suite.execute('mobile table list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });

  it('table delete nonexisting table', function (done) {
    suite.execute('mobile table delete %s table1 -q --json', servicename, function (result) {
      result.exitStatus.should.equal(1);
      console.log(result.text);
      console.log(result.errorText);
      result.errorText.should.include('The table \'table1\' was not found');
      done();
    });
  });
}
