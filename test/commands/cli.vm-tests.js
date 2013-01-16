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
var url = require('url');
var uuid = require('node-uuid');
var util = require('util');
var cli = require('../cli');
var capture = require('../util').capture;

var communityImageId = process.env['AZURE_COMMUNITY_IMAGE_ID'];
// A common VM used by multiple tests
var vmToUse = { Name: null, Created: false, Delete: false};

suite('cli', function (){
  suite('vm', function () {
    teardown(function (done) {
      function deleteUsedVM (vm) {
        if (vm.Created && vm.Delete) {
          var cmd = ('node cli.js vm delete ' + vm.Name + ' --json').split(' ');

          capture(function () {
            cli.parse(cmd);
          }, function () {
            done();
          });
      
          vm.Name = null;
          vm.Created = vm.Delete = false;
        } else {
          done();
        }
      };

      deleteUsedVM(vmToUse);
    });

    test('vm endpoint create-multiple. Verify creation of multiple endpoints', function (done) {
      getSharedVM(function(vm) {
        vm.Created.should.be.ok;

        var endPoints =  { 
          OnlyLb: {Lb: 3333 }, 
          LbAndVm: { Lb: 4444, Vm: 4454 },
          LbVmAndSet: { Lb: 5555, Vm: 5565, LbSetName: 'LbSet1' },
          LbVmSetProb: { Lb: 6666, Vm: 6676, LbSetName: 'LbSet2', PProtocol: 'http', PPort: "7777", PPath: '/prob/listner1'}
        };

        var cmd = util.format(
          'node cli.js vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s,%s:%s:%s:%s:%s:%s --json', 
          vm.Name, 
          // EndPoint1
          endPoints.OnlyLb.Lb, 
          // EndPoint2
          endPoints.LbAndVm.Lb, endPoints.LbAndVm.Vm,
          // EndPoint3
          endPoints.LbVmAndSet.Lb, endPoints.LbVmAndSet.Vm, endPoints.LbVmAndSet.LbSetName,
          // EndPoint4
          endPoints.LbVmSetProb.Lb, endPoints.LbVmSetProb.Vm, endPoints.LbVmSetProb.LbSetName,
          endPoints.LbVmSetProb.PProtocol, endPoints.LbVmSetProb.PPort, endPoints.LbVmSetProb.PPath
        ).split(' ');

        capture(function() {
          cli.parse(cmd)
        }, function (result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('node cli.js vm endpoint list %s --json', vm.Name).split(' ');
          capture(function() {
            cli.parse(cmd)
          }, function (result) {
            result.exitStatus.should.equal(0);
            var allEndPointList = JSON.parse(result.text);

            // Verify endpoint creation with only lb port
            var endPointListOnlyLb = allEndPointList.filter(
              function(element, index, array) { 
                return (element.LocalPort == endPoints.OnlyLb.Lb)
              }
            );
            endPointListOnlyLb.length.should.be.equal(1);
            (endPointListOnlyLb[0].PublicPort == endPointListOnlyLb[0].LocalPort).should.be.true;

            // Verify endpoint creation with lb port and vm port
            var endPointListLbAndVm = allEndPointList.filter(
              function(element, index, array) { 
                return (element.LocalPort == endPoints.LbAndVm.Vm)
              }
            );
            endPointListLbAndVm.length.should.be.equal(1);
            (endPointListLbAndVm[0].PublicPort == endPoints.LbAndVm.Lb).should.be.true;

            // Verify endpoint creation with lbSetName and prob option
            cmd = util.format('node cli.js vm show %s --json', vm.Name).split(' ');
            capture(function() {
              cli.parse(cmd)
            }, function (result) {
              result.exitStatus.should.equal(0);
              var vmInfo = JSON.parse(result.text);
              (vmInfo.Network.Endpoints.length >= 4).should.be.true;

              var endPointListLbVmAndSet = vmInfo.Network.Endpoints.filter(
                function(element, index, array) { 
                  return (element.LocalPort == endPoints.LbVmAndSet.Vm)
                }
              );
              endPointListLbVmAndSet.length.should.be.equal(1);
              endPointListLbVmAndSet[0].LoadBalancedEndpointSetName.should.be.equal('LbSet1');

              var endPointListLbVmSetAndProb = vmInfo.Network.Endpoints.filter(
                function(element, index, array) { 
                  return (element.LocalPort == endPoints.LbVmSetProb.Vm)
                }
              );
              endPointListLbVmSetAndProb.length.should.be.equal(1);
              endPointListLbVmSetAndProb[0].LoadBalancedEndpointSetName.should.be.equal('LbSet2');
              endPointListLbVmSetAndProb[0].LoadBalancerProbe.Protocol.should.be.equal('http');
              endPointListLbVmSetAndProb[0].LoadBalancerProbe.Port.should.be.equal(endPoints.LbVmSetProb.PPort);

              // Set Delete to true if this is the last test using shared vm
              vm.Delete = true;
              done();
            });
          });
        });
      });
    });

    test('vm create from community image', function (done) {
      var vmName = ('cliuttestvm2' + uuid()).toLowerCase().substr(0, 15);
      // Create a VM using community image (-o option)
      var cmd = util.format(
        'node cli.js vm create %s %s communityUser PassW0rd$ -o --json --ssh --location', 
        vmName, 
        communityImageId
      ).split(' ');
      cmd.push('West US');
    
      capture(function () {
        cli.parse(cmd);
      }, function (result) {
        result.exitStatus.should.equal(0);
        // List the VMs
        cmd = 'node cli.js vm list --json'.split(' ');
        capture(function () {
          cli.parse(cmd);
        }, function (result) {
          var vmList = JSON.parse(result.text);
          // Look for created VM
          var vmExists = vmList.some(function (vm) {
            return vm.VMName.toLowerCase() === vmName.toLowerCase()
          });
      
          vmExists.should.be.ok;
      
          // Delete the VM
          cmd = ('node cli.js vm delete ' + vmName + ' --json').split(' ');
          capture(function() {
            cli.parse(cmd);
          }, function (result) {
            done();
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
        capture(function () {
          cli.parse(cmd);
        }, function (result) {
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
        callBack(vmToUse);
      } else {
        getImageName('Microsoft', function(imageName) {
          var name = ('clitestvm1' + uuid()).toLowerCase().substr(0, 15);
          var cmd = util.format(
            'node cli.js vm create %s %s Administrator PassW0rd$ --json --location', 
            name, 
            imageName
          ).split(' ');
          cmd.push('West US');
          capture(function () {
            cli.parse(cmd);
          }, function (result) {
            vmToUse.Created = (result.exitStatus == 0);
            vmToUse.Name = vmToUse.Created ? name : null;
            callBack(vmToUse);
          });
        });
      }
    }
  });
});
