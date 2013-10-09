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
var sinon = require('sinon');
var fs = require('fs');
var path = require('path');

var SubscriptionClient = require('../../../lib/commands/core/subscriptionclient');

describe('subscriptionclient', function () {
  var subscriptionClient;
  var currentSubscription = 'db1ab6f0-4769-4b27-930e-fake';

  before(function (done) {
    // Change azure dir for testing
    var azureDir = path.join(__dirname, '../../data/azure');
    process.env.AZURE_CONFIG_DIR = azureDir;

    cleanEnvironment();

    fs.mkdirSync(azureDir);
    fs.writeFileSync(
      path.join(azureDir, 'config.json'),
      '{"endpoint":"https://management.core.windows.net/","subscription":"' + currentSubscription + '"}'
    );

    var publishSettings = fs.readFileSync(path.join(__dirname, '../../data/account-credentials2.publishSettings')).toString();
    fs.writeFileSync(
      path.join(azureDir, 'publishSettings.xml'),
      publishSettings
    );

    var cliStub = {
      output: {
        silly: function() {},
        verbose: function() {}
      }
    };
    subscriptionClient = new SubscriptionClient(cliStub);

    done();
  });

  after(function (done) {
    cleanEnvironment();

    delete process.env.AZURE_CONFIG_DIR;

    done();
  });

  function cleanEnvironment() {
    var azureDir = path.join(__dirname, '../../data/azure');

    try { fs.unlinkSync(path.join(azureDir, 'config.json')); } catch (e) {}
    try { fs.unlinkSync(path.join(azureDir, 'publishSettings.xml')); } catch (e) {}
    try { fs.unlinkSync(path.join(azureDir, 'managementCertificate.pem')); } catch (e) {}
    try { fs.rmdirSync(azureDir); } catch (e) {}
  }

  describe('getCurrentSubscriptionId', function () {
    it('should work', function (done) {
      var subscription = subscriptionClient.getCurrentSubscriptionId();
      subscription.should.equal(currentSubscription);

      done();
    });
  });

  describe('getSubscriptions', function () {
    it('should work', function (done) {
      var subscriptions = subscriptionClient.getSubscriptions();
      subscriptions.some(function (s) {
        return s.Id === 'db1ab6f0-4769-4b27-930e-01e2ef9c124d' && s.Name === 'Other';
      }).should.equal(true);

      subscriptions.some(function (s) {
        return s.Id === 'db1ab6f0-4769-4b27-930e-01e2ef9c123c' && s.Name === 'Account';
      }).should.equal(true);

      done();
    });
  });

  describe('setSubscription', function () {
    it('should work', function (done) {
      subscriptionClient.setSubscription('db1ab6f0-4769-4b27-930e-01e2ef9c124d');
      var subscription = subscriptionClient.getCurrentSubscriptionId();
      subscription.should.equal('db1ab6f0-4769-4b27-930e-01e2ef9c124d');

      done();
    });
  });
});