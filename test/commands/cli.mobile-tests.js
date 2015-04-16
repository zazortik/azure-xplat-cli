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
var location = process.env.AZURE_SQL_TEST_LOCATION || 'West US';

var MobileTest = require('../util/mobileTest');

var suite;
var servicename;
var existingServiceName;

var newNode = {
  describe: 'newNode'
};
var existingNode = {
  describe: 'existingNode',
  args: {
    backend: 'node',
    push: 'nh'
  }
};
var newDotNet = {
  describe: 'newDotNet',
  args: {
    backend: 'DotNet'
  }
};
var existingDotNet = {
  describe: 'existingDotNet',
  args: {
    backend: 'DotNet',
    push: 'nh'
  }
};

var mobileTest = new MobileTest(__filename);

mobileTest.addMobileServiceObject(newNode);
mobileTest.addMobileServiceObject(existingNode);
mobileTest.addMobileServiceObject(newDotNet);
mobileTest.addMobileServiceObject(existingDotNet);

mobileTest.runTests(function () {
  it('locations verifies provided locations', function (done) {
    suite = mobileTest.suite;
    suite.execute('mobile locations --json', function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      Array.isArray(response).should.be.ok;
      response.should.includeEql({
        'region': location
      });
      done();
    });
  });

  mobileServiceTests(newNode, existingNode);
  mobileServiceTests(newDotNet, existingDotNet);
});

function mobileServiceTests(newService, existingService) {
  describe(newService.args.backend, function () {
    mobileTest.createMobileServiceTest(newService, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.have.property('Name', newService.servicename + 'mobileservice');
      response.should.have.property('Label', newService.servicename);
      response.should.have.property('State', 'Healthy');
      existingService.args.sqlDb = response.InternalResources.InternalResource[1].Name;
      existingService.args.sqlServer = response.InternalResources.InternalResource[2].Name;
    });

    mobileTest.createMobileServiceTest(existingService, function (result) {
      result.exitStatus.should.equal(0);
      var response = JSON.parse(result.text);
      response.should.have.property('Name', existingService.servicename + 'mobileservice');
      response.should.have.property('Label', existingService.servicename);
      response.should.have.property('State', 'Healthy');
      response.InternalResources.InternalResource.Name.should.equal(existingService.servicename);
      Array.isArray(response.ExternalResources.ExternalResource).should.be.ok;
      response.ExternalResources.ExternalResource.length.should.equal(2);
      response.ExternalResources.ExternalResource[0].Name.should.equal(existingService.args.sqlDb);
      response.ExternalResources.ExternalResource[1].Name.should.equal(existingService.args.sqlServer);
    });

    it('list contains healthy service', function (done) {
      servicename = newService.servicename;
      existingServiceName = existingService.servicename;

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

    it('show returns healthy service', function (done) {
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

    it('redeploy', function (done) {
      suite.execute('mobile redeploy %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        result.text.should.equal('{}\n');

        done();
      });
    });

    it('restart', function (done) {
      suite.execute('mobile restart %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        result.text.should.equal('{}\n');

        done();
      });
    });

    // delete mobile services
    it('delete existing service but leave db', function (done) {
      suite.execute('mobile delete %s -d -n -q --json', existingServiceName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('list shows new db service', function (done) {
      suite.execute('mobile list --json', function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        response.some(function (service) {
          return service.name === existingServiceName;
        }).should.not.be.ok;
        done();
      });
    });

    it('show verifies db and server still exist', function (done) {
      suite.execute('mobile show %s --json', servicename, function (result) {
        result.exitStatus.should.equal(0);
        var response = JSON.parse(result.text);
        Array.isArray(response.application.InternalResources.InternalResource).should.be.ok;
        response.application.InternalResources.InternalResource.length.should.equal(3);
        response.application.InternalResources.InternalResource[1].Name.should.equal(existingService.args.sqlDb);
        response.application.InternalResources.InternalResource[2].Name.should.equal(existingService.args.sqlServer);
        done();
      });
    });

    mobileTest.deleteMobileServiceTest(newService);

    it('list verifies no services exist', function (done) {
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

    it('delete nonexisting service', function (done) {
      suite.execute('mobile delete %s -a -q --json', servicename, function (result) {
        result.exitStatus.should.equal(1);
        result.errorText.should.include('The application name was not found');
        done();
      });
    });
  });
};
