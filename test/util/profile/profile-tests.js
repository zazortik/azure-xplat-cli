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

var should = require('should');

var profile = require('../../../lib/util/profile');

describe('profile', function () {

  describe('when empty', function () {
    var p;

    before(function () {
      p = profile.load({});
    });

    it('should contain public environments', function () {
      p.environments.length.should.equal(2);
      p.environments.should.have.property('AzureCloud');
      p.environments.should.have.property('AzureChinaCloud');
    });
  });

  describe('when loaded with one profile', function () {
    var p;

    before(function () {
      p = profile.load({
        environments: [
        {
          name: 'TestProfile',
          managementEndpoint: 'https://some.site.example'
        }]
      });
    });

    it('should include loaded and public profiles', function () {
      p.environments.length.should.equal(3);
      ['TestProfile', 'AzureCloud', 'AzureChinaCloud'].forEach(function (name) {
        p.environments.should.have.property(name);
      });
    });
  });
});
