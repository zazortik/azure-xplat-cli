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
        p.saveToStream(es.wait(function (err, text) {
          if (err) {
            done(err);
          } else {
            saved = JSON.parse(text);
            done();
          }
        }));
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
});

