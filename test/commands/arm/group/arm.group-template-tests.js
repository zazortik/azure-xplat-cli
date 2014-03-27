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

var fs = require('fs');
var path = require('path');
var util = require('util');

var utils = require('../../../../lib/util/utils');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-group-templates-tests';

describe('arm', function () {
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
        it('should list all templates from gallery', function (done) {
          suite.execute('group template list --json', function (result) {
            if (result.exitStatus === 0) {
              result.exitStatus.should.equal(0);

              var templates = JSON.parse(result.text);
              templates.length.should.be.above(0);
              done();
            }
          });
        });

        it('should list all templates published by Microsoft from gallery', function (done) {
          suite.execute('group template list --publisher %s --json', 'Microsoft', function (result) {
            result.exitStatus.should.equal(0);

            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.publisher === 'Microsoft'; }).should.be.true;

            done();
          });
        });

        it('should list templates in category1 from gallery', function (done) {
          suite.execute('group template list -c %s --json', 'category1', function (result) {
            result.exitStatus.should.equal(0);
            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.categoryIds.indexOf('category1') != -1}).should.be.true;

            done();
          });
        });

        it('should list templates from Microsoft in category1 from gallery', function (done) {
          suite.execute('group template list -p %s -c %s --json', 'Microsoft', 'category1', function (result) {
            result.exitStatus.should.equal(0);
            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.publisher === 'Microsoft'; }).should.be.true;
            templates.every(function (t) { return t.categoryIds.indexOf('category1') != -1}).should.be.true;

            done();
          });
        });
      });

      describe('show', function () {
        var templateName = 'Microsoft.WebSiteMySQLDatabase.0.1.0-preview1';
        var expectedPublisher = 'Microsoft';
        var expectedVersion = '0.1.0-preview1';

        it('should show a resource group template from gallery with positional name', function (done) {
          suite.execute('group template show %s --json', templateName, function (result) {
            result.exitStatus.should.equal(0);

            var template = JSON.parse(result.text);
            should.exist(template);
            template.identity.should.equal(templateName);
            template.publisher.should.equal(expectedPublisher);
            template.version.should.equal(expectedVersion);

            done();
          });
        });

        it('should show a resource group template from gallery with name switch', function (done) {
          suite.execute('group template show --name %s --json', templateName, function (result) {
            result.exitStatus.should.equal(0);

            var template = JSON.parse(result.text);
            should.exist(template);
            template.identity.should.equal(templateName);
            template.publisher.should.equal(expectedPublisher);
            template.version.should.equal(expectedVersion);

            done();
          });
        });
      });

      describe('download', function () {
        var templateName = 'Microsoft.WebSiteMySQLDatabase.0.1.0-preview1';
        var downloadFileName = templateName + '.json';
        var downloadDir = 'testdownloaddir';
        var dirDownloadFileName = path.join(downloadDir, downloadFileName);

        beforeEach(function () {
          if (utils.pathExistsSync(downloadFileName)) {
            fs.unlinkSync(downloadFileName);
          }

          if (utils.pathExistsSync(dirDownloadFileName)) {
            fs.unlinkSync(dirDownloadFileName);
          }

          if (utils.pathExistsSync(downloadDir)) {
            fs.rmdirSync(downloadDir);
          }
        });

        it('should download template file using name of template', function (done) {
          suite.execute('group template download %s --json', templateName, function (result) {
            result.exitStatus.should.equal(0);
            utils.pathExistsSync(downloadFileName).should.be.true;

            fs.unlinkSync(downloadFileName);
            done();
          });
        });

        it('should create directory to download to and download file there', function (done) {
          suite.execute('group template download %s -f %s --json', templateName, dirDownloadFileName, function (result) {
            result.exitStatus.should.equal(0);

            utils.pathExistsSync(dirDownloadFileName).should.be.true;

            fs.unlinkSync(dirDownloadFileName);
            fs.rmdirSync(downloadDir);
            done();
          });
        });
      });
    });
  });
});
