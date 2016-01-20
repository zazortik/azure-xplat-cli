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
exports = module.exports = hdinsightTestUtil;

/**
 * @class
 * Initializes a new instance of the hdinsightTestUtil class.
 * @constructor
 * 
 * 
 */
function hdinsightTestUtil() {
  this.timeoutLarge = 27000000;
  this.timeoutMedium = 600000;
}

hdinsightTestUtil.prototype.createGroup = function(groupName, location, suite, callback) {
  suite.execute(util.format('group create %s --location %s --json', groupName, location), function(result) {
    result.exitStatus.should.equal(0);
    callback();
  });

};

hdinsightTestUtil.prototype.deleteUsedGroup = function(groupName, suite, callback) {
  if (!suite.isPlayback()) {
    suite.execute('group delete %s --quiet --json', groupName, function(result) {
      callback();
    });
  } else callback();
};

hdinsightTestUtil.prototype.parseSSHPublicKeyPemFile = function(sshKeyFile) {
  var self = this;
  self.output.info(util.format($('Verifying the public key SSH file: %s'), sshKeyFile));
  var sshPublickeyPemData = fs.readFileSync(sshKeyFile);
  var sshPublickeyPemDataStr = sshPublickeyPemData.toString();
  if (!utils.isPemCert(sshPublickeyPemDataStr)) {
    throw new Error($('Specified SSH public key file is not in PEM format'));
  }

  return sshPublickeyPemDataStr;
};