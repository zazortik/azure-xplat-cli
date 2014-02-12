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
var should = require('should');
var sinon = require('sinon');
var stream = require('stream');

var azure = require('azure');

var profile = require('../../../lib/util/profile');

describe('profile', function () {

  describe('default', function () {
    it('should contain public environments', function () {
      _.keys(profile.current.environments).length.should.be.greaterThan(1);
      profile.current.environments.should.have.property('AzureCloud');
      profile.current.environments.should.have.property('AzureChinaCloud');
    });
  });

  describe('when empty', function () {
    var p = profile.load({});

    it('should contain public environments', function () {
      _.keys(p.environments).length.should.equal(2);
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
          managementEndpoint: 'https://some.site.example'
        }]
      });
    });

    it('should include loaded and public environmentd', function () {
      p.environments.should.have.properties('TestProfile', 'AzureCloud', 'AzureChinaCloud');
    });

    describe('and saving', function () {
      var saved;

      before(function (done) {
        saveProfile(p, done, function (s) { saved = s; });
      });

      it('should include public profiles', function () {
        saved.environments.should.have.length(3);
      });

      it('should save custom environment', function () {
        var customEnvironment = _.filter(saved.environments,
          function (env) { return env.name === 'TestProfile'; })[0];

        customEnvironment.should.have.properties({
          name: 'TestProfile',
          managementEndpoint: 'https://some.site.example'
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
        p.subscriptions['Account'].should.have.properties({
          name: 'Account',
          id: 'db1ab6f0-4769-4b27-930e-01e2ef9c123c',
          serviceManagementUrl: 'https://management.core.windows.net/'
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
      managementEndpointUrl: 'https://management.core.windows.net/',
      managementCertificate: {
        key: 'to be determined',
        cert: 'to be determined'
      }
    };

    var p = profile.load({
      environments: [],
      subscriptions: [
        expectedSubscription
      ]
    });

    it('should contain one subscription', function () {
      _.keys(p.subscriptions).should.have.length(1);
    });

    it('should contain the named subscription', function () {
      should.exist(p.subscriptions['Account']);
    });

    it('should have expected properties', function () {
      p.subscriptions['Account'].should.have.properties(expectedSubscription);
    });

    describe('and saving', function () {
      var saved;
      before(function (done) {
        saveProfile(p, done, function (s) { saved = s; });
      });

      it('should write subscription', function (done) {
        should.exist(saved.subscriptions);
        saved.subscriptions.should.have.length(1);
        saved.subscriptions[0].should.have.properties(expectedSubscription);
        done();
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

      before(function () {
        p.addSubscription(newSub);
      });

      it('should reset the current subscription', function () {
        p.currentSubscription.should.be.exactly(newSub);
      });

      it('should remove default flag on old subscription', function () {
        p.subscriptions.Account.isDefault.should.be.false;
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
      }
    };

    var expectedSubscription2 = {
      name: 'Other',
      id: 'db1ab6f0-4769-4b27-930e-01e2ef9c124d',
      managementEndpointUrl: 'https://management.core.windows.net/',
      isDefault: true,
      managementCertificate: {
        key: 'fake key',
        cert: 'fake cert'
      }
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

    describe('when setting current subscription', function () {
      beforeEach(function () {
        p.currentSubscription = p.subscriptions[expectedSubscription1.name];
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

    describe('when creating service', function () {
      var fakeService = { withFilter: function () { return this; } };
      var factory = sinon.stub().returns(fakeService);
      var created;

      beforeEach(function () {
        created = p.currentSubscription.createClient(factory);
      });

      it('should have called the factory', function () {
        factory.calledOnce.should.be.true;
      });

      it('should call factory with expected subscription id', function () {
        var credentials = factory.args[0][0];
        credentials.subscriptionId.should.equal(p.currentSubscription.id);
      });

      it('should have correct key and cert', function () {
        var credentials = factory.args[0][0];
        credentials.credentials.should.have.properties({
          key: p.currentSubscription.managementCertificate.key,
          cert: p.currentSubscription.managementCertificate.cert
        });
      });

      it('should pass CloudCertificateCredentials', function () {
        factory.args[0][0].should.be.instanceOf(azure.CertificateCloudCredentials);
      });
    });

    describe('when deleting the Account subscription', function () {
      beforeEach(function () {
        p.deleteSubscription('Account');
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
        p.deleteSubscription('Other');
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
        p.deleteSubscription('Account');
        p.deleteSubscription('Other');
      });

      it('should have no subscriptions left', function () {
        _.keys(p.subscriptions).should.have.length(0);
      });

      it('should have no default subscription', function () {
        should.not.exist(p.currentSubscription);
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
