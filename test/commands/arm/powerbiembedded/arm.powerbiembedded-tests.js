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
'use strict';

var should = require('should');
var utils = require('../../../../lib/util/utils');
var CLITest = require('../../../framework/arm-cli-test');
var testPrefix = 'arm-cli-powerbiembedded-tests';

var requiredEnvironment = [
  { name: 'AZURE_POWERBIEMBEDDED_TEST_LOCATION', defaultValue: 'southcentralus' },
  { name: 'AZURE_POWERBIEMBEDDED_TEST_SKU', defaultValue: 'S1' },
  { name: 'AZURE_POWERBIEMBEDDED_TEST_TIER', defaultValue: 'Standard' },
];
var resourceGroupPrefix = "azureXplatCliTestResourceGroup";
var createdResourceGroups = [];
var workspaceCollectionPrefix = "azureXplatCliTestWorkspaceCollection";
var createdWorkspaceCollections = [];

var suite;

describe('arm', function () {
  describe('powerbiembedded', function () {
    var resourceGroupName;
    var workspaceCollection;
    var workspaceCollectionName;
    var accountLcation = process.env.AZURE_POWERBIEMBEDDED_TEST_LOCATION;
    var accountSku = process.env.AZURE_POWERBIEMBEDDED_TEST_SKU;
    var accountTier = process.env.AZURE_POWERBIEMBEDDED_TEST_TIER;

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        resourceGroupName = suite.generateId(resourceGroupPrefix, createdResourceGroups);

        suite.execute('group create %s --json', resourceGroupName, function () {
          done();
        });
      });
    });

    after(function (done) {
      suite.execute('group delete %s --quiet --json', resourceGroupName, function () {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('can create a workspace collection in resource group', function (done) {
      workspaceCollectionName = suite.generateId(workspaceCollectionPrefix, createdWorkspaceCollections);

      suite.execute('powerbi create %s %s --json', resourceGroupName, workspaceCollectionName, function (result) {
        console.log(result);
        result.exitStatus.should.equal(0);
        // result.text.should.containEql('Succeeded');

        done();
      });
    });

    it('can create a workspace collection in resource group at specific location with tags', function (done) {
      workspaceCollectionName = suite.generateId(workspaceCollectionPrefix, createdWorkspaceCollections);
      var tagsString = "tag1=value1;tag2=value2";

      suite.execute('powerbi create %s %s --location %s --tags %s --json', resourceGroupName, workspaceCollectionName, tagsString, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    /**
     * Skip until update operation is fixed.
     */
    it.skip('should update the workspace collection with new tags', function (done) {
      var tagsString = "newTag=newValue;tag1=updatedValue;tag2=";

      suite.execute('powerbi update %s %s --tags %s --json', resourceGroupName, workspaceCollectionName, tagsString, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should list workspace collections within subscription', function (done) {
      suite.execute('powerbi list --json', function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should list workspace collections within subscription and within resource group', function (done) {
      suite.execute('powerbi list %s --json', resourceGroupName, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should return primary and secondary access keys', function (done) {
      suite.execute('powerbi get-keys %s %s --json', resourceGroupName, workspaceCollectionName, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    })

    it('should regenerate one of the keys for the workspace collection', function (done) {
      var keyName = "key1";

      suite.execute('powerbi regenerate-key %s %s %s --json', resourceGroupName, workspaceCollectionName, keyName, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });
    
    it('should list the workspaces within the workspace collection', function (done) {
      suite.execute('powerbi list-workspace', function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    /**
     * Skip until delete operation is fixed and working in the client repo.
     */
    it.skip('should delete workspace collection', function (done) {
      suite.execute('powerbi delete %s %s', resourceGroupName, workspaceCollectionName, function (result) {
        //result.text.should.containEql('Succeeded');
        result.exitStatus.should.equal(0);

        done();
      });
    });
  });
});