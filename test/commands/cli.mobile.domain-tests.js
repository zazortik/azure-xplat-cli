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

/*
 INSTRUCTIONS FOR RE-GENERATING THE NOCK FILE:

  1. Make sure the tests are passing against live Microsoft Azure endpoints:
  1.0. Remember to register your Microsoft Azure credentials with `azure account import`
  1.1. Set the NOCK_OFF environment variable to `true`
  1.2. Run tests with `npm test`

  2. Re-run the tests against the live Microsoft Azure endpints while capturing the
     HTTP traffic:
  2.1. Make sure NOCK_OFF is still set to `true`
  2.2. Set AZURE_NOCK_RECORD to `true`
  2.3. Run the tests with `npm test`. The new cli.mobile.domain-tests.nock.js will be generated.

  3. Validate the new mocks:
  3.1. Unset both NOCK_OFF and AZURE_NOCK_RECORD environment variables
  3.2. Run the tests with `npm test`.
*/

var should = require('should');
var MobileTest = require('../util/mobileTest');
var utils = require('../../lib/util/utils');
var path = require('path');

var suite;
var serviceName = process.env.MOBILE_SERVICE_NAME || 'mamaso-domain-test';
//Custom domain (requires CNAME record to point to mobile service uri)
var domainName = process.env.CUSTOM_DOMAIN || 'domaintest.mattmason.me';
var fakeDomainName = 'fake.domain.com';

/*
To create a new cert, run in vs developer command prompt:

makecert -pe -n "CN=<custom domain>" -a sha1 -sky Exchange -eku 1.3.6.1.5.5.7.3.1 -sp "Microsoft RSA SChannel Cryptographic Provider" -sy 12 -sv domaincert.pvk domaincert.cer

enter in private key password in the dialog

pvk2pfx -pvk domaincert.pvk -spc domaincert.cer -pfx domaincert.pfx -po <private key password>
*/

//Thumbprint of domaincert.pfx
var certThumbprint = process.env.CERT_THUMBPRINT || 'ec5a24cce1ba72ae74adea2683728ecb3026a7bb';
var certPath = process.env.CUSTOM_DOMAIN_CERT_PATH || path.join(__dirname, 'mobile/domaincert.pfx');
//Password of domaincert.pfx
var certKey = process.env.CUSTOM_DOMAIN_CERT_KEY || 'password';

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject({
  servicename: serviceName
});

mobileTest.createServicesAndRunForEach(testCustomDomains);

function testCustomDomains(service) {
  it('scale to standard', function (done) {
    suite = mobileTest.suite;
    suite.execute('mobile scale change %s -t standard -q --json', serviceName, function (result) {
      result.exitStatus.should.equal(0);

      done();
    });
  });

  it('add domain', function (done) {
    suite.execute('mobile domain add %s %s --json ', serviceName, domainName, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile domain list %s --json ', serviceName, function (result) {
        result.exitStatus.should.equal(0);

        var domainList = JSON.parse(result.text);

        domainList.some(function (domain) {
          return domain === domainName;
        }).should.equal(true);

        done();
      });
    });
  });

  it('add cert', function (done) {
    suite.execute('mobile cert add %s %s %s --json ', serviceName, certPath, certKey, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile cert list %s --json ', serviceName, function (result) {
        result.exitStatus.should.equal(0);

        var certList = JSON.parse(result.text);

        certList.some(function (cert) {
          return cert.thumbprint === certThumbprint.toUpperCase();
        }).should.equal(true);

        done();
      });
    });
  });

  it('enable ssl', function (done) {
    suite.execute('mobile domain ssl enable %s %s %s --json ', serviceName, domainName, certThumbprint, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile domain ssl show %s %s --json ', serviceName, domainName, function (result) {
        result.exitStatus.should.equal(0);

        var state = JSON.parse(result.text);

        state.sslState.should.equal('sniEnabled');
        state.thumbprint.should.equal(certThumbprint.toUpperCase());

        done();
      });
    });
  });

  it('disable ssl', function (done) {
    suite.execute('mobile domain ssl disable %s %s %s --json ', serviceName, domainName, certThumbprint, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile domain ssl show %s %s --json ', serviceName, domainName, function (result) {
        result.exitStatus.should.equal(0);

        var state = JSON.parse(result.text);

        state.should.not.have.property('sslState');

        done();
      });
    });
  });

  it('delete cert', function (done) {
    suite.execute('mobile cert delete %s %s --json ', serviceName, certThumbprint, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile cert list %s --json ', serviceName, function (result) {
        result.exitStatus.should.equal(0);

        var certList = JSON.parse(result.text);

        certList.some(function (cert) {
          return cert.thumbprint === certThumbprint.toUpperCase();
        }).should.equal(false);

        done();
      });
    });
  });

  it('delete domain', function (done) {
    suite.execute('mobile domain delete %s %s --json', serviceName, domainName, function (result) {
      result.exitStatus.should.equal(0);

      suite.execute('mobile domain list %s --json', serviceName, function (result) {
        result.exitStatus.should.equal(0);

        var domainList = JSON.parse(result.text);

        domainList.some(function (domain) {
          return domain === domainName;
        }).should.equal(false);

        done();
      });
    });
  });
}
