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

var CLITest = require('../../../framework/arm-cli-test');
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-cli-cdn-management-tests';

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_LOCATION',
  defaultValue: 'East US 2'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP_1',
  defaultValue: 'xplattestadlsrg01'
}, {
  name: 'AZURE_ARM_TEST_CDN_PROFILE_1',
  defaultValue: 'cliTestProfile01'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP_2',
  defaultValue: 'xplattestadlsrg02'
}, {
  name: 'AZURE_ARM_TEST_CDN_PROFILE_2',
  defaultValue: 'cliTestProfile02'
}, {
  name: 'AZURE_ARM_TEST_CDN_ENDPOINT_1',
  defaultValue: 'cliTestEndpoint01'
}, {
  name: 'AZURE_ARM_TEST_CDN_ENDPOINT_2',
  defaultValue: 'cliTestEndpoint02'
}, {
  name: 'AZURE_ARM_TEST_CDN_ORIGIN_1',
  defaultValue: 'cliTestOrigin01'
}, {
  name: 'AZURE_ARM_TEST_CDN_ORIGIN_2',
  defaultValue: 'cliTestOrigin02'
}, {
  name: 'AZURE_ARM_TEST_ENDPOINT_TEST_LOCATION_1',
  defaultValue: 'eastus'
}, {
  name: 'AZURE_ARM_TEST_CUSTOM_DOMAIN_NAME_1',
  defaultValue: 'cliTestCustomDomain01',
}, {
  name: 'AZURE_ARM_TEST_CUSTOM_DOMAIN_HOST_NAME_1',
  defaultValue: 'cli-1-406f580d-a634-4077-9b11-216a70c5998d.azureedge-test.net',
}];

var suite;
var testLocation;
var testResourceGroup_1;
var testProfileName_1;
var testResourceGroup_2;
var testProfileName_2;
var testEndpointName_1;
var testEndpointName_2;
var testOriginName_1;
var testOriginName_2;
var testEndpointLocation;
var testCustomDomainName_1;
var testCustomDomainHostName_1;

