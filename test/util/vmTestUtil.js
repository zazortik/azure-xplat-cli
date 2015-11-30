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
//Moving to common util file
//var dockerCerts;
//var sshKeys;
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

VMTestUtil.prototype.createGroup = function(groupName, location, suite, callback) {
  var timestamp = (new Date()).toISOString();
  var tagstr = (suite.testPrefix + '=' + timestamp);
  suite.execute('group create %s --location %s --tags %s --json', groupName, location, tagstr, function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });

};
VMTestUtil.prototype.deleteUsedGroup = function(groupName, suite, callback) {
  if (!suite.isPlayback()) {
    suite.execute('group delete %s --quiet --json', groupName, function(result) {
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

    fs.writeFile(UrnPath, text, function(err) {});
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

    fs.writeFile(UrnPath, text, function(err) {});
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
  suite.execute('vm sizes -l %s --json', location, function(result) {
    result.exitStatus.should.equal(0);
    var allResources = JSON.parse(result.text);
    VMTestUtil.vmSize = allResources[0].name;
    callback();
  });
};
VMTestUtil.prototype.checkImagefile = function(callback) {

  fs.open(ImageUrnPath, 'r+', function(err, fd) {
    if (err == null || err == undefined) {
      var data = fs.readFileSync(ImageUrnPath, 'utf8');
      var image = JSON.parse(data);
      VMTestUtil.linuxImageUrn = (image.ImageUrn[1].Linux != '' && image.ImageUrn[1].Linux != undefined) ? image.ImageUrn[1].Linux : '';
      VMTestUtil.winImageUrn = (image.ImageUrn[0].Windows != '' && image.ImageUrn[0].Windows != undefined) ? image.ImageUrn[0].Windows : '';
    } else {
      fs.writeFile(ImageUrnPath, Imagejsontext, function(err) {

      });
    }
    callback();
  });
};