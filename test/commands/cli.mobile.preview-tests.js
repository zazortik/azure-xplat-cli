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

mobileTest.createServicesAndRunForEach(testPreviewFeatures);

function testPreviewFeatures(service) {
  it('preview list no features enabled', function (done) {
    servicename = service.servicename;
    suite = mobileTest.suite;
    suite.execute('mobile preview list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.available.should.containEql("Users");
      done();
    });
  });

  it('preview enable feature', function (done) {
    suite.execute('mobile preview enable %s users --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.featureName.should.equal("Users");
      done();
    });
  });

  it('preview list features enabled', function (done) {
    suite.execute('mobile preview list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.enabled.should.containEql("Users");
      done();
    });
  });
};
