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

var path = require('path');
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-group-tests';

var testStorageAccount = process.env['AZURE_ARM_TEST_STORAGEACCOUNT'];
var testLocation = process.env['AZURE_ARM_TEST_LOCATION'];

var normalizedTestLocation = testLocation.toLowerCase().replace(/ /g, '');
var createdGroups = [];
var createdDeployments = [];

describe('arm', function () {
  describe('group', function () {
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

    describe('create', function () {
      it('should create empty group', function (done) {
        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });

      it('should create a group with a named deployment from a template file and a parameter file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s -f %s -e %s -s %s -d %s --template-version %s --json --quiet',
          groupName, testLocation, templateFile, parameterFile, testStorageAccount, 'mydepTemplateFile', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should create a group with a named deployment from a gallery template and a parameter file', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
        var galleryTemplateName = 'Microsoft.ASPNETStarterSite.0.1.0-preview1';

        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s -y %s -e %s -d %s --template-version %s --json --quiet',
          groupName, testLocation, galleryTemplateName, parameterFile, 'mydepGalleryTemplate', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });

      it('should create a group with a named deployment from a template uri and parameter string', function (done) {
        var parameterString = fs.readFileSync(path.join(__dirname, '../../../data/startersite-parameters.json')).toString().replace(/\n/g, '').replace(/\r/g, '');
        var templateUri = 'https://gallerystoreprodch.blob.core.windows.net/prod-microsoft-windowsazure-gallery/8D6B920B-10F4-4B5A-B3DA-9D398FBCF3EE.PUBLICGALLERYITEMS.MICROSOFT.ASPNETSTARTERSITE.0.1.0-PREVIEW1/DeploymentTemplates/Website_NewHostingPlan-Default.json';

        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s --template-uri %s -p %s -d %s --template-version %s --json --quiet',
          groupName, testLocation, templateUri, parameterString, 'mydepTemplateUri', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group list --json', function (listResult) {
            listResult.exitStatus.should.equal(0);
            var groups = JSON.parse(listResult.text);

            groups.some(function (g) { return (g.name === groupName && g.location === normalizedTestLocation && g.provisioningState === 'Succeeded'); }).should.be.true;

            suite.execute('group deployment list -g %s --json', groupName, function (listResult) {
              listResult.exitStatus.should.equal(0);

              var results = JSON.parse(listResult.text);
              results.length.should.be.above(0);

              suite.execute('group delete %s --json --quiet', groupName, function () {
                done();
              });
            });
          });
        });
      });
    });

    describe('show', function () {
      it('should show information of an empty group', function (done) {
        var groupName = suite.generateId('xplatTestGrpShow', createdGroups, suite.isMocked);
        suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group show %s --json', groupName, function (showResult) {
            showResult.exitStatus.should.equal(0);

            var group = JSON.parse(showResult.text);
            group.name.should.equal(groupName);
            group.resources.length.should.equal(0);
            group.properties.provisioningState.should.equal('Succeeded');

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });

      it('should show information of a group with resources created in it', function (done) {
        var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
        var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');

        var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);

        suite.execute('group create %s --location %s -f %s -e %s -s %s -d %s --template-version %s --json --quiet',
          groupName, testLocation, templateFile, parameterFile, testStorageAccount, 'mydepTemplateFile', '1.0.0.0', function (result) {
          result.exitStatus.should.equal(0);

          suite.execute('group show %s --json', groupName, function (showResult) {
            showResult.exitStatus.should.equal(0);

            var group = JSON.parse(showResult.text);
            group.name.should.equal(groupName);
            group.properties.provisioningState.should.equal('Succeeded');

            group.resources.forEach(function (item) {
              item.location.should.equal(testLocation);
              if (item.type === 'Microsoft.Web/serverFarms') {
                item.name.should.equal('xDeploymentTestHost1');
              }
              else if (item.type === 'Microsoft.Web/sites') {
                item.name.should.equal('xDeploymentTestSite1');  
              }
            });

            suite.execute('group delete %s --json --quiet', groupName, function () {
              done();
            });
          });
        });
      });
    });
  });
});
