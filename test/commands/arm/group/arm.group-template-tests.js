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
var testUtil = require('../../../util/util');
var requiredEnvironment = [
  { requiresToken: true },
  { name: 'AZURE_ARM_TEST_LOCATION', defaultValue: 'West US' }
];

var testprefix = 'arm-cli-group-templates-tests';
var galleryTemplateName;
var galleryTemplateUrl;
var createdGroups = [];
var cleanedUpGroups = 0;

describe('arm', function () {
  describe('group', function () {
    describe('template', function () {
      var suite;
      var testLocation;
      var normalizedTestLocation;
      
      before(function (done) {
        suite = new CLITest(this, testprefix, requiredEnvironment);
        suite.setupSuite(done);
      });
      
      after(function (done) {
        suite.teardownSuite(done);
      });
      
      beforeEach(function (done) {
        suite.setupTest(function () {
          testLocation = process.env['AZURE_ARM_TEST_LOCATION'];
          normalizedTestLocation = testLocation.toLowerCase().replace(/ /g, '');
          testUtil.getTemplateInfoByName(suite, 'Microsoft.ASPNETStarterSite.0.2.2-preview', function (error, templateInfo) {
            if (error) {
              return done(new Error('Could not get template info: ' + error));
            }
            galleryTemplateName = templateInfo.templateName;
            galleryTemplateUrl = templateInfo.templateUrl;
            done();
          });
        });
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
        it('should list templates from Microsoft in web category from gallery', function (done) {
          suite.execute('group template list -p %s -c %s --json', 'Microsoft', 'web', function (result) {
            result.exitStatus.should.equal(0);
            var templates = JSON.parse(result.text);
            templates.length.should.be.above(0);
            templates.every(function (t) { return t.publisher === 'Microsoft'; }).should.be.true;
            templates.every(function (t) { return t.categoryIds.indexOf('web') != -1 }).should.be.true;
            
            done();
          });
        });
      });
      
      describe('show', function () {
        var templateName;
        var expectedPublisher;
        var expectedVersion;
        
        beforeEach(function (done) {
          suite.setupTest(function () {
            testUtil.getTemplateInfo(suite, 'Microsoft.WebSiteMySQLDatabase', function (error, templateInfo) {
              if (error) {
                console.log(error);
              }
              templateName = templateInfo.templateName;
              expectedPublisher = templateInfo.publisher;
              expectedVersion = templateInfo.version;
              done();
            });
          });
        });
        afterEach(function (done) {
          suite.teardownTest(done);
        });
        
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
        var templateName;
        var downloadFileName;
        var downloadDir;
        var dirDownloadFileName;
        
        function cleanup() {
          if (utils.pathExistsSync(downloadFileName)) {
            fs.unlinkSync(downloadFileName);
          }
          
          if (utils.pathExistsSync(dirDownloadFileName)) {
            fs.unlinkSync(dirDownloadFileName);
          }
          
          if (utils.pathExistsSync(downloadDir)) {
            fs.rmdirSync(downloadDir);
          } 
        }
        
        before(function (done) {
          suite.setupSuite(function () {
            testUtil.getTemplateInfo(suite, 'Microsoft.WebSiteMySQLDatabase', function (error, templateInfo) {
              if (error) {
                console.log(error);
              }
              templateName = templateInfo.templateName;
              downloadFileName = templateName + '.json';
              downloadDir = 'testdownloaddir';
              dirDownloadFileName = path.join(downloadDir, downloadFileName);
              done();
            });    
          }); 
        });
        
        beforeEach(function (done) {
          suite.setupTest(function () {
            cleanup();
            done();
          });
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
        it('should pass when a valid gallery template with a parameter file and a resource group are provided', function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
          
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group template validate -g %s -y %s -e %s --json', groupName, galleryTemplateName, parameterFile, function (result) {
              result.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });
        
        it('should pass when a valid template uri with a parameter string and a resource group are provided', function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterString = fs.readFileSync(path.join(__dirname, '../../../data/startersite-parameters.json')).toString().replace(/\n/g, '').replace(/\r/g, '');
          
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group template validate -g %s --template-uri %s -p %s --json', groupName, galleryTemplateUrl, parameterString, function (result) {
              result.exitStatus.should.equal(0);
              cleanup(done);
            });
          });
        });
        
        it('should fail when an invalid gallery template is provided', function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterFile = path.join(__dirname, '../../../data/startersite-parameters.json');
          var invalidGalleryTemplateName = 'Microsoft.ASPNETStarterSite.0.1.0-preview101ABC';
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group template validate -g %s -y %s -e %s --json', groupName, invalidGalleryTemplateName, parameterFile, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.include('Gallery item \'Microsoft.ASPNETStarterSite.0.1.0-preview101ABC\' was not found.');
              cleanup(done);
            });
          });
        });
        
        it('should fail when an invalid template uri is provided', function (done) {
          var groupName = suite.generateId('xplatTestGCreate', createdGroups, suite.isMocked);
          var parameterString = fs.readFileSync(path.join(__dirname, '../../../data/startersite-parameters.json')).toString().replace(/\n/g, '').replace(/\r/g, '');
          var invalidTemplateUrl = 'https://gallerystoreprodch.blob.core.windows.net/prod-microsoft-windowsazure-gallery/8D6B920B-10F4-4B5A-B3DA-9D398FBCF3EE.PUBLICGALLERYITEMS.MICROSOFT.ASPNETSTARTERSITE.0.1.0-PREVIEW1/DeploymentTemplates/Website_NewHostingPla.json';
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('group template validate -g %s --template-uri %s -p %s --json', groupName, invalidTemplateUrl, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.match(/.*Unable to download deployment content.*/i);
              cleanup(done);
            });
          });
        });
        
        it('should fail when a parameter for template is missing', function (done) {
          var parameterString = "{ \"siteName\":{\"value\":\"xDeploymentTestSite1\"}, \"hostingPlanName\":{ \"value\":\"xDeploymentTestHost1\" }, \"sku\":{ \"value\":\"Free\" }, \"workerSize\":{ \"value\":\"0\" }}";
          var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
          
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('group template validate -g %s -y %s -p %s --json', groupName, galleryTemplateName, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.match(/.*Deployment template validation failed.*/i);
              cleanup(done);
            });
          });
        });
        
        it('should fail when an invalid value (Free12) for template parameter (sku) is provided', function (done) {
          var parameterString = "{ \"siteName\":{\"value\":\"xDeploymentTestSite1\"}, \"hostingPlanName\":{ \"value\":\"xDeploymentTestHost1\" }, \"siteLocation\":{ \"value\":\"West US\" }, \"sku\":{ \"value\":\"Free12\" }, \"workerSize\":{ \"value\":\"0\" }}";
          var groupName = suite.generateId('xDeploymentTestGroup', createdGroups, suite.isMocked);
          
          suite.execute('group create %s --location %s --json', groupName, testLocation, function (result) {
            result.exitStatus.should.equal(0);
            
            suite.execute('group template validate -g %s -y %s -p %s --json', groupName, galleryTemplateName, parameterString, function (result) {
              result.exitStatus.should.equal(1);
              result.errorText.should.match(/.*Deployment template validation failed.*/i);
              cleanup(done);
            });
          });
        });
      });
    });
  });
});