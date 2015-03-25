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

mobileTest.createServicesAndRunForEach(pushTests);

function pushTests(service) {
  // Push settings
  it('push nh enable', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile push nh enable %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push nh get', function (done) {
    suite.execute('mobile push nh get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.enableExternalPushEntity.should.equal(true);
      response.externalPushEntitySettingsPropertyBag.externalPushEntityState.should.equal('healthy');
      done();
    });
  });

  it('push mpns set', function (done) {
    suite.execute('mobile push mpns set %s ' + mobileTest.testArtifactDir + '/cert.pfx password --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push mpns get', function (done) {
    suite.execute('mobile push mpns get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.certificateKey.should.equal('password');
      response.enableUnauthenticatedSettings.should.equal(true);
      done();
    });
  });

  it('push mpns delete', function (done) {
    suite.execute('mobile push mpns delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push mpns get is empty', function (done) {
    suite.execute('mobile push mpns get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.enableUnauthenticatedSettings.should.equal(false);
      done();
    });
  });

  it('push nh disable', function (done) {
    suite.execute('mobile push nh disable %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push nh get is empty', function (done) {
    suite.execute('mobile push nh get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      JSON.stringify(response.externalPushEntitySettingsPropertyBag).should.equal('{}');
      done();
    });
  });
}
