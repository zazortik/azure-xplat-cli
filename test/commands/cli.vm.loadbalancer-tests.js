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
var should = require('should');
var util = require('util');
var fs = require('fs');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'clitestvmVnet';
var createdVms = [];
var createdVnets = [];
var testPrefix = 'cli.vm.loadbalancer-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      vmVnetName,
      userName = 'azureuser',
      password = 'Collabera@01',
      retry = 5,
      subNet,
      Subnetip,
      internalLBName = 'duplicateloadname',
      loadname = 'testload',
      updateloadname = 'updateload',
      timeout;
    testUtils.TIMEOUT_INTERVAL = 12000;
    var vmToUse = {
      Name: null,
      Created: false,
      Delete: false
    };

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmVnetName = suite.generateId(vmPrefix, createdVms);
        done();
      });
    });

    after(function(done) {
      function deleteUsedVM(vm, callback) {
        if (!suite.isMocked) {
          setTimeout(function() {
            var cmd = util.format('vm delete %s -b -q --json', vmVnetName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              setTimeout(callback, timeout);
            });
          }, timeout);
        } else
          callback();
      }

      deleteUsedVM(vmToUse, function() {
        suite.teardownSuite(function (){
          if(!suite.isPlayback()) {
            createdVnets.forEach(function (item) {
              suite.execute('network vnet delete %s -q --json', item, function (result) {
                result.exitStatus.should.equal(0);
              });
            });
          }
          done();
        });
      });
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function(done) {
      setTimeout(function() {
        suite.teardownTest(done);
      }, timeout);
    });

    describe('Load balancer :', function() {
      it('Vm should create with vnet', function(done) {
        getImageName('Linux', function(imageName) {
          getVnet('Created', function(virtualnetName, location, subnetname, subnetip) {
            var cmd = util.format('vm create %s --virtual-network-name %s %s %s %s --json',
              vmVnetName, virtualnetName, imageName, userName, password).split(' ');
            cmd.push('-l');
            cmd.push(location);
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              subNet = subnetname;
              Subnetip = subnetip;
              vmToUse.Created = true;
              vmToUse.Name = vmVnetName;
              vmToUse.Delete = true;
              done();
            });
          });
        });
      });

      it('Load balance add on a created cloudservice', function(done) {
        var cmd = util.format('service internal-load-balancer add %s %s -t %s -a %s --json',
          vmVnetName, loadname, subNet, Subnetip).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Add loadbalancer to existing loadbalanced deployment', function(done) {
        var cmd = util.format('service internal-load-balancer add %s %s -t %s --json',
          vmVnetName, internalLBName, subNet).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(1);
          result.errorText.should.include('LoadBalancer already exists: testload. Only one internal load balancer allowed per deployment');
          done();
        });
      });

      it('Load balancer list', function(done) {
        var cmd = util.format('service internal-load-balancer list %s --json', vmVnetName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var loadlist = JSON.parse(result.text);
          loadlist[0].name.should.equal('testload');
          done();
        });
      });
	  
	  it('Load balancer update', function (done) {
        var cmd = util.format('service internal-load-balancer set %s %s -t %s -a %s --json', vmVnetName, updateloadname, subNet, Subnetip).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });	  

      it('Load balancer delete', function(done) {
        var cmd = util.format('service internal-load-balancer delete %s testload --quiet --json', vmVnetName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    //get name of a vnet
    function getVnet(status, callback) {
      var cmd;
      if (getVnet.vnetName) {
        callback(getVnet.vnetName, getVnet.location, getVnet.subnetname, getVnet.subnetaddress);
      } else {
        cmd = util.format('network vnet list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vnetName = JSON.parse(result.text);
          var found = vnetName.some(function(vnet) {
            if (vnet.state.toLowerCase() === status.toLowerCase() && vnet.location !== undefined) {
              getVnet.vnetName = vnet.name;
              getVnet.location = vnet.location;
              getVnet.subnetname = vnet.subnets[0].name;
              var address = vnet.subnets[0].addressPrefix;
              var addressSplit = address.split('/');
              var firstip = addressSplit[0];
              var n = firstip.substring(0, firstip.lastIndexOf('.') + 1);
              var secondip = n.concat(addressSplit[1]);
              getVnet.subnetaddress = secondip;
              return true;
            }
          });

          if (!found) {
            getAffinityGroup(location, function(affinGrpName) {
              vnetName = suite.generateId('testvnet', createdVnets);
              cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                suite.execute('network vnet show %s --json', vnetName, function (result) {
                  result.exitStatus.should.equal(0);
                  var vnet = JSON.parse(result.text);
                  getVnet.vnetName = vnet.name;
                  getVnet.location = location;
                  getVnet.subnetname = vnet.subnets[0].name;
                  var address = vnet.subnets[0].addressPrefix;
                  var addressSplit = address.split('/');
                  var firstip = addressSplit[0];
                  var n = firstip.substring(0, firstip.lastIndexOf('.') + 1);
                  var secondip = n.concat(addressSplit[1]);
                  getVnet.subnetaddress = secondip;
                  callback(getVnet.vnetName, getVnet.location, getVnet.subnetname, getVnet.subnetaddress);
                });
              });
            });
          } else {
            callback(getVnet.vnetName, getVnet.location, getVnet.subnetname, getVnet.subnetaddress);
          }
        });
      }
    }

    // Get name of an image of the given category
    function getAffinityGroup(location, callBack) {
      var cmd;
      if (getAffinityGroup.affinGrpName) {
        callBack(getAffinityGroup.affinGrpName);
      } else {
        cmd = util.format('account affinity-group list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var affinList = JSON.parse(result.text);
          var found = affinList.some(function(affinGrp) {
            if (affinGrp.location === location) {
              getAffinityGroup.affinGrpName = affinGrp.name;
              return true;
            }
          });
          if (!found) {
            cmd = util.format('account affinity-group create -l %s -e %s -d %s %s --json',
              location, affinLabel, affinDesc, affinityName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              getAffinityGroup.affinGrpName = affinityName;
              callBack(affinityName);
            });
          } else
            callBack(getAffinityGroup.affinGrpName);
        });
      }
    }

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (process.env.VM_LINUX_IMAGE) {
        callBack(process.env.VM_LINUX_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_LINUX_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_LINUX_IMAGE);
        });
      }
    }
  });
});
