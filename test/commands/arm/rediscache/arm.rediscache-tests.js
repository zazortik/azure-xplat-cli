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

var testPrefix = 'arm-cli-rediscache-tests';
var cachePrefix = 'xplatTestCache';
var knownNames = [];

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_LOCATION',
  defaultValue: 'West US'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP',
  defaultValue: 'xplatTestCacheRG'
}
];

var suite;
var testLocation;
var testResourceGroup;

var cacheName;
var storageName;
var newCacheName;
var testSize;
var testSku;
var testMaxMemoryPolicy;
var testEnableNonSSLPort;
var testNewMaxMemoryPolicy;

var galleryTemplateName;
var galleryTemplateUrl;

describe('arm', function () {

  before(function (done) {
    suite = new CLITest(this, testPrefix, requiredEnvironment);
    suite.setupSuite(function () {
      testLocation = process.env.AZURE_ARM_TEST_LOCATION;
      testLocation = testLocation.toLowerCase().replace(/ /g, '');
      testResourceGroup = process.env.AZURE_ARM_TEST_RESOURCE_GROUP;
      testSize = 'C2';
      testSku = 'Basic';
      testNewMaxMemoryPolicy = 'VolatileLRU';
      cacheName = suite.generateId(cachePrefix, knownNames);
      storageName = cacheName;
      newCacheName = suite.generateId(cachePrefix, knownNames);

      suite.execute('group create %s --location %s --json', testResourceGroup, testLocation, function () {
        done();
      });
    });
  });


  after(function (done) {
    suite.execute('group delete %s --quiet --json', testResourceGroup, function () {
      suite.teardownSuite(done);
    });
  });

  beforeEach(function (done) {
    suite.setupTest(done);
  });

  afterEach(function (done) {
    suite.teardownTest(done);
  });

  describe('Redis Cache', function () {
    it('create commands should work', function (done) {
      suite.execute('rediscache create --name %s --resource-group %s --location %s --json', cacheName, testResourceGroup, testLocation, function (result) {
        result.exitStatus.should.be.equal(0);
        var cacheJson = JSON.parse(result.text);
        cacheJson.name.should.be.equal(cacheName);

        suite.execute('rediscache create --name %s --resource-group %s --location %s --size %s --sku %s --enable-non-ssl-port --json', newCacheName, testResourceGroup, testLocation, testSize, testSku, function (result) {
          result.exitStatus.should.be.equal(0);
          var newCacheJson = JSON.parse(result.text);
          newCacheJson.name.should.be.equal(newCacheName);
          done();
        });
      });
    });

    it('create cache with same name should fail', function (done) {
      suite.execute('rediscache create --name %s --resource-group %s --location %s --json', cacheName, testResourceGroup, testLocation, function (result) {
        result.exitStatus.should.be.equal(1);
        result.errorText.should.include('The requested cache name is unavailable');
        done();
      });
    });

    it('show command should work', function (done) {
      suite.execute('rediscache show --name %s --resource-group %s --json', cacheName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        var cacheJson = JSON.parse(result.text);
        cacheJson.name.should.be.equal(cacheName);
        done();
      });
    });

    it('list commands should work', function (done) {
      suite.execute('rediscache list --json', function (result) {
        result.exitStatus.should.be.equal(0);

        suite.execute('rediscache list --resource-group %s --json', testResourceGroup, function (result) {
          result.exitStatus.should.be.equal(0);
          done();
        });
      });
    });

    it('list-keys command should work', function (done) {
      suite.execute('rediscache list-keys --name %s --resource-group %s --json', cacheName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        var cacheJson = JSON.parse(result.text);
        //console.log('res : ' + util.inspect(cacheJson));
        cacheJson.primaryKey.should.not.be.null;
        done();
      });
    });

    it.skip('Set Cache command should work', function (done) {
      listPoll(suite, 40, cacheName, testResourceGroup, function (result) {
        suite.execute('rediscache set --name %s --resource-group %s --max-memory-policy %s --json', cacheName, testResourceGroup, testNewMaxMemoryPolicy, function (result) {
          result.exitStatus.should.be.equal(0);
          done();
        });
      });
    });

    it.skip('Renew Key command should work', function (done) {
      suite.execute('rediscache renew-key --name %s --resource-group %s --json', cacheName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it.skip('Set Diagnostics command should work', function (done) {
      suite.execute('rediscache set-diagnostics --name %s --resource-group %s --storage-account-name %s --storage-account-resource-group %s --json', cacheName, testResourceGroup, storageName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it.skip('Delete command should work', function (done) {
      suite.execute('rediscache delete --name %s --resource-group %s --json', cacheName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        done();
      });
    });

    it.skip('Show command must fail for deleted cache', function (done) {
      suite.execute('rediscache show --name %s --resource-group %s --json', cacheName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(1);
        result.errorText.should.include('Cache not found');
        done();
      });
    });
  });
});

function listPoll(suite, attemptsLeft, cacheName, cacheRG, callback) {
  if (attemptsLeft === 0) {
    throw new Error('azure rediscache show --name ' + cacheName + ' --resource-group ' + cacheRG + ' : Timeout expired for cache creation');
  }

  var objectFound = false;
  suite.execute('rediscache show --name %s --resource-group %s --json', cacheName, cacheRG, function (showResult) {
    var cacheJson = JSON.parse(showResult.text);
    if (cacheJson) {
      objectFound = cacheJson.properties.provisioningState === 'Succeeded';
    }
    if (objectFound === true) {
      callback(showResult);
    }
    else {
      setTimeout(function () {
        listPoll(suite, attemptsLeft - 1, cacheName, cacheRG, callback);
      }, 30000);
    }
  });
}