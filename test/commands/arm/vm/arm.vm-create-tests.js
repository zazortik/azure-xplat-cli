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
  defaultValue: 'southeastasia'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/myCert.pem'
}];

var groupName,
  vmPrefix = 'xplattestvm',
  vm2Prefix = 'xplattestvm2',
  nicName = 'xplattestnic',
  nic2Name = 'xplattestnic2',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatteststorage1',
  storageAccount2 = 'xplatteststorage2',
  storageCont = 'xplatteststoragecnt1',
  storageCont2 = 'xplatteststoragecnt2',
  osdiskvhd = 'xplattestvhd',
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  publicipName = 'xplattestip',
  publicip2Name = 'xplattestip2',
  dnsPrefix = 'xplattestipdns',
  dns2Prefix = 'xplattestipdns2',
  tags = 'a=b;b=c;d=',
  sshcert,
  IaasDiagPublisher,
  IaasDiagExtName,
  IaasDiagVersion,
  datafile = 'test/data/testdata.json';

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        groupName = suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        vm2Prefix = suite.isMocked ? vm2Prefix : suite.generateId(vm2Prefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        nic2Name = suite.isMocked ? nic2Name : suite.generateId(nic2Name, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageAccount2 = suite.generateId(storageAccount2, null);
        storageCont = suite.generateId(storageCont, null);
        storageCont2 = suite.generateId(storageCont2, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        publicip2Name = suite.isMocked ? publicip2Name : suite.generateId(publicip2Name, null);
        dnsPrefix = suite.generateId(dnsPrefix, null);
        dns2Prefix = suite.generateId(dns2Prefix, null);
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
                  var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --boot-diagnostics-storage-uri https://%s.blob.core.windows.net/ --json',
                    groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                    vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert, tags, storageAccount).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            } else {
              var cmd = util.format('vm create %s %s %s Linux -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --boot-diagnostics-storage-uri https://%s.blob.core.windows.net/ --json',
                groupName, vmPrefix, location, nicName, VMTestUtil.linuxImageUrn, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix, sshcert, tags, storageAccount).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            }
          });
        });
      });

      it('create 2nd vm without boot diagnostics should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          if (VMTestUtil.winImageUrn === '' || VMTestUtil.winImageUrn === undefined) {
            vmTest.GetWindowsSkusList(location, suite, function(result) {
              vmTest.GetWindowsImageList(location, suite, function(result) {
                var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --disable-boot-diagnostics --json',
                  groupName, vm2Prefix, location, nic2Name, VMTestUtil.winImageUrn, username, password, storageAccount2, storageCont2,
                  vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicip2Name, dns2Prefix, sshcert, tags, storageAccount2).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  done();
                });
              });
            });
          } else {
            var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s -M %s --tags %s --disable-boot-diagnostics --json',
              groupName, vm2Prefix, location, nic2Name, VMTestUtil.winImageUrn, username, password, storageAccount2, storageCont2,
              vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicip2Name, dns2Prefix, sshcert, tags, storageAccount2).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
               done();
            });
          }
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
          allResources.some(function(res) {
            return res.resourceGroupName === groupName;
          }).should.be.true;
          done();
        });
      });

      it('list all should display all VMs in subscription', function(done) {
        var cmd = util.format('vm list %s --json', '').split(' ');
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
          should(result.text.indexOf('diagnosticsProfile') > -1).ok;
          should(result.text.indexOf('bootDiagnostics') > -1).ok;
          should(result.text.indexOf('storageUri') > -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-instance-view should get instance view of the 2nd vm', function(done) {
        var cmd = util.format('vm get-instance-view %s %s --json', groupName, vm2Prefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          should(result.text.indexOf('diagnosticsProfile') > -1).ok;
          should(result.text.indexOf('bootDiagnostics') > -1).ok;
          should(result.text.indexOf('storageUri') == -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-serial-output should get serial output of the VM', function(done) {
        var cmd = util.format('vm get-serial-output %s %s', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          should(result.text.indexOf('bootdiagnostics') > -1 || result.text.indexOf('bootDiagnostics') > -1).ok;
          should(result.text.indexOf('serialconsole.log') > -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-serial-output should not get serial output of the 2nd vm', function(done) {
        var cmd = util.format('vm get-serial-output %s %s', groupName, vm2Prefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          should(result.text.indexOf('bootdiagnostics') == -1 && result.text.indexOf('bootDiagnostics') == -1).ok;
          should(result.text.indexOf('serialconsole.log') == -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('set should disable the diagnostics settings', function(done) {
        var cmd = util.format('vm set --disable-boot-diagnostics %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-serial-output should not show bootdiagnostics output', function(done) {
        var cmd = util.format('vm get-serial-output %s %s', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          should(result.text.indexOf('bootDiagnostics') == -1 && result.text.indexOf('bootdiagnostics') == -1).ok;
          should(result.text.indexOf('serialconsole.log') == -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('set should enable the diagnostics settings', function(done) {
        var cmd = util.format('vm set --enable-boot-diagnostics --boot-diagnostics-storage-uri https://%s.blob.core.windows.net/ %s %s --json', storageAccount, groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('set should be able to update the VM size', function(done) {
        var cmd = util.format('vm set -z %s %s --json', 'Standard_A1', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('get-serial-output should show bootdiagnostics output again', function(done) {
        var cmd = util.format('vm get-serial-output %s %s', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          should(result.text.indexOf('bootdiagnostics') > -1 || result.text.indexOf('bootDiagnostics') > -1).ok;
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Enable diagnostics extension on created VM in a resource group', function(done) {
        var cmd = util.format('vm enable-diag %s %s -a %s --json', groupName, vmPrefix, storageAccount).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Check diagnostics extension on created VM should pass', function(done) {
        var cmd = util.format('vm extension get %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].publisher.should.equal(IaasDiagPublisher);
          allResources[0].name.should.equal(IaasDiagExtName);
          allResources[0].typeHandlerVersion.should.equal(IaasDiagVersion);
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