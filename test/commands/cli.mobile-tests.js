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

/*

  WARNING: whenever you make any of the following changes:
  - product changes affecting wire protocols
  - adding tests
  - removing tests
  - reordering tests
  you must regenerate the cli.mobile-tests.nock.js file that contains
  the mocked HTTP requests and responses corresponding to the tests in this
  file. The instructions are below.

  INSTRUCTIONS FOR RE-GENERATING THE cli.mobile-tests.nock.js FILE:

  1. Make sure the tests are passing against live Microsoft Azure endpoints:
  1.0. Remember to register your Microsoft Azure credentials with `azure account import`
  1.1. Set the NOCK_OFF environment variable to `true`
  1.2. Run tests with `npm test`

  2. Re-run the tests against the live Microsoft Azure endpints while capturing the
     HTTP traffic:
  2.1. Make sure NOCK_OFF is still set to `true`
  2.2. Set AZURE_NOCK_RECORD to `true`
  2.3. Run the tests with `npm test`. The new cli.mobile-tests.nock.js will be generated.
  2.4. Manually update the `nockedSubscriptionId`,`nodeNockedServiceName` and `dotnetNockedServiceName` variables right below
     to the values of subscription Id and service name that had been used during the test pass in #2.3.
     The service name should be displayed in the name of every test that executed.

  3. Validate the new mocks:
  3.1. Unset both NOCK_OFF and AZURE_NOCK_RECORD environment variables
  3.2. Run the tests with `npm test`.

*/

var nockedSubscriptionId = '1bf890dd-ee1e-45b8-a870-34e6279ffaba';
var nodeNockedServiceName = 'clitestab9d284f-7691-4640-9086-81d40a2fce98';
var dotnetNockedServiceName = 'clitest2f0b9371-9ed5-4d3f-8b27-f925cecf007d';

var _ = require('underscore');
var should = require('should');
var uuid = require('node-uuid');
var fs = require('fs');
var azureCommon = require('azure-common');
var path = require('path');
var PipelineChannel = require('../../lib/commands/asm/mobile/pipelineChannel');
var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');
var WebResource = azureCommon.WebResource;
var location = process.env.AZURE_SQL_TEST_LOCATION || 'West US';
var servicedomain = process.env.SERVICE_DOMAIN || '.azure-mobile.net';
var scopeWritten;
var existingDBName;
var existingServerName;
var existingContinuationToken;
var knownRecords;

var suite;
var testPrefix = 'cli.mobile-tests';
var requiredEnvironment = [];
var testArtifactDir = path.join(__dirname, 'mobile');

var testLogFile = '';

