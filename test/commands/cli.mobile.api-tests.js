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
var fs = require('fs');
var MobileTest = require('../util/mobileTest');
var utils = require('../../lib/util/utils');

var suite;
var servicename;

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();

mobileTest.createServicesAndRunForEach(testApis);

function testApis(service) {
  it('api list shows no apis', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile api list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });

  it('api create', function (done) {
    suite.execute('mobile api create %s testapi --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('api create with permissions', function (done) {
    suite.execute('mobile api create %s testapitwo --permissions get=public,post=application,put=user,patch=admin,delete=admin --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  // Confirm apis were created
  it('api list shows two apis with permissions', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);

      response.should.includeEql({
        name: 'testapi',
        get: 'application',
        put: 'application',
        post: 'application',
        patch: 'application',
        delete: 'application'
      });
      response.should.includeEql({
        name: 'testapitwo',
        get: 'public',
        put: 'user',
        post: 'application',
        patch: 'admin',
        delete: 'admin'
      });
      done();
    });
  });

  it('api update permissions', function (done) {
    suite.execute('mobile api update %s testapi --permissions get=public,post=application,put=user,patch=admin,delete=admin --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('api delete testapitwo', function (done) {
    suite.execute('mobile api delete %s testapitwo --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('api list shows api with updated permissions', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.includeEql({
        name: 'testapi',
        get: 'public',
        put: 'user',
        post: 'application',
        patch: 'admin',
        delete: 'admin'
      });
      done();
    });
  });

  it('script upload to api', function (done) {
    suite.execute('mobile script upload %s api/testapi.js -f ' + mobileTest.testArtifactDir + '/testapi.js --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('script download from api', function (done) {
    suite.execute('mobile script download %s api/testapi.js -o -f ' + mobileTest.testArtifactDir + '/testapicopy.js --json', servicename, function (result) {
      try {
        fs.unlinkSync(mobileTest.testArtifactDir + '/testapicopy.js');
      } catch (e) { }
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('api delete testapi', function (done) {
    suite.execute('mobile api delete %s testapi --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('api list again shows no apis', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });
}
