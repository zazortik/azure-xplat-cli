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

var _ = require('underscore');
var should = require('should');

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.service-tests';

var createdServicesPrefix = 'cli-cs';
var createdServices = [];

describe('cli', function () {
  describe('service', function () {
    var location = process.env.AZURE_CLOUD_SERVICE_TEST_LOCATION || 'West US';

    before(function (done) {
      suite = new CLITest(testPrefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('server cmdlets', function () {
      var oldServiceNames;

      beforeEach(function (done) {
        suite.execute('service list --json', function (result) {
          oldServiceNames = JSON.parse(result.text).map(function (service) {
            return service.ServiceName;
          });

          done();
        });
      });

      afterEach(function (done) {
        function deleteUsedServices (serviceNames) {
          if (serviceNames.length > 0) {
            var serviceName = serviceNames.pop();

            suite.execute('service delete %s --quiet --json', serviceName, function () {
              deleteUsedServices(serviceNames);
            });
          } else {
            done();
          }
        }

        suite.execute('node cli.js service list --json', function (result) {
          var services = JSON.parse(result.text);

          var usedServices = [ ];
          _.each(services, function (service) {
            if (!_.contains(oldServiceNames, service.ServiceName)) {
              usedServices.push(service.ServiceName);
            }
          });

          deleteUsedServices(usedServices);
        });
      });

      describe('Create Cloud Service', function () {
        it('should create a server', function (done) {
          var cloudServiceName = suite.generateId(createdServicesPrefix, createdServices);

          suite.execute('node cli.js service create %s --location %s --json', cloudServiceName, location, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var serverName = JSON.parse(result.text).Name;
            serverName.should.not.be.null;
            serverName.should.match(/[0-9a-zA-Z]*/);

            done();
          });
        });
      });

      describe('List and show Cloud Service', function () {
        var cloudServiceName;

        beforeEach(function (done) {
          cloudServiceName = suite.generateId(createdServicesPrefix, createdServices);
          suite.execute('service create %s --location %s --json', cloudServiceName, location, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var serviceName = JSON.parse(result.text).Name;
            serviceName.should.equal(cloudServiceName);

            done();
          });
        });

        it('should show the service', function (done) {
          suite.execute('service show %s --json', cloudServiceName, function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var service = JSON.parse(result.text);
            service.Location.should.equal(location);
            service.ServiceName.should.equal(cloudServiceName);
            service.Label.should.not.be.null;
            service.Status.should.equal('Created');
            service.DateCreated.should.not.be.null;
            service.DateLastModified.should.not.be.null;

            done();
          });
        });

        it('should list the service', function (done) {
          suite.execute('service list --json', function (result) {
            result.text.should.not.be.null;
            result.exitStatus.should.equal(0);

            var services = JSON.parse(result.text);

            should.exist(services.filter(function (service) {
              return service.Name === cloudServiceName;
            }));

            done();
          });
        });
      });
    });
  });
});