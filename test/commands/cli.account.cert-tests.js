// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var fs = require('fs');
var path = require('path');
var should = require('should');

var CLITest = require('../framework/cli-test');
var suite = new CLITest();

describe('cli', function () {
  describe('account cert', function () {
    it('should export with subscription, output file and publish settings specified', function (done) {
      var publishSettingsPath = path.join(__dirname, '../data/account-credentials.publishSettings');
      var pemPath = path.join(__dirname, '../../out.pem');

      suite.execute('account cert export --publishsettings %s --file %s --subscription %s',
        publishSettingsPath,
        pemPath,
        'Account', function (result) {

        result.exitStatus.should.equal(0);
        fs.existsSync(pemPath).should.equal(true);
        fs.unlinkSync(pemPath);

        done();
      });
    });

    it('should export with subscription and publish settings specified', function (done) {
      var publishSettingsPath = path.join(__dirname, '../data/account-credentials.publishSettings');
      var pemPath = path.join(__dirname, '../../db1ab6f0-4769-4b27-930e-01e2ef9c123c.pem');

      suite.execute('account cert export --publishsettings %s --subscription %s',
        publishSettingsPath,
        'Account', function (result) {

        result.exitStatus.should.equal(0);
        fs.existsSync(pemPath).should.equal(true);
        fs.unlinkSync(pemPath);

        done();
      });
    });
  });
});