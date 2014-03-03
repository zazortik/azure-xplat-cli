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

var util = require('util');

var CLITest = require('../../../framework/csm-cli-test');
var testprefix = 'csm-cli-group-templates-tests';

describe('csm', function () {
  describe('group', function () {
    describe('template', function () {
      var suite;

      before(function (done) {
        suite = new CLITest(testprefix);
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

      describe('list', function () {
        it('should list all resource group templates from gallery', function (done) {
          suite.execute('group template list --json --env %s', process.env['AZURE_CSM_TEST_ENVIRONMENT'], function (result) {
            result.exitStatus.should.equal(0);

            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);

            done();
          });
        });
      });

      describe('list', function () {
        it('should list all resource group templates published by Microsoft from gallery', function (done) {
          suite.execute('group template list --publisher %s --json --env %s', 'Microsoft', process.env['AZURE_CSM_TEST_ENVIRONMENT'], function (result) {
            result.exitStatus.should.equal(0);

            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.publisher === 'Microsoft'; }).should.be.true;

            done();
          });
        });
      });

      // describe('show', function () {
      //   it('should show a resource group template from gallery', function (done) {
      //     var templateName = 'Microsoft.WebSiteMySQLDatabase.0.1.0-preview1';
      //     suite.execute('group template show %s --json --env %s', templateName, process.env['AZURE_CSM_TEST_ENVIRONMENT'], function (result) {
      //       result.exitStatus.should.equal(0);

      //       var template = JSON.parse(result.text);
      //       should.exist(template);
      //       // template.identity.should.equal(templateName);

      //       done();
      //     });
      //   });
      // });
    });
  });
});