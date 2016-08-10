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
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-cli-iothub-tests';
var iothubPrefix = 'xplattestiothub';
var knownNames = [];

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP',
  defaultValue: 'xplattestiothubrg'
}
];

var galleryTemplateName;
var galleryTemplateUrl;
var iothubName;

describe('arm', function () {

  describe('iothub', function () {
    var suite;
    var testLocation;
    var testResourceGroup;
    var testSku = 'S1';
    var testUnits = '1';

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        testLocation = process.env.AZURE_ARM_TEST_LOCATION;
        testLocation = testLocation.toLowerCase().replace(/ /g, '');
        testResourceGroup = process.env.AZURE_ARM_TEST_RESOURCE_GROUP;
        if (!suite.isPlayback()) {
          suite.execute('group create %s --location %s', testResourceGroup, testLocation, function () {
            done();
          });
        } else {
          done();
        }
      });
    });

    after(function (done) {
      if (!suite.isPlayback()) {
        suite.execute('group delete %s --quiet', testResourceGroup, function() {
          suite.teardownSuite(done);
        });
      } else {
        done();
      }
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('All Tests', function () {

      it('create command should work', function (done) {

        iothubName = suite.generateId(iothubPrefix, knownNames);
        createIotHubMustSucceed();

        function createIotHubMustSucceed() {
          suite.execute('iothub create --name %s --resource-group %s --location %s --sku-name %s --units %s --json', iothubName, testResourceGroup, testLocation, testSku, testUnits, function (result) {
            result.exitStatus.should.be.equal(0);
            showIotHubMustSucceed();
          });
        }

        function showIotHubMustSucceed() {
          suite.execute('iothub show --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothub = JSON.parse(result.text);
            iothub.name.should.be.equal(iothubName);
            done();
          });
        }
      });

      it('stats commands should work', function (done) {

        showIotHubQuotaMustSucceed();

        function showIotHubQuotaMustSucceed() {
          suite.execute('iothub show-quota-metrics --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothubQuota = JSON.parse(result.text);
            iothubQuota[0].name.should.be.equal('TotalMessages');
            iothubQuota[0].currentValue.should.equal(0);
            iothubQuota[0].maxValue.should.equal(400000);
            showIotHubRegistryStatsMustSucceed();
          });
        }

        function showIotHubRegistryStatsMustSucceed() {
          suite.execute('iothub show-registry-stats --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothubStats = JSON.parse(result.text);
            iothubStats.totalDeviceCount.should.be.equal(0);
            iothubStats.enabledDeviceCount.should.be.equal(0);
            iothubStats.disabledDeviceCount.should.be.equal(0);
            done();
          });
        }
      });

      it('set sku commands should work', function (done) {
        suite.execute('iothub sku set --name %s --resource-group %s --sku-name %s --units %s --json', iothubName, testResourceGroup, 'S2', '2', function (result) {
          result.exitStatus.should.be.equal(0);
          var iothub = JSON.parse(result.text);
          iothub.name.should.be.equal(iothubName);
          iothub.sku.name.should.equal('S2');
          iothub.sku.capacity.should.equal(2);
          done();
        });
      });

      it('update d2c commands should work', function (done) {
        suite.execute('iothub device-to-cloud-properties set --name %s --resource-group %s --d2c-retention-time-in-days %s --json', iothubName, testResourceGroup, '5', function (result) {
          result.exitStatus.should.be.equal(0);
          var iothub = JSON.parse(result.text);
          iothub.name.should.be.equal(iothubName);
          iothub.properties.eventHubEndpoints["events"].retentionTimeInDays.should.equal(5);
          done();
        });
      });

      it('update c2d commands should work', function (done) {
        suite.execute('iothub cloud-to-device-properties set --name %s --resource-group %s --c2d-max-delivery-count %s --json', iothubName, testResourceGroup, '50', function (result) {
          result.exitStatus.should.be.equal(0);
          var iothub = JSON.parse(result.text);
          iothub.name.should.be.equal(iothubName);
          iothub.properties.cloudToDevice.maxDeliveryCount.should.equal(50);
          done();
        });
      });

      it('update tags commands should work', function (done) {
        suite.execute('iothub tags set --name %s --resource-group %s --tags %s --json', iothubName, testResourceGroup, 't1=v1', function (result) {
          result.exitStatus.should.be.equal(0);
          var iothub = JSON.parse(result.text);
          iothub.name.should.be.equal(iothubName);
          iothub.tags.should.not.be.empty;
          done();
        });
      });

      it('eventhub consumer group commands should work', function (done) {

        createIotHubEHConsumerGroupMustSucceed();

        function createIotHubEHConsumerGroupMustSucceed() {
          suite.execute('iothub ehconsumergroup create --name %s --resource-group %s --eh-endpoint-type %s --eh-consumer-group %s --json', iothubName, testResourceGroup, 'events', 'cg1', function (result) {
            result.exitStatus.should.be.equal(0);
            listIotHubEHConsumerGroupMustSucceed();
          });
        }

        function listIotHubEHConsumerGroupMustSucceed() {
          suite.execute('iothub ehconsumergroup list --name %s --resource-group %s --eh-endpoint-type %s --json', iothubName, testResourceGroup, 'events', function (result) {
            result.exitStatus.should.be.equal(0);
            var ehcg = JSON.parse(result.text);
            ehcg[0].should.be.equal('$Default');
            ehcg[1].should.be.equal('cg1');
            ehcg.length.should.be.equal(2);
            deleteIotHubEHConsumerGroupMustSucceed();
          });
        }

        function deleteIotHubEHConsumerGroupMustSucceed() {
          suite.execute('iothub ehconsumergroup delete --name %s --resource-group %s --eh-endpoint-type %s --eh-consumer-group %s --json', iothubName, testResourceGroup, 'events', 'cg1', function (result) {
            result.exitStatus.should.be.equal(0);
            listIotHubEHConsumerGroupAfterDeleteMustSucceed();
          });
        }

        function listIotHubEHConsumerGroupAfterDeleteMustSucceed() {
          suite.execute('iothub ehconsumergroup list --name %s --resource-group %s --eh-endpoint-type %s --json', iothubName, testResourceGroup, 'events', function (result) {
            result.exitStatus.should.be.equal(0);
            var ehcg = JSON.parse(result.text);
            ehcg[0].should.be.equal('$Default');
            ehcg.length.should.be.equal(1);
            done();
          });
        }
      });

      it('list iothubs command should work', function (done) {
        suite.execute('iothub list --resource-group %s --json', testResourceGroup, function (result) {
          result.exitStatus.should.be.equal(0);
          var iothubs = JSON.parse(result.text);
          iothubs.length.should.be.above(0);
          done();
        });
      });

      it('list keys command should work', function (done) {

        listIotHubKeysMustSucceed();

        function listIotHubKeysMustSucceed() {
          suite.execute('iothub key list --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothubKeys = JSON.parse(result.text);
            iothubKeys.length.should.be.above(0);
            showIotHubKeyMustSucceed();
          });
        }

        function showIotHubKeyMustSucceed() {
          suite.execute('iothub key show --name %s --resource-group %s --key-name %s', iothubName, testResourceGroup, 'iothubowner', function (result) {
            result.exitStatus.should.be.equal(0);
            result.text.should.include('iothubowner');
            done();
          });
        }

      });

      it('create iothub key command should work', function (done) {

        createIotHubKeyMustSucceed();

        function createIotHubKeyMustSucceed() {
          suite.execute('iothub key create --name %s --resource-group %s --key-name %s --primary-key %s --secondary-key %s --rights %s --json', iothubName, testResourceGroup, 'key1', 'dfd', 'dfd', 'ServiceConnect', function (result) {
            result.exitStatus.should.be.equal(0);
            showIotHubKeyAfterCreateMustSucceed();
          });
        }

        function showIotHubKeyAfterCreateMustSucceed() {
          suite.execute('iothub key show --name %s --resource-group %s --key-name %s ', iothubName, testResourceGroup, 'key1', function (result) {
            result.exitStatus.should.be.equal(0);
            result.text.should.include('key1');
            listIotHubKeyAfterCreateMustSucceed();
          });
        }

        function listIotHubKeyAfterCreateMustSucceed() {
          suite.execute('iothub key list --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothubKeys = JSON.parse(result.text);
            iothubKeys.length.should.be.above(1);
            done();
          });
        }

      });

      it('delete iothub key command should work', function (done) {

        deleteIotHubKeyMustSucceed()

        function deleteIotHubKeyMustSucceed() {
          suite.execute('iothub key delete --name %s --resource-group %s --key-name %s ', iothubName, testResourceGroup, 'key1', function (result) {
            result.exitStatus.should.be.equal(0);
            showIotHubKeyAfterDeleteMustFail();
          });
        }

        function showIotHubKeyAfterDeleteMustFail() {
          suite.execute('iothub key show --name %s --resource-group %s --key-name %s', iothubName, testResourceGroup, 'key1', function (result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include('KeyNameNotFound');
            listIotHubKeyAfterDeleteMustSucceed();
          });
        }

        function listIotHubKeyAfterDeleteMustSucceed() {
          suite.execute('iothub key list --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var iothubKeys = JSON.parse(result.text);
            iothubKeys.length.should.be.above(1);
            done();
          });
        }
      });

      it('opmon related commands should work', function (done) {

        listIotHubOpMonPropertiesMustSucceed();

        function listIotHubOpMonPropertiesMustSucceed() {
          suite.execute('iothub opmon show --name %s --resource-group %s --json', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            var opmon = JSON.parse(result.text);
            opmon.events.Connections.should.equal('None')
            setIotHubOpMonPropertiesMustSucceed();
          });
        }

        function setIotHubOpMonPropertiesMustSucceed() {
          suite.execute('iothub opmon set --name %s --resource-group %s --opmon-category %s --diagnostic-level %s --json', iothubName, testResourceGroup, 'Connections', 'Information', function (result) {
            result.exitStatus.should.be.equal(0);
            var opmon = JSON.parse(result.text);
            opmon.events.Connections.should.equal('Information')
            done();
          });
        }
      });

      it('iothub deletion command should work', function (done) {

        deleteIotHubMustSucceed();

        function deleteIotHubMustSucceed() {
          suite.execute('iothub delete --name %s --resource-group %s ', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(0);
            showIotHubMustFail();
          });
        }

        function showIotHubMustFail() {
          suite.execute('iothub show --name %s --resource-group %s', iothubName, testResourceGroup, function (result) {
            result.exitStatus.should.be.equal(1);
            result.errorText.should.include('IotHubNotFound');
            done();
          });
        }
      });
    });
  });
});