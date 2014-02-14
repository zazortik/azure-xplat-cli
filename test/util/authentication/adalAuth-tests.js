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

var adalAuth = require('../../../lib/util/authentication/adalAuth');

describe('tenant from username', function () {
  it('should return everything after @ if present', function () {
    adalAuth.tenantIdForUser('user@sometenant.testorg.example').should.equal('sometenant.testorg.example');
  });

  it('should append onmicrosoft.com if no domain present', function () {
    adalAuth.tenantIdForUser('user@sometenant').should.equal('sometenant.onmicrosoft.com');
  });

  it('should throw if no domain is present', function () {
    (function () {
      return adalAuth.tenantIdForUser('user');
    }).should.throw();
  });
});
