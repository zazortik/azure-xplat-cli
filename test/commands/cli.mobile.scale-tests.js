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

mobileTest.createServicesAndRunForEach(scaleTests);

function scaleTests(service) {
  // Scale Tests
  it('scale show default', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier1');
      response.numberOfInstances.should.equal(1);
      done();
    });
  });

  it('scale change to 2 basic', function (done) {
    suite.execute('mobile scale change %s -t basic -i 2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show 2 basic', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier2');
      response.numberOfInstances.should.equal(2);
      done();
    });
  });

  it('scale change to standard', function (done) {
    suite.execute('mobile scale change %s -t standard --json -q', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show standard', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier3');
      response.numberOfInstances.should.equal(2);
      done();
    });
  });

  it('scale change to default', function (done) {
    suite.execute('mobile scale change %s -t free -i 1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show back to default', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier1');
      response.numberOfInstances.should.equal(1);
      done();
    });
  });
}
