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
var crypto = require('crypto');
var utils = require('../../lib/util/utils');
var fs = require('fs');
var path = require('path');
var CLITest = require('../framework/cli-test');

var communityImageId = process.env['AZURE_COMMUNITY_IMAGE_ID'];
var storageAccountKey = process.env['AZURE_STORAGE_ACCOUNT'] ? process.env['AZURE_STORAGE_ACCOUNT'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';
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
		var vmName = 'xplattestvm';
		var vnetName = 'xplattestvnet';
		var diskName = 'xplattestdisk';
		var affinityName = 'xplattestaffingrp';
		var vnetVmName = 'xplattestvmVnet';
		var diskSourcePath,
		domainUrl,
		imageSourcePath,
		location;

		before(function (done) {
			suite = new CLITest(testPrefix, true);

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

		//Location List
		it('Location List', function (done) {
			suite.execute('vm location list --json', function (result) {
				result.exitStatus.should.equal(0);
				result.text.should.not.empty;
				return done();
			});
		});

		// List Disk
		it('List and Show Disk', function (done) {
			suite.execute('vm disk list --json', function (result) {
				result.exitStatus.should.equal(0);
				var diskList = JSON.parse(result.text);
				diskList.length.should.be.above(0);
				var DiskName = '';
				for (var diskObj in diskList) {
					if (diskList[diskObj].OS.toLowerCase() == 'linux') {
						DiskName = diskList[diskObj].Name;
						break;
					}
				}
				suite.execute('vm disk show %s --json', DiskName, function (result) {
					result.exitStatus.should.equal(0);
					var diskDetails = JSON.parse(result.text);
					diskSourcePath = diskDetails.MediaLink;
					domainUrl = 'http://' + diskSourcePath.split('/')[2];
					location = diskDetails.Location;
					return done();
				});
			});
		});

		// Create Disk
		it('Create Disk', function (done) {
			console.log()
			var blobUrl = domainUrl + '/disks/' + diskName;
			suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, location, blobUrl, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm disk show %s --json', diskName, function (result) {
					result.exitStatus.should.equal(0);
					var diskObj = JSON.parse(result.text);
					diskObj.Name.should.equal(diskName);
					imageSourcePath = diskObj.MediaLink;
					return done();
				});
			});
		});

		// Image Create
		it('Image Create', function (done) {
			var blobUrl = domainUrl + '/vm-images/' + vmImgName;
			suite.execute('vm image create -u %s %s %s --os %s -l %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux', location, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm image show %s --json', vmImgName, function (result) {
					result.exitStatus.should.equal(0);
					var vmImageObj = JSON.parse(result.text);
					vmImageObj.Name.should.equal(vmImgName);
					vmImageObj.OS.should.equal('Linux');
					vmImageObj.MediaLink.should.equal(blobUrl);
					return done();
				});
			});
		});

		// Create a VM
		it('Create and List VM', function (done) {
			// get list of all vms
			// create a vm with dnsname(vmName) and imagename(vmImgName)
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmName, vmImgName, location, function (result) {
				// check the error code for error
				result.exitStatus.should.equal(0);
				// check if vm is created
				// get list of all vms and then check if vmName is present in VMList
				suite.execute('vm list --json', function (result) {
					var vmList = JSON.parse(result.text);

					// Look for created VM
					var vmExists = vmList.some(function (vm) {
							return vm.VMName.toLowerCase() === vmName.toLowerCase();
						});
					vmExists.should.be.ok;
					return done();
				});
			});
		});
 
		// Export a VM
		it('Export a VM', function (done) {
			var file = 'vminfo.json';
			suite.execute('vm export %s %s  --json', vmName, file, function (result) {
				result.exitStatus.should.equal(0);
				if(fs.exists){
					fs.exists(file, function (result) {
						result.should.be.true;
						// this file will be deleted in 'create-from a VM' method
						return done();
					});
				} else {
					path.exists(file, function (result) {
						result.should.be.true;
						// this file will be deleted in 'create-from a VM' method
						return done();
					});
				}
			});
		});

		// Negative Test Case by specifying VM Name Twice
		it('Negavtive test case by specifying Vm Name Twice', function (done) {
			var vmNegName = 'xplattestvm';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmNegName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include(' A VM with dns prefix "xplattestvm" already exists');
				return done();
			});
		});

		// Attach & Detach Disk
		it('Attach & Detach disk', function (done) {
			suite.execute('vm disk attach %s %s --json', vmName, diskName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					var vmObj = JSON.parse(result.text);
					vmObj.DataDisks[0].DiskName.should.equal(diskName);
					createdDisks.push(vmObj.OSDisk.DiskName);
					suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		// Attach-New
		it('Attach-New', function (done) {
			var blobUrl = domainUrl + '/disks/xplattestDiskUpload.vhd';
			suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					return done();
				});
			});
		});

		// Vm disk list for a VM
		it('Vm disk List for a VM', function (done) {
			suite.execute('vm disk list %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				var diskInfo = JSON.parse(result.text);
				diskInfo[0].DiskName.should.include(vmName);
				diskInfo[0].SourceImageName.should.equal('xplattestimg');
				return done();
			});
		});

		// VM shutdown
		it('VM Shutdown and start', function (done) {
			suite.execute('vm shutdown %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm start %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					return done();
				});
			});
		});

		// VM Restart
		it('VM Restart', function (done) {
			suite.execute('vm restart  %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		// VM Capture
		it('VM capture', function (done) {
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

		// Create VM using availability set
		it('Availability set', function (done) {
			suite.execute('vm create -A %s -n %s -l %s %s %s "azureuser" "Pa$$word@123" --json',
				'Testset', vmName, location, vmName, vmImgName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					var vmConnectName = JSON.parse(result.text);
					vmConnectName.VMName.should.equal(vmName);
					createdDisks.push(vmConnectName.OSDisk.DiskName);
					return done();
				});
			});
		});

		// Connect to a existing VM
		it('Connect a VM', function (done) {
			var vmConnect = vmName + '-2';
			suite.execute('vm create -l %s --connect %s %s "azureuser" "Pa$$word@123" --json',
				location, vmName, vmImgName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmConnect, function (result) {
					result.exitStatus.should.equal(0);
					var vmConnectName = JSON.parse(result.text);
					vmConnectName.VMName.should.equal(vmConnect);
					createdDisks.push(vmConnectName.OSDisk.DiskName);
					vmToUse.Name = vmConnectName.VMName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					return done();
				});
			});
		});

		// Delete a VM
		it('Delete VM', function (done) {
			suite.execute('vm delete %s -b --json --quiet', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					result.exitStatus.should.equal(1);
					result.errorText.should.include('No VMs found');
					return done();
				});
			});
		});

		// Create VM with rdp port enabled
		it('Create vm with rdp port', function (done) {
			var rdpVmName = vmName + 'rdp';
			var certFile = process.env['SSHCERT'] || 'test/data/fakeSshcert.pem';
			suite.execute('vm create -e %s -r %s -z %s --ssh-cert %s --no-ssh-password %s %s "azureuser" "Pa$$word@123"  --json --location %s',
				'223', '3389', 'Small', certFile, rdpVmName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', rdpVmName, function (result) {
					var vmRDP = JSON.parse(result.text);
					vmRDP.VMName.should.equal(rdpVmName);
					vmRDP.InstanceSize.should.equal('Small');
					createdDisks.push(vmRDP.OSDisk.DiskName);
					vmToUse.Name = rdpVmName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					return done();
				});
			});
		});

		// Creating a Windows VM
		it('Create Windows Vm', function (done) {
			getSharedVM(function (vm) {
				vm.Created.should.be.ok;
				vmToUse.Delete = true;
				done();
			});
		});

		//Create affinitygroup and associate affinity group to VM
		it('Create and assign affinity group for VM', function (done) {
			suite.execute('account affinity-group create -l %s -e %s -d %s %s --json',
				location, 'XplatAffinGrp', 'Test Affinty Group for xplat', affinityName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// Assigning a VM to a Virtual Network
		it('Assign vm to a virtual network', function (done) {
			suite.execute('network vnet create %s -a %s --json',
				vnetName, affinityName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm create --virtual-network-name %s %s %s "azureuser" "Pa$$word@123" --affinity-group %s --json',
					vnetName, vnetVmName, vmImgName, affinityName, function (result) {
					result.exitStatus.should.equal(0);
					suite.execute('vm show %s --json', vnetVmName, function (result) {
						var vmVnet = JSON.parse(result.text);
						createdDisks.push(vmVnet.OSDisk.DiskName);
						vmToUse.Name = vnetVmName;
						vmToUse.Created = true;
						return done();
					});
				});
			});
		});

		// Create a endpoint
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
							return ep.Name.toLowerCase() === vmEndpointName.toLowerCase();
						});
					epExists.should.be.ok;
					return done();
				});
			});
		});

		// Update a endpoint
		it('Update and Delete Endpoint', function (done) {
			var vmEndpointName = 'TestEndpoint';
			suite.execute('vm endpoint update -t %s -l %s -d %s -n %s -o %s %s %s --json',
				8081, 8082, vnetVmName, vmEndpointName, 'tcp', vnetVmName, vmEndpointName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm endpoint show %s -e %s --json', vnetVmName, vmEndpointName, function (result) {
					result.exitStatus.should.equal(0);
					var vmEndpointObj = JSON.parse(result.text);
					vmEndpointObj.Network.Endpoints[0].Port.should.equal('8082');
					suite.execute('vm endpoint delete %s %s --json', vnetVmName, vmEndpointName, function (result) {
						result.exitStatus.should.equal(0);
						done();
					});
				});
			});
		});

		// create multiple endpoints
		it('Create multiple endpoints', function (done) {
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
					'node cli.js vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s:%s:%s,%s:%s:%s:%s:%s:%s:%s:%s --json',
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
					suite.execute('vm show %s --json', vnetVmName, function (result) {
						result.exitStatus.should.equal(0);
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

		// Negative Test Case by specifying invalid Password
		it('Negavtive test case for password', function (done) {
			var vmNegName = 'TestImg';
			suite.execute('vm create %s %s "azureuser" "Coll" --json --location %s',
				vmNegName, vmImgName, location, function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('password must be atleast 8 character in length, it must contain a lower case, an upper case, a number and a special character');
				done();
			});
		});

		// Negative Test Case for Vm Create with Invalid Name
		it('Negative Test Case for Vm Create', function (done) {
			var vmNegName = 'test1@1';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmNegName, vmImgName, location, function (result) {
				// check the error code for error
				result.exitStatus.should.equal(1);
				result.errorText.should.include('The hosted service name is invalid.');
				done();
			});
		});

		// Negative Test Case by specifying invalid Location
		it('Negative Test Case for Vm create Location', function (done) {
			var vmNegName = 'newTestImg';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmNegName, vmImgName, 'SomeLoc', function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include(' No location found which has DisplayName or Name same as value of --location');
				done();
			});
		});

		// Create-from
		it('Create-from a VM', function (done) {
			var file = 'vminfo.json';
			var Fileresult = fs.readFileSync(file, 'utf8');
			var obj = JSON.parse(Fileresult);
			obj['RoleName'] = vmName;
			var jsonstr = JSON.stringify(obj);
			fs.writeFileSync(file, jsonstr);
			suite.execute('vm create-from %s %s --json --location %s', vmName, file, location, function (result) {
				result.exitStatus.should.equal(0);
				fs.unlink('vminfo.json', function (err) {
					if (err)
						throw err;
					createdDisks.push(obj.OSVirtualHardDisk['DiskName'].toString());
					vmToUse.Name = vmName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					done();
				});
			});
		});

		// Delete a Vnet
		it('Delete Vnet', function (done) {
			suite.execute('network vnet delete %s --quiet --json', vnetName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// Delete a AffinityGroup
		it('Delete Affinity Group', function (done) {
			suite.execute('account affinity-group delete %s --quiet --json', 'xplattestaffingrp', function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// Image delete
		it('Image Delete', function (done) {
			suite.execute('vm image delete -b %s --json', vmImgName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// Delete Disk
		it('Delete disk', function (done) {
			suite.execute('vm disk delete -b %s --json', diskName, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// upload disk
		it('Should verify upload disk', function (done) {
			var sourcePath = process.env['BLOB_SOURCE_PATH'] || diskSourcePath;
			var blobUrl = sourcePath.substring(0, sourcePath.lastIndexOf('/')) + '/disknewupload.vhd';
			suite.execute('vm disk upload %s %s %s --json', sourcePath, blobUrl, storageAccountKey, function (result) {
				result.exitStatus.should.equal(0);
				done();
			});
		});

		// create vm from a community image
		it('Should create from community image', function (done) {
			var vmComName = suite.generateId(vmPrefix, vmNames);

			// Create a VM using community image (-o option)
			suite.execute('vm create %s %s communityUser PassW0rd$ -o --json --ssh --location %s',
				vmComName, communityImageId, location,
				function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmComName, function (result) {
					var vmComObj = JSON.parse(result.text);
					createdDisks.push(vmComObj.OSDisk.DiskName);
					vmToUse.Name = vmComName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					done();
				});
			});
		});
		
		// Create VM with custom data
		it('Create vm with custom data', function (done) {
			var customVmName = vmName + 'customdata';
			suite.execute('vm create %s %s testuser Collabera@01 -l %s -d %s --json --verbose',
				    customVmName, vmImgName,"West US", 'test/data/customdata.txt', function (result) {
					result.exitStatus.should.equal(0);
					var verboseString = result.text;
					var iPosCustom = verboseString.indexOf('CustomData:');
					iPosCustom.should.equal(-1);
					vmToUse.Name = customVmName;
					vmToUse.Created = true;
					vmToUse.Delete = true;
					return done();
			});
		});
		
		// Create VM with custom data with large file as customdata file
		it('negetive testcase for custom data - Large File', function (done) {
			var customVmName = vmName + 'customdatalargefile';
			suite.execute('vm create %s %s testuser Collabera@01 -l %s -d %s --json',
				customVmName, vmImgName,"West US", 'test/data/customdatalargefile.txt', function (result) {
					result.exitStatus.should.equal(1);
					result.errorText.should.include('Input custom data file exceeded the maximum length of 65535 bytes');
					return done();
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
		function getSharedVM(callBack) {
			if (vmToUse.Created) {
				return callBack(vmToUse);
			} else {
				getImageName('Microsoft Corporation', function (imageName) {
					var name = suite.generateId(vmPrefix, vmNames);
					suite.execute('vm create %s %s azureuser PassW0rd$ --ssh --json --location %s',
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
		}
	});
});
