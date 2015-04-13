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

mobileTest.createServicesAndRunForEach(testAuth);

function testAuth(service) {
  // Auth commands
  it('auth microsoftaccount set', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    suite.execute('mobile auth microsoftaccount set %s 123 456 --packageSid 789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('123');
      response.secret.should.equal('456');
      response.packageSid.should.equal('789');
      done();
    });
  });

  it('auth microsoftaccount set updates appId and secret', function (done) {
    var cmd = ('mobile auth microsoftaccount set ' + servicename + ' 1234 5678 --json').split(' ');

    suite.execute(cmd, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');

      done();
    });
  });

  it('auth microsoftaccount get gets updated appId and secret', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      response.packageSid.should.equal('789');
      done();
    });
  });

  it('auth microsoftaccount set updates Sid', function (done) {
    suite.execute('mobile auth microsoftaccount set %s --packageSid 123456789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get gets updated Sid', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      response.packageSid.should.equal('123456789');
      done();
    });
  });

  it('auth microsoftaccount delete', function (done) {
    suite.execute('mobile auth microsoftaccount delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get is empty', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      // result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth facebook set', function (done) {
    suite.execute('mobile auth facebook set %s 1234 5678 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth facebook get', function (done) {
    suite.execute('mobile auth facebook get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('facebook');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      done();
    });
  });

  it('auth facebook delete', function (done) {
    suite.execute('mobile auth facebook delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth facebook get is empty', function (done) {
    suite.execute('mobile auth facebook get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth twitter set', function (done) {
    suite.execute('mobile auth twitter set %s 12345 6789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth twitter get', function (done) {
    suite.execute('mobile auth twitter get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('twitter');
      response.appId.should.equal('12345');
      response.secret.should.equal('6789');
      done();
    });
  });

  it('auth twitter delete', function (done) {
    suite.execute('mobile auth twitter delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth twitter get is empty', function (done) {
    suite.execute('mobile auth twitter get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth google set', function (done) {
    suite.execute('mobile auth google set %s 45678 9123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth google get', function (done) {
    suite.execute('mobile auth google get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('google');
      response.appId.should.equal('45678');
      response.secret.should.equal('9123');
      done();
    });
  });

  it('auth google delete', function (done) {
    suite.execute('mobile auth google delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth google get is empty', function (done) {
    suite.execute('mobile auth google get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth aad set suceeds', function (done) {
    suite.execute('mobile auth aad set %s 123456789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth aad tenant add', function (done) {
    suite.execute('mobile auth aad tenant add %s tenant.com --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    })
  });

  it('auth aad get shows appId and tenant', function (done) {
    suite.execute('mobile auth aad get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('aad');
      response.appId.should.equal('123456789');
      response.tenants.length.should.equal(1);
      response.tenants[0].should.equal('tenant.com');
      done();
    });
  });

  it('auth aad tenant shows tenant', function (done) {
    suite.execute('mobile auth aad tenant list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].should.equal('tenant.com');
      done();
    });
  });

  it('auth aad tenant delete', function (done) {
    suite.execute('mobile auth aad tenant delete %s tenant.com --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    })
  });

  it('auth aad tenant list is empty', function (done) {
    suite.execute('mobile auth aad tenant list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    })
  });

  it('auth aad delete suceeds', function (done) {
    suite.execute('mobile auth aad delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth aad get is empty', function (done) {
    suite.execute('mobile auth aad get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });
}
