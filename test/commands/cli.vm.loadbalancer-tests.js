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
var vmPrefix = 'clitestvm';
var testPrefix = 'cli.vm.pip-tests';
var requiredEnvironment = [{
    name : 'AZURE_VM_TEST_LOCATION',
    defaultValue : 'West US'
  }
];

describe('cli', function () {
  describe('vm', function () {
    var vmName,
    location,
    vmVnetName,
    userName = 'azureuser',
    password = 'Collabera@01',
    retry = 5,
    subNet,
    loadname = 'testload',
    updateloadname = 'updateload',
    timeout;
    testUtils.TIMEOUT_INTERVAL = 12000;
    var vmToUse = {
      Name : null,
      Created : false,
      Delete : false
    };

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
      vmVnetName = suite.isMocked ? 'xplattestvmVnet' : suite.generateId(vmPrefix, null) + 'Vnet';
    });

    after(function (done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function () {
            var cmd = util.format('vm show %s --json', vm.Name).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              vm.Name = null;
              //vm.Created = vm.Delete = false;
              callback();
            });
          }, timeout);
        } else {
          callback();
        }
      }

      deleteUsedVM(vmToUse, function () {
        suite.teardownTest(done);
      });
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });

    afterEach(function (done) {
      setTimeout(function () {
        suite.teardownTest(done);
      }, timeout);
    });

    describe('Public ip address :', function () {

      it('Vm should create with vnet', function (done) {
        getImageName('Linux', function (imageName) {
          getVnet('Created', function (virtualnetName, affinityName, subnet) {
            console.log(vmVnetName);
            console.log(virtualnetName);
            console.log(imageName);
            console.log(userName);
            var cmd = util.format('vm create %s --virtual-network-name %s %s %s %s --json',
                vmVnetName, virtualnetName, imageName, userName, password).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              subNet = subnet;
              vmToUse.Created = true;
              vmToUse.Name = vmVnetName;
              vmToUse.Delete = true;
              done();
            });
          });
        });
      });

      it('Load balancer', function (done) {
        var cmd = util.format('service internal-load-balancer add -n %s %s %s --json',
            subNet, vmVnetName, loadname).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);

          done();
        });
      });

      it('Load balancer list', function (done) {
        var cmd = util.format('service internal-load-balancer list OffshoreTt --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var loadlist = JSON.parse(result.text);
          loadlist[0].name.should.equal('testload');

          done();
        });
      });

      it('Load balancer update', function (done) {
        var cmd = util.format('service internal-load-balancer set OffshoreTt -n --json', updateloadname).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var loadlist = JSON.parse(result.text);
          done();
        });
      });

      it('Load balancer delete', function (done) {
        var cmd = util.format('service internal-load-balancer delete OffshoreTt testload --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          console.log('hello');
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    //get name of a vnet
    function getVnet(status, callback) {
      var cmd;
      if (getVnet.vnetName) {
        callback(getVnet.vnetName, getVnet.affinityName);
      } else {
        cmd = util.format('network vnet list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var vnetName = JSON.parse(result.text);
          var found = vnetName.some(function (vnet) {
              if (vnet.state.toLowerCase() === status.toLowerCase() && vnet.affinityGroup !== undefined) {
                getVnet.vnetName = vnet.name;
                getVnet.affinityName = vnet.affinityGroup;
                return true;
              }
            });

          if (!found) {
            getAffinityGroup(location, function (affinGrpName) {
              cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                getVnet.vnetName = vnetName;
                getVnet.affinityName = affinGrpName;
                callback(getVnet.vnetName, getVnet.affinityName);
              });
            });
          } else {
            callback(getVnet.vnetName, getVnet.affinityName);
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
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var affinList = JSON.parse(result.text);
          var found = affinList.some(function (affinGrp) {
              if (affinGrp.location === location) {
                getAffinityGroup.affinGrpName = affinGrp.name;
                return true;
              }
            });
          if (!found) {
            cmd = util.format('account affinity-group create -l %s -e %s -d %s %s --json',
                location, affinLabel, affinDesc, affinityName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function (result) {
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
      if (process.env.VM_WIN_IMAGE) {
        callBack(process.env.VM_WIN_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          console.log('22');
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function (image) {
            console.log('222');
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_WIN_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_WIN_IMAGE);
        });
      }
    }
  });
});