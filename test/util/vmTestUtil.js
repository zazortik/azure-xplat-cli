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
var dockerCerts;
var ImageUrnPath = './test/data/imageUrn.json';
var Imagejsontext = '{"ImageUrn":[' +
		'{"Windows":""},' +
		'{"Linux":""}]}';
exports = module.exports = VMTestUtil;

/**
 * @class
 * Initializes a new instance of the VMTestUtil class.
 * @constructor
 * 
 * Example use of this class:
 *
 * //creates mobile test class
 * var vmUtil = new VMTestUtil();
 * // use the methods 
 * 
 */
function VMTestUtil() {
	this.linuxSkus;
	this.linuxImageUrn;
	this.linuxPublisher = 'Canonical';
	this.linuxOffer = 'UbuntuServer';
	this.linuxDockerSkus = '14.04.1-LTS';
	this.vmSize;
	this.winPublisher = 'MicrosoftWindowsServer';
	this.winOffer = 'WindowsServer';
	this.winSkus;
	this.winImageUrn;
	this.timeoutLarge = 800000;
	this.timeoutMedium = 600000; 
}

VMTestUtil.prototype.createGroup = function (groupName, location, suite, callback) {
	suite.execute('group create %s --location %s --json', groupName, location, function (result) {
		result.exitStatus.should.equal(0);
		callback();	
	});
	
};
VMTestUtil.prototype.deleteUsedGroup = function (groupName, suite, callback) {
	if(!suite.isPlayback()) {
		suite.execute('group delete %s --quiet --json', groupName, function (result) {
			result.exitStatus.should.equal(0);
			callback();
		});
	} else callback();
};

VMTestUtil.prototype.GetLinuxSkusList = function(location, suite, callback) {
	suite.execute('vm image list-skus %s %s %s --json', location, this.linuxPublisher, this.linuxOffer, function(result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.linuxSkus = allResources[0].name;
		callback();
	});
};
VMTestUtil.prototype.GetLinuxImageList = function(location, suite, callback) {
	var UrnPath = './test/data/imageUrn.json';
	suite.execute('vm image list %s %s %s %s --json', location, this.linuxPublisher, this.linuxOffer, VMTestUtil.linuxSkus, function(result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.linuxImageUrn = allResources[0].urn;
		
		var text = '{"ImageUrn":[' +
				'{"Windows": "' + VMTestUtil.winImageUrn + '"},' +
				'{"Linux":"' + VMTestUtil.linuxImageUrn + '"}]}';
				
		fs.writeFile(UrnPath, text, function (err) {
		});
		callback();
	});
};
VMTestUtil.prototype.GetWindowsSkusList = function(location, suite, callback) {
	suite.execute('vm image list-skus %s %s %s --json', location, this.winPublisher, this.winOffer, function(result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.winSkus = allResources[1].name;
		callback();
	});
};
VMTestUtil.prototype.GetWindowsImageList = function(location, suite, callback) {
	var UrnPath = './test/data/imageUrn.json';
	suite.execute('vm image list %s %s %s %s --json', location, this.winPublisher, this.winOffer, VMTestUtil.winSkus, function(result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.winImageUrn = allResources[0].urn;
		var text = '{"ImageUrn":[' +
				'{"Windows": "' + VMTestUtil.winImageUrn + '"},' +
				'{"Linux":"' + VMTestUtil.linuxImageUrn + '"}]}';
				
		fs.writeFile(UrnPath, text, function (err) {
		});
		callback();
	});
};
VMTestUtil.prototype.GetDockerLinuxImageList = function(location, suite, callback) {
	suite.execute('vm image list %s %s %s %s --json', location, this.linuxPublisher, this.linuxOffer, this.linuxDockerSkus, function(result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.linuxImageUrn = allResources[0].urn;
		callback();
	});
};
VMTestUtil.prototype.getVMSize = function(location, suite, callback) {
	suite.execute('vm sizes -l %s --json', location, function (result) {
		result.exitStatus.should.equal(0);
		var allResources = JSON.parse(result.text);
		VMTestUtil.vmSize =  allResources[0].name;		
		callback();
	});
};
VMTestUtil.prototype.deleteDockerCertificates = function(dockerCertDir) {
	if (!dockerCertDir || !dockerCerts) {
      return;
    }

    fs.exists(dockerCertDir, function(exists) {
      if (!exists) {
        return;
      }

      fs.unlinkSync(dockerCerts.caKey);
      fs.unlinkSync(dockerCerts.ca);
      fs.unlinkSync(dockerCerts.serverKey);
      fs.unlinkSync(dockerCerts.server);
      fs.unlinkSync(dockerCerts.serverCert);
      fs.unlinkSync(dockerCerts.clientKey);
      fs.unlinkSync(dockerCerts.client);
      fs.unlinkSync(dockerCerts.clientCert);
      fs.unlinkSync(dockerCerts.extfile);
      fs.rmdirSync(dockerCertDir);
    });
};
VMTestUtil.prototype.checkForDockerCertificates = function(vmName, dockerCertDir) {
	 dockerCerts = {
			caKey: path.join(dockerCertDir, 'ca-key.pem'),
			ca: path.join(dockerCertDir, 'ca.pem'),
			serverKey: path.join(dockerCertDir, vmName + '-server-key.pem'),
			server: path.join(dockerCertDir, vmName + '-server.csr'),
			serverCert: path.join(dockerCertDir, vmName + '-server-cert.pem'),
			clientKey: path.join(dockerCertDir, 'key.pem'),
			client: path.join(dockerCertDir, 'client.csr'),
			clientCert: path.join(dockerCertDir, 'cert.pem'),
			extfile: path.join(dockerCertDir, 'extfile.cnf')
		  };

		  if (!fs.existsSync(dockerCerts.caKey)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.ca)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.serverKey)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.server)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.serverCert)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.clientKey)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.client)) {
			return false;
		  }

		  if (!fs.existsSync(dockerCerts.clientCert)) {
			return false;
		  }

		  return true;
};
VMTestUtil.prototype.checkImagefile = function(callback) {
	
	fs.open(ImageUrnPath, 'r+', function(err, fd) {
			if(err == null || err == undefined) {
				var data = fs.readFileSync(ImageUrnPath, 'utf8');
				var image = JSON.parse(data);
				VMTestUtil.linuxImageUrn = (image.ImageUrn[1].Linux != '' && image.ImageUrn[1].Linux != undefined) ? image.ImageUrn[1].Linux : '';
				VMTestUtil.winImageUrn = (image.ImageUrn[0].Windows != '' && image.ImageUrn[0].Windows != undefined) ? image.ImageUrn[0].Windows: '';
			}
			else {
				fs.writeFile(ImageUrnPath, Imagejsontext, function (err) {
					
				});
			}
		callback();	
	});
}