describe('arm', function() {
  before(function(done) {
    suite = new CLITest(this, testPrefix, requiredEnvironment);

    if (suite.isMocked) {
      utils.POLL_REQUEST_INTERVAL = 0;
    }

    suite.setupSuite(function() {
      testLocation = process.env.AZURE_ARM_TEST_LOCATION;
      testLocation = testLocation.toLowerCase().replace(/ /g, '');
      testResourceGroup_1 = process.env.AZURE_ARM_TEST_RESOURCE_GROUP_1;
      testProfileName_1 = process.env.AZURE_ARM_TEST_CDN_PROFILE_1;
      testResourceGroup_2 = process.env.AZURE_ARM_TEST_RESOURCE_GROUP_2;
      testProfileName_2 = process.env.AZURE_ARM_TEST_CDN_PROFILE_2;
      testEndpointName_1 = process.env.AZURE_ARM_TEST_CDN_ENDPOINT_1;
      testEndpointName_2 = process.env.AZURE_ARM_TEST_CDN_ENDPOINT_2;
      testOriginName_1 = process.env.AZURE_ARM_TEST_CDN_ORIGIN_1;
      testOriginName_2 = process.env.AZURE_ARM_TEST_CDN_ORIGIN_2;
      testEndpointLocation = process.env.AZURE_ARM_TEST_ENDPOINT_TEST_LOCATION_1;
      testCustomDomainName_1 = process.env.AZURE_ARM_TEST_CUSTOM_DOMAIN_NAME_1;
      testCustomDomainHostName_1 = process.env.AZURE_ARM_TEST_CUSTOM_DOMAIN_HOST_NAME_1;
      if (!suite.isPlayback()) {
        suite.execute('group create %s --location %s --json', testResourceGroup_1, testLocation, function() {
          suite.execute('group create %s --location %s --json', testResourceGroup_2, testLocation, function() {
            done();
          });
        });
      } else {
        done();
      }
    });
  });


  after(function(done) {
    suite.execute('group delete %s --quiet --json', testResourceGroup_1, function() {
      suite.execute('group delete %s --quiet --json', testResourceGroup_2, function() {
        suite.teardownSuite(done);
      });
    });
  });

  beforeEach(function(done) {
    suite.setupTest(done);
  });

  afterEach(function(done) {
    suite.teardownTest(done);
  });

  describe('Cdn Profile', function() {
    it('list command should not exist error', function(done) {
      suite.execute('cdn profile list --json', function(result) {
        result.exitStatus.should.be.equal(0);
        var profileListJson = JSON.parse(result.text);
        profileListJson.length.should.equal(0);
        done();
      });
    });

    it('create command should success', function(done) {
      suite.execute('cdn profile create %s %s %s %s --json', testProfileName_1, testResourceGroup_1, "westus", "Standard", function(result) {
        result.exitStatus.should.be.equal(0);
        var profileJson = JSON.parse(result.text);
        profileJson.name.should.be.equal(testProfileName_1);
        done();
      });
    });

    it('list command should now list one', function(done) {
      suite.execute('cdn profile list --json', function(result) {
        result.exitStatus.should.be.equal(0);
        var profileListJson = JSON.parse(result.text);
        profileListJson.length.should.equal(1);
        profileListJson[0].name.should.be.equal(testProfileName_1);
        done();
      });
    });

    it('create command should success with tags', function(done) {
      suite.execute("cdn profile create %s %s %s %s -t tag1=val1;tag2=val2 --json", testProfileName_2, testResourceGroup_2, "westus", "Standard", function(result) {
        result.exitStatus.should.be.equal(0);
        var profileJson = JSON.parse(result.text);
        profileJson.name.should.be.equal(testProfileName_2);
        profileJson.tags.tag1.should.equal('val1');
        profileJson.tags.tag2.should.equal('val2');
        done();
      });
    });

    it('list command should now list two', function(done) {
      suite.execute('cdn profile list --json', function(result) {
        result.exitStatus.should.be.equal(0);
        var profileListJson = JSON.parse(result.text);
        profileListJson.length.should.equal(2);
        done();
      });
    });

    it('list command should only list one when resource group options is specified', function(done) {
      suite.execute('cdn profile list -g %s --json', testResourceGroup_2, function(result) {
        result.exitStatus.should.be.equal(0);
        var profileListJson = JSON.parse(result.text);
        profileListJson.length.should.equal(1);
        profileListJson[0].name.should.equal(testProfileName_2);
        done();
      });
    });

    it('set command should update profile tags succesfully', function(done) {
      suite.execute('cdn profile set %s %s -t tag1=val1 --json', testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var profileJson = JSON.parse(result.text);
        profileJson.tags.tag1.should.equal('val1');
        done();
      });
    });

    it('show command should get the profile info', function(done) {
      suite.execute('cdn profile show %s %s --json', testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var profileJson = JSON.parse(result.text);
        profileJson.name.should.be.equal(testProfileName_1);
        profileJson.tags.tag1.should.equal('val1');
        profileJson.sku.name.should.equal('Standard');
        done();
      });
    });

    it('delete command should successfully delete the profile', function(done) {
      suite.execute('cdn profile delete %s %s --json', testProfileName_2, testResourceGroup_2, function(result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('list command should now list only one profile', function(done) {
      suite.execute('cdn profile list --json', function(result) {
        result.exitStatus.should.be.equal(0);
        var profileListJson = JSON.parse(result.text);
        profileListJson.length.should.equal(1);
        profileListJson[0].name.should.equal(testProfileName_1);
        done();
      });
    });
  });

  describe('Cdn Endpoints', function() {
    it('list command should list zero in the beginning', function(done) {
      suite.execute('cdn endpoint list %s %s --json', testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var endpointListJson = JSON.parse(result.text);
        endpointListJson.length.should.equal(0);
        done();
      });
    });

    it('create command should create endpoint successfully', function(done) {
      suite.execute('cdn endpoint create %s %s %s %s %s %s -t tag1=val1;tag2=val2 --json', testEndpointName_1, testProfileName_1,
        testResourceGroup_1, testEndpointLocation, testOriginName_1, "test.azure.net",
        function(result) {
          result.exitStatus.should.be.equal(0);
          var endpointJson = JSON.parse(result.text);
          endpointJson.name.should.equal(testEndpointName_1);
          endpointJson.isHttpAllowed.should.equal(true);
          endpointJson.isHttpsAllowed.should.equal(true);
          endpointJson.resourceState.should.equal("Running");
          endpointJson.location.should.equal("EastUs");
          endpointJson.origins[0].name.should.equal(testOriginName_1);
          endpointJson.tags.tag1.should.equal("val1");
          endpointJson.tags.tag2.should.equal("val2");
          done();
        });
    });

    it('list command should list one after the creation', function(done) {
      suite.execute('cdn endpoint list %s %s --json', testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var endpointListJson = JSON.parse(result.text);
        endpointListJson.length.should.equal(1);
        done();
      });
    });

    it('stop command should stop the endpoint', function(done) {
      suite.execute('cdn endpoint stop %s %s %s --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('show command should get the endpoint and it should be stopped', function(done) {
      suite.execute('cdn endpoint show %s %s %s --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var endpointJson = JSON.parse(result.text);
        endpointJson.name.should.equal(testEndpointName_1);
        endpointJson.isHttpAllowed.should.equal(true);
        endpointJson.isHttpsAllowed.should.equal(true);
        endpointJson.resourceState.should.equal("Stopped");
        endpointJson.location.should.equal("EastUs");
        endpointJson.origins[0].name.should.equal(testOriginName_1);
        endpointJson.tags.tag1.should.equal("val1");
        endpointJson.tags.tag2.should.equal("val2");
        done();
      });
    });

    it('start command should start the endpoint', function(done) {
      suite.execute('cdn endpoint start %s %s %s --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    //TODO: There is a bug in the SDK that makes async patch not available, un-comment this test once that is fixed
    //it('set command should update the endpoint', function (done) {
    //    suite.execute('cdn endpoint set %s %s %s -w false --tags tag1=val1 --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function (result) {
    //        result.exitStatus.should.be.equal(0);
    //        var endpointJson = JSON.parse(result.text);
    //        endpointJson.name.should.equal(testEndpointName_1);
    //        endpointJson.isHttpAllowed.should.equal(true);
    //        endpointJson.isHttpsAllowed.should.equal(false);
    //        endpointJson.resourceState.should.equal("Running");
    //        endpointJson.location.should.equal("EastUs");
    //        endpointJson.origins[0].name.should.equal(testOriginName_1);
    //        endpointJson.tags.tag1.should.equal("val1");
    //        endpointJson.tags.should.not.have.property('tag2');
    //        done();
    //    });
    //});

    it('purge command should purge the content with out error', function(done) {
      suite.execute('cdn endpoint purge %s %s %s /movies/*,/pictures/pic1.jpg --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        console.log(result.errorText);
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('purge command should purge fake content with error', function(done) {
      suite.execute('cdn endpoint purge %s %s %s fakePath! --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(1);
        done();
      });
    });

    it('load command should load the content with out error', function(done) {
      suite.execute('cdn endpoint load %s %s %s /movies/amazing.mp4,/pictures/pic1.jpg --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        console.log(result.errorText);
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('load command should load content of invalid paths with error', function(done) {
      suite.execute('cdn endpoint load %s %s %s /movies/*,/pictures/pic1.jpg --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(1);
        done();
      });
    });

    it('create command should create endpoint successfully with options', function(done) {
      suite.execute('cdn endpoint create %s %s %s %s %s %s -a false  --json', testEndpointName_2, testProfileName_1,
        testResourceGroup_1, testEndpointLocation, testOriginName_2, "test2.azure.net",
        function(result) {
          result.exitStatus.should.be.equal(0);
          var endpointJson = JSON.parse(result.text);
          endpointJson.name.should.equal(testEndpointName_2);
          endpointJson.isHttpAllowed.should.equal(true);
          endpointJson.isHttpsAllowed.should.equal(false);
          endpointJson.resourceState.should.equal("Running");
          endpointJson.location.should.equal("EastUs");
          endpointJson.origins[0].name.should.equal(testOriginName_2);
          done();
        });
    });

    it('delete command should delete the endpoint succesfully', function(done) {
      suite.execute('cdn endpoint delete %s %s %s --json', testEndpointName_1, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('list command should list one after the deletion', function(done) {
      suite.execute('cdn endpoint list %s %s --json', testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var endpointListJson = JSON.parse(result.text);
        endpointListJson.length.should.equal(1);
        done();
      });
    });
  });

  describe('Cdn Origins', function() {
    it('show command should get the existing origin under endpoint', function(done) {
      suite.execute('cdn origin show %s %s %s %s --json', testOriginName_2, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var originJson = JSON.parse(result.text);
        originJson.name.should.equal(testOriginName_2);
        done();
      });
    });

    it('set command should update the origin', function(done) {
      suite.execute('cdn origin set %s %s %s %s -o testtest.azure.com -r 500 -w 501 --json', testOriginName_2, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var originJson = JSON.parse(result.text);
        originJson.name.should.equal(testOriginName_2);
        originJson.hostName.should.equal('testtest.azure.com');
        originJson.httpPort.should.equal(500);
        originJson.httpsPort.should.equal(501);
        done();
      });
    });

    it('set command should fail with invalid host name', function(done) {
      suite.execute('cdn origin set %s %s %s %s -o testtest --json', testOriginName_2, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(1);
        done();
      });
    });

    it('set command should fail with invalid port number', function(done) {
      suite.execute('cdn origin set %s %s %s %s -r 0 --json', testOriginName_2, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(1);
        done();
      });
    });
  });

  describe('Cdn Custom Domains', function() {
    it('list command should list nothing under existing endpoint', function(done) {
      suite.execute('cdn customDomain list %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var customDomainListJson = JSON.parse(result.text);
        customDomainListJson.length.should.equal(0);
        done();
      });
    });

    it('validate command should pass on a registered custom domain host name', function(done) {
      suite.execute('cdn customDomain validate %s %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, testCustomDomainHostName_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var answer = JSON.parse(result.text);
        answer.customDomainValidated.should.equal(true);
        done();
      });
    });

    it('validate command should not pass on a non-registered custom domain host name', function(done) {
      suite.execute('cdn customDomain validate %s %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, 'cli-non-existing-test.net', function(result) {
        result.exitStatus.should.be.equal(0);
        var answer = JSON.parse(result.text);
        answer.customDomainValidated.should.equal(false);
        done();
      });
    });

    it('validate command should fail on invalid custom domain host name', function(done) {
      suite.execute('cdn customDomain validate %s %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, '??cli-6029da3a-835e-4506-b4ea-bd5375165cdf??', function(result) {
        result.exitStatus.should.be.equal(1);
        done();
      });
    });

    it('create command should success on a registered custom domain', function(done) {
      suite.execute('cdn customDomain create %s %s %s %s %s --json', testCustomDomainName_1, testEndpointName_2, testProfileName_1, testResourceGroup_1, testCustomDomainHostName_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var customDomainJson = JSON.parse(result.text);
        customDomainJson.name.should.equal(testCustomDomainName_1);
        customDomainJson.hostName.should.equal(testCustomDomainHostName_1);
        done();
      });
    });

    it('show command should get the created custom Domain', function(done) {
      suite.execute('cdn customDomain show %s %s %s %s testtest --json', testCustomDomainName_1, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var customDomainJson = JSON.parse(result.text);
        customDomainJson.name.should.equal(testCustomDomainName_1);
        customDomainJson.hostName.should.equal(testCustomDomainHostName_1);
        done();
      });
    });

    it('list command should list one under existing endpoint', function(done) {
      suite.execute('cdn customDomain list %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var customDomainListJson = JSON.parse(result.text);
        customDomainListJson.length.should.equal(1);
        customDomainListJson[0].name.should.equal(testCustomDomainName_1);
        customDomainListJson[0].hostName.should.equal(testCustomDomainHostName_1);
        done();
      });
    });

    it('delete command should successfully delete the custom domain', function(done) {
      suite.execute('cdn customDomain delete %s %s %s %s testtest --json', testCustomDomainName_1, testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it('list command should list nothing under existing endpoint after the deletion', function(done) {
      suite.execute('cdn customDomain list %s %s %s --json', testEndpointName_2, testProfileName_1, testResourceGroup_1, function(result) {
        result.exitStatus.should.be.equal(0);
        var customDomainListJson = JSON.parse(result.text);
        customDomainListJson.length.should.equal(0);
        done();
      });
    });
  });
});