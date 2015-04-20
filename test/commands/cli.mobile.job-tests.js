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

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();
mobileTest.addMobileServiceObject({
  args: {
    backend: 'DotNet'
  }
});

mobileTest.createServicesAndRunForEach(jobTests);

function jobTests(service) {
  it('job list has no jobs', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });

  it('job create', function (done) {
    suite.execute('mobile job create %s foobar --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list has one job', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      response[0].intervalUnit.should.equal('minute');
      response[0].intervalPeriod.should.equal(15);
      mobileTest.setTimeout(done, 90000);
    });
  });

  it('job update', function (done) {
    suite.execute('mobile job update %s foobar -u hour -i 2 -a enabled --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list shows update', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('enabled');
      response[0].intervalUnit.should.equal('hour');
      response[0].intervalPeriod.should.equal(2);
      done();
    });
  });

  it('job update on demand', function (done) {
    suite.execute('mobile job update %s foobar -u none --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list shows on demand', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      done();
    });
  });

  it('job update to have schedule', function (done) {
    suite.execute('mobile job update %s foobar -u minute -i 20 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list shows schedule', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      response[0].intervalUnit.should.equal('minute');
      response[0].intervalPeriod.should.equal(20);
      response[0].startTime.should.equal('1900-01-01T00:00:00Z');
      done();
    });
  });

  // Disable specific scheduler job
  it('job update disable', function (done) {
    suite.execute('mobile job update %s foobar -a disabled --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');

      done();
    });
  });

  it('job delete', function (done) {
    suite.execute('mobile job delete %s foobar --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list has no jobs at end', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });
}