function createDirIfNotExists(directory) {
  if(!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
  return directory;
};

function getTestOutputDir(){
  var testLogDir = createDirIfNotExists(path.resolve(__dirname, '..', 'output'));
  testLogDir = createDirIfNotExists(path.resolve(testLogDir, 'mobile-tests'));
  return testLogDir;
}

//creates log file in output/mobile-tests/ which contains test result data for debugging purposes
function createLogFile() {
  testLogFile = path.resolve(getTestOutputDir(), 'mobile_' + getTimeStamp() + '.log');
  if(!fs.existsSync(testLogFile)) {
    fs.writeFileSync(testLogFile,"");
  }
  return testLogFile;
}

//appends the content to the log file
function appendContent(content) {
  if(!fs.existsSync(testLogFile)) {
    createLogFile();
  }
  fs.appendFileSync(testLogFile, content);
}

//provides current time in custom format that will be used in naming log files
//example '2014_8_20_15_11_13'
function getTimeStamp() {
  var now = new Date();
  var dArray = [now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()];
  return dArray.join("_");
}

// Load profile and start recording
nockStart = function () {
  before(function (done) {
    suite = new CLITest(testPrefix, requiredEnvironment);
    testLogFile = createLogFile();

    //wrapper function around suite.execute to capture result info
    var previousExecute = suite.execute;
    suite.execute = _.bind(function() {
      var testCallback = arguments[arguments.length-1];

      //get arguments for current test call
      var argArray = Array.prototype.slice.call(arguments);

      //set wrapper callback to output test results to file
      arguments[arguments.length-1] = function(result) {
        appendContent('\r\n\r\nTest Call: ' + argArray.slice(0, argArray.length - 1).join(' '));
        appendContent('\r\nTimestamp: ' + new Date().toString());
        appendContent('\r\nExit Status: ' + result.exitStatus);
        appendContent('\r\nResult Text: ' + result.text);
        testCallback(result);
      };
      previousExecute.apply(suite, arguments);
    }, suite);

    if (suite.isMocked) {
      utils.POLL_REQUEST_INTERVAL = 0;
    }

    suite.setupSuite(done);
  });

  // Mocha does not invoke "before" if it does not have tests 
  it('dummy Test', function (done) {
    done();
  });
};

nockEnd = function () {
  after(function (done) {
    suite.teardownSuite(done);
  });

  // Mocha does not invoke "after" if it does not have tests 
  it('dummy Test', function (done) {
    done();
  });
};

allTests = function (backend) {
  var servicename;
  // The hardcoded service name may need to be updated every time before a new NOCK recording is made
  if (backend === 'node') {
    servicename = process.env.NOCK_OFF ? 'clitest' + uuid() : nodeNockedServiceName;
  } else {
    servicename = process.env.NOCK_OFF ? 'clitest' + uuid() : dotnetNockedServiceName;
  }

  var existingServiceName = servicename.replace(/clitest/, 'existing');

  // before every test
  beforeEach(function (done) {
    suite.setupTest(this.currentTest.fullTitle(), done);
  });

  // after every test
  afterEach(function (done) {
    suite.teardownTest(done);
  });

  it('locations --json (verify the locations provided by mobile service)', function (done) {
    suite.execute('mobile locations --json', function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.should.includeEql({ 'region': location });
      done();
    });
  });

  it('create ' + servicename + ' tjanczuk FooBar#12 -b ' + backend + ' -p legacy --sqlLocation "' + location + '" --json (create new service and get its server, DB name)', function (done) {
    suite.execute('mobile create %s tjanczuk FooBar#12 -b %s -p legacy --sqlLocation %s --json', servicename, backend, location, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.have.property('Name', servicename + 'mobileservice');
      response.should.have.property('Label', servicename);
      response.should.have.property('State', 'Healthy');
      existingDBName = response.InternalResources.InternalResource[1].Name;
      existingServerName = response.InternalResources.InternalResource[2].Name;
      done();
    });
  });

  it('create ' + existingServiceName + ' -d existingDBName -r existingServerName tjanczuk FooBar#12 -b ' + backend + ' --push nh --json (create service with existing DB and server)', function (done) {
    suite.execute('mobile create %s -d %s -r %s tjanczuk FooBar#12 -b %s --push nh --json', existingServiceName, existingDBName, existingServerName, backend, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.have.property('Name', existingServiceName + 'mobileservice');
      response.should.have.property('Label', existingServiceName);
      response.should.have.property('State', 'Healthy');
      response.InternalResources.InternalResource.Name.should.equal(existingServiceName);
      Array.isArray(response.ExternalResources.ExternalResource).should.be.ok;
      response.ExternalResources.ExternalResource.length.should.equal(2);
      response.ExternalResources.ExternalResource[0].Name.should.equal(existingDBName);
      response.ExternalResources.ExternalResource[1].Name.should.equal(existingServerName);

      done();
    });
  });

  it('list --json (contains healthy service)', function (done) {
    suite.execute('mobile list --json', function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.some(function (service) {
        return service.name === servicename && service.state === 'Ready';
      }).should.be.ok;
      response.some(function (service) {
        return service.name === existingServiceName && service.state === 'Ready';
      }).should.be.ok;

      done();
    });
  });


  it('show ' + servicename + ' --json (contains healthy service)', function (done) {
    var cmd = ('mobile show ' + servicename + ' --json').split(' ');
    suite.execute(cmd, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.service.name.should.equal(servicename);
      response.service.state.should.equal('Ready');
      response.application.Name.should.equal(servicename + 'mobileservice');
      response.application.Label.should.equal(servicename);
      response.application.State.should.equal('Healthy');
      response.scalesettings.tier.should.equal('tier1');
      response.scalesettings.numberOfInstances.should.equal(1);

      done();
    });
  });

  it('job list --json (contains no scheduled jobs by default)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });

  it('job create ' + servicename + ' foobar --json (create default scheduled job)', function (done) {
    suite.execute('mobile job create %s foobar --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list --json (contains one scheduled job)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      response[0].intervalUnit.should.equal('minute');
      response[0].intervalPeriod.should.equal(15);
      setTimeout(done(), 90000);
    });
  });

  it('job update ' + servicename + ' foobar -u hour -i 2 -a enabled --json (update scheduled job)', function (done) {
    suite.execute('mobile job update %s foobar -u hour -i 2 -a enabled --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list --json (contains updated scheduled job)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('enabled');
      response[0].intervalUnit.should.equal('hour');
      response[0].intervalPeriod.should.equal(2);
      done();
    });
  });

  it('job update ' + servicename + ' foobar -u none --json (update scheduled job to be on demand)', function (done) {
    suite.execute('mobile job update %s foobar -u none --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list --json (job updated to be on demand)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      done();
    });
  });

  it('job update ' + servicename + ' foobar -u minute -i 20 --json (update on demand job to have schedule)', function (done) {
    suite.execute('mobile job update %s foobar -u minute -i 20 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list --json (job now a scheduled job)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(1);
      response[0].name.should.equal('foobar');
      response[0].status.should.equal('disabled');
      response[0].intervalUnit.should.equal('minute');
      response[0].intervalPeriod.should.equal(20);
      response[0].startTime.should.equal('1900-01-01T00:00:00Z');
      done();
    });
  });

  // Disable specific scheduler job
  it('job update ' + servicename + ' -a disabled --json', function (done) {
    suite.execute('mobile job update %s foobar -a disabled --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');

      done();
    });
  });

  it('job delete ' + servicename + ' foobar --json (delete scheduled job)', function (done) {
    suite.execute('mobile job delete %s foobar --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('job list --json (contains no scheduled jobs after deletion)', function (done) {
    suite.execute('mobile job list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.length.should.equal(0);
      done();
    });
  });

  it('redeploy ' + servicename + ' --json (Redeploy specific service)', function (done) {
    suite.execute('mobile redeploy %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');

      done();
    });
  });

  it('config list ' + servicename + ' --json (default config)', function (done) {
    suite.execute('mobile config list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      if (response.service && response.service.applicationSystemKey) {
        response.service.applicationSystemKey = '';
      }
      if (backend === 'node') {
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
        }
        );
      }
      done();
    });
  });

  // Facebook settings
  it('config set ' + servicename + ' facebookClientId 123 --json', function (done) {
    suite.execute('mobile config set %s facebookClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' facebookClientId --json (value was set)', function (done) {
    suite.execute('mobile config get %s facebookClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.facebookClientId.should.equal('123');
      done();
    });
  });

  it('config set ' + servicename + ' facebookClientSecret 456 --json', function (done) {
    suite.execute('mobile config set %s facebookClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' facebookClientSecret --json (value was set)', function (done) {
    suite.execute('mobile config get %s facebookClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.facebookClientSecret.should.equal('456');
      done();
    });
  });

  // Apple Push Notification
  it('config get ' + servicename + ' apns --json (by default apns certificate is not set)', function (done) {
    suite.execute('mobile config get %s apns --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.apns.should.equal('none');
      done();
    });
  });

  it('config set ' + servicename + ' apns dev:password:' + testArtifactDir + '/cert.pfx --json (set apns certificate)', function (done) {
    suite.execute('mobile config set %s apns dev:password:' + testArtifactDir + '/cert.pfx --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' apns --json (apns certificate was set)', function (done) {
    suite.execute('mobile config get %s apns --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.apns.should.equal('dev');
      done();
    });
  });

  // Google Cloud Messaging
  it('config set ' + servicename + ' gcm AIzaSyCLQM-YbdtwFx32h4Dp8PJ-3J_7PhxUxrc --json', function (done) {
    suite.execute('mobile config set %s gcm AIzaSyCLQM-YbdtwFx32h4Dp8PJ-3J_7PhxUxrc --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' gcm --json (value was set)', function (done) {
    suite.execute('mobile config get %s gcm --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.gcm.should.equal('AIzaSyCLQM-YbdtwFx32h4Dp8PJ-3J_7PhxUxrc');
      done();
    });
  });

  // Google Settings
  it('config set ' + servicename + ' googleClientId 123 --json', function (done) {
    suite.execute('mobile config set %s googleClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' googleClientId --json (value was set)', function (done) {
    suite.execute('mobile config get %s googleClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.googleClientId.should.equal('123');
      done();
    });
  });

  it('config set ' + servicename + ' googleClientSecret 456 --json', function (done) {
    suite.execute('mobile config set %s googleClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' googleClientSecret --json (value was set)', function (done) {
    suite.execute('mobile config get %s googleClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.googleClientSecret.should.equal('456');
      done();
    });
  });

  // Twitter Settings
  it('config set ' + servicename + ' twitterClientId 123 --json', function (done) {
    suite.execute('mobile config set %s twitterClientId 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' twitterClientId --json (value was set)', function (done) {
    suite.execute('mobile config get %s twitterClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.twitterClientId.should.equal('123');
      done();
    });
  });

  it('config set ' + servicename + ' twitterClientSecret 456 --json', function (done) {
    suite.execute('mobile config set %s twitterClientSecret 456 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' twitterClientSecret --json (value was set)', function (done) {
    suite.execute('mobile config get %s twitterClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.twitterClientSecret.should.equal('456');
      done();
    });
  });

  // Cross Domain approved list
  it('config set ' + servicename + ' crossDomainWhitelist localhost --json', function (done) {
    suite.execute('mobile config set %s crossDomainWhitelist localhost --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' crossDomainWhitelist --json (value was set)', function (done) {
    suite.execute('mobile config get %s crossDomainWhitelist --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.crossDomainWhitelist.length.should.equal(1);
      response.should.include({
        "crossDomainWhitelist": [
          { host: "localhost" }
        ]
      });

      response.crossDomainWhitelist[0].host.should.equal('localhost');
      done();
    });
  });

  it('config set ' + servicename + ' crossDomainWhitelist test.com,127.0.0.1 --json', function (done) {
    suite.execute('mobile config set %s crossDomainWhitelist test.com,127.0.0.1 --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' crossDomainWhitelist --json (value was set)', function (done) {
    suite.execute('mobile config get %s crossDomainWhitelist --json', servicename, function (result) {
      result.errorText.should.equal('');
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.crossDomainWhitelist.length.should.equal(2);
      response.should.include({
        "crossDomainWhitelist": [
          { host: "test.com" },
          { host: "127.0.0.1" }
        ]
      });

      done();
    });
  });

  // Microsoft (Live) Settings
  it('config set ' + servicename + ' microsoftAccountClientId 123 --json', function (done) {
    var cmd = ('mobile config set ' + servicename + ' microsoftAccountClientId 123 --json').split(' ');
    suite.execute(cmd, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' microsoftAccountClientId --json (value was set)', function (done) {
    suite.execute('mobile config get %s microsoftAccountClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountClientId.should.equal('123');
      done();
    });
  });

  it('config set ' + servicename + ' microsoftAccountClientSecret 123 --json', function (done) {
    suite.execute('mobile config set %s microsoftAccountClientSecret 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' microsoftAccountClientSecret --json (value was set)', function (done) {
    suite.execute('mobile config get %s microsoftAccountClientSecret --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountClientSecret.should.equal('123');
      done();
    });
  });

  it('config set ' + servicename + ' microsoftAccountPackageSID 123 --json', function (done) {
    suite.execute('mobile config set %s microsoftAccountPackageSID 123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' microsoftAccountPackageSID --json (value was set)', function (done) {
    suite.execute('mobile config get %s microsoftAccountPackageSID --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.microsoftAccountPackageSID.should.equal('123');
      done();
    });
  });

  // Setting from file
  it('config set -f ' + testArtifactDir + '/facebookClientId.txt ' + servicename + ' facebookClientId --json', function (done) {
    suite.execute('mobile config set %s facebookClientId -f ' + testArtifactDir + '/facebookClientId.txt --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('config get ' + servicename + ' facebookClientId --json (set from file)', function (done) {
    suite.execute('mobile config get %s facebookClientId --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      fs.readFileSync(testArtifactDir + '/facebookClientId.txt', 'utf8', function (err, data) {
        if (err) {
          return console.log(err);
        }
        response.facebookClientId.should.equal(data);
      });
      done();
    });
  });

  it('appsetting list ' + servicename + '--json (empty)', function (done) {
    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });

  it('appsetting add ' + servicename + '  testsetting alpha1 --json', function (done) {
    suite.execute('mobile appsetting add %s testsetting alpha1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('appsetting show ' + servicename + '  testsetting --json', function (done) {
    suite.execute('mobile appsetting show %s testsetting --json', servicename, function (result) {
      var response = JSON.parse(result.text);
      response.name.should.equal('testsetting');
      response.value.should.equal('alpha1');
      done();
    });
  });

  it('appsetting list ' + servicename + '--json (empty)', function (done) {
    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(1);
      done();
    });
  });

  it('appsetting delete ' + servicename + '  testsetting alpha1 --json', function (done) {
    suite.execute('mobile appsetting delete %s testsetting --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('appsetting list ' + servicename + ' --json (empty)', function (done) {
    suite.execute('mobile appsetting list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.length.should.equal(0);
      done();
    });
  });

  // Auth commands
  it('auth microsoftaccount set ' + servicename + ' 123 456 --packageSid 789 --json', function (done) {
    suite.execute('mobile auth microsoftaccount set %s 123 456 --packageSid 789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get ' + servicename + ' --json (123 456 789)', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('123');
      response.secret.should.equal('456');
      response.packageSid.should.equal('789');
      done();
    });
  });

  it('auth microsoftaccount set ' + servicename + ' 1234 5678 --json', function (done) {
    var cmd = ('mobile auth microsoftaccount set ' + servicename + ' 1234 5678 --json').split(' ');

    suite.execute(cmd, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');

      done();
    });
  });

  it('auth microsoftaccount get ' + servicename + ' --json (1234 5678 789)', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      response.packageSid.should.equal('789');
      done();
    });
  });

  it('auth microsoftaccount set ' + servicename + ' --packageSid 123456789 --json', function (done) {
    suite.execute('mobile auth microsoftaccount set %s --packageSid 123456789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get ' + servicename + ' --json (1234 5678 123456789)', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('microsoft');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      response.packageSid.should.equal('123456789');
      done();
    });
  });

  it('auth microsoftaccount delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth microsoftaccount delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth microsoftaccount get ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth microsoftaccount get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      // result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth facebook set ' + servicename + ' 1234 5678 --json', function (done) {
    suite.execute('mobile auth facebook set %s 1234 5678 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth facebook get ' + servicename + ' --json (1234 5678)', function (done) {
    suite.execute('mobile auth facebook get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('facebook');
      response.appId.should.equal('1234');
      response.secret.should.equal('5678');
      done();
    });
  });

  it('auth facebook delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth facebook delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth facebook get ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth facebook get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth twitter set ' + servicename + ' 12345 6789 --json', function (done) {
    suite.execute('mobile auth twitter set %s 12345 6789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth twitter get ' + servicename + ' --json (12345 6789)', function (done) {
    suite.execute('mobile auth twitter get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('twitter');
      response.appId.should.equal('12345');
      response.secret.should.equal('6789');
      done();
    });
  });

  it('auth twitter delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth twitter delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth twitter get ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth twitter get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth google set ' + servicename + ' 45678 9123 --json', function (done) {
    suite.execute('mobile auth google set %s 45678 9123 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth google get ' + servicename + ' --json (45678 9123)', function (done) {
    suite.execute('mobile auth google get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('google');
      response.appId.should.equal('45678');
      response.secret.should.equal('9123');
      done();
    });
  });

  it('auth google delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth google delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth google get ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth google get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  it('auth aad set ' + servicename + ' 123456789 --json', function (done) {
    suite.execute('mobile auth aad set %s 123456789 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth aad get ' + servicename + ' --json (123456789)', function (done) {
    suite.execute('mobile auth aad get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.provider.should.equal('aad');
      response.appId.should.equal('123456789');
      done();
    });
  });

  it('auth aad delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth aad delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('auth aad get ' + servicename + ' --json', function (done) {
    suite.execute('mobile auth aad get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');
      done();
    });
  });

  // Push settings
  it('push nh enable ' + servicename + ' --json', function (done) {
    suite.execute('mobile push nh enable %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push nh get ' + servicename + ' --json', function (done) {
    suite.execute('mobile push nh get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.enableExternalPushEntity.should.equal(true);
      response.externalPushEntitySettingsPropertyBag.externalPushEntityState.should.equal('healthy');
      done();
    });
  });

  it('push mpns set ' + servicename + ' ' + testArtifactDir + '/cert.pfx password --enableUnAuthenticatedPush --json', function (done) {
    suite.execute('mobile push mpns set %s ' + testArtifactDir + '/cert.pfx password --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push mpns get ' + servicename + ' --json', function (done) {
    suite.execute('mobile push mpns get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.certificateKey.should.equal('password');
      response.enableUnauthenticatedSettings.should.equal(true);
      done();
    });
  });

  it('push mpns delete ' + servicename + ' --json', function (done) {
    suite.execute('mobile push mpns delete %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('push mpns get ' + servicename + ' --json', function (done) {
    suite.execute('mobile push mpns get %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.enableUnauthenticatedSettings.should.equal(false);
      done();
    });
  });

  it('push nh disable ' + servicename + ' --json', function (done) {
      suite.execute('mobile push nh disable %s --json', servicename, function (result) {
          result.exitStatus.should.equal(0);
          done();
      });
  });

  it('push nh get ' + servicename + ' --json (disabled)', function (done) {
      suite.execute('mobile push nh get %s --json', servicename, function (result) {
          result.exitStatus.should.equal(0);
          var response = JSON.parse(result.text);
          JSON.stringify(response.externalPushEntitySettingsPropertyBag).should.equal('{}');
          done();
      });
  });

  // Table commands
  it('table list ' + servicename + ' --json (no tables by default)', function (done) {
    suite.execute('mobile table list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table create ' + servicename + ' table1 --json (add first table)', function (done) {
    suite.execute('mobile table create %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table list ' + servicename + ' --json (contains one table)', function (done) {
    suite.execute('mobile table list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(1);
        response[0].name.should.equal('table1');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table1 --json (default table config)', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        ['insert', 'read', 'update', 'delete'].forEach(function (permission) {
          response.permissions[permission].should.equal('application');
        });
        response.table.name.should.equal('table1');
        Array.isArray(response.columns).should.be.ok;
        response.columns.length.should.equal(4);
        response.columns[0].name.should.equal('id');
        response.columns[0].type.should.equal('string');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table1 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('table update ' + servicename + ' table1 -p *=admin,insert=public --json (update permissions)', function (done) {
    suite.execute('mobile table update %s table1 -p *=admin,insert=public --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Not all update operations completed successfully');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table1 --json (updated permissions)', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        ['read', 'update', 'delete'].forEach(function (permission) {
          response.permissions[permission].should.equal('admin');
        });
        response.permissions.insert.should.equal('public');
        response.table.name.should.equal('table1');
        Array.isArray(response.columns).should.be.ok;
        response.columns.length.should.equal(4);
        response.columns[0].name.should.equal('id');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table1 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('table create ' + servicename + ' table2 --json (add table with specific permission)', function (done) {
    suite.execute('mobile table create -p insert=public,update=public,read=user,delete=admin %s table2 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table2 --json (check the specific permission setting)', function (done) {
    suite.execute('mobile table show %s table2 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        ['insert', 'update'].forEach(function (permission) {
          response.permissions[permission].should.equal('public');
        });
        response.permissions.read.should.equal('user');
        response.permissions.delete.should.equal('admin');
        response.table.name.should.equal('table2');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table2 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('table delete ' + servicename + ' table2 -q --json (delete table2)', function (done) {
    suite.execute('mobile table delete %s table2 -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  function getWebResource(uri) {
    var httpRequest = new WebResource();

    httpRequest.uri = uri;
    return httpRequest;
  }

  function insert5Rows(callback) {
    var success = 0;
    var failure = 0;

    function tryFinish(error, content, response) {
      if (error) {
        failure++;
      } else {
        response.statusCode >= 400 ? failure++ : success++;
      }

      if ((success + failure) < 5) {
        return;
      }

      callback(success, failure);
    }

    for (var i = 0; i < 5; i++) {
      var resource = getWebResource('http://' + servicename + servicedomain);
      var client = azureCommon.requestPipeline.create(
          utils.createPostBodyFilter(),
          utils.createFollowRedirectFilter(),
          utils.createFollowRedirectFilter());
      var channel = new PipelineChannel(client, resource)
          .path('tables')
          .path('table1')
          .header('Content-Type', 'application/json');
      channel.post(JSON.stringify({ rowNumber: i, foo: 'foo', bar: 7, baz: true }), tryFinish);
    }
  };

  it('(add 5 rows of data to table with public insert permission)', function (done) {
    if (backend === 'node') {
      insert5Rows(function (success, failure) {
        failure.should.equal(0);
        done();
      });
    } else {
      done();
    }
  });

  it('table show ' + servicename + ' table1 --json (new rows and columns)', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.columns).should.be.ok;
        response.columns.length.should.equal(8);
        [{ name: 'id', indexed: true },
          { name: '__createdAt', indexed: true },
          { name: '__updatedAt', indexed: false },
          { name: '__version', indexed: false },
          { name: 'rowNumber', indexed: false },
          { name: 'foo', indexed: false },
          { name: 'bar', indexed: false },
          { name: 'baz', indexed: false }].forEach(function (column, columnIndex) {
            response.columns[columnIndex].name.should.equal(column.name);
            response.columns[columnIndex].indexed.should.equal(column.indexed);
          });
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table1 or mobile service ' + servicename + ' does not exist');
      }

      done();
    });
  });

  it('data read ' + servicename + ' table1 --json (show 5 rows of data)', function (done) {
    suite.execute('mobile data read %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        knownRecords = JSON.parse(result.text);
        Array.isArray(knownRecords).should.be.ok;
        knownRecords.length.should.equal(5);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('data read ' + servicename + ' table1 --top 1 --json (show top 1 row of data)', function (done) {
    suite.execute('mobile data read %s table1 --top 1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(1);
        response[0].id.should.equal(knownRecords[0].id);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('data read ' + servicename + ' table1 --skip 3 --json', function (done) {
    suite.execute('node clis.js mobile data read %s table1 --skip 3 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(2);
        response[0].id.should.equal(knownRecords[3].id);
        response[1].id.should.equal(knownRecords[4].id);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    })
  });

  it('data read ' + servicename + ' table1 --skip 2 --top 2 --json (skip top 2 row of data to show following 2 records)', function (done) {
    suite.execute('mobile data read %s table1 --skip 2 --top 2 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(2);
        response[0].id.should.equal(knownRecords[2].id);
        response[1].id.should.equal(knownRecords[3].id);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('data read ' + servicename + ' table1 $top=2 --json', function (done) {
    suite.execute('node clis.js mobile data read %s table1 $top=2 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(2);
        response[0].id.should.equal(knownRecords[0].id);
        response[1].id.should.equal(knownRecords[1].id);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    })
  });

  it('table update ' + servicename + ' table1 --deleteColumn foo --addIndex bar,baz -q --json (delete column, add indexes)', function (done) {
    suite.execute('mobile table update %s table1  --deleteColumn foo --addIndex bar,baz -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Not all update operations completed successfully');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table1 --json (fewer columns, more indexes)', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.columns).should.be.ok;
        response.columns.length.should.equal(7);
        [{ name: 'id', indexed: true },
          { name: '__createdAt', indexed: true },
          { name: '__updatedAt', indexed: false },
          { name: '__version', indexed: false },
          { name: 'rowNumber', indexed: false },
          { name: 'bar', indexed: true },
          { name: 'baz', indexed: true }].forEach(function (column, columnIndex) {
            response.columns[columnIndex].name.should.equal(column.name);
            response.columns[columnIndex].indexed.should.equal(column.indexed);
          });
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table1 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('table update ' + servicename + ' table1 --deleteIndex bar --addColumn custom=string -q --json (delete index)', function (done) {
    suite.execute('mobile table update %s table1 --deleteIndex bar --addColumn custom=string -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Not all update operations completed successfully');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table1 --json (remove index on specific column)', function (done) {
    suite.execute('mobile table show %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.columns).should.be.ok;
        response.columns.length.should.equal(8);
        [{ name: 'id', indexed: true },
          { name: '__createdAt', indexed: true },
          { name: '__updatedAt', indexed: false },
          { name: '__version', indexed: false },
          { name: 'rowNumber', indexed: false },
          { name: 'bar', indexed: false },
          { name: 'baz', indexed: true },
          { name: 'custom', indexed: false }].forEach(function (column, columnIndex) {
            response.columns[columnIndex].name.should.equal(column.name);
            response.columns[columnIndex].indexed.should.equal(column.indexed);
          });
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table1 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('data delete ' + servicename + ' table1 <recordid> -q --json (delete a record)', function (done) {
    suite.execute('mobile data delete %s table1 %s -q --json', servicename, knownRecords[0].id, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);

      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('data read ' + servicename + ' table1 --json (show 4 rows of data)', function (done) {
    suite.execute('mobile data read %s table1 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        knownRecords = JSON.parse(result.text);
        Array.isArray(knownRecords).should.be.ok;
        knownRecords.length.should.equal(4);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('data truncate ' + servicename + ' table1 -q --json (delete all data from table)', function (done) {
    suite.execute('mobile data truncate %s table1 -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.didTruncate.should.equal(true);
        response.rowCount.should.equal(4);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  // Verify we can create old style tables
  it('table create ' + servicename + ' table3 --integerId --json', function (done) {
    suite.execute('mobile table create %s table3 --integerId --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table show ' + servicename + ' table3 --json (fewer columns, more indexes)', function (done) {
    suite.execute('mobile table show %s table3 --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.columns).should.be.ok;
        response.columns[0].name.should.equal('id');
        response.columns[0].indexed.should.equal(true);
        response.columns[0].type.should.equal('bigint (MSSQL)');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('Table table3 or mobile service ' + servicename + ' does not exist');
      }
      done();
    });
  });

  it('table delete ' + servicename + ' table3 -q --json (delete table3)', function (done) {
    suite.execute('mobile table delete %s table3 -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  //Custom Api
  it('api list ' + servicename + ' --json (no apis by default)', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.length.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('api create ' + servicename + ' testapi --json (create first api)', function (done) {
    suite.execute('mobile api create %s testapi --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('api create ' + servicename + ' testapitwo --permissions get=public,post=application,put=user,patch=admin,delete=admin --json', function (done) {
    suite.execute('mobile api create %s testapitwo --permissions get=public,post=application,put=user,patch=admin,delete=admin --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  // Confirm apis were created
  it('api list ' + servicename + ' --json', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);

        response.should.includeEql({
          name: 'testapi',
          get: 'application',
          put: 'application',
          post: 'application',
          patch: 'application',
          delete: 'application'
        });
        response.should.includeEql({
          name: 'testapitwo',
          get: 'public',
          put: 'user',
          post: 'application',
          patch: 'admin',
          delete: 'admin'
        });
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('api update ' + servicename + ' testapi --json', function (done) {
    suite.execute('mobile api update %s testapi --permissions get=public,post=application,put=user,patch=admin,delete=admin --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('api delete ' + servicename + ' testapitwo --json', function (done) {
    suite.execute('mobile api delete %s testapitwo --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  // Confirm permissions were updated and second api deleted
  it('api list ' + servicename + ' --json', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.should.includeEql({
          name: 'testapi',
          get: 'public',
          put: 'user',
          post: 'application',
          patch: 'admin',
          delete: 'admin'
        });
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('script upload ' + servicename + ' api/testapi.js -f ' + testArtifactDir + '/testapi.js --json (upload new script)', function (done) {
    suite.execute('mobile script upload %s api/testapi.js -f ' + testArtifactDir + '/testapi.js --json', servicename, function (result) {
      if (backend === 'node') {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('script download ' + servicename + ' api/testapi.js -o -f ' + testArtifactDir + '/testapicopy.js --json (download script)', function (done) {
    suite.execute('mobile script download %s api/testapi.js -o -f ' + testArtifactDir + '/testapicopy.js --json', servicename, testArtifactDir, function (result) {
      if (backend === 'node') {
        try { fs.unlinkSync(testArtifactDir + '/testapicopy.js'); } catch (e) { }

        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('api delete ' + servicename + ' testapi --json', function (done) {
    suite.execute('mobile api delete %s testapi --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  // Confirm no api's exist after delete
  it('api list ' + servicename + ' --json', function (done) {
    suite.execute('mobile api list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.length.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  //script commands
  it('script list ' + servicename + ' --json (no scripts by default)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script list %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.should.include({
          "table": []
        });
        done();
      });
    } else {
      done();
    }
  });

  it('script upload ' + servicename + ' table/table1.insert -f ' + testArtifactDir + '/table1.insert.js --json (upload one script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script upload %s table/table1.insert -f ' + testArtifactDir + '/table1.insert.js --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script upload ' + servicename + ' table/table1.read -f ' + testArtifactDir + '/table1.read.js --json (upload one script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script upload %s table/table1.read -f ' + testArtifactDir + '/table1.read.js --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script upload ' + servicename + ' table/table1.update -f ' + testArtifactDir + '/table1.update.js --json (upload one script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script upload %s table/table1.update -f ' + testArtifactDir + '/table1.update.js --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script upload ' + servicename + ' table/table1.delete -f ' + testArtifactDir + '/table1.delete.js --json (upload one script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script upload %s table/table1.delete -f ' + testArtifactDir + '/table1.delete.js --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script list ' + servicename + ' --json (insert&read&upload&delete scripts uploaded)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script list %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.table).should.be.ok;
        response.table.length.should.equal(4);
        response.table.forEach(function (item) {
          switch (item.operation) {
            case 'insert':
              {
                item.table.should.equal('table1');
                item.selflink.should.include(servicename + '/repository/service/table/table1.insert.js');
                item.should.have.property('sizeBytes');
              }
              break;
            case 'update':
              {
                item.table.should.equal('table1');
                item.selflink.should.include(servicename + '/repository/service/table/table1.update.js');
                item.should.have.property('sizeBytes');
              }
              break;
            case 'delete':
              {
                item.table.should.equal('table1');
                item.selflink.should.include(servicename + '/repository/service/table/table1.delete.js');
                item.should.have.property('sizeBytes');
              }
              break;
            case 'read':
              {
                item.table.should.equal('table1');
                item.selflink.should.include(servicename + '/repository/service/table/table1.read.js');
                item.should.have.property('sizeBytes');
              }
              break;
            default:
              {
                false.should.not.be.false;
              }
              break;
          }
        });
        done();
      });
    } else {
      done();
    }
  });

  it('script delete ' + servicename + '/mobile/table1.read.js --json (delete read script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script delete %s table/table1.read --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script upload ' + servicename + ' shared/apnsFeedback -f ' + testArtifactDir + '/feedback_upload.js --json (upload APNS script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script upload %s shared/apnsFeedback -f ' + testArtifactDir + '/feedback_upload.js --json', servicename, function (result) {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
        done();
      });
    } else {
      done();
    }
  });

  it('script download ' + servicename + ' shared/apnsFeedback -f -o ' + testArtifactDir + '/feedback_download.js --json (download APNS script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script download %s shared/apnsFeedback -o -f ' + testArtifactDir + '/feedback_download.js --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        result.errorText.should.equal('');
        result.text.should.equal('');
        var data_str = null;
        fs.readFileSync(testArtifactDir + '/feedback_download.js', 'utf8', function (err, data) {
          if (err) {
            return console.log(err);
          }
          data_str = data;
        });
        fs.readFileSync(testArtifactDir + '/feedback_upload.js', 'utf8', function (err, data) {
          if (err) {
            return console.log(err);
          }
          data.should.equal(data_str);
        });

        try { fs.unlinkSync(testArtifactDir + '/feedback_download.js'); } catch (e) { }
        done();
      });
    } else {
      done();
    }

  });

  it('script list ' + servicename + ' --json (with APNS script but without read script)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile script list %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.shared).should.be.ok;
        response.shared.length.should.equal(1);
        response.shared[0].name.toLowerCase().should.equal('apnsfeedback.js');

        Array.isArray(response.table).should.be.ok;
        response.table.length.should.equal(3);
        response.table.forEach(function (item) {
          item.operation.should.not.equal('read');
        });
        done();
      });
    } else {
      done();
    }
  });
  
  it('log ' + servicename + ' --json (no logs by default)', function (done) {
    suite.execute('mobile log %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.include({
        "results": []
      });
      done();
    });
  });

  it('(add 5 more rows of data to invoke scripts)', function (done) {
    if (backend === 'node') {
      insert5Rows(function (success, failure) {
        failure.should.equal(0);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --json (15 log entries added)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(10);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --type information --json (10 information log entries added)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --type information --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(10);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --type warning --json (no warning log entry)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --type warning --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(0);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --type error --json (5 error log entries added)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --type error --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(5);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --top 3 --json (list 3 top log entries)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --top 3 --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(3);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' -r $top=1 --json (list 1 top log entry)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s -r $top=1 --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(1);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' -r $top=1&$skip=1 --json (list 1 top log entry after skip 1)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s -r $top=1&$skip=1 --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(1);
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' --source /table/table1.insert.js --json (get logs from specific source)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s --source /table/table1.insert.js --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(10);
        response.results.forEach(function (item) {
          item.timeCreated.should.not.be.empty;
          item.type.should.not.be.empty;
          item.source.should.not.be.empty;
          item.message.should.not.be.empty;
        });
        response.continuationToken.should.not.be.empty;
        existingContinuationToken = response.continuationToken;
        done();
      });
    } else {
      done();
    }
  });

  it('log ' + servicename + ' -c existingContinuationToken --source /table/table1.insert.js --json (get logs by Continuation Token)', function (done) {
    if (backend === 'node') {
      suite.execute('mobile log %s -c %s --source /table/table1.insert.js --json', servicename, existingContinuationToken, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.results).should.be.ok;
        response.results.length.should.equal(5);
        response.results.forEach(function (item) {
          item.timeCreated.should.not.be.empty;
          item.type.should.not.be.empty;
          item.source.should.not.be.empty;
          item.message.should.not.be.empty;
        });
        done();
      });
    }
    else {
      done();
    }
  });

  it('table delete ' + servicename + ' table1 -q --json (delete existing table)', function (done) {
    suite.execute('mobile table delete %s table1 -q --json', servicename, function (result) {
      if (backend === 'node') {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table list ' + servicename + ' --json (no tables after table deletion)', function (done) {
    suite.execute('mobile table list %s --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response).should.be.ok;
        response.length.should.equal(0);
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('table delete ' + servicename + ' table1 -q --json (delete nonexisting table)', function (done) {
    suite.execute('mobile table delete %s table1 -q --json', servicename, function (result) {
      result.exitStatus.should.equal(1);
      if (backend === 'node') {
        result.errorText.should.include('The table \'table1\' was not found');
      } else {
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  // Key Command Tests
  // Test setting and randomly generating the application key
  it('key set ' + servicename + ' application LengthOfThirtyLettersAndNumber02 --json', function (done) {
    suite.execute('mobile key set %s application LengthOfThirtyLettersAndNumber02 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.applicationKey.should.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  it('key regenerate ' + servicename + ' application --json', function (done) {
    suite.execute('mobile key regenerate %s application --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.applicationKey.length.should.equal(32);
      response.applicationKey.should.not.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  // Repeat test for master key
  it('key set ' + servicename + ' master LengthOfThirtyLettersAndNumber02 --json', function (done) {
    suite.execute('mobile key set %s master LengthOfThirtyLettersAndNumber02 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.masterKey.should.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  it('key regenerate ' + servicename + ' master --json', function (done) {
    suite.execute('mobile key regenerate %s master --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.masterKey.length.should.equal(32);
      response.masterKey.should.not.equal('LengthOfThirtyLettersAndNumber02');
      done();
    });
  });

  // Scale Tests
  it('scale show ' + servicename + ' --json (show default scale settings)', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier1');
      response.numberOfInstances.should.equal(1);
      done();
    });
  });

  it('scale change ' + servicename + ' -t basic -i 2 --json (rescale to 2 basic instances)', function (done) {
    suite.execute('mobile scale change %s -t basic -i 2 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show ' + servicename + ' --json (show updated scale settings)', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier2');
      response.numberOfInstances.should.equal(2);
      done();
    });
  });

  it('scale change ' + servicename + ' -t standard --json -q (change scale to standard)', function (done) {
    suite.execute('mobile scale change %s -t standard --json -q',servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show ' + servicename + ' --json (show updated scale settings - premium)', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier3');
      response.numberOfInstances.should.equal(2);
      done();
    });
  });

  it('scale change ' + servicename + ' -t free -i 1 --json (rescale back to default)', function (done) {
    suite.execute('mobile scale change %s -t free -i 1 --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('');
      done();
    });
  });

  it('scale show ' + servicename + ' --json (show updated scale settings - free)', function (done) {
    suite.execute('mobile scale show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.tier.should.equal('tier1');
      response.numberOfInstances.should.equal(1);
      done();
    });
  });

  // Preview Features
  it('preview list ' + servicename + ' --json (no features enabled)', function (done) {
    suite.execute('mobile preview list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      if (backend === 'node') {
        response.should.include({
          "enabled": ["SourceControl"],
          "available": ["SourceControl", "Users"]
        });
      } else {
        response.should.include({
          "enabled": [],
          "available": []
        });
      };
      done();
    });
  });

  it('preview enable ' + servicename + ' sourcecontrol --json', function (done) {
    suite.execute('mobile preview enable %s sourcecontrol --json', servicename, function (result) {
      if (backend === 'node') {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.featureName.should.equal("SourceControl");
      } else {
        result.exitStatus.should.equal(1);
      }
      done();
    });
  });

  it('preview list ' + servicename + ' --json', function (done) {
    suite.execute('mobile preview list %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      if (backend === 'node') {
        response.should.include({
          "enabled": ["SourceControl"],
          "available": ["SourceControl", "Users"]
        });
      } else {
        response.should.include({
          "enabled": [],
          "available": []
        });
      }
      done();
    });
  });

  // Source control tests for shared scripts
  it('script upload ' + servicename + ' shared/test -f ' + testArtifactDir + '/table1.delete.js --json (upload one script)', function (done) {
    suite.execute('mobile script upload %s shared/test -f ' + testArtifactDir + '/table1.delete.js --json', servicename, function (result) {
      if (backend === 'node') {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('script upload ' + servicename + ' shared/test -f ' + testArtifactDir + '/table1.delete.js --json (change one script)', function (done) {
    suite.execute('mobile script upload ' + servicename + ' shared/test -f ' + testArtifactDir + '/table1.read.js --json', function (result) {
      if (backend === 'node') {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('script delete ' + servicename + ' shared/test --json (delete one script)', function (done) {
    suite.execute('mobile script delete %s shared/test --json', servicename, function (result) {
      if (backend === 'node') {
        result.errorText.should.equal('');
        result.exitStatus.should.equal(0);
        result.text.should.equal('');
      } else {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('This operation is not valid for mobile services using the DotNet runtime');
      }
      done();
    });
  });

  it('restart ' + servicename + ' --json (Restart specific service)', function (done) {
    suite.execute('mobile restart %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      result.text.should.equal('{}\n');

      done();
    });
  });

  // delete mobile services
  it('delete ' + existingServiceName + ' -d -n -q --json (delete service, but do not delete DB)', function (done) {
    suite.execute('mobile delete %s -d -n -q --json', existingServiceName, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('list --json (Only leave the service with new DB and server)', function (done) {
    suite.execute('mobile list --json', function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.some(function (service) {
        return service.name === existingServiceName;
      }).should.not.be.ok;
      done();
    });
  });

  it('show ' + servicename + ' --json (verify the existing DB and server exist or not )', function (done) {
    suite.execute('mobile show %s --json', servicename, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response.application.InternalResources.InternalResource).should.be.ok;
      response.application.InternalResources.InternalResource.length.should.equal(3);
      response.application.InternalResources.InternalResource[1].Name.should.equal(existingDBName);
      response.application.InternalResources.InternalResource[2].Name.should.equal(existingServerName);
      done();
    });
  });

  it('delete ' + servicename + ' -a -q -n --json (delete existing service)', function (done) {
    suite.execute('mobile delete %s -a -q -n --json', servicename, function (result) {
      result.text.should.equal('');
      result.exitStatus.should.equal(0);
      done();
    });
  });

  it('list --json (no services exist)', function (done) {
    suite.execute('mobile list --json', function (result) {
      result.exitStatus.should.equal(0);
      if (result.text !== '') {
        var response = JSON.parse(result.text);
        response.some(function (service) {
          return service.name === servicename;
        }).should.not.be.ok;
      }
      done();
    });
  });

  it('delete ' + servicename + ' -a -q --json (delete nonexisting service)', function (done) {
    suite.execute('mobile delete %s -a -q --json', servicename, function (result) {
      result.exitStatus.should.equal(1);
      result.errorText.should.include('The application name was not found');
      done();
    });
  });
}

describe('cli', function () {
  describe('mobile nock', nockStart);

  describe('mobile', function () {
    allTests('node');
  });

  describe('mobile-dotNet', function () {
    allTests('DotNet');
  });

  describe('mobile nock', nockEnd);
});
