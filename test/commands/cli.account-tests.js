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

var _ = require('underscore');
var should = require('should');
var sinon = require('sinon');
var fs = require('fs');
var util = require('util');

var adalAuth = require('../../lib/util/authentication/adalAuth');
var profile = require('../../lib/util/profile');
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');
var testPrefix = 'cli.account-tests';
var suite = new CLITest(null, testPrefix);

var testFile = './test/data/account-credentials.publishSettings';

describe('cli', function () {
  describe('account', function() {
    describe('env', function () {
      describe('list', function () {
        it('should include default environments', function (done) {
          suite.execute('account env list --json', function (result) {
            result.exitStatus.should.equal(0);
            var environments = JSON.parse(result.text);

            environments.AzureCloud.should.not.equal(null);
            environments.AzureChinaCloud.should.not.equal(null);
            environments.AzureCloud.publishingProfileUrl.should.not.equal(null);
            environments.AzureChinaCloud.publishingProfileUrl.should.not.equal(null);

            done();
          });
        });
      });
    });

    describe('import', function() {
      var sandbox;
      var originalProfile;
      var profileData;
      var clearAzureDir;

      before(function () {
        sandbox = sinon.sandbox.create();
        originalProfile = profile.current;
        profile.current = new profile.Profile();
        sandbox.stub(profile.current, 'save');
        clearAzureDir = sandbox.stub(profile, 'clearAzureDir');
        sandbox.stub(adalAuth.tokenCache, 'clear').callsArg(0);
      });

      after(function () {
        sandbox.restore();
        profile.current = originalProfile;
      });

      it('should import certificate', function(done) {
        suite.execute('account import %s --skipregister', testFile, function (result) {
          result.exitStatus.should.equal(0);
          _.values(profile.current.subscriptions).length.should.equal(1);
          done();
        });
      });

      it('should clear accounts', function (done) {
        suite.execute('account clear --quiet', function (result) {
          result.exitStatus.should.equal(0);
          _.values(profile.current.subscriptions).should.have.length(0);
          clearAzureDir.callCount.should.equal(1);
          adalAuth.tokenCache.clear.callCount.should.equal(1);
          done();
        });
      });
    });

    describe('show', function () {
      var sandbox;
      var originalProfile;

      before(function () {
        sandbox = sinon.sandbox.create();
        originalProfile = profile.current;
        profile.current = new profile.Profile();
        profile.current.addSubscription(new profile.Subscription({
          id: 'd3649b6d-2d60-40fc-aa54-8fda443c3c2c',
          name: 'testAccount',
          isDefault: true,
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        profile.current.addSubscription(new profile.Subscription({
          id: '9274827f-25c8-4195-ad6d-6c267ce32b27',
          name: 'Other',
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        profile.current.addSubscription(new profile.Subscription({
          id: '2874827f-25c8-4195-ad6d-6c267ce32b27',
          name: 'Other',
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        sandbox.stub(profile.current, 'save');
      });

      after(function () {
        sandbox.restore();
        profile.current = originalProfile;
      });

      it('should show the subscription by id', function (done) {
        suite.execute('account show %s -d --json', 'd3649b6d-2d60-40fc-aa54-8fda443c3c2c', function (result) {
          result.exitStatus.should.equal(0);
          subscriptions = JSON.parse(result.text);
          subscriptions[0].id.should.equal('d3649b6d-2d60-40fc-aa54-8fda443c3c2c');
          subscriptions[0].name.should.equal('testAccount');
          subscriptions[0].isDefault.should.be.true;
          done();
        });
      });

      it('should show information about all the subscriptions that match the provided name', function (done) {
        suite.execute('account show %s -d --json', 'Other', function (result) {
          result.exitStatus.should.equal(0);
          subscriptions = JSON.parse(result.text);
          subscriptions.should.have.length(2);
          subscriptions.some(function (s) { 
            return (utils.ignoreCaseEquals(s.id, '9274827f-25c8-4195-ad6d-6c267ce32b27') && s.name === 'Other'); 
          }).should.be.true;
          subscriptions.some(function (s) { 
            return (utils.ignoreCaseEquals(s.id, '2874827f-25c8-4195-ad6d-6c267ce32b27') && s.name === 'Other'); 
          }).should.be.true;
          done();
        });
      });
    });

    describe('set', function () {
      var sandbox;
      var originalProfile;

      before(function () {
        sandbox = sinon.sandbox.create();
        originalProfile = profile.current;
        profile.current = new profile.Profile();
        profile.current.addSubscription(new profile.Subscription({
          id: 'd3649b6d-2d60-40fc-aa54-8fda443c3c2c',
          name: 'testAccount',
          isDefault: true,
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        profile.current.addSubscription(new profile.Subscription({
          id: '9274827f-25c8-4195-ad6d-6c267ce32b27',
          name: 'Other',
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        profile.current.addSubscription(new profile.Subscription({
          id: '2874827f-25c8-4195-ad6d-6c267ce32b27',
          name: 'Other',
          managementCertificate: {
            cert: process.env.AZURE_CERTIFICATE,
            key: process.env.AZURE_CERTIFICATE_KEY
          }
        }, profile.current.getEnvironment('AzureCloud')));

        sandbox.stub(profile.current, 'save');
      });

      after(function () {
        sandbox.restore();
        profile.current = originalProfile;
      });

      it('should have three subscriptions', function (done) {
        suite.execute('account list --json', function (result) {
          result.exitStatus.should.equal(0);
          subscriptions = JSON.parse(result.text);
          subscriptions.should.have.length(3);
          done();
        });
      });

      it('should set subscription by id', function (done) {
        suite.execute('account set 2874827f-25c8-4195-ad6d-6c267ce32b27', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('account list --json', function (result) {
            result.exitStatus.should.equal(0);

            var subscriptions = JSON.parse(result.text);
            var subsById = _.object(subscriptions.map(function (s) { return s.id; }), subscriptions);

            subsById['2874827f-25c8-4195-ad6d-6c267ce32b27'].isDefault.should.be.true;
            subsById['9274827f-25c8-4195-ad6d-6c267ce32b27'].isDefault.should.be.false;
            subsById['d3649b6d-2d60-40fc-aa54-8fda443c3c2c'].isDefault.should.be.false;
            done();
          });
        });
      });

      it('with 2 subscriptions by same name should set first subscription if subscription name is provided', function (done) {
        suite.execute('account set Other', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('account list --json', function (result) {
            result.exitStatus.should.equal(0);

            var subscriptions = JSON.parse(result.text);
            var subsById = _.object(subscriptions.map(function (s) { return s.id; }), subscriptions);

            subsById['2874827f-25c8-4195-ad6d-6c267ce32b27'].isDefault.should.be.false;
            subsById['9274827f-25c8-4195-ad6d-6c267ce32b27'].isDefault.should.be.true;
            subsById['d3649b6d-2d60-40fc-aa54-8fda443c3c2c'].isDefault.should.be.false;
            done();
          });
        });
      });
    });
  });
});
