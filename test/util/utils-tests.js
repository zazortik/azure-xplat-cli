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

var assert = require('assert');

// Test includes
var testutil = require('./util');

// Lib includes
var util = testutil.libRequire('util/utils');

suite('util-tests', function() {
  test('should start with', function (done) {
    assert.equal(util.stringStartsWith('test', 't'), true);
    assert.equal(util.stringStartsWith('test', 'e'), false);
    assert.equal(util.stringStartsWith('test', ''), true);
    assert.equal(util.stringStartsWith('test', null), true);
    assert.equal(util.stringStartsWith('test', 'T'), false);

    done();
  });

  test('should end with', function (done) {
    assert.equal(util.stringEndsWith('test', 't'), true);
    assert.equal(util.stringEndsWith('test', 'e'), false);
    assert.equal(util.stringEndsWith('test', ''), true);
    assert.equal(util.stringEndsWith('test', null), true);
    assert.equal(util.stringEndsWith('test', 'T'), false);

    done();
  });

  test('should equal ignore case', function (done) {
    assert.equal(util.ignoreCaseEquals(null, 'a'), false);
    assert.equal(util.ignoreCaseEquals('b', null), false);
    assert.equal(util.ignoreCaseEquals(null, null), true);
    assert.equal(util.ignoreCaseEquals(undefined, undefined), true);
    assert.equal(util.ignoreCaseEquals('A', 'a'), true);
    assert.equal(util.ignoreCaseEquals('AbC', 'aBc'), true);
    assert.equal(util.ignoreCaseEquals('AbC', 'aBcD'), false);

    done();
  });
});