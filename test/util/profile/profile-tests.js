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

var es = require('event-stream');
var should = require('should');
var stream = require('stream');

var profile = require('../../../lib/util/profile');

describe('profile', function () {

  describe('default', function () {
    it('should contain public environments', function () {
      profile.environments.length.should.be.greaterThan(1);
      profile.environments.should.have.property('AzureCloud');
      profile.environments.should.have.property('AzureChinaCloud');
    });
  });

  describe('when empty', function () {
    var p = profile.load({});

    it('should contain public environments', function () {
      p.environments.length.should.equal(2);
      p.environments.should.have.property('AzureCloud');
      p.environments.should.have.property('AzureChinaCloud');
    });
  });

  describe('when loaded with one profile', function () {
    var p = profile.load({
      environments: [
      {
        name: 'TestProfile',
        managementEndpoint: 'https://some.site.example'
      }]
    });

    it('should include loaded and public profiles', function () {
      p.environments.should.have.length(3);
      ['TestProfile', 'AzureCloud', 'AzureChinaCloud'].forEach(function (name) {
        p.environments.should.have.property(name);
      });
    });

    describe('and saving', function () {
      var saved;

      before(function (done) {
        saveProfile(p, done, function (s) { saved = s; });
      });

      it('should not save public profiles', function () {
        saved.environments.should.have.length(1);
      });

      it('should save custom environment', function () {
        saved.environments[0].should.have.properties({
          name: 'TestProfile',
          managementEndpoint: 'https://some.site.example'
        });
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
      p.subscriptions.should.have.length(1);
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
