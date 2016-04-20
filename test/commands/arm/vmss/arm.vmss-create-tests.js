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
var testprefix = 'arm-cli-vmss-create-tests';
var groupPrefix = 'xplatTestVMSSCreate';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

var groupName,
  vmssPrefix = 'xplattestvmss',
  vmssPrefix1 = 'xplattestvmss1',
  vmssPrefix2 = 'xplattestvms2',
  nicName = 'xplattestnic',
  location,
  imageUrn = 'MicrosoftWindowsServer:WindowsServer:2008-R2-SP1:latest',
  linuxImageUrn = 'SUSE:openSUSE:13.2:latest',
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
  sshcert,
  IaasDiagPublisher,
  IaasDiagExtName,
  IaasDiagVersion,
  datafile = 'test/data/testdata.json',
  paramFileName = 'test/data/vmssParamTest.json';

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT ? process.env.SSHCERT : 'test/myCert.pem';
        groupName = suite.generateId(groupPrefix, null);
        vmssPrefix = suite.isMocked ? vmssPrefix : suite.generateId(vmssPrefix, null);
        vmssPrefix2 = suite.isMocked ? vmssPrefix2 : suite.generateId(vmssPrefix2, null);
        nicName = suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.generateId(dnsPrefix, null);
        tags = 'a=b;b=c;d=';

        // Get real values from test/data/testdata.json file and assign to the local variables
        var data = fs.readFileSync(datafile, 'utf8');
        var variables = JSON.parse(data);
        IaasDiagPublisher = variables.IaasDiagPublisher_Linux.value;
        IaasDiagExtName = variables.IaasDiagExtName_Linux.value;
        IaasDiagVersion = variables.IaasDiagVersion_Linux.value;
        done();
      });
    });
    after(function(done) {
      this.timeout(vmTest.timeoutLarge * 10);
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

    describe('vmss', function() {

      it('group create should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            var cmd = util.format('vmss list-all --json').split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              cmd = util.format('provider list --json').split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                // Create the parameter file
                cmd = util.format('vmss config generate --parameter-file %s --json', paramFileName).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          });
        });
      });

      it('vmss quick-create should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        vmTest.checkImagefile(function() {
          var cmd = util.format(
            'vmss quick-create -g %s -n %s -l %s -Q %s -u %s -M %s -z Standard_DS1 -C 5 --json',
            groupName, vmssPrefix1, location, linuxImageUrn, username, sshcert).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            vmTest.setGroup(groupName, suite, function(result) {
              var cmd = util.format(
                'vmss quick-create -g %s -n %s -l %s -Q %s -u %s -p %s -z Standard_DS1 -C 5 --json',
                groupName, vmssPrefix, location, imageUrn, username, password).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        });
      });

      it('vmssvm operations should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var id0 = '0';
        var cmd = util.format('vmssvm get --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(vmssPrefix + '_' + id0);
          var cmd = util.format('vmssvm power-off --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var cmd = util.format('vmssvm get-instance-view --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              result.text.should.containEql('PowerState/stopped');
              var cmd = util.format('vmssvm start --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var cmd = util.format('vmssvm restart --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  var cmd = util.format('vmssvm deallocate --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var cmd = util.format('vmssvm delete --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix, id0).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                      result.exitStatus.should.equal(0);
                      var cmd = util.format('vmssvm list --resource-group-name %s --virtual-machine-scale-set-name %s', groupName, vmssPrefix).split(' ');
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        result.text.should.not.containEql(vmssPrefix + '_' + id0);
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      it('vmss update instances should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vmss update-instances --resource-group-name %s --vm-scale-set-name %s --instance-ids 0,1 --json', groupName, vmssPrefix1).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('vmss delete should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss delete --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vmss delete --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix1).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('vmss quick-create 2 using long param names should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            var cmd = util.format(
              'vmss quick-create %s %s %s %s 5 %s %s --vm-size Standard_DS1 --json',
              groupName, vmssPrefix2, location, imageUrn, username, password).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });

      it('vmss get instance view should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vmss get-instance-view --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      
      it('vmss delete 2 should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss delete --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix2).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      
    });
  });
});
