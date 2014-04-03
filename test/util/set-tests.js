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

var Set = require('../../lib/util/set');

describe('Sets', function () {
  it('should contain keys that are set', function () {
    var s = new Set();
    s.add('a');
    s.has('a').should.be.true;
  });

  it('should use key transformation', function () {
    var s = new Set(function (k) { return k.toLowerCase(); });
    s.add('A');
    s.has('a').should.be.true;
  });

  it('should deduplicate', function () {
    var s = new Set(function (k) { return k.toLowerCase(); });
    s.add('a', 'A', 'b', 'B');
    s.has('a').should.be.true;
    s.has('b').should.be.true;
    s.keys().should.have.length(2);
  });

  it('should foreach over all keys', function () {
    var s = new Set();
    s.add('one', 'two', 'three');
    var remaining = 3;
    s.forEach(function (k) { --remaining; });
    remaining.should.equal(0);
  });
});