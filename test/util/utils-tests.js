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

var assert = require('assert');

// Test includes
var testutil = require('./util');
var Subscription = testutil.libRequire('util/profile/subscription')
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

  test('getReplaceRegExpFromCharCode should work', function(done) {
    var charCodes = [];
    assert.equal(util.getReplaceRegExpFromCharCode(charCodes).toString(), '/(?:)/');
    charCodes = [65];
    assert.equal(util.getReplaceRegExpFromCharCode(charCodes).toString(), '/A/gim');
    charCodes = [65, 66];
    assert.equal(util.getReplaceRegExpFromCharCode(charCodes).toString(), '/A|B/gim');
    charCodes = [63];
    assert.equal(util.getReplaceRegExpFromCharCode(charCodes).toString(), '/\\?/gim');
    charCodes = [63, 66];
    assert.equal(util.getReplaceRegExpFromCharCode(charCodes).toString(), '/\\?|B/gim');
    done();
  });

  test('stringTrimEnd should work', function(done) {
    assert.equal(util.stringTrimEnd(null), null);
    assert.equal(util.stringTrimEnd(''), '');
    assert.equal(util.stringTrimEnd('a', 'a'), '');
    assert.equal(util.stringTrimEnd('abc   '), 'abc');
    assert.equal(util.stringTrimEnd('abc', 'c'), 'ab');
    assert.equal(util.stringTrimEnd('abccc', 'c'), 'ab');
    assert.equal(util.stringTrimEnd('abccc', 'd'), 'abccc');
    done();
  });

  test('escapeFilePath should work', function(done) {
    //Run test case on all platforms
    util.isWindows = function() { return true;};
    assert.equal(util.escapeFilePath('abc'), 'abc');
    assert.equal(util.escapeFilePath('a?c'), 'a%3fc');
    assert.equal(util.escapeFilePath('a\\c'), 'a%5cc');
    assert.equal(util.escapeFilePath('a/bc'), 'a%2fbc');
    assert.equal(util.escapeFilePath('a?c/*'), 'a%3fc%2f%2a');
    assert.equal(util.escapeFilePath('COM'), 'COM');
    assert.equal(util.escapeFilePath('COM1'), 'COM1 (1)');
    assert.equal(util.escapeFilePath('COm1'), 'COm1 (1)');
    assert.equal(util.escapeFilePath(''), '');
    assert.equal(util.escapeFilePath('a?*bc'), 'a%3f%2abc');
    assert.equal(util.escapeFilePath('a\0bc'), 'a%0bc');
    assert.equal(util.escapeFilePath('con'), 'con (1)');
    assert.equal(util.escapeFilePath('lpT9'), 'lpT9 (1)');
    assert.equal(util.escapeFilePath('LPT9?'), 'LPT9%3f');
    done();
  });

  test('create arm clients with a cert based subscription should fail', function () {
    var data = {
      managementCertificate : "some certifcate"
    }

    var subscription = new Subscription(data, {});

    try {
      util.createAutoRestClient('somefactory', subscription);
      assert.fail('no exception was thrown when creating autorest client ' + 
        'with a cert based subscription.');
    } catch (ex) {
      assert.ok(ex.message.indexOf('current cmdlet requires you to log in') > 0);
    }

    try {
      util.createComputeResourceProviderClient(subscription);
      assert.fail('no exception was thrown when creating arm compute client ' + 
        'with a cert based subscription.');
    } catch (ex) {
      assert.ok(ex.message.indexOf('current cmdlet requires you to log in') > 0);
    }
  });
});
