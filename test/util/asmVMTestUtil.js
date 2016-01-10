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
var async = require('async');
var path = require('path');
var fs = require('fs');
var util = require('util');
var testUtils = require('../util/util');
//Moving to common util file
//var dockerCerts, sshKeys;
exports = module.exports = asmVMTestUtil;
var retry = 5;
var createReservedIp = new Object();

var affinityName = 'xplataffintest',
  affinLabel = 'xplatAffinGrp',
  affinDesc = 'Test Affinty Group for xplat';
/**
 * @class
 * Initializes a new instance of the asmVMTestUtil class.
 * @constructor
 *
 * Example use of this class:
 *
 * //creates mobile test class
 * var vmUtil = new asmVMTestUtil();
 * // use the methods
 *
 */
function asmVMTestUtil() {
  this.vmSize;
  this.vmImgName;
  this.ripCreate = false;
  this.staticIpavail;
  this.staticIpToSet;
}
asmVMTestUtil.prototype.getVM = function(getVM, vmName, username, password, location, timeout, suite, callback) {

  if (getVM.VMName) {
    callback(getVM.VMName);
  } else {
    var cmd = util.format('vm list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var vmList = JSON.parse(result.text);
      var found = vmList.some(function(vm) {
        if (vm.OSDisk.operatingSystem.toLowerCase() === 'windows') {
          getVM.VMName = vm.VMName;
          return true;
        }
      });
      if (!found) {
        this.createWindowsVM(vmName, username, password, location, timeout, suite, function() {
          getVM.VMName = vmName;
        });
      }
      callback(getVM.VMName);
    });
  }
};
asmVMTestUtil.prototype.createWindowsVM = function(vmName, username, password, location, timeout, suite, callback) {
  this.getImageName('Windows', suite, function(imagename) {
    var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      setTimeout(callback, timeout);
    });
  });

};

