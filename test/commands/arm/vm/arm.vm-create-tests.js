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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-create-tests';
var groupPrefix = 'xplatTestGVMCreate';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vmPrefix = 'xplattestvm',
  nicName = 'xplattestnic',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatteststorage1',
  storageCont = 'xplatteststoragecnt1',
  osdiskvhd = 'xplattestvhd',
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  publicipName = 'xplattestip',
  dnsPrefix = 'xplattestipdns',
  tags = 'a=b;b=c;d=',
  sshcert;

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.isMocked ? dnsPrefix : suite.generateId(dnsPrefix, null);
        tags = 'a=b;b=c;d=';

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

      it('create should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            if (VMTestUtil.linuxImageUrn === '' || VMTestUtil.linuxImageUrn === undefined) {
              vmTest.GetLinuxSkusList(location, suite, function(result) {
                vmTest.GetLinuxImageList(location, suite, function(result) {
                  var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --json',
                    groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                    vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert, tags).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            } else {
              var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --json',
                groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert, tags).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            }
          });
        });
      });

      it('list should display all VMs in resource group', function(done) {
        var cmd = util.format('vm list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.some(function(res) {
            return res.name === vmPrefix;
          }).should.be.true;
          done();
        });
      });
      it('show should display details about VM', function(done) {
        var cmd = util.format('vm show %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources.name.should.equal(vmPrefix);
          done();
        });
      });

      it('get-instance-view should get instance view of the VM', function(done) {
        var cmd = util.format('vm get-instance-view %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('delete should delete VM', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm delete %s %s --quiet --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });

  });
});