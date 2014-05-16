3 /**
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
var _ = require('underscore');
var crypto = require('crypto');
var utils = require('../../lib/util/utils');
var fs = require('fs');
var path = require('path');
var CLITest = require('../framework/cli-test');

var communityImageId = process.env['AZURE_COMMUNITY_IMAGE_ID'];
var storageAccountKey = process.env['AZURE_STORAGE_ACCOUNT'] ? process.env['AZURE_STORAGE_ACCESS_KEY'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';
var isForceMocked = false;
var createdDisks = [];

// A common VM used by multiple tests
var vmToUse = {
	Name : null,
	Created : false,
	Delete : false
};

var vmPrefix = 'clitestvm';
var vmNames = [];

var suite;
var testPrefix = 'cli.vm-tests';

var currentRandom = 0;

describe('cli', function () {
	describe('vm', function () {
		var vmImgName = 'xplattestimg';
		var vmName = 'xplattestvm2';
		var vnetName = 'xplattestvnet';
		var diskName = 'xplattestdisk';
		var affinityName = 'xplattestaffingrp';
		var vnetVmName = 'xplattestvmVnet';
    var timeout = 60000;
		var diskSourcePath,
		domainUrl,
		imageSourcePath,
		location;

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
      console.log('AFTER started...');
      console.log('DISKS to del List: %j', createdDisks);

      if (suite.isMocked) {
        crypto.randomBytes.restore();
        suite.teardownSuite(done);
      } else {
        (function deleteUsedDisk() {
          if (createdDisks.length > 0) {
            var diskName = createdDisks.pop();

            console.log('Deleting disk: %s', diskName);

            suite.execute('vm disk delete -b %s --json', diskName, function () {
              deleteUsedDisk();
            });
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
					suite.execute('vm delete %s -b --json --quiet', vm.Name, function () {
						vm.Name = null;
						vm.Created = vm.Delete = false;
						return callback();
					});
				} else {
					return callback();
				}
			}

			deleteUsedVM(vmToUse, function () {
				suite.teardownTest(done);
			});
		});
    
		it('Location List', function (done) {
			suite.execute('vm location list --json', function (result) {
				result.exitStatus.should.equal(0);
				result.text.should.not.empty;
				return done();
			});
		});
    
 		it('List and Show Disk', function (done) {
			suite.execute('vm disk list --json', function (result) {
				result.exitStatus.should.equal(0);
				var diskList = JSON.parse(result.text);
				diskList.length.should.be.above(0);
        var diskName = diskList[0].name;

				suite.execute('vm disk show %s --json', diskName, function (result) {
					result.exitStatus.should.equal(0);
					var diskDetails = JSON.parse(result.text);
					diskSourcePath = diskDetails.mediaLinkUri;
					domainUrl = 'http://' + diskSourcePath.split('/')[2];
					location = diskDetails.location;
					return done();
				});
			});
		});

		it('Create Disk', function (done) {
			var blobUrl = domainUrl + '/disks/' + diskName;
			suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm disk show %s --json', diskName, function (result) {
					result.exitStatus.should.equal(0);
					var disk = JSON.parse(result.text);
					disk.name.should.equal(diskName);
					imageSourcePath = disk.mediaLinkUri;
					return done();
				});
			});
		});
    
		it('Image Create', function (done) {
			var blobUrl = domainUrl + '/vm-images/' + vmImgName;
			suite.execute('vm image create -u %s %s %s --os %s -l %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux', location, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm image show %s --json', vmImgName, function (result) {
					result.exitStatus.should.equal(0);
					var image = JSON.parse(result.text);
					image.name.should.equal(vmImgName);
					image.operatingSystemType.should.equal('Linux');
					image.mediaLinkUri.should.equal(blobUrl);
					return done();
				});
			});
		});

		it('Create and List VM', function (done) {
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(0);

				suite.execute('vm list --json', function (result) {
					var vmList = JSON.parse(result.text);
					// look for created VM
					var vmExists = vmList.some(function (vm) {
							return vm.VMName.toLowerCase() === vmName.toLowerCase();
						});
					vmExists.should.be.ok;
					return done();
				});
			});
		});
    
		it('Export VM', function (done) {
			var fileName = 'vminfo.json';
      // this file will be deleted in 'Create VM from Json' test
			suite.execute('vm export %s %s  --json', vmName, fileName, function (result) {
				result.exitStatus.should.equal(0);
				if(fs.exists){
					fs.exists(fileName, function (result) {
						result.should.be.true;
						return done();
					});
				} else {
					path.exists(fileName, function (result) {
						result.should.be.true;
						return done();
					});
				}
			});
		});
    
		it('Negative Test Case by specifying VM Name Twice', function (done) {
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('already exists');
				return done();
			});
		});
    
		it('Attach & Detach Disk', function (done) {
			suite.execute('vm disk attach %s %s --json', vmName, diskName, function (result) {
				result.exitStatus.should.equal(0);

        setTimeout(function () {
          suite.execute('vm show %s --json', vmName, function (result) {
            var vmObj = JSON.parse(result.text);
            vmObj.DataDisks[0].name.should.equal(diskName);

            suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
              result.exitStatus.should.equal(0);
              return done();
            });
          });
        }, timeout);

			});
		});
    
		it('Attach-New Disk', function (done) {
			var blobUrl = domainUrl + '/disks/xplattestDiskUpload.vhd';
			suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
				result.exitStatus.should.equal(0);

        setTimeout(function () {
          suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
            result.exitStatus.should.equal(0);
            return done();
          });
        }, timeout);

			});
		});
    
		it('List Disks for VM', function (done) {
			suite.execute('vm disk list %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				var diskInfo = JSON.parse(result.text);
				diskInfo[0].name.should.include(vmName);
				diskInfo[0].sourceImageName.should.equal(vmImgName);
				return done();
			});
		});
    
		it('VM Shutdown and Start', function (done) {
			suite.execute('vm shutdown %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm start %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					return done();
				});
			});
		});
    
		it('VM Restart', function (done) {
			suite.execute('vm restart  %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});
    
		it('VM Capture', function (done) {
			suite.execute('vm shutdown %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm capture %s %s %s --json --delete', vmName, 'caputured_Image', function (result) {
					result.exitStatus.should.equal(0);
					suite.execute('vm image delete -b %s --json', 'caputured_Image', function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});
    
		it('Create VM with Availability set', function (done) {
			suite.execute('vm create -A %s -n %s -l %s %s %s "azureuser" "Pa$$word@123" --json',
				'Testset', vmName, location, vmName, vmImgName, function (result) {

				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					var vmConnectName = JSON.parse(result.text);
					vmConnectName.VMName.should.equal(vmName);
					return done();
				});
			});
		});
    
		it('Connect to existing VM', function (done) {
			var vmConnect = vmName + '-2';
			suite.execute('vm create -l %s --connect %s %s "azureuser" "Pa$$word@123" --json',
				location, vmName, vmImgName, function (result) {

				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmConnect, function (result) {
					result.exitStatus.should.equal(0);
					var vmConnectName = JSON.parse(result.text);
					vmConnectName.VMName.should.equal(vmConnect);
					vmToUse.Name = vmConnectName.VMName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					return done();
				});
			});
		});
    
		it('Delete VM', function (done) {
			suite.execute('vm delete %s --json --quiet', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					result.text.should.include('No VMs found');
					return done();
				});
			});
		});
    
		it('Create VM with RDP port', function (done) {
			var rdpVmName = vmName + 'rdp';
			var certFile = process.env['SSHCERT'] || path.join(__dirname, '../data/azure.pem');

			suite.execute('vm create -e %s -r %s -z %s --ssh-cert %s --no-ssh-password %s %s "azureuser" "Pa$$word@123"  --json --location %s',
				'223', '3389', 'Small', certFile, rdpVmName, vmImgName, location, function (result) {

				result.exitStatus.should.equal(0);

        setTimeout(function () {
          suite.execute('vm show %s --json', rdpVmName, function (result) {
            var vmRDP = JSON.parse(result.text);
            vmRDP.VMName.should.equal(rdpVmName);
            vmRDP.InstanceSize.should.equal('Small');
            vmToUse.Name = rdpVmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            return done();
          });
        }, timeout);

			});
		});
    
		it('Create Windows VM', function (done) {
			getSharedVM(function (vm) {
				vm.Created.should.be.ok;
				vmToUse.Delete = true;
				done();
			});
		});
    
		it('Create Affinity Group', function (done) {
			suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
				location, 'XplatAffinGrp', 'Test Affinty Group for xplat', affinityName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});
    
    it('Create Virtual Network', function (done) {
      suite.execute('network vnet create %s -a %s --json',
        vnetName, affinityName, function (result) {
         result.exitStatus.should.equal(0);
         done();
      });
    });
    
    it('Create VM assigned to a Virtual Network', function (done) {
      suite.execute('vm create --virtual-network-name %s %s %s "azureuser" "Pa$$word@123" --affinity-group %s --json',
          vnetName, vnetVmName, vmImgName, affinityName, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm show %s --json', vnetVmName, function (result) {
              var vmVnet = JSON.parse(result.text);
              vmToUse.Name = vnetVmName;
              vmToUse.Created = true;
              return done();
            });
      });
    });
    
		it('Create and List Endpoint', function (done) {
			var vmEndpointName = 'TestEndpoint';
			var lbSetName = 'Lb_Set_Test';
			var probPathName = '/prob/listner1';
			suite.execute('vm endpoint create -n %s -o %s %s %s %s -u -b %s -t %s -r tcp -p %s --json',
				vmEndpointName, 'tcp', vnetVmName, 8080, 80, lbSetName, 4444, probPathName, function (result) {

				result.exitStatus.should.equal(0);
				suite.execute('vm endpoint list %s --json', vnetVmName, function (result) {
          result.exitStatus.should.equal(0);
					var epList = JSON.parse(result.text);
					var epExists = epList.some(function (ep) {
							return ep.name.toLowerCase() === vmEndpointName.toLowerCase();
						});
					epExists.should.be.true;
					return done();
				});
			});
		});
    
		it('Update and Delete Endpoint', function (done) {
			var vmEndpointName = 'TestEndpoint';
			suite.execute('vm endpoint update %s %s -t %s -l %s -o %s --json',
          vnetVmName, vmEndpointName, 8081, 8082, 'tcp', function (result) {
            result.exitStatus.should.equal(0);

				suite.execute('vm endpoint show %s -e %s --json', vnetVmName, vmEndpointName, function (result) {
					result.exitStatus.should.equal(0);
					var vmEndpointObj = JSON.parse(result.text);
					vmEndpointObj.Network.Endpoints[0].port.should.equal(8082);
					suite.execute('vm endpoint delete %s %s --json', vnetVmName, vmEndpointName, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
		});
    
		it('Create Multiple Endpoints', function (done) {
			var endPoints = {
				OnlyPP : {
					PublicPort : 3333
				},
				PPAndLP : {
					PublicPort : 4444,
					LocalPort : 4454
				},
				PPLPAndLBSet : {
					PublicPort : 5555,
					LocalPort : 5565,
					Protocol : 'tcp',
					EnableDirectServerReturn : false,
					LoadBalancerSetName : 'LbSet1'
				},
				PPLPLBSetAndProb : {
					PublicPort : 6666,
					LocalPort : 6676,
					Protocol : 'tcp',
					EnableDirectServerReturn : false,
					LoadBalancerSetName : 'LbSet2',
					ProbProtocol : 'http',
					ProbPort : '7777',
					ProbPath : '/prob/listner1'
				}
			};

			var cmd = util.format(
					'vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s:%s:%s,%s:%s:%s:%s:%s:%s:%s:%s --json',
					vnetVmName,
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
				result.exitStatus.should.equal(0);

				suite.execute('vm endpoint list %s --json', vnetVmName, function (result) {
					result.exitStatus.should.equal(0);
					var allEndPointList = JSON.parse(result.text);
					// Verify endpoint creation with only lb port
					var endPointListOnlyLb = allEndPointList.filter(
							function (element, index, array) {
							return (element.localPort == endPoints.OnlyPP.PublicPort);
						});
					endPointListOnlyLb.length.should.be.equal(1);
					(endPointListOnlyLb[0].port == endPointListOnlyLb[0].port).should.be.true;
					// Verify endpoint creation with lb port and vm port
					var endPointListLbAndVm = allEndPointList.filter(
							function (element, index, array) {
							return (element.localPort == endPoints.PPAndLP.LocalPort);
						});

					endPointListLbAndVm.length.should.be.equal(1);
					(endPointListLbAndVm[0].port == endPoints.PPAndLP.PublicPort).should.be.true;

					// Verify endpoint creation with lbSetName and prob option
					suite.execute('vm show %s --json', vnetVmName, function (result) {
						result.exitStatus.should.equal(0);

						var vmInfo = JSON.parse(result.text);

						(vmInfo.Network.Endpoints.length >= 4).should.be.true;

						var endPointListLbVmAndSet = vmInfo.Network.Endpoints.filter(
								function (element, index, array) {
								return (element.localPort == endPoints.PPLPAndLBSet.LocalPort);
							});

						endPointListLbVmAndSet.length.should.be.equal(1);

						// Set Delete to true if this is the last test using shared vm
						vmToUse.Delete = true;
						done();
					});
				});
			});
		});
    
		it('Negative Test Case for VM Create by specifying invalid Password', function (done) {
			var vmNegName = 'TestImg';
			suite.execute('vm create %s %s "azureuser" "badpassword" --json --location %s',
				vmNegName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('password must be at least');
				done();
			});
		});
    
		it('Negative Test Case for VM Create with Invalid Name', function (done) {
			var vmNegName = 'test1@1';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmNegName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('The hosted service name is invalid');
				done();
			});
		});
    
		it('Negative Test Case by specifying invalid Location', function (done) {
			var vmNegName = 'newTestImg';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmNegName, vmImgName, 'BadLocation', function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('No location found');
				done();
			});
		});

    it('Create VM from Community Image', function (done) {
      var vmComName = suite.generateId(vmPrefix, vmNames);
      suite.execute('vm create %s %s communityUser PassW0rd$ -o --json --ssh --location %s',
          vmComName, communityImageId, location, function (result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm show %s --json', vmComName, function (result) {
              var vmComObj = JSON.parse(result.text);
              vmComObj.VMName.should.equal(vmComName);
              vmToUse.Name = vmComName;
              vmToUse.Created = true;
              vmToUse.Delete = true;
              done();
            });
          });
    });
    
	  it('Create VM from Json file', function (done) {
			var filePath = path.join(__dirname, '../../vminfo.json');
			var content = fs.readFileSync(filePath, 'utf8');
			var vmObj = JSON.parse(content);

			vmObj['roleName'] = vmName;

			var jsonstr = JSON.stringify(vmObj);

			fs.writeFileSync(filePath, jsonstr);

      setTimeout(function () {
        suite.execute('vm create-from %s %s --json --location %s', vmName, filePath, location, function (result) {
          result.exitStatus.should.equal(0);
          fs.unlink('vminfo.json', function (err) {
            if (err)
              throw err;
            vmToUse.Name = vmName;
            vmToUse.Created = true;
            vmToUse.Delete = true;
            done();
          });
        });
      }, timeout*4);

		});
    
    it('Upload disk', function (done) {
      var sourcePath = process.env['BLOB_SOURCE_PATH'] || diskSourcePath;
      var blobUrl = 'http://' + process.env['AZURE_STORAGE_ACCOUNT']+'.blob.core.windows.net/vhd-store/Uploaded-Disk.vhd';
      suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
		it('Delete Virtual Network', function (done) {
      setTimeout(function () {
        suite.execute('network vnet delete %s --quiet --json', vnetName, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      }, timeout);
		});
    
	  it('Delete Affinity group', function (done) {
			suite.execute('account affinity-group delete %s --quiet --json', 'xplattestaffingrp', function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});
    
		it('Image Delete', function (done) {
			suite.execute('vm image delete -b %s --json', vmImgName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});
    
		it('Delete Disk', function (done) {
			suite.execute('vm disk delete -b %s --json', diskName, function (result) {
				result.exitStatus.should.equal(0);
				done();
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
						if (image.category.toLowerCase() === category.toLowerCase()) {
							getImageName.imageName = image.name;
						}
					});

					callBack(getImageName.imageName);
				});
			}
		}

		// Create a VM to be used by multiple tests (this will be useful when we add more tests
		// for endpoint create/delete/update, vm create -c.
		function getSharedVM(callBack) {
			if (vmToUse.Created) {
				return callBack(vmToUse);
			} else {
				getImageName('Public', function (imageName) {
					var name = suite.generateId(vmPrefix, vmNames);
					suite.execute('vm create %s %s azureuser PassW0rd$ --ssh --json --location %s',
					 name, imageName, location, function (result) {
						vmToUse.Created = (result.exitStatus === 0);
						vmToUse.Name = vmToUse.Created ? name : null;
						suite.execute('vm show %s --json', name, function (result) {
							var vmObj = JSON.parse(result.text);
              return callBack(vmToUse);
						});
					});
				});
			}
		}
	});
});
