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

var _ = require('underscore');
var es = require('event-stream');
var path = require('path');
var should = require('should');
var sinon = require('sinon');
var stream = require('stream');
var util = require('util');

var utils = require('../../../lib/util/utils');
var profile = require('../../../lib/util/profile');
var AccessTokenCloudCredentials = require('../../../lib/util/authentication/accessTokenCloudCredentials');
var subscriptionUtils = require('../../../lib/util/profile/subscriptionUtils');
var testFileDir = './test/data';
var oneSubscriptionFile = 'account-credentials.publishSettings';

describe('profile', function () {

  describe('default', function () {
    it('should contain public environments', function () {
      profile.current.environments.should.have.properties('AzureCloud', 'AzureChinaCloud');
    });
  });

  describe('when empty', function () {
    var p = profile.load({});

    it('should contain public environments', function () {
      _.keys(p.environments).length.should.equal(profile.Environment.publicEnvironments.length);
      p.environments.should.have.property('AzureCloud');
      p.environments.should.have.property('AzureChinaCloud');
    });
  });

  describe('when loaded with one environment', function () {
    var p;

    beforeEach(function () {
      p = profile.load({
        environments: [
        {
          name: 'TestProfile',
          managementEndpointUrl: 'https://some.site.example'
        }]
      });
    });

    it('should include loaded and public environments', function () {
      p.environments.should.have.properties('TestProfile', 'AzureCloud', 'AzureChinaCloud');
    });

    it('should read value for custom environment that was set', function () {
      p.getEnvironment('TestProfile').managementEndpointUrl.should.equal('https://some.site.example');
    });

    it('should throw when reading endpoint that is not set', function () {
      (function () {
        p.getEnvironment('TestProfile').resourceManagerEndpointUrl;
      }).should.throw(/not defined/);
    });

    describe('and saving', function () {
      var saved;

      before(function (done) {
        saveProfile(p, done, function (s) { saved = s; });
      });

      it('should not include public profiles', function () {
        saved.environments.should.have.length(1);
      });

      it('should save custom environment', function () {
        var customEnvironment = _.filter(saved.environments,
          function (env) { return env.name === 'TestProfile'; })[0];

        customEnvironment.should.have.properties({
          name: 'TestProfile',
          managementEndpointUrl: 'https://some.site.example'
        });
      });
    });

    describe('and importing publishSettings', function () {
      beforeEach(function () {
        p.importPublishSettings('./test/data/account-credentials2.publishSettings');
      });

      it('should import the subscriptions', function() {
        _.keys(p.subscriptions).should.have.length(2);
      });

      it('should have loaded first subscription', function () {
        p.subscriptions['db1ab6f0-4769-4b27-930e-01e2ef9c123c'].should.have.properties({
          name: 'Account',
          id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
          managementEndpointUrl: 'https://management.core.windows.net/'
        });
      });

      it('should set first subscription as default', function () {
        should.exist(p.currentSubscription);
        p.currentSubscription.name.should.equal('Account');
      });
    });
  });

  describe('when loaded with one subscription', function() {
    var expectedSubscription = {
      name: 'Account',
      id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
      managementCertificate: {
        key: 'to be determined',
        cert: 'to be determined'
      },
      environmentName: 'AzureCloud'
    };

    var p;

    beforeEach(function () {
      p = profile.load({
        environments: [],
        subscriptions: [
          expectedSubscription
        ]
      });
    });

    it('should contain one subscription', function () {
      _.keys(p.subscriptions).should.have.length(1);
    });

    it('should contain the named subscription', function () {
      p.subscriptions[expectedSubscription.id].name.should.equal('Account');
    });

    it('should have expected properties', function () {
      p.subscriptions[expectedSubscription.id].should.have.properties(
        _.omit(expectedSubscription, 'environmentName'));
      p.subscriptions[expectedSubscription.id].environment.should.equal(p.environments.AzureCloud);
    });

    describe('and saving', function () {
      var saved;
      beforeEach(function (done) {
        saveProfile(p, done, function (s) { saved = s; });
      });

      it('should write subscription', function (done) {
        should.exist(saved.subscriptions);
        saved.subscriptions.should.have.length(1);
        saved.subscriptions[0].should.have.properties(expectedSubscription);
        done();
      });
    });

    describe('and changing an endpoint specifically', function () {
      beforeEach(function () {
        p.subscriptions[expectedSubscription.id].managementEndpointUrl = 'http://some.new.url.example';
      });

      it('should save updated endpoint with subscription', function (done) {
        saveProfile(p, done, function (savedData) {
          savedData.subscriptions[0].managementEndpointUrl.should.equal('http://some.new.url.example');
        });
      });
    });

    describe('and adding a second subscription marked as default', function () {
      var newSub = new profile.Subscription({
        name: 'Other',
        id: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
        managementEndpointUrl: 'https://management.core.windows.net/',
        isDefault: true,
        managementCertificate: {
          key: 'fake key',
          cert: 'fake cert'
        }
      });

      beforeEach(function () {
        p.addOrUpdateSubscription(newSub, p.getEnvironment('AzureCloud'));
      });
      
      //There are no end user scenarios that new subscriptions added with 
      //"isDefault" be 'true', because this field doesn't come from the wire.
      //So we will respect the existing default one, rather the new one.
      it('should not reset the current subscription', function () {
        p.subscriptions[expectedSubscription.id].isDefault.should.be.true;
        p.currentSubscription.should.be.exactly(p.subscriptions[expectedSubscription.id]);
      });
    });

    describe('and logging in to already loaded subscription', function () {
      var loginUser = 'user';
      var loginSubscriptions = [
      {
        subscriptionId: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
        subscriptionName: 'Account',
        username: loginUser
      }];

      var expectedToken = {
        accessToken: 'Dummy token',
        refreshToken: 'Dummy refresh token',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
      };

      before(function () {
        sinon.stub(subscriptionUtils, 'getSubscriptions').callsArgWith(4, null, loginSubscriptions);
      });

      after(function () {
        subscriptionUtils.getSubscriptions.restore();
      });

      beforeEach(function (done) {
        var fakeEnvironment = new profile.Environment({
          name: 'TestEnvironment',
          activeDirectoryEndpointUrl: 'http://dummy.example',
          activeDirectoryResourceId: 'http://login.dummy.example',
          commonTenantName: 'common'
        });

        sinon.stub(fakeEnvironment, 'acquireToken').callsArgWith(3, null, expectedToken);

        fakeEnvironment.addAccount(loginUser, 'password', null, false, function (err, subscriptions) {
          subscriptions.forEach(function (s) {
            p.addOrUpdateSubscription(s);
          });

          done();
        });
      });

      it('should have one subscription', function () {
        _.keys(p.subscriptions).should.have.length(1);
      });

      it('should have management cert', function () {
        should.exist(p.subscriptions[expectedSubscription.id].managementCertificate);
      });

      it('should have expected cert', function () {
        p.subscriptions[expectedSubscription.id].managementCertificate.should.have.properties(expectedSubscription.managementCertificate);
      });

      it('should have expected username', function () {
        p.subscriptions[expectedSubscription.id].user.name.should.equal(loginUser);
      });
    });
  });

  describe('when loaded with two subscriptions', function () {
    var expectedSubscription1 = {
      name: 'Account',
      id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
      managementEndpointUrl: 'https://management.core.windows.net/',
      managementCertificate: {
        key: 'to be determined',
        cert: 'to be determined'
      },
      environmentName: 'AzureCloud'
    };

    var expectedSubscription2 = {
      name: 'Other',
      id: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
      managementEndpointUrl: 'https://management.core.windows.net/',
      isDefault: true,
      managementCertificate: {
        key: 'fake key',
        cert: 'fake cert'
      },
      environmentName: 'AzureCloud'
    };

    var p;

    beforeEach(function () {
      p = profile.load({
        subscriptions: [ expectedSubscription1, expectedSubscription2 ]
      });
    });

    it('should contain both subscriptions', function () {
      _.keys(p.subscriptions).should.have.length(2);
    });

    it('should have expected default subscription', function () {
      p.currentSubscription.id.should.equal(expectedSubscription2.id);
    });

    describe('with the same name', function () {
      var expectedSubscription3 = {
        name: 'Other',
        id: 'db1ab6f0-4769-4b27-930e-01e2ef9c125e',
        managementEndpointUrl: 'https://management.core.windows.net/',
        isDefault: false,
        managementCertificate: {
          key: 'fake key',
          cert: 'fake cert'
        },
        environmentName: 'AzureCloud'
      };

      beforeEach(function () {
        p = profile.load({
          subscriptions: [ expectedSubscription1, expectedSubscription2, expectedSubscription3 ]
        });
        p.currentSubscription = p.subscriptions[expectedSubscription1.id];
      });

      it('should get all the subscriptions when searching on subscription name and returnAllMatched is set to true', function () {
        var subs = p.getSubscription(expectedSubscription3.name, true);
        subs.length.should.equal(2);
        subs.some(function (s) { return utils.ignoreCaseEquals(s.id, expectedSubscription2.id); }).should.be.true;
        subs.some(function (s) { return utils.ignoreCaseEquals(s.id, expectedSubscription3.id); }).should.be.true;
      });

    });

    describe('when setting current subscription', function () {
      beforeEach(function () {
        p.currentSubscription = p.subscriptions[expectedSubscription1.id];
      });

      it('should set current subscription', function () {
        p.currentSubscription.id.should.equal(expectedSubscription1.id);
      });

      it('should set default flag on old one to false', function () {
        p.getSubscription(expectedSubscription2.id).isDefault.should.be.false;
      });

      it('should set default flag on new current subscription', function () {
        p.currentSubscription.isDefault.should.be.true;
      });
    });

    describe('when deleting the Account subscription', function () {
      beforeEach(function () {
        p.deleteSubscription(expectedSubscription1.id);
      });

      it('should have one subscription left', function () {
        _.keys(p.subscriptions).should.have.length(1);
      });

      it('should leave default subscription unchanged', function () {
        p.currentSubscription.name.should.equal('Other');
      });
    });

    describe('when deleting the default subscription', function () {
      beforeEach(function () {
        p.deleteSubscription(expectedSubscription2.id);
      });

      it('should have one subscription left', function () {
        _.keys(p.subscriptions).should.have.length(1);
      });

      it('should reset default subscription', function () {
        p.currentSubscription.name.should.equal('Account');
      });
    });

    describe('when deleting all subscriptions', function () {
      beforeEach(function () {
        p.deleteSubscription(expectedSubscription1.id);
        p.deleteSubscription(expectedSubscription2.id);
      });

      it('should have no subscriptions left', function () {
        _.keys(p.subscriptions).should.have.length(0);
      });

      it('should have no default subscription', function () {
        should.not.exist(p.currentSubscription);
      });
    });
  });

  describe('when loaded with one subscription with access token', function() {
    var expectedSubscription = {
      name: 'Account',
      id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
      username: 'someuser@someorg.example',
      environmentName: 'AzureCloud'
    };

    var p;

    beforeEach(function () {
      p = profile.load({
        environments: [],
        subscriptions: [
          expectedSubscription
        ]
      });
    });

    describe('and importing publishSettings for same account', function () {
      beforeEach(function () {
        var filePath = path.join(testFileDir, oneSubscriptionFile);
        p.importPublishSettings(filePath);
      });

      it('should have one subscription', function () {
        _.keys(p.subscriptions).should.have.length(1);
      });

      it('should have management cert', function () {
        should.exist(p.subscriptions[expectedSubscription.id].managementCertificate);
      });

      it('should have user name', function () {
        var loadedSubscription = p.subscriptions[expectedSubscription.id];
        should.exist(loadedSubscription.user);
        p.subscriptions[expectedSubscription.id].user.name.should.equal(expectedSubscription.username);
      });

      it('should have expected cert', function () {
        p.subscriptions[expectedSubscription.id].managementCertificate.should.have.properties('cert', 'key');
      });

      it('should create token credentials when asked for credentials', function () {
        p.subscriptions[expectedSubscription.id]._createCredentials()
          .should.be.instanceof(AccessTokenCloudCredentials);
      });
    });
  });
});

//////////////////////////
// Local helper functions
//

function saveProfile(profile, done, callback) {
  profile.saveToStream(es.wait(function (err, text) {
    if (err) {
      done(err);
    } else {
      callback(JSON.parse(text));
      done();
    }
  }));
}