asmVMTestUtil.prototype.getDiskName = function(OS, location, suite, callback) {
  var diskObj;
  var cmd = util.format('vm disk list --json').split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var diskList = JSON.parse(result.text);
    diskList.some(function(disk) {
      if ((disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === OS.toLowerCase()) &&
        (disk.location && disk.location.toLowerCase() === location.toLowerCase())) {
        diskObj = disk;
        return true;
      }
    });
    callback(diskObj);
  });

};
asmVMTestUtil.prototype.getImageName = function(category, suite, callback) {
  if (category == 'Windows') {
    if (process.env.VM_WIN_IMAGE && process.env.VM_WIN_IMAGE !== undefined) {
      callback(process.env.VM_WIN_IMAGE);
    } else {
      var cmd = util.format('vm image list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);

        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            this.vmImgName = image.name;
            process.env.VM_WIN_IMAGE = (category == 'Windows') ? image.name : process.env.VM_WIN_IMAGE;
            return true;
          }
        });
        callback(this.vmImgName);
      });

    }
  } else if (category == 'Linux') {
    if (process.env.VM_LINUX_IMAGE && process.env.VM_LINUX_IMAGE !== undefined) {
      callback(process.env.VM_LINUX_IMAGE);
    } else {

      var cmd = util.format('vm image list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);

        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            this.vmImgName = image.name;
            process.env.VM_LINUX_IMAGE = (category == 'Linux') ? image.name : process.env.VM_LINUX_IMAGE;
            return true;
          }
        });
        callback(this.vmImgName);
      });
    }
  }

};
asmVMTestUtil.prototype.createVM = function(certFile, vmName, username, password, location, timeout, suite, callback) {
  this.getImageName('Linux', suite, function(imagename) {
    var cmd = util.format('vm create --ssh --ssh-cert %s %s %s %s %s --json', certFile, vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);

    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      setTimeout(callback, timeout);
    });
  });
};
asmVMTestUtil.prototype.createVMShutdown = function(vmName, username, password, location, timeout, suite, callback) {
  this.getImageName('Linux', suite, function(imagename) {
    var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      setTimeout(callback, timeout);
    });
  });
};
asmVMTestUtil.prototype.createLinuxVM = function(vmName, username, password, location, timeout, suite, callback) {
  this.getImageName('Linux', suite, function(imagename) {
    var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      setTimeout(callback, timeout);
    });
  });
};
asmVMTestUtil.prototype.createVMReturn = function(vmName, username, password, location, timeout, suite, vmToUse, callback) {
  this.getImageName('Linux', suite, function(imagename) {
    var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      vmToUse.Name = vmName;
      vmToUse.Created = true;
      setTimeout(callback(vmToUse), timeout);
    });
  });
};
asmVMTestUtil.prototype.createVMExport = function(vmName, username, password, location, timeout, vmToUse, suite, callback) {
  this.getImageName('Linux', suite, function(imagename) {
    var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      vmToUse.Name = vmName;
      vmToUse.Created = true;
      setTimeout(callback, timeout);
    });
  });
};
asmVMTestUtil.prototype.getVnet = function(status, getVnetStatic, getAffinityGroupStatic, createdVnets, suite, that, callback) {
  var cmd;
  if (getVnetStatic && getVnetStatic.vnetName && getVnetStatic.affinityName) {
    callback(getVnetStatic.vnetName, getVnetStatic.affinityName, getVnetStatic.staticIpavail);
  } else {
    cmd = util.format('network vnet list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var vnetName = JSON.parse(result.text);
      var found = vnetName.some(function(vnet) {
        if (vnet.state.toLowerCase() === status.toLowerCase() && vnet.affinityGroup !== undefined) {
          getVnetStatic.vnetName = vnet.name;
          getVnetStatic.affinityName = vnet.affinityGroup;
          var address = vnet.addressSpace.addressPrefixes[0];
          getVnetStatic.staticIpavail = address.split('/')[0];
          return true;
        }
      });

      if (!found) {
        function getAllMethods(object) {
          return Object.getOwnPropertyNames(object).filter(function(property) {
            return typeof object[property] == 'function';
          });
        }
        that.getAffinityGroup(getAffinityGroupStatic.location, getAffinityGroupStatic, suite, function(affinGrpName) {
          var vnetName = suite.generateId('testvnet', createdVnets);
          cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('network vnet list --json').split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              var vnet = JSON.parse(result.text);
              result.exitStatus.should.equal(0);
              getVnetStatic.vnetName = vnetName;
              getVnetStatic.affinityName = affinGrpName;
              var address = vnet[0].addressSpace.addressPrefixes[0];
              getVnetStatic.staticIpavail = address.split('/')[0];
              callback(getVnetStatic.vnetName, getVnetStatic.affinityName, getVnetStatic.staticIpavail);
            });
          });
        });
      } else {
        callback(getVnetStatic.vnetName, getVnetStatic.affinityName, getVnetStatic.staticIpavail);
      }
    });
  }
};
asmVMTestUtil.prototype.getAffinityGroup = function(location, getAffinityGroupStatic, suite, callback) {
  var cmd;

  if (getAffinityGroupStatic && getAffinityGroupStatic.affinGrpName) {
    callback(getAffinityGroupStatic.affinGrpName);
  } else {
    cmd = util.format('account affinity-group list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var affinList = JSON.parse(result.text);
      var found = affinList.some(function(affinGrp) {
        if (affinGrp.location.toLowerCase() === location.toLowerCase()) {
          getAffinityGroupStatic.affinGrpName = affinGrp.name;
          return true;
        }
      });
      if (!found) {
        cmd = util.format('account affinity-group create -e %s %s',
          affinLabel, affinityName).split(' ');
        cmd.push('-l');
        cmd.push(location);
        cmd.push('-d');
        cmd.push(affinDesc);
        cmd.push('--json');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          getAffinityGroupStatic.affinGrpName = affinityName;
          callback(affinityName);
        });
      } else
        callback(getAffinityGroupStatic.affinGrpName);
    });
  }
};
asmVMTestUtil.prototype.getVnetStaticIP = function(status, getVnet, getAffinityGroup, createdVnets, suite, callback) {
  var cmd;
  if (getVnet.vnetName) {
    callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
  } else {
    cmd = util.format('network vnet list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var vnetName = JSON.parse(result.text);
      var found = vnetName.some(function(vnet) {
        if (vnet.state === status && vnet.affinityGroup !== undefined) {
          getVnet.vnetName = vnet.name;
          getVnet.affinityName = vnet.affinityGroup;
          var address = vnet.addressSpace.addressPrefixes[0];
          var addressSplit = address.split('/');
          var staticIpToCreate = addressSplit[0];
          var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
          var staticIpToSet = n.concat(addressSplit[1]);
          getVnet.staticIpToCreate = staticIpToCreate;
          getVnet.staticIpToSet = staticIpToSet;
          return true;
        }
      });

      if (!found) {
        this.getAffinityGroup(location, getAffinityGroup, suite, function(affinGrpName) {
          vnetName = suite.generateId('testvnet', createdVnets);
          cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            getVnet.vnetName = vnetName;
            getVnet.affinityName = affinGrpName;
            var address = vnet.addressSpace.addressPrefixes[0];
            var addressSplit = address.split('/');
            var staticIpToCreate = addressSplit[0];
            var n = staticIpToCreate.substring(0, staticIpToCreate.lastIndexOf('.') + 1);
            var staticIpToSet = n.concat(addressSplit[1]);
            getVnet.staticIpToCreate = staticIpToCreate;
            getVnet.staticIpToSet = staticIpToSet;
            callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
          });
        });
      } else {
        callback(getVnet.vnetName, getVnet.affinityName, getVnet.staticIpToCreate, getVnet.staticIpToSet);
      }
    });
  }
};
asmVMTestUtil.prototype.createVMEndPt = function(vmName, publicport, localoport, vmEndpointName, protocol, idletimeout, probeport, probeprotocol, probPathName, lbSetName, dirctserverreturn, timeout, suite, callback) {
  var cmd = util.format('vm endpoint create %s %s -k %s -n %s -o %s -m %s -t %s -r %s -p %s -b %s -u %s --json', vmName, publicport, localoport, vmEndpointName, protocol, idletimeout, probeport, probeprotocol, probPathName, lbSetName, dirctserverreturn).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    setTimeout(callback, timeout);
  });
};
asmVMTestUtil.prototype.deleteUsedVM = function(vm, timeout, suite, callback) {
  if (vm.Created && vm.Delete) {
    setTimeout(function() {
      var cmd = util.format('vm delete %s -b -q --json', vm.Name).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        vm.Name = null;
        vm.Created = vm.Delete = false;
        callback();
      });
    }, timeout);
  } else {
    callback();
  }
};
asmVMTestUtil.prototype.deleteVM = function(vmName, timeout, suite, callback) {
  var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
  setTimeout(function() {
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      return callback();
    });
  }, timeout);
};
asmVMTestUtil.prototype.deleteUsedVMStaticIP = function(vmName, timeout, suite, callback) {
  if (!suite.isPlayback()) {
    setTimeout(function() {
      var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        setTimeout(callback, timeout);
      });
    }, timeout);
  } else
    callback();
};
asmVMTestUtil.prototype.deleteUsedVMExport = function(vm, timeout, suite, callback) {
  if (vm.Created && vm.Delete) {
    var cmd = vm.blobDelete ?
      util.format('vm delete %s -b -q --json', vm.Name).split(' ') :
      util.format('vm delete %s -q --json', vm.Name).split(' ');
    setTimeout(function() {
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        vm.Name = null;
        vm.Created = vm.Delete = false;
        return callback();
      });
    }, timeout);
  } else {
    return callback();
  }
};
asmVMTestUtil.prototype.createReservedIp = function(ripName, location, suite, callback) {
  if (createReservedIp.ripName) {
    callback(createReservedIp.ripName);
  } else {
    var cmd;
    cmd = util.format('network reserved-ip list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var ripList = JSON.parse(result.text);
      var ripfound = ripList.some(function(ripObj) {
        if (!ripObj.inUse && ripObj.location.toLowerCase() === location.toLowerCase()) {
          createReservedIp.ripName = ripObj.name;
          return true;
        }
      });
      if (ripfound) {
        callback(createReservedIp.ripName);
      } else {
        cmd = util.format('network reserved-ip create %s', ripName).split(' ');
        cmd.push(location);
        cmd.push('--json');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          this.ripCreate = true;
          createReservedIp.ripName = ripName;
          callback(createReservedIp.ripName);
        });
      }
    });
  }
};
asmVMTestUtil.prototype.deleterip = function(ripName, suite, callback) {
  var cmd = util.format('network reserved-ip delete %s -q --json', ripName).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    this.ripCreate = false;
    callback();
  });
};
asmVMTestUtil.prototype.createDisk = function(diskName, location, suite, callback) {
  this.getDiskName('Linux', location, suite, function(diskObj) {
    var diskSourcePath = diskObj.mediaLinkUri;
    var domainUrl = 'http://' + diskSourcePath.split('/')[2];
    var blobUrl = domainUrl + '/disks/' + diskName;
    var cmd = util.format('vm disk create %s %s -u %s -o %s --json', diskName, diskSourcePath, blobUrl, "Linux").split(' ');
    cmd.push('-l');
    cmd.push(location);
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  });
};
asmVMTestUtil.prototype.waitForDiskOp = function(vmName, DiskAttach, timeout, suite, callback) {
  var vmObj;
  var VMTestUtil = this;
  var cmd = util.format('vm show %s --json', vmName).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    vmObj = JSON.parse(result.text);
    if ((!DiskAttach && !vmObj.DataDisks[0]) || (DiskAttach && vmObj.DataDisks[0])) {
      callback(vmObj);
    } else {
      setTimeout(function() {
        VMTestUtil.waitForDiskOp(vmName, DiskAttach, timeout, suite, callback);
      }, timeout);
    }
  });
};
asmVMTestUtil.prototype.ListDisk = function(OS, location, suite, callback) {
  var diskObj;
  var cmd = util.format('vm disk list --json').split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    var diskList = JSON.parse(result.text);
    diskList.some(function(disk) {
      if ((disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === OS.toLowerCase()) &&
        (disk.location && disk.location.toLowerCase() === location.toLowerCase())) {
        diskObj = disk;
        return true;
      }
    });
    callback(diskObj);
  });
};
asmVMTestUtil.prototype.checkFreeDisk = function(suite, callback) {
  var diskname;
  var cmd = util.format('vm disk list --json');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    vmDiskObj = JSON.parse(result.text);
    vmDiskObj.some(function(disk) {
      if (!disk.usageDetails && disk.operatingSystemType && disk.operatingSystemType.toLowerCase() === 'linux') {
        diskname = disk.name;
        return true;
      }
    });
    callback(diskname);
  });
};
asmVMTestUtil.prototype.waitForDiskRelease = function(vmDisk, timeout, diskreleasetimeout, suite, callback) {
  var vmDiskObj;
  var VMTestUtil = this;
  var cmd = util.format('vm disk show %s --json', vmDisk).split(' ');
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    vmDiskObj = JSON.parse(result.text);
    if (vmDiskObj.usageDetails && vmDiskObj.usageDetails.deploymentName) {
      setTimeout(function() {
        VMTestUtil.waitForDiskRelease(vmDisk, timeout, diskreleasetimeout, suite, callback);
      }, timeout);
    } else {
      setTimeout(function() {
        callback();
      }, diskreleasetimeout);
    }
  });
};
asmVMTestUtil.prototype.checkForDockerPort = function(cratedVM, dockerPort) {
  var result = false;
  if (cratedVM.Network && cratedVM.Network.Endpoints) {
    cratedVM.Network.Endpoints.forEach(function(element, index, array) {
      if (element.name === 'docker' && element.port === dockerPort) {
        result = true;
      }
    });
  }
  return result;
};
asmVMTestUtil.prototype.generateFile = function(filename, fileSizeinBytes, data) {
  if (fileSizeinBytes)
    data = testUtils.generateRandomString(fileSizeinBytes);
  fs.writeFileSync(filename, data);
};
asmVMTestUtil.prototype.getVnetForLb = function(status, getVnetLB, getAffinityGroup, createdVnets, suite, callback) {
  var cmd;
  if (getVnetLB.vnetName) {
    callback(getVnetLB.vnetName, getVnetLB.location, getVnetLB.subnetname, getVnetLB.subnetaddress);
  } else {
    cmd = util.format('network vnet list --json').split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      var vnetName = JSON.parse(result.text);
      var found = vnetName.some(function(vnet) {
        if (vnet.state.toLowerCase() === status.toLowerCase() && vnet.location !== undefined) {
          getVnetLB.vnetName = vnet.name;
          getVnetLB.location = vnet.location;
          getVnetLB.subnetname = vnet.subnets[0].name;
          var address = vnet.subnets[0].addressPrefix;
          var addressSplit = address.split('/');
          var firstip = addressSplit[0];
          var n = firstip.substring(0, firstip.lastIndexOf('.') + 1);
          var secondip = n.concat(addressSplit[1]);
          getVnetLB.subnetaddress = secondip;
          return true;
        }
      });
      if (!found) {
        this.getAffinityGroup(location, getAffinityGroup, suite, function(affinGrpName) {
          vnetName = suite.generateId('testvnet', createdVnets);
          cmd = util.format('network vnet create %s -a %s --json', vnetName, affinGrpName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('network vnet show %s --json', vnetName, function(result) {
              result.exitStatus.should.equal(0);
              var vnet = JSON.parse(result.text);
              getVnetLB.vnetName = vnet.name;
              getVnetLB.location = location;
              getVnetLB.subnetname = vnet.subnets[0].name;
              var address = vnet.subnets[0].addressPrefix;
              var addressSplit = address.split('/');
              var firstip = addressSplit[0];
              var n = firstip.substring(0, firstip.lastIndexOf('.') + 1);
              var secondip = n.concat(addressSplit[1]);
              getVnetLB.subnetaddress = secondip;
              callback(getVnetLB.vnetName, getVnetLB.location, getVnetLB.subnetname, getVnetLB.subnetaddress);
            });
          });
        });
      } else {
        callback(getVnetLB.vnetName, getVnetLB.location, getVnetLB.subnetname, getVnetLB.subnetaddress);
      }
    });
  }
};
asmVMTestUtil.prototype.deleteVMCreatedByStatisIp = function(vmName, timeout, suite, callback) {
  if (!suite.isPlayback()) {
    setTimeout(function() {
      var cmd = util.format('vm delete %s -q --json', vmName).split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        setTimeout(callback, timeout);
      });
    }, timeout);
  } else
    callback();
};
asmVMTestUtil.prototype.createSubnetVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr, location, suite, callback) {
  var cmd = util.format('network vnet create %s -e %s -i %s -n %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetPrefix, subnetStartIp, subnetCidr).split(' ');
  cmd.push('-l');
  cmd.push(location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
asmVMTestUtil.prototype.createVnet = function(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, suite, callback) {
  var cmd = util.format('network vnet create %s -e %s -i %s -p %s -r %s --json', vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr).split(' ');
  cmd.push('-l');
  cmd.push(location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};

asmVMTestUtil.prototype.deleteVnet = function(vnetPrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network vnet delete %s --quiet --json', vnetPrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};
asmVMTestUtil.prototype.createNSG = function(nsgPrefix, location, suite, callback) {
  var cmd = util.format('network nsg create %s --json', nsgPrefix).split(' ');
  cmd.push('-l');
  cmd.push(location);
  testUtils.executeCommand(suite, retry, cmd, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });
};
asmVMTestUtil.prototype.deleteNSG = function(nsgPrefix, suite, callback) {
  if (!suite.isPlayback()) {
    var cmd = util.format('network nsg delete %s --quiet --json', nsgPrefix).split(' ');
    testUtils.executeCommand(suite, retry, cmd, function(result) {
      result.exitStatus.should.equal(0);
      callback();
    });
  } else
    callback();
};