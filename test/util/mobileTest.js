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
var azureCommon = require('azure-common');
var PipelineChannel = require('../../lib/commands/asm/mobile/pipelineChannel');
var CLITest = require('../framework/cli-test');
var utils = require('../../lib/util/utils');

exports = module.exports = MobileTest;

/**
 * @class
 * Initializes a new instance of the MobileTest class.
 * @constructor
 *
 * @param {string} testfile - The filename of the test file
 * 
 * Example use of this class:
 *
 * //creates mobile test class
 * var mobileTest = new MobileTest(__filename);
 *
 * //adds two test mobile services, one default and one partially defined
 * mobileTest.addMobileServiceObject();
 * mobileTest.addMobileServiceObject({
 * 		describe: 'testService',
 * 		args: {
 * 			backend: 'DotNet'
 * 		}
 * });
 *
 * mobileTest.runTestsAgainstEachService(testFunction);
 *
 * function testFunction(service) {
 * 		it('dummy', function (done) {
 * 			console.log(service.servicename);
 * 		});
 * }
 */
function MobileTest(testfile) {
	this.suite;
	this.services = [];

	this.testArtifactDir = path.join(__dirname, '../commands/mobile');

	this.mobileServicePrefix = 'clitest';
	this.mobileServiceNames = [];
	this.testfile = testfile;
	this.requiredEnvironments = [];

	this.servicedomain = process.env.SERVICE_DOMAIN || '.azure-mobile.net';
};

/**
 * Adds a mobile service object to be used for testing.
 * Use this before any tests are run.
 * @param service - the mobile service object (optional, if empty a default node service is used)
 * Sample mobile service object:
 * {
 * 		servicename - the name of the mobile service (optional, assigned automatically)
 * 		describe - a description of mobile service, ie. 'node' (optional, assigned as args.backend by default)
 * 		sqlAdminUsername - (tjanczuk by default)
 * 		sqlAdminPassword - (FooBar#12 by default)
 * 		args {
 * 			backend - (node by default)
 * 			push - (legacy by default)
 * 			location - (West US by default)
 * 			sqlLocation - (optional)
 * 			sqlServer - use existing server (optional)
 * 			sqlDb - use existing db (optional)
 * 		}
 * }
 */
MobileTest.prototype.addMobileServiceObject = function (service) {
	if (service === undefined) {
		service = { };
	}
	this.populateServiceObject(service);
	this.services.push(service);
}

/**
 * Creates a mobile service using a mobile service object.
 * Use this inside test functions to create test mobile services.
 * @param  service - the mobile service object with which to create the mobile service
 * @param  resultEvaluator - an optional result evaluator function
 */
MobileTest.prototype.createMobileServiceTest = function (service, resultEvaluator) {
	var self = this;

	if (resultEvaluator === undefined) {
		resultEvaluator = function (result) {
			result.exitStatus.should.equal(0);
	  	var response = JSON.parse(result.text);
			response.should.have.property('Name', service.servicename + 'mobileservice');
	    response.should.have.property('Label', service.servicename);
	    response.should.have.property('State', 'Healthy');
		};
	}
	it('create mobile service ' + service.describe, function (done) {
		var args = self.getMobileCreateArgs(service, function (result) {
			resultEvaluator(result);
	    done();
		});
		self.suite.execute.apply(self.suite, args);
	});
};

/**
 * Deletes a mobile service.
 * Use this inside test function to delete test mobile services
 * @param  service - the mobile service to delete
 * @param  resultEvaluator - an optional result evaluator function
 */
MobileTest.prototype.deleteMobileServiceTest = function (service, resultEvaluator) {
	var self = this;

	if (resultEvaluator === undefined) {
		resultEvaluator = function (result) {
	    result.text.should.equal('');
	    result.exitStatus.should.equal(0);
		};
	}
	it('delete mobile service ' + service.describe, function (done) {
		self.suite.execute('mobile delete %s -a -q -n --json', service.servicename, function (result) {
	    resultEvaluator(result);
	    done();
  	});
	})
}

