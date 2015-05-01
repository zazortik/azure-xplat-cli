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

mobileTest.createServicesAndRunForEach(keyTests);

function keyTests(service) {
  // Key Command Tests
  // Test setting and randomly generating the application key
  it('key set application', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile key set %s application LengthOfThirtyLettersAndNumber02 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.applicationKey.should.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  it('key regenerate application', function (done) {
    suite.execute('mobile key regenerate %s application --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.applicationKey.length.should.equal(32);
      response.applicationKey.should.not.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  // Repeat test for master key
  it('key set master', function (done) {
    suite.execute('mobile key set %s master LengthOfThirtyLettersAndNumber02 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.masterKey.should.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  it('key regenerate master', function (done) {
    suite.execute('mobile key regenerate %s master --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.masterKey.length.should.equal(32);
      response.masterKey.should.not.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });
}
