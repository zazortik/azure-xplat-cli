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

var should = require('should');

var WebsiteManagementService = require('../../lib/websites/websiteManagementService');
var MockedTestUtils = require('../framework/mocked-test-utils');

var testPrefix = 'website-tests';

describe('Website Management', function () {
  var sqlServersToClean = [];
  var service;
  var suiteUtil;

  before(function (done) {
    var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
    var auth = { keyvalue: testutil.getCertificateKey(), certvalue: testutil.getCertificate() };
    service = new WebsiteManagementService(
      subscriptionId, auth,
      { serializetype: 'XML'});

    suiteUtil = new MockedTestUtils(service, testPrefix);
    suiteUtil.setupSuite(done);
  });

  after(function (done) {
    deleteSqlServers(sqlServersToClean, function () {
      suiteUtil.teardownSuite(done);
    });
  });

  beforeEach(function (done) {
    suiteUtil.setupTest(done);
  });

  afterEach(function (done) {
    suiteUtil.baseTeardownTest(done);
  });

  describe('listWebspaces', function () {
    it('should work', function (done) {
      service.listWebspaces(function (err, webspaces) {
        should.exist(webspaces);
        webspaces.should.be.empty;
        done(err);
      });
    });
  });
});