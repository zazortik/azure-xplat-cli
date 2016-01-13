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
var util = require('util');
var CLITest = require('../../../framework/arm-cli-test');
var testUtils = require('../../../util/util');
var testprefix = 'arm-cli-vm-stoprestart-tests';
var groupPrefix = 'xplatTestGVMStart';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];
var groupName, timeout,
  vmPrefix = 'xplatvmStSp',
  nicName = 'xplattestnicStSp',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplattstoragestsp',
  storageCont = 'xplatteststoragecntstsp',
  osdiskvhd = 'xplattestvhdstsp',
  vNetPrefix = 'xplattestvnetStSp',
  subnetName = 'xplattestsubnetStSp',
  publicipName = 'xplattestipStSp',
  dnsPrefix = 'xplattestipdnsstsp',
  sshcert;

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    testUtils.TIMEOUT_INTERVAL = 5000;

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.isMocked ? storageCont : suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.isMocked ? dnsPrefix : suite.generateId(dnsPrefix, null);
        done();
      });
    });

    after(function(done) {
      vmTest.deleteUsedGroup(groupName, suite, function(result) {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function(done) {

      suite.setupTest(done);
    });
    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('vm', function() {

      it('create should pass for stop start & restart', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            if (VMTestUtil.linuxImageUrn === '' || VMTestUtil.linuxImageUrn === undefined) {
              vmTest.GetLinuxSkusList(location, suite, function(result) {
                vmTest.GetLinuxImageList(location, suite, function(result) {
                  var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --json',
                    groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                    vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            } else {
              var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --json',
                groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            }
          });
        });
      });

      it('get-instance-view should get instance view of the VM', function(done) {
        var cmd = util.format('vm get-instance-view %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          //should(result.text.indexOf('diagnosticsProfile') > -1).ok;
          //should(result.text.indexOf('bootDiagnostics') > -1).ok;
          //should(result.text.indexOf('storageUri') > -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-serial-output should get serial output of the VM', function(done) {
        var cmd = util.format('vm get-serial-output %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          should(result.text.indexOf('bootdiagnostics') == -1).ok;
          done();
        });
      });

      it('Stop and start VM should work', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm stop %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(function() {
            cmd = util.format('vm start %s %s --json', groupName, vmPrefix).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          }, timeout);
        });
      });
      // VM Restart
      it('Restart should restart the VM', function(done) {
        var cmd = util.format('vm restart %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('Deallocate should release the compute resources', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm deallocate %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});