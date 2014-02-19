/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

// Tests of the publishSettings import

var path = require('path');
var should = require('should');

var publishSettings = require('../../../lib/util/profile/publishSettings');

var testFileDir = './test/data';
var oneSubscriptionFile = 'account-credentials.publishSettings';
var twoSubscriptionFile = 'account-credentials2.publishSettings';

describe('publishSettings import', function () {

  function pubSettingsPath(fileName) { return path.join(testFileDir, fileName); }

  describe('one subscription file', function () {
    var subs = publishSettings.import(pubSettingsPath(oneSubscriptionFile));

    it('should parse a single subscription', function () {
      subs.should.be.an.Array;
      subs.should.have.length(1);
    });

    it('should have read correct properties', function () {
      subs[0].should.have.properties({
        id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
        name: 'Account',
        managementEndpointUrl: 'https://management.core.windows.net/'
      });
    });

    it('should have parsed managementCertificate', function () {
      subs[0].should.have.property('managementCertificate');
      subs[0].managementCertificate.should.have.properties('key', 'cert');
    });
  });

  describe('two subscription file', function () {
    var subs = publishSettings.import(pubSettingsPath(twoSubscriptionFile));

    it('should parse two subscriptions', function () {
      subs.should.be.an.Array;
      subs.should.have.length(2);
    });

    it('should have read correct properties for first subscription', function () {
      subs[0].should.have.properties({
        id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
        name: 'Account',
        managementEndpointUrl: 'https://management.core.windows.net/'
      });
    });

    it('should have read correct properties for second subscription', function () {
      subs[1].should.have.properties({
        id: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
        name: 'Other',
        managementEndpointUrl: 'https://management.core.windows.net/'
      });
    });

    it('should share certs', function () {
      subs[0].managementCertificate.should.eql(subs[1].managementCertificate);
    });
  });
});
