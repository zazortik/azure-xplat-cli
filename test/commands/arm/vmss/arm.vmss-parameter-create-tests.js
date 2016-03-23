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
var profile = require('../../../../lib/util/profile');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vmss-parameter-create-tests';
var groupPrefix = 'xplatTstVmssGCreate';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'southeastasia'
}];

var groupName,
  vmssPrefix5 = 'xplattestvmss5',
  nicName = 'xplattestnic',
  location,
  imageUrn = 'MicrosoftWindowsServer:WindowsServer:2008-R2-SP1:latest',
  linuxImageUrn = 'SUSE:openSUSE:13.2:latest',
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatteststorage1',
  storageAccount2 = 'xplatteststorage2',
  storageAccount3 = 'xplatteststorage3',
  storageCont = 'xplatteststoragecnt1',
  storageCont2 = 'xplatteststoragecnt2',
  storageCont3 = 'xplatteststoragecnt3',
  osdiskvhd = 'xplattestvhd',
  vNetPrefix = 'xplattestvnet',
  subnetName = 'xplattestsubnet',
  publicipName = 'xplattestip',
  dnsPrefix = 'xplattestipdns',
  tags = 'a=b;b=c;d=',
  IaasDiagPublisher,
  IaasDiagExtName,
  IaasDiagVersion,
  datafile = 'test/data/testdata.json',
  paramFileName = 'test/data/vmssParamTest5.json',
  vmssCapacity = 10,
  publisher = 'Microsoft.Compute',
  bgInfoExtName = 'BGInfo',
  bgInfoExtVer = '2.1',
  vmaExtName = 'VMAccessAgent',
  vmaExtVer = '2.0';
  
