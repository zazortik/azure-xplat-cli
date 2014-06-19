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
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

// A common VM used by multiple tests
var vmToUse = {
  Name : null,
  Created : false,
  Delete : false
};

var vmPrefix = 'clitestvm';
var vmNames = [];
var timeout = isForceMocked ? 0 : 5000;

var suite;
var testPrefix = 'cli.vm.create_affin_vnet_vm-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var affinityName = 'xplataffintest',
    vmVnetName,
    vnetName = 'xplattestvnet',
    affinLabel = 'xplatAffinGrp',
    affinDesc = 'Test Affinty Group for xplat',
    location = process.env.AZURE_VM_TEST_LOCATION || 'West US',
    availSetName = 'Testset';

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      
      vmVnetName = isForceMocked ? 'xplattestvmVnet' : suite.generateId(vmPrefix, null) + 'Vnet';
      suite.setupSuite(done);
    });

    after(function (done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);

    });

    afterEach(function (done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
          setTimeout(function () {
            var cmd = util.format('vm delete %s -b -q --json', vm.Name).split(' ');
            suite.execute(cmd, function (result) {
              vm.Name = null;
              vm.Created = vm.Delete = false;
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

    //create a vm with affinity group, vnet and availibilty set
    describe('Create:', function () {
      it('Vm with affinity, vnet and availibilty set', function (done) {
        getImageName('Linux', function (imageName) {
          getVnet('Created', function (virtualnetName, affinityName) {
            var cmd = util.format('vm create -A %s -n %s -a %s -w %s %s %s "azureuser" "Pa$$word@123" --json',
                availSetName, vmVnetName, affinityName, virtualnetName, vmVnetName, imageName).split(' ');
            suite.execute(cmd, function (result) {
              result.exitStatus.should.equal(0);
              vmToUse.Created = true;
              vmToUse.Name = vmVnetName;
              vmToUse.Delete = true;
              done();
            });
          });
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (getImageName.imageName) {
        callBack(getImageName.imageName);
      } else {
        suite.execute('vm image list --json', function (result) {
          var imageList = JSON.parse(result.text);
          imageList.some(function (image) {
            if (image.operatingSystemType.toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
              getImageName.imageName = image.name;
              return true;
            }
          });
          callBack(getImageName.imageName);
        });
      }
    }

    //get name of a vnet
    function getVnet(status, callback) {
      var cmd;
      if (getVnet.vnetName) {
        callback(getVnet.vnetName, getVnet.affinityName);
      } else {
        cmd = util.format('network vnet list --json').split(' ');
        suite.execute(cmd, function (result) {
          var vnetName = JSON.parse(result.text);
          var found = vnetName.some(function (vnet) {
              if (vnet.state == status) {
                getVnet.vnetName = vnet.name;
                getVnet.affinityName = vnet.affinityGroup;
                return true;
              }
            });

          if (!found) {
            getAffinityGroup(location, function (affinGrpName) {
              cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
              suite.execute(cmd, function (result) {
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
      if (getAffinityGroup.affinGrpName) {
        callBack(getAffinityGroup.affinGrpName);
      } else {
        suite.execute('account affinity-group list --json', function (result) {
          var affinList = JSON.parse(result.text);
          var found = affinList.some(function (affinGrp) {
              if (affinGrp.location == location) {
                getAffinityGroup.affinGrpName = affinGrp.name;
                return true;
              }
            });
          if (!found) {
            suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
              location, affinLabel, affinDesc, affinityName, function (result) {
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
