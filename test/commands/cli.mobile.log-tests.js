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
var existingContinuationToken;

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();

mobileTest.createServicesAndRunForEach(logTests);

function logTests(service) {
  it('log starts with no logs', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile log %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.include({
        "results": []
      });
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

  it('table update insert permissions', function (done) {
    suite.execute('mobile table update %s table1 -p *=admin,insert=public --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script upload insert script', function (done) {
    suite.execute('mobile script upload %s table/table1.insert -f ' + mobileTest.testArtifactDir + '/table1.insert.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('add 5 rows to invoke scripts', function (done) {
    mobileTest.insert5Rows(servicename, 'table1', function (success, failure) {
      failure.should.equal(0);

      //wait to ensure log entries updated
      mobileTest.setTimeout(done, 5000);
    });
  });

  it('log has 15 entries', function (done) {
    suite.execute('mobile log %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(10);
      done();
    });
  });

  it('log has 10 info entries', function (done) {
    suite.execute('mobile log %s --type information --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(10);
      done();
    });
  });

  it('log has no warning entries', function (done) {
    suite.execute('mobile log %s --type warning --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(0);
      done();
    });
  });

  it('log has 5 error entries', function (done) {
    suite.execute('mobile log %s --type error --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(5);
      done();
    });
  });

  it('log list top 3 entries', function (done) {
    suite.execute('mobile log %s --top 3 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(3);
      done();
    });
  });

  it('log list top entry', function (done) {
    suite.execute('mobile log %s -r $top=1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(1);
      done();
    });
  });

  it('log skip one list one', function (done) {
    suite.execute('mobile log %s -r $top=1&$skip=1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(1);
      done();
    });
  });

  it('log get from table1', function (done) {
    suite.execute('mobile log %s --source /table/table1.insert.js --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(10);
      response.results.forEach(function (item) {
        item.timeCreated.should.not.be.empty;
        item.type.should.not.be.empty;
        item.source.should.not.be.empty;
        item.message.should.not.be.empty;
      });
      response.continuationToken.should.not.be.empty;
      existingContinuationToken = response.continuationToken;
      done();
    });
  });

  it('log get from table1 with continuationToken', function (done) {
    suite.execute('mobile log %s -c %s --source /table/table1.insert.js --json', servicename, existingContinuationToken, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.results).should.be.ok;
      response.results.length.should.equal(5);
      response.results.forEach(function (item) {
        item.timeCreated.should.not.be.empty;
        item.type.should.not.be.empty;
        item.source.should.not.be.empty;
        item.message.should.not.be.empty;
      });
      done();
    });
  });
}
