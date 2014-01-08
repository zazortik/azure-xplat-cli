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
var utils = require('../../lib/util/utils');
var fs = require('fs');
var CLITest = require('../framework/cli-test');

var communityImageId = process.env['AZURE_COMMUNITY_IMAGE_ID'];
var storageAccountKey = process.env['AZURE_STORAGE_ACCOUNT'] ? process.env['AZURE_STORAGE_ACCOUNT'] : 'YW55IGNhcm5hbCBwbGVhc3VyZQ==';

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
		var diskSourcePath,
		imageSourcePath;

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
			}

			suite.teardownSuite(done);
		});

		beforeEach(function (done) {
			suite.setupTest(done);
		});

		afterEach(function (done) {
			function deleteUsedVM(vm, callback) {
				if (vm.Created && vm.Delete) {
					suite.execute('vm delete %s --json --quiet', vm.Name, function () {
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

		//List Disk
		it('List disk', function (done) {
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
					return done();
				});
			});
		});

		// Create Disk
		it('Create Disk', function (done) {
			var blobUrl = 'http://acsforsdk2.blob.core.windows.net/disks/' + diskName;
			suite.execute('vm disk create %s %s --location %s -u %s --json', diskName, diskSourcePath, 'West US', blobUrl, function (result) {
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

		//Image Create
		it('Image Create', function (done) {
			var blobUrl = 'http://acsforsdk2.blob.core.windows.net/vm-images/' + vmImgName;
			suite.execute('vm image create -u %s %s %s --os %s --json', blobUrl, vmImgName, imageSourcePath, 'Linux', function (result) {
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

		//Create a VM
		it('Create a VM', function (done) {
			//get list of all vms
			//create a vm with dnsname(vmName) and imagename(vmImgName)
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s --ssh --rdp --vm-size %s',
				vmName,
				vmImgName,
				'West US', 'medium', function (result) {
				//check the error code for error
				result.exitStatus.should.equal(0);
				//check if vm is created
				//get list of all vms and then check if vmName is present in VMList
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
			var path = 'vminfo.json';
			suite.execute('vm export %s %s  --json', vmName, path, function (result) {
				result.exitStatus.should.equal(0);
				fs.exists('vminfo.json', function (result) {
					result.should.be.true;
					//this file will be deleted in 'create-from a VM' method
					return done();
				});
			});
		});

		// Attach & Detach Disk
		it('Attach & Detach disk', function (done) {
			suite.execute('vm disk attach %s %s --json', vmName, diskName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					var vmObj = JSON.parse(result.text);
					vmObj.DataDisks[0].DiskName.should.equal(diskName);
					suite.execute('vm disk detach %s 0 --json', vmName, function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		//VM shutdown
		it('VM Shutdown', function (done) {
			suite.execute('vm shutdown %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm start %s --json', vmName, function (result) {
					result.exitStatus.should.equal(0);
					return done();
				});
			});
		});

		// Create-from
		it('Create-from a VM', function (done) {
			var vmName1 = 'Azure_Vm_Export';
			var path = 'vminfo.json';
			var diskName1 = 'testdiskvm1';
			fs.exists('vminfo.json', function (exists) {
				if(exists){
					var Fileresult = fs.readFileSync(path, 'utf8');
					var obj = JSON.parse(Fileresult);
					obj['RoleName'] = vmName1;
					obj.OSVirtualHardDisk['DiskName'] = diskName1;
					var jsonstr = JSON.stringify(obj);
					fs.writeFileSync(path, jsonstr);
					suite.execute('vm create-from %s %s --json --location %s', vmName1, path, 'West US', function (result) {
						result.exitStatus.should.equal(0);
						fs.unlink('vminfo.json', function (err) {
							if (err)
								throw err;
							return done();
						});
					});
				}
			});
		});

		//Create VM with rdp port enabled
		it('Create vm with rdp port', function (done) {
			var rdpVmName = vmName + 'rdp';
			suite.execute('vm create --rdp %s %s %s "azureuser" "Pa$$word@123"  --json --location %s',
				'3389',
				rdpVmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//Create VM with ssh port Enabled
		it('Create vm with ssh port', function (done) {
			var sshVmName = vmName + 'ssh';
			suite.execute('vm create --ssh %s %s %s "azureuser" "Pa$$word@123"  --json --location %s',
				'223',
				sshVmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//Create VM using availability set
		it('Availability set', function (done) {
			var availSetVmName = vmName + 'availability-set';
			suite.execute('vm create --availability-set %s %s %s "azureuser" "Pa$$word@123" --json --location %s',
				'Testset',
				availSetVmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//VM Capture
		it('VM capture', function (done) {
			suite.execute('vm shutdown %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm capture %s %s %s --json --delete', vmName, 'caputured_Image', function (result) {
					result.exitStatus.should.equal(0);
					suite.execute('vm image delete %s --json', 'caputured_Image', function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		//Assigning a VM to a Virtual Network
		it('Assign vm to a virtual network', function (done) {
			var vnetVmName = vmName + 'Vnet';
			suite.execute('network vnet create %s --location %s --json',
				vnetName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm create --virtual-network-name %s %s %s "azureuser" "Pa$$word@123"  --json --affinity-group %s',
					vnetName,
					vnetVmName,
					vmImgName,
					'affinity1', function (result) {
					result.exitStatus.should.equal(0);
					suite.execute('vm delete %s --json --quiet --json', vnetVmName, function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		//Connect to a existing VM
		it('Connect a VM', function (done) {
			suite.execute('vm create --connect %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName + '-2', function (result) {
					result.exitStatus.should.equal(0);
					var vmConnectName = JSON.parse(result.text);
					vmConnectName.VMName.should.equal(vmName + '-2');
					suite.execute('vm delete %s --json --quiet', vmConnectName.VMName, function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		//Specifying size of VM
		it('Size of VM', function (done) {
			var sizeVmName = vmName + '-Size';
			suite.execute('vm create --vm-size %s %s %s "azureuser" "Pa$$word@123" --json --location %s',
				'Small',
				sizeVmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', sizeVmName, function (result) {
					JSON.parse(result.text).InstanceSize.should.equal('Small');
					return done();
				});
			});
		});

		//To specify name of Virtual machine
		it('Arg Name Create of VM', function (done) {
			var vmCustomName = vmName + '-Custom';
			var vmDNSName = vmName + '-CustomDNS';
			suite.execute('vm create --vm-name %s %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmCustomName,
				vmDNSName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//VM Restart
		it('VM Restart', function (done) {
			suite.execute('vm restart  %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//List endpoint
		it('List Endpoint', function (done) {
			suite.execute('vm endpoint list %s --json', vmName, function (result) {
				result.exitStatus.should.equal(0);
				result.text.should.not.empty;
				return done();
			});
		});

		//Create a endpoint
		it('Create Endpoint', function (done) {
			var vmEndpointName = 'TestEndpoint';
			var lbSetName = 'Lb_Set_Test';
			var probPathName = '/prob/listner1';
			suite.execute('vm endpoint create -n %s -o %s %s %s %s -u -b %s -t %s -r tcp -p %s --json',
				vmEndpointName, 'tcp', vmName, 8080, 80, lbSetName, 4444, probPathName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//Update a endpoint
		it('Update Endpoint', function (done) {
			var vmEndpointName = 'TestEndpoint';
			suite.execute('vm endpoint update -t %s -l %s -d %s -n %s -o %s %s %s --json',
				8081, 8082,  'xplattestvm', vmEndpointName, 'tcp', vmName, vmEndpointName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm endpoint show %s %s --json', vmName, vmEndpointName, function (result) {
					result.exitStatus.should.equal(0);
					var vmEndpointObj = JSON.parse(result.text);
					vmEndpointObj.Network.Endpoints[0].Port.should.equal('8081');
					suite.execute('vm endpoint delete %s %s --json', vmName, vmEndpointName, function (result) {
						result.exitStatus.should.equal(0);
						return done();
					});
				});
			});
		});

		//Negative Test Case by specifying VM Name Twice
		it('Negavtive test case by specifying Vm Name Twice', function (done) {
			var vmName = 'xplattestvm';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmName,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include(' A VM with dns prefix "xplattestvm" already exists');
				return done();
			});
		});

		// Negative Test Case by specifying invalid Password
		it('Negavtive test case for password', function (done) {
			var vmNew = 'TestImg';
			suite.execute('vm create %s %s "azureuser" "Coll" --json --location %s',
				vmNew,
				vmImgName,
				'West US', function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include('password must be atleast 8 character in length, it must contain a lower case, an upper case, a number and a special character');
				return done();
			});
		});

		//Negative Test Case for Vm Create with Invalid Name
		it('Negative Test Case for Vm Create', function (done) {
			var vmnew = 'test1@1';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmnew,
				vmImgName,
				'West US', function (result) {
				//check the error code for error
				result.exitStatus.should.equal(1);
				result.errorText.should.include('The hosted service name is invalid.');
				return done();
			});
		});

		//Negative Test Case by specifying invalid Location
		it('Negative Test Case for Vm create Location', function (done) {
			var vmnew = 'newTestImg';
			suite.execute('vm create %s %s "azureuser" "Pa$$word@123" --json --location %s',
				vmnew,
				vmImgName,
				'China', function (result) {
				result.exitStatus.should.equal(1);
				result.errorText.should.include(' No location found which has DisplayName or Name same as value of --location');
				return done();
			});
		});

		//Delete a Vnet
		it('Delete the Vnet', function (done) {
			suite.execute('network vnet delete %s --quiet --json', vnetName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//Delete a VM
		it('Delete a VM', function (done) {
			suite.execute('vm delete %s --json --quiet', vmName, function (result) {
				result.exitStatus.should.equal(0);
				suite.execute('vm show %s --json', vmName, function (result) {
					result.exitStatus.should.equal(1);
					result.errorText.should.include('No VMs found');
					return done();
				});
			});
		});

		//Delete Disk
		it('Delete disk', function (done) {
			suite.execute('vm disk delete %s --json', diskName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//Image delete
		it('Image Delete', function (done) {
			suite.execute('vm image delete %s --json', vmImgName, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//create vm from a community image
		it('Should create from community image', function (done) {
			var vmName = suite.generateId(vmPrefix, vmNames);

			// Create a VM using community image (-o option)
			suite.execute('vm create %s %s communityUser PassW0rd$ -o --json --ssh --location %s',
				vmName,
				communityImageId,
				process.env.AZURE_VM_TEST_LOCATION || 'West US',
				function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//create multiple endpoints
		it('Should verify creation of multiple endpoints', function (done) {
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
					vmName+'-Endpoint',
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

				suite.execute('vm endpoint list %s --json', vmName+'-Endpoint', function (result) {
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
					suite.execute('vm show %s --json', vmName+'-Endpoint', function (result) {
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
						//vm.Delete = true;
						return done();
					});
				});
			});
		});

		//upload disk
		it('Should verify upload disk', function (done) {
			var blobUrl = 'http://acsforsdk2.blob.core.windows.net/disks/testUpload.vhd';
			suite.execute('vm disk upload %s %s %s -p 2 --json', diskSourcePath, blobUrl, storageAccountKey, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});

		//upload disk
		it('Check Location List', function (done) {
			suite.execute('vm location list --json', function (result) {
				result.exitStatus.should.equal(0);
				return done();		
			});
		});

		// Attach-New
		it('Attach-New', function (done) {
			var blobUrl = 'http://acsforsdk2.blob.core.windows.net/disks/xplattestDiskUpload.vhd';
			suite.execute('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl, function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		});
		
		// Attach-New
		it('Create Vm with SHH', function (done) {
			var certFile = 'test/data/fakeSshcert.pem';
			suite.execute('vm create %s %s communityUser --ssh-cert %s -e --no-ssh-password -r -l %s --json',
			vmName, vmImgName, certFile,'West US', function (result) {
				result.exitStatus.should.equal(0);
				return done();
			});
		}); 
		
		it('Create Windows Vm', function (done) {
			getSharedVM(function(vm){
				vm.Created.should.be.ok;
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
						process.env.AZURE_VM_TEST_LOCATION || 'West US',
						function (result) {

						vmToUse.Created = (result.exitStatus === 0);
						vmToUse.Name = vmToUse.Created ? name : null;
						return callBack(vmToUse);
					});
				});
			}
		}
	});
});
