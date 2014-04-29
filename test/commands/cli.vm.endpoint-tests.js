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
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var createdDisks = [];

// A common VM used by multiple tests
var vmToUse = {
  Name: null,
  Created: false,
  Delete: false
};

var vmPrefix = 'clitestvm';
var vmNames = [];
var timeout = isForceMocked ? 0 : 90000;

var suite;
var testPrefix = 'cli.vm.endpoint-tests';

var currentRandom = 0;

describe('cli', function () {
  describe('vm', function () {
    var vmImgName, name, location;

    before(function (done) {
      suite = new CLITest(testPrefix, isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function () {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function (done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
        suite.teardownSuite(done);
      } else {
        (function deleteUsedDisk() {
          if (createdDisks.length > 0) {
            var diskName = createdDisks.pop();
            setTimeout(function () {
              suite.execute('vm disk delete -b %s --json', diskName, function (result) {
            	deleteUsedDisk();
              });
            }, timeout);
          } else {
            suite.teardownSuite(done);
          }
        })();
      }
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      function deleteUsedVM(vm, callback) {
        if (vm.Created && vm.Delete) {
		  setTimeout(function () {
            suite.execute('vm delete %s -b --quiet --json', vm.Name, function (result) {
			  vm.Name = null;
			  vm.Created = vm.Delete = false;
			  return callback();
			});
          }, timeout);
        } else {
          return callback();
        }
      }

      deleteUsedVM(vmToUse, function () {
        suite.teardownTest(done);
      });
    });

    // Creating a Windows VM
   it('Create Windows Vm', function (done) {
      getSharedVM(function (vm) {
        vm.Created.should.be.ok;
		done();
      });
    });
    
   /*  //Create affinitygroup and associate affinity group to VM
    it('Create and assign affinity group for VM', function (done) {
      suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
        location, 'XplatAffinGrp', 'Test Affinty Group for xplat', affinityName, function (result) {
           if(result.exitStatus == 1)
			done(result.errorText, null);
		  result.exitStatus.should.equal(0);
          setTimeout(function () {
			done();
		  }, timeout);
        });
    }); 
    
	// Assigning a VM to a Virtual Network
    it('Assign vm to a virtual network', function (done) {
      suite.execute('network vnet create %s -a %s --json',
        vnetName, affinityName, function (result) {
           if(result.exitStatus == 1)
			done(result.errorText, null);
		  result.exitStatus.should.equal(0);
          suite.execute('vm create --virtual-network-name %s -l %s %s %s "azureuser" "Pa$$word@123" --json',
            vnetName, location, vnetVmName, vmImgName, function (result) {
               if(result.exitStatus == 1)
			done(result.errorText, null);
			  result.exitStatus.should.equal(0);
              suite.execute('vm show %s --json', vnetVmName, function (result) {
                var vmVnet = JSON.parse(result.text);
                createdDisks.push(vmVnet.OSDisk.DiskName);
                setTimeout(function () {
				  done();
				}, timeout);
              });
            });
        });
    }); 
 */
    
	// Create a endpoint
    it('Create and List Endpoint', function (done) {
      var vmEndpointName = 'TestEndpoint';
      var lbSetName = 'Lb_Set_Test';
      var probPathName = '/prob/listner1';
      suite.execute('vm endpoint create -n %s -o %s %s %s %s -u -b %s -t %s -r tcp -p %s --json',
        vmEndpointName, 'tcp', name, 8080, 80, lbSetName, 4444, probPathName, function (result) {
           if(result.exitStatus == 1)
			done(result.errorText, null);
		  suite.execute('vm endpoint list %s --json', name, function (result) {
            result.exitStatus.should.equal(0);
            var epList = JSON.parse(result.text);

            var epExists = epList.some(function (ep) {
              return ep.Name.toLowerCase() === vmEndpointName.toLowerCase();
            });
            epExists.should.be.ok;
            setTimeout(function () {
            	done();
            }, timeout);
          });
        });
    });

    // Update a endpoint
    it('Update and Delete Endpoint', function (done) {
      var vmEndpointName = 'TestEndpoint';
      suite.execute('vm endpoint update -t %s -l %s -d %s -n %s -o %s %s %s --json',
        8081, 8082, name, vmEndpointName, 'tcp', name, vmEndpointName, function (result) {
           if(result.exitStatus == 1)
			done(result.errorText, null);
		  suite.execute('vm endpoint show %s -e %s --json', name, vmEndpointName, function (result) {
            var vmEndpointObj = JSON.parse(result.text);
            vmEndpointObj.Network.Endpoints[0].Port.should.equal('8082');
            suite.execute('vm endpoint delete %s %s --json', name, vmEndpointName, function (result) {
              result.exitStatus.should.equal(0);
              setTimeout(function () {
            	done();
			  }, timeout);
            });
          });
        });
    });

    // create multiple endpoints
    it('Create multiple endpoints', function (done) {
      var endPoints = {
        OnlyPP: {
          PublicPort: 3333
        },
        PPAndLP: {
          PublicPort: 4444,
          LocalPort: 4454
        },
        PPLPAndLBSet: {
          PublicPort: 5555,
          LocalPort: 5565,
          Protocol: 'tcp',
          EnableDirectServerReturn: false,
          LoadBalancerSetName: 'LbSet1'
        },
        PPLPLBSetAndProb: {
          PublicPort: 6666,
          LocalPort: 6676,
          Protocol: 'tcp',
          EnableDirectServerReturn: false,
          LoadBalancerSetName: 'LbSet2',
          ProbProtocol: 'http',
          ProbPort: '7777',
          ProbPath: '/prob/listner1'
        }
      };

      var cmd = util.format(
        'node cli.js vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s:%s:%s,%s:%s:%s:%s:%s:%s:%s:%s --json',
        name,
        // EndPoint1
        endPoints.OnlyPP.PublicPort,
        // EndPoint2
        endPoints.PPAndLP.PublicPort, endPoints.PPAndLP.LocalPort,
        // EndPoint3
        endPoints.PPLPAndLBSet.PublicPort, endPoints.PPLPAndLBSet.LocalPort, endPoints.PPLPAndLBSet.Protocol, endPoints.PPLPAndLBSet.EnableDirectServerReturn, endPoints.PPLPAndLBSet.LoadBalancerSetName,
        // EndPoint4
        endPoints.PPLPLBSetAndProb.PublicPort, endPoints.PPLPLBSetAndProb.LocalPort, endPoints.PPLPLBSetAndProb.Protocol, endPoints.PPLPLBSetAndProb.EnableDirectServerReturn, endPoints.PPLPLBSetAndProb.LoadBalancerSetName,
        endPoints.PPLPLBSetAndProb.ProbProtocol, endPoints.PPLPLBSetAndProb.ProbPort, endPoints.PPLPLBSetAndProb.ProbPath).split(' ');

      suite.execute(cmd, function (result) {
         if(result.exitStatus == 1)
			done(result.errorText, null);
		result.exitStatus.should.equal(0);

        suite.execute('vm endpoint list %s --json', name, function (result) {
          var allEndPointList = JSON.parse(result.text);

          // Verify endpoint creation with only lb port
          var endPointListOnlyLb = allEndPointList.filter(
            function (element, index, array) {
              return (element.LocalPort == endPoints.OnlyPP.PublicPort);
            });
          endPointListOnlyLb.length.should.be.equal(1);
          (endPointListOnlyLb[0].Port == endPointListOnlyLb[0].Port).should.be.true;

          // Verify endpoint creation with lb port and vm port
          var endPointListLbAndVm = allEndPointList.filter(
            function (element, index, array) {
              return (element.LocalPort == endPoints.PPAndLP.LocalPort);
            });

          endPointListLbAndVm.length.should.be.equal(1);
          (endPointListLbAndVm[0].Port == endPoints.PPAndLP.PublicPort).should.be.true;

          // Verify endpoint creation with lbSetName and prob option
          suite.execute('vm show %s --json', name, function (result) {
            var vmInfo = JSON.parse(result.text);

            (vmInfo.Network.Endpoints.length >= 4).should.be.true;

            var endPointListLbVmAndSet = vmInfo.Network.Endpoints.filter(
              function (element, index, array) {
                return (element.LocalPort == endPoints.PPLPAndLBSet.LocalPort);
              });

            endPointListLbVmAndSet.length.should.be.equal(1);
            endPointListLbVmAndSet[0].LoadBalancedEndpointSetName.should.be.equal('LbSet1');

            var endPointListLbVmSetAndProb = vmInfo.Network.Endpoints.filter(
              function (element, index, array) {
                return (element.LocalPort == endPoints.PPLPLBSetAndProb.LocalPort);
              });
            endPointListLbVmSetAndProb.length.should.be.equal(1);
            endPointListLbVmSetAndProb[0].LoadBalancedEndpointSetName.should.be.equal(endPoints.PPLPLBSetAndProb.LoadBalancerSetName);
            endPointListLbVmSetAndProb[0].LoadBalancerProbe.Protocol.should.be.equal(endPoints.PPLPLBSetAndProb.ProbProtocol);
            endPointListLbVmSetAndProb[0].LoadBalancerProbe.Port.should.be.equal(endPoints.PPLPLBSetAndProb.ProbPort);

            // Set Delete to true if this is the last test using shared vm
			vmToUse.Delete = true;
            done();
          });
        });
      });
    });

	/* it('Delete Vnet', function (done) {
      suite.execute('network vnet delete %s --quiet --json', vnetName, function (result) {
         if(result.exitStatus == 1)
			done(result.errorText, null);
		result.exitStatus.should.equal(0);
        setTimeout(function () {
		  done();
		}, timeout);
      });
    }); 
 */
 
    // Delete a AffinityGroup
   /*  it('Delete Affinity Group', function (done) {
      suite.execute('account affinity-group delete %s --quiet --json', 'xplattestaffingrp', function (result) {
         if(result.exitStatus == 1)
			done(result.errorText, null);
		result.exitStatus.should.equal(0);
        setTimeout(function () {
		  done();
		}, timeout);
      });
    });
    */ 
	
	// Get name of an image of the given category
    // Get name of an image of the given category
    function getImageName(category, callBack) {
      if (getImageName.imageName) {
        callBack(getImageName.imageName);
      } else {
        suite.execute('vm image list --json', function (result) {
          var imageList = JSON.parse(result.text);
          imageList.some(function (image) {
            if (image.OS.toLowerCase() === category.toLowerCase() && image.Category.toLowerCase() === 'public') {
              getImageName.imageName = image.Name;
			  location = image.Location.split(';')[0];
            }
          });

          callBack(getImageName.imageName);
        });
      }
    }


    // Create a VM to be used by multiple tests (this will be useful when we add more tests
    // for endpoint create/delete/update, vm create -c.
    function getSharedVM(callBack) {
        getImageName('Windows', function (imageName) {
          name = suite.generateId(vmPrefix, vmNames);
          suite.execute('vm create -r %s %s %s azureuser PassW0rd$ --json --location %s',
            '3389',
			name,
            imageName,
            location,
            function (result) {
              vmToUse.Created = (result.exitStatus === 0);
              vmToUse.Name = vmToUse.Created ? name : null;
              suite.execute('vm show %s --json', name, function (result) {
                var vmObj = JSON.parse(result.text);
                createdDisks.push(vmObj.OSDisk.DiskName);
                return callBack(vmToUse);
              });
            });
        });
    }
  });
});