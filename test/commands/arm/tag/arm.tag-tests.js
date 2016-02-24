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

var path = require('path');
var should = require('should');

var CLITest = require('../../../framework/arm-cli-test');

var testprefix = 'arm-cli-tag-tests';
var groupPrefix = 'xplatTestTagCreate';
var createdTags = [];

var requiredEnvironment = [
  { requiresToken: true }
];

describe('arm', function () {

  describe('tag', function () {
    var suite;

    before(function (done) {
      suite = new CLITest(this, testprefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('managing tag end to end testing', function () {
      it('should create a tag with value and delete them when done', function (done) {
        var tagName = suite.generateId(groupPrefix, createdTags, suite.isMocked);
        var tagValue = 'foobar';
        suite.execute('tag create %s %s --json', tagName, tagValue, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('tag list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var tags = JSON.parse(listResult.text);
            tags.some(function (t) { return (t.tagName === tagName) && (t.values[0].tagValueProperty === tagValue); }).should.be.true;
            
            suite.execute('tag show %s --json', tagName, function (showResult) {
              showResult.exitStatus.should.equal(0);
              showResult.text.should.include(tagValue);
            
              suite.execute('tag delete %s --json --quiet', tagName, function (result) {
                result.exitStatus.should.equal(0);
                
                //make sure the tag is gone.
                suite.execute('tag list --json', function (listResult) {
                  listResult.exitStatus.should.equal(0);
                  var tags = JSON.parse(listResult.text);
                  tags.some(function (t) { return t.tagName === tagName; }).should.be.false;
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
