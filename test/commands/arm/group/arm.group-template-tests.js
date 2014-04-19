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

var testLocation = process.env['AZURE_ARM_TEST_LOCATION'];
var testStorageAccount = process.env['AZURE_ARM_TEST_STORAGEACCOUNT'];

var testprefix = 'arm-cli-group-templates-tests';
var normalizedTestLocation = testLocation.toLowerCase().replace(/ /g, '');
var templateUri = 'https://gallerystoreprodch.blob.core.windows.net/prod-microsoft-windowsazure-gallery/8D6B920B-10F4-4B5A-B3DA-9D398FBCF3EE.PUBLICGALLERYITEMS.MICROSOFT.ASPNETSTARTERSITE.0.1.0-PREVIEW1/DeploymentTemplates/Website_NewHostingPlan-Default.json';
var galleryTemplateName = 'Microsoft.ASPNETStarterSite.0.1.0-preview1';
var createdGroups = [];
var cleanedUpGroups = 0;

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

      function cleanup(done) {
        function deleteGroups(index, callback) {
          if (index === createdGroups.length) {
            return callback();
          }
          suite.execute('group delete %s --quiet -vv', createdGroups[index], function () {
            deleteGroups(index + 1, callback);
          });
        }

        deleteGroups(cleanedUpGroups, function () {
          cleanedUpGroups = createdGroups.length;
          done();
        });
      }

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

        it('should list templates in web category from gallery', function (done) {
          suite.execute('group template list -c %s --json', 'web', function (result) {
            result.exitStatus.should.equal(0);
            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.categoryIds.indexOf('web') != -1}).should.be.true;

            done();
          });
        });

        it('should list templates from Microsoft in web category from gallery', function (done) {
          suite.execute('group template list -p %s -c %s --json', 'Microsoft', 'web', function (result) {
            result.exitStatus.should.equal(0);
            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.publisher === 'Microsoft'; }).should.be.true;
            templates.every(function (t) { return t.categoryIds.indexOf('web') != -1}).should.be.true;

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

        it('should download template file using name of template and overwrite the existing file', function (done) {
          suite.execute('group template download %s --json', templateName, function (result) {
            result.exitStatus.should.equal(0);
            utils.pathExistsSync(downloadFileName).should.be.true;

            suite.execute('group template download %s -q --json', templateName, function (result) {
              result.exitStatus.should.equal(0);
              utils.pathExistsSync(downloadFileName).should.be.true;

              fs.unlinkSync(downloadFileName);
              done();
            });
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

      describe('validate', function () {
        it('should pass when a valid file template with a storage account, a parameter file and a resource group are provided',  function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterFile = path.join(__dirname, '../../../data/arm-deployment-parameters.json');
          var templateFile = path.join(__dirname, '../../../data/arm-deployment-template.json');
          
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s -f %s -e %s -s %s --json', groupName, templateFile, parameterFile, testStorageAccount, function (result) {
              result.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });

        it('should pass when a valid gallery template with a parameter file and a resource group are provided',  function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
          var galleryTemplateName = 'Microsoft.ASPNETStarterSite.0.1.0-preview1';
          
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s -y %s -e %s --json', groupName, galleryTemplateName, parameterFile, function (result) {
              result.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });

        it('should pass when a valid template uri with a parameter string and a resource group are provided',  function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterString = fs.readFileSync(path.join(__dirname, '../../../data/startersite-parameters.json')).toString().replace(/\n/g, '').replace(/\r/g, '');
          
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s --template-uri %s -p %s --json', groupName, templateUri, parameterString, function (result) {
              result.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });

        it('should fail when an invalid gallery template is provided',  function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
          var invalidGalleryTemplateName = 'Microsoft.ASPNETStarterSite.0.1.0-preview101ABC';
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s -y %s -e %s --json', groupName, invalidGalleryTemplateName, parameterFile, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.include('Gallery item \'Microsoft.ASPNETStarterSite.0.1.0-preview101ABC\' was not found.');
              cleanup(done);
            });
          });
        });

        it('should fail when an invalid template uri is provided',  function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterString = fs.readFileSync(path.join(__dirname, '../../../data/startersite-parameters.json')).toString().replace(/\n/g, '').replace(/\r/g, '');
          var invalidTemplateUri = 'https://gallerystoreprodch.blob.core.windows.net/prod-microsoft-windowsazure-gallery/8D6B920B-10F4-4B5A-B3DA-9D398FBCF3EE.PUBLICGALLERYITEMS.MICROSOFT.ASPNETSTARTERSITE.0.1.0-PREVIEW1/DeploymentTemplates/Website_NewHostingPla.json';
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s --template-uri %s -p %s --json', groupName, invalidTemplateUri, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.include('Unable to download deployment template. Status code \'NotFound\'. ReasonPhrase \'NotFound\'.');
              cleanup(done);
            });
          });
        });

        it('should fail when a parameter for template is missing',  function (done) {
          var parameterString = "{ \"siteName\":{\"value\":\"xDeploymentTestSite1\"}, \"hostingPlanName\":{ \"value\":\"xDeploymentTestHost1\" }, \"sku\":{ \"value\":\"Free\" }, \"workerSize\":{ \"value\":\"0\" }}";
          var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
          
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s -y %s -p %s --json', groupName, galleryTemplateName, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.include('Deployment template validation failed: \'The value for the template parameter \'siteLocation\' is not provided.\'.');
              cleanup(done);
            });
          });
        });

        it('should fail when an invalid value (Free12) for template parameter (sku) is provided',  function (done) {
          var parameterString = "{ \"siteName\":{\"value\":\"xDeploymentTestSite1\"}, \"hostingPlanName\":{ \"value\":\"xDeploymentTestHost1\" }, \"siteLocation\":{ \"value\":\"West US\" }, \"sku\":{ \"value\":\"Free12\" }, \"workerSize\":{ \"value\":\"0\" }}";
          var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
          
          suite.execute('group create %s --location %s --json --quiet', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);

            suite.execute('group template validate -g %s -y %s -p %s --json', groupName, galleryTemplateName, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.include('Deployment template validation failed: \'The provided value for the template parameter \'sku\' is not valid.\'.');
              cleanup(done);
            });
          });
        });
      }); 
    });
  });
});
