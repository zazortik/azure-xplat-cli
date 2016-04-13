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
var fs = require('fs');
var util = require('util');
var utils = require('../../../../lib/util/utils');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-HDInsight-cluster-create-tests';
var groupPrefix = 'xplatTestRgHDInsightClusterCreate';
var clusterNamePrefix = 'xplatTestHDInsightClusterCreate';
var HdinsightTestUtil = require('../../../util/hdinsightTestUtil');
var requiredEnvironment = [
  {
    name: 'AZURE_ARM_TEST_LOCATION',
    defaultValue: 'eastus'
  }, {
    name: 'SSHCERT',
    defaultValue: 'test/myCert.pem'
  }
];

var liveOnly = process.env.NOCK_OFF ? it : it.skip;
var timeBeforeClusterAvailable;
var groupName;
var clusterNameWindows;
var clusterNameLinux;
var clusterNamePremium;
var createdResources = [];
var scriptActionName;
var scriptActionUri;

var  location = "East US",
  username = 'azureuser',
  password = 'Brillio@2015',
  defaultStorageAccount = 'xplatteststorage1',
  defaultStorageAccountKey = 'dnsfnsdfmsdlsk09809kjsdff====',
  defaultStorageContainer = 'xplatteststoragecnt1',
  workerNodeCount = 3,
  headNodeSize = "Standard_D3",
  workerNodeSize = "Standard_D3",
  zookeeperNodeSize = "Standard_D3",
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  sshUserName = 'xplattestsshuser',
  sshPassword = 'Brillio@2015',
  sshPublicKey,
  rdpUsername = 'xplattestrdpuser',
  rdpPassword = 'Brillio@2015',
  rdpExpiryDate,
  tags = 'a=b;b=c;d=',
  configFile = 'test/data/hdinsight-test-config-data.json';

