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
var should = require('should');
var fs = require('fs');
var MobileTest = require('../util/mobileTest');
var utils = require('../../lib/util/utils');

var suite;
var servicename;

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject();
mobileTest.addMobileServiceObject({
  args: {
    backend: 'DotNet'
  }
});

mobileTest.createServicesAndRunForEach(configTests);

function configTests(service) {
  it('config list default', function (done) {
    suite = mobileTest.suite;
    servicename = service.servicename;

    var test = function () {
      suite.execute('mobile config list %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        if (response.service && response.service.applicationSystemKey) {
          response.service.applicationSystemKey = '';
        }
        if (service.args.backend === 'node') {
          response.should.include({
            "apns": {
              "mode": "none"
            },
            "live": {},
            "service": {
              "dynamicSchemaEnabled": true,
              "previewFeatures": []
            },
            "auth": [],
            "gcm": {}
          });
        } else {
          response.should.include({
            "service": {
              "remoteDebuggingEnabled": false,
              "remoteDebuggingVersion": "VS2012",
              "previewFeatures": []
            },
            "live": {},
            "auth": [],
            "apns": {
              "mode": "none"
            },
            "gcm": {}
          });
        }
        done();
      });
    };

    //push settings are not immediately available after mobile service creation for DotNet
    mobileTest.setTimeout(test, 30000);
  });

  // Facebook settings
  it('config set facebookClientId', function (done) {
    suite.execute('mobile config set %s facebookClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get facebookClientId', function (done) {
    suite.execute('mobile config get %s facebookClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.facebookClientId.should.equal('123');
      done();
    });
  });

  it('config set facebookClientSecret', function (done) {
    suite.execute('mobile config set %s facebookClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get facebookClientSecret', function (done) {
    suite.execute('mobile config get %s facebookClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.facebookClientSecret.should.equal('456');
      done();
    });
  });

  // Apple Push Notification
  it('config get apns default empty', function (done) {
    suite.execute('mobile config get %s apns --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.apns.should.equal('none');
      done();
    });
  });

  it('config set apns', function (done) {
    suite.execute('mobile config set %s apns dev:password:' + mobileTest.testArtifactDir + '/cert.pfx --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get apns', function (done) {
    suite.execute('mobile config get %s apns --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.apns.should.equal('dev');
      done();
    });
  });

  // Google Cloud Messaging
  it('config set gcm', function (done) {
    suite.execute('mobile config set %s gcm AIzaSyCLQM-YbdtwFx32h4Dp8PJ-3J_7PhxUxrc --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get gcm', function (done) {
    suite.execute('mobile config get %s gcm --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.gcm.should.equal('AIzaSyCLQM-YbdtwFx32h4Dp8PJ-3J_7PhxUxrc');
      done();
    });
  });

  // Google Settings
  it('config set googleClientId', function (done) {
    suite.execute('mobile config set %s googleClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get googleClientId', function (done) {
    suite.execute('mobile config get %s googleClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.googleClientId.should.equal('123');
      done();
    });
  });

  it('config set googleClientSecret', function (done) {
    suite.execute('mobile config set %s googleClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get googleClientSecret', function (done) {
    suite.execute('mobile config get %s googleClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.googleClientSecret.should.equal('456');
      done();
    });
  });

  // Twitter Settings
  it('config set twitterClientId', function (done) {
    suite.execute('mobile config set %s twitterClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get twitterClientId', function (done) {
    suite.execute('mobile config get %s twitterClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.twitterClientId.should.equal('123');
      done();
    });
  });

  it('config set twitterClientSecret', function (done) {
    suite.execute('mobile config set %s twitterClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get twitterClientSecret', function (done) {
    suite.execute('mobile config get %s twitterClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.twitterClientSecret.should.equal('456');
      done();
    });
  });

  // Cross Domain approved list
  it('config set crossDomainWhitelist localhost', function (done) {
    suite.execute('mobile config set %s crossDomainWhitelist localhost --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get crossDomainWhitelist localhost', function (done) {
    suite.execute('mobile config get %s crossDomainWhitelist --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.crossDomainWhitelist.length.should.equal(1);
      response.should.include({
        "crossDomainWhitelist": [{
          host: "localhost"
        }]
      });

      response.crossDomainWhitelist[0].host.should.equal('localhost');
      done();
    });
  });

  it('config set crossDomainWhitelist test.com', function (done) {
    suite.execute('mobile config set %s crossDomainWhitelist test.com,127.0.0.1 --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get crossDomainWhitelist test.com suceeds', function (done) {
    suite.execute('mobile config get %s crossDomainWhitelist --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.crossDomainWhitelist.length.should.equal(2);
      response.should.include({
        "crossDomainWhitelist": [{
          host: "test.com"
        }, {
          host: "127.0.0.1"
        }]
      });

      done();
    });
  });

  // Microsoft (Live) Settings
  it('config set microsoftAccountClientId', function (done) {
    var cmd = ('mobile config set ' + servicename + ' microsoftAccountClientId 123 --json').split(' ');
    suite.execute(cmd, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get microsoftAccountClientId', function (done) {
    suite.execute('mobile config get %s microsoftAccountClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountClientId.should.equal('123');
      done();
    });
  });

  it('config set microsoftAccountClientSecret', function (done) {
    suite.execute('mobile config set %s microsoftAccountClientSecret 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get microsoftAccountClientSecret', function (done) {
    suite.execute('mobile config get %s microsoftAccountClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountClientSecret.should.equal('123');
      done();
    });
  });

  it('config set microsoftAccountPackageSID', function (done) {
    suite.execute('mobile config set %s microsoftAccountPackageSID 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get microsoftAccountPackageSID', function (done) {
    suite.execute('mobile config get %s microsoftAccountPackageSID --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountPackageSID.should.equal('123');
      done();
    });
  });

  // Setting from file
  it('config set from file', function (done) {
    suite.execute('mobile config set %s facebookClientId -f ' + mobileTest.testArtifactDir + '/facebookClientId.txt --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get setting set from file', function (done) {
    suite.execute('mobile config get %s facebookClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      fs.readFileSync(mobileTest.testArtifactDir + '/facebookClientId.txt', 'utf8', function (err, data) {
        if (err) {
          return console.log(err);
        }
        response.facebookClientId.should.equal(data);
      });
      done();
    });
  });
}
