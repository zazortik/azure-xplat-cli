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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var sinon = require('sinon');
var blobUtils = require('../../lib/util/blobUtils');

// A common VM used by multiple tests
var suite;
var vmPrefix = 'clitestvm';
var createdVms = [];
var createdVnets = [];
var testPrefix = 'cli.vm.create_staticvm-tests';
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      username = 'azureuser',
      password = 'PassW0rd$',
      retry = 5,
      timeout, staticIpavail, staticIpToSet;
      testUtils.TIMEOUT_INTERVAL = 5000;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(function() {
        vmName = suite.generateId(vmPrefix, createdVms);
        //Record + Playback
        if (suite.isMocked) {
          //mock the behavior to provide a predictable storage account name 
          //in record and playback mode
          sinon.stub(blobUtils, "normalizeServiceName", function () {
            return vmName + "14264783346";
          });
        }
        done();
      });
    });

    after(function(done) {
      suite.teardownSuite(function (){
        //Record + Playback
        if (suite.isMocked) {
          //restore the normalization of storage account name to the original behavior
          blobUtils.normalizeServiceName.restore();
        }
        //Run delete calls only in Live and Record mode
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

    //check for available static-ips for a vnet

    describe('network:', function() {
      it('check for available static ips in a vnet', function(done) {
        getVnet('Created', function(virtualnetName) {
          var cmd = util.format('network vnet static-ip check %s %s --json', virtualnetName, staticIpavail).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var staticIps = JSON.parse(result.text);
            staticIps.availableAddresses.length.should.be.above(0);
            staticIpavail = staticIps.availableAddresses[0];
            staticIpToSet = staticIps.availableAddresses[1];
            done();
          });
        });
      });
    });

    //create a vm with static-ip set
    describe('Create a VM with static ip address:', function() {
      it('Create a VM with static ip address', function(done) {
        getImageName('Windows', function(ImageName) {
          getVnet('Created', function(virtualnetName) {
            var cmd = util.format('vm create --virtual-network-name %s %s %s %s %s --static-ip %s --json',
              virtualnetName, vmName, ImageName, username, password, staticIpavail).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              done();
            });
          });
        });
      });
    });

    // VM Restart and check
    describe('StaticIp Show:', function() {
      it('Show the description of the vm with set static ip', function(done) {
        var cmd = util.format('vm static-ip show %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var VnetIps = JSON.parse(result.text);
          VnetIps.Network.StaticIP.should.equal(staticIpavail);
          done();
        });
      });
    });

    describe('static ip operations:', function() {

      after(function(done) {
        if (suite.isPlayback()) {
          done();
        } else {
          var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }
      });

      it('Setting the static ip address to the created VM', function(done) {
        var cmd = util.format('vm static-ip set %s %s --json', vmName, staticIpToSet).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          cmd = util.format('vm show %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(innerresult) {
            innerresult.exitStatus.should.equal(0);
            var vmshow = JSON.parse(innerresult.text);
            vmshow.IPAddress.should.equal(staticIpToSet);
            done();
          });
        });
      });

      it('Removing the static ip address', function(done) {
        var cmd = util.format('vm static-ip remove %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          cmd = util.format('vm static-ip show %s --json --verbose', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            result.text.should.include('No static IP address set for VM');
            done();
          });
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (process.env.VM_WIN_IMAGE) {
        callBack(process.env.VM_WIN_IMAGE);
      } else {
        var cmd = util.format('vm image list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var imageList = JSON.parse(result.text);
          imageList.some(function(image) {
            if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              process.env.VM_WIN_IMAGE = image.name;
              return true;
            }
          });
          callBack(process.env.VM_WIN_IMAGE);
        });
      }
    }

    //get name of a vnet
    function getVnet(status, callback) {
      var cmd;
      if (getVnet.vnetName) {
        callback(getVnet.vnetName);
      } else {
        cmd = util.format('network vnet list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var vnetName = JSON.parse(result.text);
          var found = vnetName.some(function(vnet) {
            if (vnet.state == status && vnet.affinityGroup) {
              getVnet.vnetName = vnet.name;
              var address = vnet.addressSpace.addressPrefixes[0];
              staticIpavail = address.split('/')[0];
              return true;
            }
          });

          if (!found) {
            getAffinityGroup(location, function(affinGrpName) {
              vnetName = suite.generateId('testvnet', createdVnets);
              cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                getVnet.vnetName = vnetName;
                var address = vnet[0].addressSpace.addressPrefixes[0];
                staticIpavail = address.split('/')[0];
                callback(getVnet.vnetName);
              });
            });
          } else {
            callback(getVnet.vnetName);
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
            if (affinGrp.location == location) {
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
  });
});