describe('arm', function() {
  describe('hdinsight', function() {
    var suite;
    var retry = 5;
    var hdinsightTest = new HdinsightTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_ARM_TEST_LOCATION;
        defaultStorageAccount = process.env.AZURE_ARM_TEST_STORAGEACCOUNT;
        defaultStorageAccountKey = process.env.AZURE_STORAGE_ACCESS_KEY;
        defaultStorageContainer = process.env.AZURE_STORAGE_CONTAINER;
        groupName = suite.generateId(groupPrefix, createdResources);
        clusterNameWindows = suite.generateId(clusterNamePrefix, createdResources);
        clusterNameLinux = suite.generateId(clusterNamePrefix, createdResources);
        clusterNamePremium = suite.generateId(clusterNamePrefix, createdResources)+ 'Premium';
        tags = 'a=b;b=c;d=';
        rdpExpiryDate = '12/12/2025';
        timeBeforeClusterAvailable = (!suite.isMocked || suite.isRecording) ? 30000 : 10;
        scriptActionName = 'testscriptname';
        scriptActionUri = 'https://hdiconfigactions.blob.core.windows.net/linuxsampleconfigaction/sample.sh';
        if (!suite.isPlayback()) {
          suite.execute('group create %s --location %s --json', groupName, location, function() {
            setTimeout(function() {
              done();
            }, 120000);
          });
        } else {
          done();
        }
      });
    });

    after(function(done) {
      suite.teardownSuite(function() {
        if (!suite.isPlayback()) {
          hdinsightTest.deleteUsedGroup(groupName, suite, function(result) {
            suite.teardownSuite(done);
          });
        } else {
          done();
        }
      });
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('cluster', function() {
	     it('create premium linux cluster should pass', function (done) {
          this.timeout(hdinsightTest.timeoutLarge);
          var cmd = util.format('hdinsight cluster create ' +
            '--resource-group %s ' +
            '--clusterName %s ' +
            '--location %s ' +
            '--osType %s ' +
            '--clusterTier %s ' +
            '--defaultStorageAccountName %s.blob.core.windows.net ' +
            '--defaultStorageAccountKey %s ' +
            '--defaultStorageContainer %s ' +
            '--headNodeSize %s ' +
            '--workerNodeCount %s ' +
            '--workerNodeSize %s ' +
            '--zookeeperNodeSize %s ' +
            '--userName %s --password %s ' +
            '--sshUserName %s --sshPassword %s ' +
            '--clusterType %s ' +
            '--version %s ' +
            '--json ',
            groupName, clusterNamePremium, location, 'Linux', 'premium',
            defaultStorageAccount, defaultStorageAccountKey, defaultStorageContainer,
            headNodeSize, workerNodeCount, workerNodeSize, zookeeperNodeSize,
            username, password, sshUserName, sshPassword,
            'Hadoop', '3.4',
            tags).split(' ');
          suite.execute(cmd, function (result) {
              result.text.should.containEql('');
              result.exitStatus.should.equal(0);
              if (!suite.isPlayback()) {
                  setTimeout(function () {
                      done();
                  }, HdinsightTestUtil.timeoutLarge);
              } else {
                  done();
              }
          });
      });
	     it('show should display details about premium hdinsight cluster', function (done) {
	         setTimeout(function () {
	             var cmd = util.format('hdinsight cluster show --resource-group %s --clusterName %s --json', groupName, clusterNamePremium).split(' ');
	             suite.execute(cmd, function (result) {
	                 result.text.should.containEql('');
	                 result.exitStatus.should.equal(0);
	                 done();
	             });
	         }, timeBeforeClusterAvailable);
	     });

	  it('create linux cluster should pass', function(done) {
        this.timeout(hdinsightTest.timeoutLarge);
        var cmd = util.format('hdinsight cluster create ' +
          '--resource-group %s ' +
          '--clusterName %s ' +
          '--location %s ' +
          '--osType %s ' +
          '--defaultStorageAccountName %s.blob.core.windows.net ' +
          '--defaultStorageAccountKey %s ' +
          '--defaultStorageContainer %s ' +
          '--headNodeSize %s ' +
          '--workerNodeCount %s ' +
          '--workerNodeSize %s ' +
          '--zookeeperNodeSize %s ' +
          '--userName %s --password %s ' +
          '--sshUserName %s --sshPassword %s ' +
          '--clusterType %s ' +
          '--version %s ' +
          '--json ',
          groupName, clusterNameLinux, location, 'Linux',
          defaultStorageAccount, defaultStorageAccountKey, defaultStorageContainer,
          headNodeSize, workerNodeCount, workerNodeSize, zookeeperNodeSize,
          username, password, sshUserName, sshPassword,
          'Hadoop', 'default',
          tags).split(' ');
        suite.execute(cmd, function(result) {
          result.text.should.containEql('');
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function() {
              done();
            }, HdinsightTestUtil.timeoutLarge);
          } else {
            done();
          }
        });
      });
	
      it('create windows cluster should pass', function(done) {
        this.timeout(hdinsightTest.timeoutLarge);
        var cmd = util.format('hdinsight cluster create ' +
          '--resource-group %s ' +
          '--clusterName %s ' +
          '--location %s ' +
          '--osType %s ' +
          '--defaultStorageAccountName %s.blob.core.windows.net ' +
          '--defaultStorageAccountKey %s ' +
          '--defaultStorageContainer %s ' +
          '--headNodeSize %s ' +
          '--workerNodeCount %s ' +
          '--workerNodeSize %s ' +
          '--zookeeperNodeSize %s ' +
          '--userName %s --password %s ' +
          '--rdpUserName %s --rdpPassword %s --rdpAccessExpiry %s ' +
          '--clusterType %s ' +
          '--version %s ' +
          '--tags %s ' +
          '--json ',
          groupName, clusterNameWindows, location, 'Windows',
          defaultStorageAccount, defaultStorageAccountKey, defaultStorageContainer,
          headNodeSize, workerNodeCount, workerNodeSize, zookeeperNodeSize,
          username, password, rdpUsername, rdpPassword, rdpExpiryDate, 'Hadoop', 'default',
          tags).split(' ');
        suite.execute(cmd, function(result) {
          result.text.should.containEql('');
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function() {
              done();
            }, HdinsightTestUtil.timeoutLarge);
          } else {
            done();
          }
        });
      });

      it('show should display details about windows hdinsight cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster show --resource-group %s --clusterName %s --json', groupName, clusterNameWindows).split(' ');
          suite.execute(cmd, function(result) {
            result.text.should.containEql('');
            result.exitStatus.should.equal(0);
            done();
          });
        }, timeBeforeClusterAvailable);
      });

      it('show should display details about linux hdinsight cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster show --resource-group %s --clusterName %s --json', groupName, clusterNameLinux).split(' ');
          suite.execute(cmd, function(result) {
            result.text.should.containEql('');
            result.exitStatus.should.equal(0);
            done();
          });
        }, timeBeforeClusterAvailable);
      });

      it('list should display all hdinsight clusters in resource group', function(done) {
        var cmd = util.format('hdinsight cluster list --resource-group %s --json', groupName).split(' ');
        suite.execute(cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('list all should display all hdinsight clusters in subscription', function(done) {
        var cmd = util.format('hdinsight cluster list --json', '').split(' ');
        this.timeout(hdinsightTest.timeoutLarge);
        suite.execute(cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('disable-http-access should disable HTTP access to the cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster disable-http-access --resource-group %s --clusterName %s --json',
            groupName, clusterNameWindows).split(' ');
          suite.execute(cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }, HdinsightTestUtil.timeoutMedium);
      });

      it('enable-http-access should enable HTTP access to the cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster enable-http-access --resource-group %s --clusterName %s --userName %s --password %s --json',
            groupName, clusterNameWindows, username, password).split(' ');
          suite.execute(cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }, HdinsightTestUtil.timeoutMedium);
      });

      it('disable-rdp-access should disable RDP access to the cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster disable-rdp-access --resource-group %s --clusterName %s --json',
            groupName, clusterNameWindows).split(' ');
          suite.execute(cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }, HdinsightTestUtil.timeoutMedium);
      });

      it('enable-rdp-access should enable RDP access to the cluster', function(done) {
        setTimeout(function() {
          var cmd = util.format('hdinsight cluster enable-rdp-access --resource-group %s --clusterName %s --rdpUserName %s --rdpPassword %s --json',
            groupName, clusterNameWindows, rdpUsername, rdpPassword, '12/12/2016').split(' ');
          suite.execute(cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }, HdinsightTestUtil.timeoutMedium);
      });

      it('delete should delete hdinsight windows cluster', function(done) {
        var cmd = util.format('hdinsight cluster delete --resource-group %s --clusterName %s --quiet --json', groupName, clusterNameWindows).split(' ');
        suite.execute(cmd, function(result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function() {
              done();
            }, HdinsightTestUtil.timeoutLarge);
          } else {
            done();
          }
        });
      });

      it('script action should succeed on hdinsight linux cluster', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action create %s --resource-group %s -n %s -u %s -t headnode;workernode --persistOnSuccess --json', clusterNameLinux, groupName, scriptActionName, scriptActionUri).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });
      
      it('script action list persisted should list persisted scripts on the cluster', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action persisted list %s --resource-group %s --json', clusterNameLinux, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });

      it('script action show persisted should show persisted script on the cluster', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action persisted show %s %s --resource-group %s --json', clusterNameLinux, scriptActionName, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });

      it('script action delete persisted should delete persisted scripts from the cluster', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action persisted delete %s %s --resource-group %s --json', clusterNameLinux, scriptActionName, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });

      it('script action list history should list script execution history', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action history list %s --resource-group %s --json', clusterNameLinux, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });
      
      it('script action show details should fail for invalid execution id', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action history show %s 1 --resource-group %s --json', clusterNameLinux, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.not.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });
      
      it('script action promote should fail for invalid execution id', function (done) {
        this.timeout(hdinsightTest.timeoutMedium);
        var cmd = util.format('hdinsight script-action persisted set %s 1 --resource-group %s --json', clusterNameLinux, groupName).split(' ');
        suite.execute(cmd, function (result) {
          result.exitStatus.should.not.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function () {
              done();
            }, HdinsightTestUtil.timeoutMedium);
          } else {
            done();
          }
        });
      });

      it('delete should delete hdinsight linux cluster', function(done) {
        this.timeout(hdinsightTest.timeoutLarge);
        var cmd = util.format('hdinsight cluster delete --resource-group %s --clusterName %s --quiet --json', groupName, clusterNameLinux).split(' ');
        suite.execute(cmd, function(result) {
          result.exitStatus.should.equal(0);
          if (!suite.isPlayback()) {
            setTimeout(function() {
              done();
            }, HdinsightTestUtil.timeoutLarge);
          } else {
            done();
          }
        });
      });
    });
  });
});
