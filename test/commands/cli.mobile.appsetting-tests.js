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

mobileTest.createServicesAndRunForEach(testAppSettings);

function testAppSettings(service) {
  it('appsetting list shows no settings', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });

  it('appsetting add setting', function (done) {
    suite.execute('mobile appsetting add %s testsetting alpha1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('appsetting show setting', function (done) {
    suite.execute('mobile appsetting show %s testsetting --json', servicename, function (result) {
      var response = JSON.parse(result.text);
      response.name.should.equal('testsetting');
      response.value.should.equal('alpha1');
      done();
    });
  });

  it('appsetting list settings shows one setting', function (done) {
    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      done();
    });
  });

  it('appsetting delete settings', function (done) {
    suite.execute('mobile appsetting delete %s testsetting --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('appsetting list again shows no settings', function (done) {
    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });
}