/**
 * A specialized version of the runTests function which runs the provided tests against each test mobile service.
 * @param  tests - a function containing all 'it's for the test file.  It will be passed a service object
 */
MobileTest.prototype.createServicesAndRunForEach = function (tests) {
	var self = this;
	this.runTests(function () {
		self.services.forEach(function (service) {
			describe(service.describe, function () {
				self.createMobileServiceTest(service);
				tests(service);
				self.deleteMobileServiceTest(service);
			});
		});
	})
}

/**
 * Initializes required mocha hooks and service names, then runs the provided tests function.
 * @param  tests - a function containing all 'it's for the test file
 */
MobileTest.prototype.runTests = function (tests) {
	var self = this;
	describe('cli', function () {
    before(function (done) {
      self.suite = new CLITest(this, path.basename(self.testfile, '.js'), self.requiredEnvironments);
      self.suite.setupSuite(function () {
      	if (self.suite.isPlayback()) {
      		utils.POLL_REQUEST_INTERVAL = 0;
      	}
      	self.services.forEach(function (service) {
      		if (service.servicename === undefined) {
      			service.servicename = self.suite.generateId(self.mobileServicePrefix + service.args.backend, self.mobileServiceNames);
      		}
      	});
      	done();
      });
    });

    after(function (done) {
      self.suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      self.suite.setupTest(done);
    });

    afterEach(function (done) {
      self.suite.teardownTest(done);
    });

    tests();
  });
}

MobileTest.prototype.insert5Rows = function(servicename, table, callback) {
  var success = 0;
  var failure = 0;

  function getWebResource(uri) {
    var httpRequest = new azureCommon.WebResource();

    httpRequest.url = uri;
    return httpRequest;
  }

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
    var resource = getWebResource('http://' + servicename + this.servicedomain);
    var client = {};
    client.pipeline = azureCommon.requestPipeline.create(
        utils.createPostBodyFilter(),
        utils.createFollowRedirectFilter(),
        utils.createFollowRedirectFilter());
    var channel = new PipelineChannel(client, resource)
        .path('tables')
        .path(table)
        .header('Content-Type', 'application/json');
    channel.post(JSON.stringify({ rowNumber: i, foo: 'foo', bar: 7, baz: true }), tryFinish);
  }
}

MobileTest.prototype.populateServiceObject = function (service) {
	if (service.args === undefined) {
		service.args = { };
	}
	if (service.args.backend === undefined) {
		service.args.backend = 'node';
	}
	if (service.args.push === undefined) {
		service.args.push = 'legacy';
	}
	if (service.args.location === undefined) {
		service.args.location = process.env.AZURE_SQL_TEST_LOCATION || 'West US';
	}
	if (service.args.json === undefined) {
		service.args.json = '';
	}
	if (service.sqlAdminUsername === undefined) {
		service.sqlAdminUsername = 'tjanczuk';
	}
	if (service.sqlAdminPassword === undefined) {
		service.sqlAdminPassword = 'FooBar#12';
	}
	if (service.describe === undefined) {
		service.describe = service.args.backend;
	}
};

MobileTest.prototype.createServiceString = function (service) {
	var createString = 'mobile create %s %s %s'; + service.servicename + ' ' + service.sqlAdminUsername + ' ' + service.sqlAdminPassword;
	for (var arg in service.args) {
		createString += ' --' + arg + ' %s';
	}
	return createString;
};

MobileTest.prototype.getMobileCreateArgs = function (service, func) {
	var args = [];
	args.push(this.createServiceString(service));
	args.push(service.servicename);
	args.push(service.sqlAdminUsername);
	args.push(service.sqlAdminPassword);
	for (var arg in service.args) {
		args.push(service.args[arg]);
	}
	args.push(func);
	return args;
};

MobileTest.prototype.setTimeout = function (func, time) {
	setTimeout(func, this.suite.isPlayback() ? 0 : time);
};