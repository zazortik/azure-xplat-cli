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

var testPrefix = 'arm-cli-datalake-analytics-tests';
var accountPrefix = 'xplattestadla';
var storeAccountPrefix = 'xplattestadls';
var knownNames = [];

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_LOCATION',
  defaultValue: 'East US 2'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP',
  defaultValue: 'xplattestadlarg01'
}
];

var suite;
var testLocation;
var testResourceGroup;
var secondResourceGroup;

var accountName;
var jobAndCatalogAccountName;
var storeAccountName;
var additionalStoreAccountName;
var azureBlobAccountName;
var azureBlobAccountKey;

var script = 'DROP DATABASE IF EXISTS FOO; CREATE DATABASE FOO; DROP DATABASE IF EXISTS FOO;';
var scriptDir = '.\\testscript.sip';
var jobName = 'xplattestjob';

describe('arm', function () {
  before(function (done) {
    suite = new CLITest(this, testPrefix, requiredEnvironment);
    suite.setupSuite(function () {
      testLocation = process.env.AZURE_ARM_TEST_LOCATION;
      testLocation = testLocation.toLowerCase().replace(/ /g, '');
      testResourceGroup = process.env.AZURE_ARM_TEST_RESOURCE_GROUP;
      secondResourceGroup = suite.generateId(accountPrefix, knownNames);
      accountName = suite.generateId(accountPrefix, knownNames);
      jobAndCatalogAccountName = suite.generateId(accountPrefix, knownNames);
      storeAccountName = suite.generateId(storeAccountPrefix, knownNames);
      additionalStoreAccountName = suite.generateId(storeAccountPrefix, knownNames);
      azureBlobAccountName = suite.generateId(storeAccountPrefix, knownNames);
      fs.writeFileSync(scriptDir, script);
      suite.execute('group create %s --location %s --json', testResourceGroup, testLocation, function () {
        suite.execute('group create %s --location %s --json', secondResourceGroup, testLocation, function () {
          suite.execute('datalake store account create --accountName %s --resource-group %s --location %s --json', storeAccountName, testResourceGroup, testLocation, function () {
            suite.execute('datalake store account create --accountName %s --resource-group %s --location %s --json', additionalStoreAccountName, testResourceGroup, testLocation, function () {
              suite.execute('storage account create %s --resource-group %s --location %s --type GRS --json', azureBlobAccountName, testResourceGroup, testLocation, function () {
                // create an account for job and catalog operations
                suite.execute('datalake analytics account create --accountName %s --resource-group %s --location %s --defaultDataLakeStore %s --json', jobAndCatalogAccountName, testResourceGroup, testLocation, storeAccountName, function () {
                  if(!suite.isPlayback()) {
                    setTimeout(function () {
                      done();
                    }, 120000); // sleep for two minutes to guarantee that the queue has been created to run jobs against
                  }
                  else {
                    done();
                  }
                });
              });
            });
          });
        });
      });
    });
  });


  after(function (done) {
    fs.unlinkSync(scriptDir);
    // this is required as a work around to ensure that the datalake analytics account does not get left behind and stuck in the "deleting" state if its storage gets deleted out from under it.
    suite.execute('datalake analytics account delete %s --quiet --json', jobAndCatalogAccountName, function () {
      suite.execute('group delete %s --quiet --json', testResourceGroup, function () {
        suite.execute('group delete %s --quiet --json', secondResourceGroup, function () {
          suite.teardownSuite(done);
        });
      });
    });
  });

  beforeEach(function (done) {
    suite.setupTest(done);
  });

  afterEach(function (done) {
    suite.teardownTest(done);
  });

  describe('Data Lake Analytics Account', function () {
    it('create command should work', function (done) {
      var tags = 'testtag1=testvalue1;testtag2=testvalue2';
      suite.execute('datalake analytics account create --accountName %s --resource-group %s --location %s --defaultDataLakeStore %s --tags %s --json', accountName, testResourceGroup, testLocation, storeAccountName, tags, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        Object.keys(accountJson.tags).length.should.be.equal(2);
        done();
      });
    });

    it('create account with same name should fail', function (done) {
      suite.execute('datalake analytics account create --accountName %s --resource-group %s --location %s --defaultDataLakeStore %s --json', accountName, secondResourceGroup, testLocation, storeAccountName, function (result) {
        result.exitStatus.should.be.equal(1);
        result.errorText.should.include('belong to another owner'); // note: this error message needs to be updated. once it is, this test will need to be updated as well.
        done();
      });
    });

    it('show command should work', function (done) {
      suite.execute('datalake analytics account show --accountName %s --resource-group %s --json', accountName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        
        // run it without requiring the resource group as well
        suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
          result.exitStatus.should.be.equal(0);
          var accountJson = JSON.parse(result.text);
          accountJson.name.should.be.equal(accountName);
          done();
        });
      });
    });

    it('list commands should work', function (done) {
      suite.execute('datalake analytics account list --json', function (result) {
        result.exitStatus.should.be.equal(0);
        var accountList = JSON.parse(result.text);
        accountList.length.should.be.above(0);
        
        // list within resource group as well.
        suite.execute('datalake analytics account list --resource-group %s --json', testResourceGroup, function (result) {
          result.exitStatus.should.be.equal(0);
          var accountList = JSON.parse(result.text);
          accountList.length.should.be.above(0);
          done();
        });
      });
    });

    it('updating the account should work', function (done) {
      var tags = 'testtag1=testvalue1;testtag2=testvalue2;testtag3=testvalue3';
      suite.execute('datalake analytics account set --accountName %s --resource-group %s --tags %s --json', accountName, testResourceGroup, tags, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        Object.keys(accountJson.tags).length.should.be.equal(3);
        done();
      });
    });
    
    it('adding and removing data lake storage accounts to the account should work', function (done) {
      suite.execute('datalake analytics account datasource add --accountName %s --dataLakeStore %s --json', accountName, additionalStoreAccountName, function (result) {
        result.exitStatus.should.be.equal(0);
        suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
          result.exitStatus.should.be.equal(0);
          var accountJson = JSON.parse(result.text);
          accountJson.properties.dataLakeStoreAccounts.length.should.be.equal(2);
          suite.execute('datalake analytics account datasource delete --accountName %s --dataLakeStore %s --json', accountName, additionalStoreAccountName, function (result) {
            result.exitStatus.should.be.equal(0);
            suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
              result.exitStatus.should.be.equal(0);
              var accountJson = JSON.parse(result.text);
              accountJson.properties.dataLakeStoreAccounts.length.should.be.equal(1);
              done();
            });
          });
        });
      });
    });
    
    it('adding and removing blob storage accounts to the account should work', function (done) {
      suite.execute('storage account keys list %s --resource-group %s --json', azureBlobAccountName, testResourceGroup, testLocation, function (result) {
        var keyJson = JSON.parse(result.text);
        azureBlobAccountKey = keyJson.storageAccountKeys.key1;
        suite.execute('datalake analytics account datasource add --accountName %s --azureBlob %s --accessKey %s --json', accountName, azureBlobAccountName, azureBlobAccountKey, function (result) {
          result.exitStatus.should.be.equal(0);
          suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
            result.exitStatus.should.be.equal(0);
            var accountJson = JSON.parse(result.text);
            accountJson.properties.storageAccounts.length.should.be.equal(1);
            suite.execute('datalake analytics account datasource delete --accountName %s --azureBlob %s --json', accountName, azureBlobAccountName, function (result) {
              result.exitStatus.should.be.equal(0);
              suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
                result.exitStatus.should.be.equal(0);
                var accountJson = JSON.parse(result.text);
                accountJson.properties.storageAccounts.length.should.be.equal(0);
                done();
              });
            });
          });
        });
      });
    });
    
    it('Delete command should work', function (done) {
      suite.execute('datalake analytics account delete --accountName %s --quiet --json', accountName, function (result) {
        result.exitStatus.should.be.equal(0);
        suite.execute('datalake analytics account show --accountName %s --json', accountName, function (result) {
          // confirm that the account no longer exists
          result.exitStatus.should.be.equal(1);
          done();
        });
      });
    });
  });
  describe('Data Lake Analytics Job', function () {
    it('create and show commands should work', function (done) {
      suite.execute('datalake analytics job create --accountName %s --jobName %s --script %s --json', jobAndCatalogAccountName, jobName, script, function (result) {
        result.exitStatus.should.be.equal(0);
        var jobJson = JSON.parse(result.text);
        jobJson.jobId.should.not.be.empty;
        jobJson.name.should.be.equal(jobName);
        
        // run the same job from a script file
        suite.execute('datalake analytics job create --accountName %s --jobName %s --script %s --json', jobAndCatalogAccountName, jobName, scriptDir, function (result) {
          result.exitStatus.should.be.equal(0);
          var jobJson = JSON.parse(result.text);
          jobJson.jobId.should.not.be.empty;
          jobJson.name.should.be.equal(jobName);
          var jobId = jobJson.jobId;
          listPoll(suite, 10, jobAndCatalogAccountName, jobId, function (result) {
            suite.execute('datalake analytics job show --accountName %s --jobId %s --includeStatistics --json', jobAndCatalogAccountName, jobId, function (result) {
              result.exitStatus.should.be.equal(0);
              var jobJson = JSON.parse(result.text);
              jobJson.result.should.be.equal('Succeeded');
              // jobJson.properties.statistics.length.should.be.above(0); // Statistics are not currently included in catalog CRUD operations. Will uncomment this when that changes.
              done();
            });
          });
        });
      });
    });
    
    it('create and cancel job should work', function (done) {
      suite.execute('datalake analytics job create --accountName %s --jobName %s --script %s --json', jobAndCatalogAccountName, jobName, script, function (result) {
        result.exitStatus.should.be.equal(0);
        var jobJson = JSON.parse(result.text);
        jobJson.jobId.should.not.be.empty;
        jobJson.name.should.be.equal(jobName);
        var jobId = jobJson.jobId;
        suite.execute('datalake analytics job cancel --accountName %s --jobId %s --quiet --json', jobAndCatalogAccountName, jobId, function (result) {
          result.exitStatus.should.be.equal(0);
          suite.execute('datalake analytics job show --accountName %s --jobId %s --includeStatistics --json', jobAndCatalogAccountName, jobId, function (result) {
            result.exitStatus.should.be.equal(0);
            var jobJson = JSON.parse(result.text);
            jobJson.state.should.be.equal('Ended');
            jobJson.result.should.include('Cancelled');
            done();
          });  
        });
      });
    });

    it('list command should work', function (done) {
      suite.execute('datalake analytics job list --accountName %s --json', jobAndCatalogAccountName, function (result) {
        result.exitStatus.should.be.equal(0);
        var jobList = JSON.parse(result.text);
        jobList.length.should.be.above(0);
        
        // list within resource group as well to make sure that code path works.
        suite.execute('datalake analytics job list --accountName %s --resource-group %s --json', jobAndCatalogAccountName, testResourceGroup, function (result) {
          result.exitStatus.should.be.equal(0);
          var jobList = JSON.parse(result.text);
          jobList.length.should.be.above(0);
          done();
        });
      });
    });
  });
  describe('Data Lake Analytics Catalog', function () {
    it('list commands should work', function (done) {
      var databaseScript = 'DROP DATABASE IF EXISTS FOO; CREATE DATABASE FOO;';
      // Get the default database (master) and all databases.
      suite.execute('datalake analytics catalog list --accountName %s --itemType database --itemPath master --json', jobAndCatalogAccountName, function (result) {
        result.exitStatus.should.be.equal(0);
        var masterJson = JSON.parse(result.text);
        masterJson[0].name.should.be.equal('master');
        // add another database to the list
        suite.execute('datalake analytics job create --accountName %s --jobName %s --script %s --json', jobAndCatalogAccountName, jobName, databaseScript, function (result) {
          result.exitStatus.should.be.equal(0);
          var jobJson = JSON.parse(result.text);
          jobJson.jobId.should.not.be.empty;
          jobJson.name.should.be.equal(jobName);
          var jobId = jobJson.jobId;
          listPoll(suite, 10, jobAndCatalogAccountName, jobId, function (result) {
            suite.execute('datalake analytics job show --accountName %s --jobId %s --includeStatistics --json', jobAndCatalogAccountName, jobId, function (result) {
              result.exitStatus.should.be.equal(0);
              var jobJson = JSON.parse(result.text);
              jobJson.result.should.be.equal('Succeeded');
              // list all databases and confirm that there are now at least two.
              suite.execute('datalake analytics catalog list --accountName %s --itemType database --json', jobAndCatalogAccountName, function (result) {
                result.exitStatus.should.be.equal(0);
                var dbJson = JSON.parse(result.text);
                dbJson.length.should.be.above(1);
                done();
              });
            });
          });
        });
      });
    });
    
    it('create set and delete commands should work', function (done) {
      var hostUri = 'https://psrreporthistory.database.windows.net:443';
      var secretName = 'clitestsecret';
      var secretPwd = 'clitestsecretpwd';
      var setSecretPwd = 'clitestsetsecretpwd';
      var databaseName = 'master';
      suite.execute('datalake analytics catalog secret create --accountName %s --databaseName %s --secretName %s --hostUri %s --password %s --json', jobAndCatalogAccountName, databaseName, secretName, hostUri, secretPwd, function (result) {
        result.exitStatus.should.be.equal(0);
        // update the secret's password
        suite.execute('datalake analytics catalog secret set --accountName %s --databaseName %s --secretName %s --hostUri %s --password %s --json', jobAndCatalogAccountName, databaseName, secretName, hostUri, setSecretPwd, function (result) {
          result.exitStatus.should.be.equal(0);
          // delete the secret
          suite.execute('datalake analytics catalog secret delete --accountName %s --databaseName %s --secretName %s --quiet --json', jobAndCatalogAccountName, databaseName, secretName, function (result) {
            result.exitStatus.should.be.equal(0);
            // try to set the secret again (should fail)
            suite.execute('datalake analytics catalog secret set --accountName %s --databaseName %s --secretName %s --hostUri %s --password %s --json', jobAndCatalogAccountName, databaseName, secretName, hostUri, setSecretPwd, function (result) {
              result.exitStatus.should.be.equal(1);
              done();
            });
          });
        });
      });
    });
  });
});


function listPoll(suite, attemptsLeft, accountName, jobId, callback) {
  if (attemptsLeft === 0) {
    throw new Error('azure datalake analytics job show --accountName ' + accountName + ' --jobId ' + jobId + ' : Timeout expired for job execution');
  }

  var objectFound = false;
  suite.execute('datalake analytics job show --accountName %s --jobId %s --json', accountName, jobId, function (showResult) {
    var jobJson = JSON.parse(showResult.text);
    if (jobJson) {
      objectFound = jobJson.state === 'Ended';
    }
    if (objectFound === true) {
      callback(showResult);
    }
    else {
      if(!suite.isPlayback()) {
        setTimeout(function () {
          listPoll(suite, attemptsLeft - 1, accountName, jobId, callback);
        }, 30000);
      }
      else {
        listPoll(suite, attemptsLeft - 1, accountName, jobId, callback);
      }
    }
  });
}