var makeCommandStr = function(component, verb, file, others) {
  var cmdFormat = 'vmss config %s %s --parameter-file %s %s --json';
  return util.format(cmdFormat, component, verb, file, others ? others : '');
};

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.generateId(groupPrefix, null);
        vmssPrefix5 = suite.isMocked ? vmssPrefix5 : suite.generateId(vmssPrefix5, null);
        nicName = suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageAccount2 = suite.generateId(storageAccount2, null);
        storageAccount3 = suite.generateId(storageAccount3, null);
        storageCont = suite.generateId(storageCont, null);
        storageCont2 = suite.generateId(storageCont2, null);
        storageCont3 = suite.generateId(storageCont3, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.generateId(vNetPrefix, null);
        subnetName = suite.generateId(subnetName, null);
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

      it('required resources (group, vnet, subnet, nic) create should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            var cmd = util.format('storage account create -g %s --type GRS --location %s %s --json', groupName, location, storageAccount).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var cmd = util.format('storage account create -g %s --type GRS --location %s %s --json', groupName, location, storageAccount2).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var cmd = util.format('storage account create -g %s --type GRS --location %s %s --json', groupName, location, storageAccount3).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  var cmd = util.format('network vnet create %s %s %s -a 10.0.0.0/16 --json', groupName, vNetPrefix, location).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var cmd = util.format('network vnet subnet create -a 10.0.0.0/24 %s %s %s --json', groupName, vNetPrefix, subnetName).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                      result.exitStatus.should.equal(0);
                      var cmd = util.format('network nic create %s %s %s --subnet-vnet-name %s --subnet-name %s --json', groupName, nicName, location, vNetPrefix, subnetName).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
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

      it('create-or-update-parameter generate set and remove should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var subscription = profile.current.getSubscription();
        var subnetId = '/subscriptions/' + subscription.id + '/resourceGroups/' + groupName + '/providers/Microsoft.Network/VirtualNetworks/' + vNetPrefix + '/subnets/' + subnetName;
        var cmd = util.format('vmss config generate --parameter-file %s', paramFileName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = makeCommandStr('virtual-machine-scale-set', 'set', paramFileName, util.format('--name %s --location %s --over-provision false', vmssPrefix5, location)).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var cmd = makeCommandStr('virtual-machine-scale-set', 'delete', paramFileName, '--type --tags --provisioning-state').split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var cmd = makeCommandStr('sku', 'set', paramFileName, '--capacity ' + vmssCapacity + ' --name Standard_A1 --tier Standard').split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var cmd = makeCommandStr('upgrade-policy', 'set', paramFileName, '--mode Manual').split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  var cmd = makeCommandStr('network-interface-configurations', 'set', paramFileName, '--index 0 --name test --primary true').split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var cmd = makeCommandStr('ip-configurations', 'set', paramFileName, '--network-interface-configurations-index 0 --index 0 --name test').split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                      result.exitStatus.should.equal(0);
                      var cmd = makeCommandStr('subnet', 'set', paramFileName, util.format('--network-interface-configurations-index 0 --ip-configurations-index 0 --id %s', subnetId)).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        var cmd = makeCommandStr('ip-configurations', 'delete', paramFileName, '--network-interface-configurations-index 0 --index 0 --load-balancer-backend-address-pools').split(' ');
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                          result.exitStatus.should.equal(0);
                          var cmd = makeCommandStr('ip-configurations', 'delete', paramFileName, '--network-interface-configurations-index 0 --index 0 --load-balancer-inbound-nat-pools').split(' ');
                          testUtils.executeCommand(suite, retry, cmd, function(result) {
                            result.exitStatus.should.equal(0);
                            var cmd = makeCommandStr('os-profile', 'delete', paramFileName, '--secrets --linux-configuration --windows-configuration --custom-data').split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                              result.exitStatus.should.equal(0);
                              var cmd = makeCommandStr('os-profile', 'set', paramFileName, util.format('--computer-name-prefix test --admin-username %s --admin-password %s', username, password)).split(' ');
                              testUtils.executeCommand(suite, retry, cmd, function(result) {
                                result.exitStatus.should.equal(0);
                                var cmd = makeCommandStr('image-reference', 'set', paramFileName, '--publisher MicrosoftWindowsServer --offer WindowsServer --sku 2012-R2-Datacenter --version latest').split(' ');
                                testUtils.executeCommand(suite, retry, cmd, function(result) {
                                  result.exitStatus.should.equal(0);
                                  var cmd = makeCommandStr('os-disk', 'set', paramFileName, '--caching None --create-option fromImage --name test').split(' ');
                                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                                    result.exitStatus.should.equal(0);
                                    var cmd = makeCommandStr('os-disk', 'delete', paramFileName, '--os-type --image').split(' ');
                                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                                      result.exitStatus.should.equal(0);
                                      var cmd = makeCommandStr('vhd-containers', 'delete', paramFileName, '--index 0').split(' ');
                                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                                        result.exitStatus.should.equal(0);
                                        var cmd = makeCommandStr('vhd-containers', 'set', paramFileName, util.format('--index 0 --value https://%s.blob.core.windows.net/%s', storageAccount, storageCont)).split(' ');
                                          testUtils.executeCommand(suite, retry, cmd, function(result) {
                                          result.exitStatus.should.equal(0);
                                          var cmd = makeCommandStr('vhd-containers', 'set', paramFileName, util.format('--index 1 --value https://%s.blob.core.windows.net/%s', storageAccount2, storageCont2)).split(' ');
                                          testUtils.executeCommand(suite, retry, cmd, function(result) {
                                            result.exitStatus.should.equal(0);
                                            var cmd = makeCommandStr('vhd-containers', 'set', paramFileName, util.format('--index 2 --value https://%s.blob.core.windows.net/%s', storageAccount3, storageCont3)).split(' ');
                                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                                              result.exitStatus.should.equal(0);
                                              var cmd = makeCommandStr('extensions', 'set', paramFileName, util.format('--index 0 --name test --publisher %s --type %s --type-handler-version %s --auto-upgrade-minor-version true', publisher, vmaExtName, vmaExtVer)).split(' ');
                                              testUtils.executeCommand(suite, retry, cmd, function(result) {
                                                result.exitStatus.should.equal(0);
                                                var cmd = util.format('vmss create-or-update -g %s -n %s --parameter-file %s --json', groupName, vmssPrefix5, paramFileName).split(' ');
                                                testUtils.executeCommand(suite, retry, cmd, function(result) {
                                                  result.exitStatus.should.equal(0);
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
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });


      it('create-or-update-parameter set extension should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var subscription = profile.current.getSubscription();
        var cmd = makeCommandStr('extensions', 'set', paramFileName, util.format('--index 1 --name test1 --publisher %s --type %s --type-handler-version %s --auto-upgrade-minor-version true', publisher, bgInfoExtName, bgInfoExtVer)).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('vmss create-or-update -g %s -n %s --parameter-file %s --json', groupName, vmssPrefix5, paramFileName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            result.text.should.containEql(publisher);
            result.text.should.containEql(bgInfoExtName);
            result.text.should.containEql(vmaExtName);
            done();
          });
        });
      });

      it('get vmss result with or without json view should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss get %s %s', groupName, vmssPrefix5).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(publisher);
          result.text.should.containEql(bgInfoExtName);
          result.text.should.containEql(vmaExtName);
          var cmd = util.format('vmss get %s %s --json', groupName, vmssPrefix5).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            result.text.should.containEql(publisher);
            result.text.should.containEql(bgInfoExtName);
            result.text.should.containEql(vmaExtName);
            done();
          });
        });
      });

      it('vmssvm list should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmssvm list --resource-group-name %s --virtual-machine-scale-set-name %s', groupName, vmssPrefix5).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(vmssPrefix5 + '_0');
          result.text.should.containEql(vmssPrefix5 + '_' + (vmssCapacity - 1).toString());
          done();
        });
      });

      it('vmss list should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss list-all').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql('ProvisioningState');
          result.text.should.containEql('-----------------');
          var cmd = util.format('vmss list --resource-group-name %s', groupName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            result.text.should.containEql(vmssPrefix5);
            result.text.should.containEql('ProvisioningState');
            result.text.should.containEql('-----------------');
            var cmd = util.format('vmss list --resource-group-name %s --json', groupName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              result.text.should.containEql(vmssPrefix5);
              result.text.should.containEql('provisioningState');
              result.text.should.not.containEql('-----------------');
              done();
            });
          });
        });
      });

      it('get instance view should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss get-instance-view --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix5).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('update instances should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('vmss update-instances --resource-group-name %s --vm-scale-set-name %s --instance-ids 0,1 --json', groupName, vmssPrefix5).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('update wrong instances should fail', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var wrongId = '999';
        var cmd = util.format('vmss update-instances --resource-group-name %s --vm-scale-set-name %s --instance-ids 0,1,%s', groupName, vmssPrefix5, wrongId).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.not.equal(0);
          result.errorText.should.containEql('The provided instanceId ' + wrongId + ' is not an active Virtual Machine Scale Set VM instanceId.');
          done();
        });
      });

      it('delete wrong instances should fail', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var wrongId = '999';
        var cmd = util.format('vmss delete-instances --resource-group-name %s --vm-scale-set-name %s --instance-ids 0,1,%s', groupName, vmssPrefix5, wrongId).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.not.equal(0);
          result.errorText.should.containEql('The provided instanceId ' + wrongId + ' is not an active Virtual Machine Scale Set VM instanceId.');
          done();
        });
      });
      
      it('vmssvm get should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var id0 = '0';
        var cmd = util.format('vmssvm get --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix5, id0).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(vmssPrefix5 + '_' + id0);
          var id1 = '1';
          var cmd = util.format('vmssvm get --resource-group-name %s --vm-scale-set-name %s --instance-id %s', groupName, vmssPrefix5, id1).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            result.text.should.containEql(vmssPrefix5 + '_' + id1);
            result.text.should.containEql(publisher);
            result.text.should.containEql(bgInfoExtName);
            result.text.should.containEql(vmaExtName);
            done();
          });
        });
      });

      it('vmssvm get instance should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var id0 = '0';
        var cmd = util.format('vmssvm get-instance-view %s %s %s', groupName, vmssPrefix5, id0).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(publisher);
          result.text.should.containEql(bgInfoExtName);
          result.text.should.containEql(vmaExtName);
          done();
        });
      });
      
      it('delete command should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 20);
        var cmd = util.format('vmss delete --resource-group-name %s --vm-scale-set-name %s --json', groupName, vmssPrefix5).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

    });
  });
});
