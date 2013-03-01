/**
* Copyright 2012 Microsoft Corporation
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
var url = require('url');
var util = require('util');
var crypto = require('crypto');
var cli = require('../../lib/cli');
var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var communityImageId = process.env['AZURE_COMMUNITY_IMAGE_ID'];
// A common VM used by multiple tests
var vmToUse = { Name: null, Created: false, Delete: false};

var vmPrefix = 'clitestvm1';
var vmNames = [];

var suiteUtil;
var testPrefix = 'cli.vm-tests';

var currentRandom = 0;

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
}

suite('cli', function(){
  suite('vm', function() {
    suiteSetup(function (done) {
      process.env.AZURE_DISABLE_STRICT_SSL = true;

      suiteUtil = new MockedTestUtils(testPrefix, true);

      if (suiteUtil.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });
      }

      suiteUtil.setupSuite(done);
    });

    suiteTeardown(function (done) {
      if (suiteUtil.isMocked) {
        crypto.randomBytes.restore();
      }

      suiteUtil.teardownSuite(function () {
        delete process.env.AZURE_DISABLE_STRICT_SSL;
        done();
      });
    });

    setup(function (done) {
      suiteUtil.setupTest(done);
    });

    teardown(function (done) {
      function deleteUsedVM (vm, callback) {
        if (vm.Created && vm.Delete) {
          var cmd = ('node cli.js vm delete ' + vm.Name + ' --json').split(' ');
          executeCmd(cmd, function (result) {
            vm.Name = null;
            vm.Created = vm.Delete = false;
            return callback();
          });
        } else {
          return callback();
        }
      };

      deleteUsedVM(vmToUse, function () {
        suiteUtil.teardownTest(done);
      });
    });

    test('vm endpoint create-multiple. Verify creation of multiple endpoints', function (done) {
      getSharedVM(function(vm) {
        vm.Created.should.be.ok;

        var endPoints =  { 
          OnlyPP: { PublicPort: 3333 },
          PPAndLP: { PublicPort: 4444, LocalPort: 4454 },
          PP_LPAndLBSet: { PublicPort: 5555, LocalPort: 5565, LoadBalancerSetName: 'LbSet1' },
          PP_LP_LBSetAndProb: {
            PublicPort: 6666, LocalPort: 6676, LoadBalancerSetName: 'LbSet2',
            ProbProtocol: 'http', ProbPort: "7777", ProbPath: '/prob/listner1'
          }
        };

        var cmd = util.format(
          'node cli.js vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s,%s:%s:%s:%s:%s:%s --json', 
          vm.Name, 
          // EndPoint1
          endPoints.OnlyPP.PublicPort,
          // EndPoint2
          endPoints.PPAndLP.PublicPort, endPoints.PPAndLP.LocalPort,
          // EndPoint3
          endPoints.PP_LPAndLBSet.PublicPort, endPoints.PP_LPAndLBSet.LocalPort, endPoints.PP_LPAndLBSet.LoadBalancerSetName,
          // EndPoint4
          endPoints.PP_LP_LBSetAndProb.PublicPort, endPoints.PP_LP_LBSetAndProb.LocalPort, endPoints.PP_LP_LBSetAndProb.LoadBalancerSetName,
          endPoints.PP_LP_LBSetAndProb.ProbProtocol, endPoints.PP_LP_LBSetAndProb.ProbPort, endPoints.PP_LP_LBSetAndProb.ProbPath
        ).split(' ');

        executeCmd(cmd, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('node cli.js vm endpoint list %s --json', vm.Name).split(' ');
          executeCmd(cmd, function (result) {
            result.exitStatus.should.equal(0);
            var allEndPointList = JSON.parse(result.text);

            // Verify endpoint creation with only lb port
            var endPointListOnlyLb = allEndPointList.filter(
              function(element, index, array) { 
                return (element.LocalPort == endPoints.OnlyPP.PublicPort)
              }
            );
            endPointListOnlyLb.length.should.be.equal(1);
            (endPointListOnlyLb[0].PublicPort == endPointListOnlyLb[0].LocalPort).should.be.true;

            // Verify endpoint creation with lb port and vm port
            var endPointListLbAndVm = allEndPointList.filter(
              function(element, index, array) { 
                return (element.LocalPort == endPoints.PPAndLP.LocalPort)
              }
            );
            endPointListLbAndVm.length.should.be.equal(1);
            (endPointListLbAndVm[0].PublicPort == endPoints.PPAndLP.PublicPort).should.be.true;

            // Verify endpoint creation with lbSetName and prob option
            cmd = util.format('node cli.js vm show %s --json', vm.Name).split(' ');
            executeCmd(cmd, function (result) {
              result.exitStatus.should.equal(0);
              var vmInfo = JSON.parse(result.text);
              (vmInfo.Network.Endpoints.length >= 4).should.be.true;

              var endPointListLbVmAndSet = vmInfo.Network.Endpoints.filter(
                function(element, index, array) { 
                  return (element.LocalPort == endPoints.PP_LPAndLBSet.LocalPort)
                }
              );
              endPointListLbVmAndSet.length.should.be.equal(1);
              endPointListLbVmAndSet[0].LoadBalancedEndpointSetName.should.be.equal('LbSet1');

              var endPointListLbVmSetAndProb = vmInfo.Network.Endpoints.filter(
                function(element, index, array) { 
                  return (element.LocalPort == endPoints.PP_LP_LBSetAndProb.LocalPort)
                }
              );
              endPointListLbVmSetAndProb.length.should.be.equal(1);
              endPointListLbVmSetAndProb[0].LoadBalancedEndpointSetName.should.be.equal(endPoints.PP_LP_LBSetAndProb.LoadBalancerSetName);
              endPointListLbVmSetAndProb[0].LoadBalancerProbe.Protocol.should.be.equal(endPoints.PP_LP_LBSetAndProb.ProbProtocol);
              endPointListLbVmSetAndProb[0].LoadBalancerProbe.Port.should.be.equal(endPoints.PP_LP_LBSetAndProb.ProbPort);

              // Set Delete to true if this is the last test using shared vm
              vm.Delete = true;
              return done();
            });
          });
        });
      });
    });

    test('vm create from community image', function (done) {
      var vmName = suiteUtil.generateId(vmPrefix, vmNames);

      // Create a VM using community image (-o option)
      var cmd = util.format(
        'node cli.js vm create %s %s communityUser PassW0rd$ -o --json --ssh --location', 
        vmName, 
        communityImageId
      ).split(' ');
      cmd.push('West US');
      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);

        // List the VMs
        cmd = 'node cli.js vm list --json'.split(' ');
        executeCmd(cmd, function (result) {
          var vmList = JSON.parse(result.text);
          // Look for created VM
          var vmExists = vmList.some(function (vm) {
            return vm.VMName.toLowerCase() === vmName.toLowerCase()
          });

          vmExists.should.be.ok;
          // Delete created VM
          cmd = ('node cli.js vm delete ' + vmName + ' --json').split(' ');
          cmd.push('--dns-name');
          cmd.push(vmName);
          executeCmd(cmd, function (result) {
            result.exitStatus.should.equal(0);
            return done();
          });
        });
      });
    });

    // Get name of an image of the given category
    function getImageName(category, callBack)
    {
      if (getImageName.imageName) {
        callBack(getImageName.imageName);
      } else {
        var cmd = 'node cli.js vm image list --json'.split(' ');
        executeCmd(cmd, function (result) {
          var imageList = JSON.parse(result.text);
          imageList.some(function (image) {
            if (image.Category.toLowerCase() === category.toLowerCase()) {
              getImageName.imageName = image.Name;
            }
          });
          callBack(getImageName.imageName);
        });
      }
    }
  
    // Create a VM to be used by multiple tests (this will be useful when we add more tests
    // for endpoint create/delete/update, vm create -c.
    function getSharedVM(callBack)
    {
      if (vmToUse.Created) {
        return callBack(vmToUse);
      } else {
        getImageName('Microsoft', function(imageName) {
          var name = suiteUtil.generateId(vmPrefix, vmNames);

          var cmd = util.format(
            'node cli.js vm create %s %s Administrator PassW0rd$ --json --location', 
            name, 
            imageName
          ).split(' ');
          cmd.push('West US');
          executeCmd(cmd, function (result) {
            vmToUse.Created = (result.exitStatus == 0);
            vmToUse.Name = vmToUse.Created ? name : null;
            return callBack(vmToUse);
          });
        });
      }
    }
  });
});
