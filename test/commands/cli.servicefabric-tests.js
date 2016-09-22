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

'use strict';

var should = require('should');
var CLITest = require('../framework/arm-cli-test');
var testUtil = require('../util/util');
var utils = require('../../lib/util/utils');


var testprefix = 'arm-cli-servicefabric-tests';
var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  { name: 'AZURE_STORAGE_ACCESS_KEY', defaultValue: 'key'}
];
var httpEndpoint = 'http://10.91.140.142:10550';
var applicationPackagePath = '/media/share/EchoServerApplication3';
var applicationPackagePath2 = '/media/share/EchoServerApplication32';
var applicationPackageName = 'EchoServerApplication3';
var applicationPackageName2 = 'EchoServerApplication32';
var applicationTypeName = 'EchoServerApp';
var applicationTypeVersion = '3.0';
var applicationTypeVersion2 = '4.0';
var serviceTypeName = 'EchoServer.EchoServiceType';
var applicationName = 'fabric:/app';
var serviceName = 'fabric:/app/svc';

describe('Service Fabric', function () {
  describe('Tests', function () {
    var suite;
    var node1;
    var partitionId;
    var replicaId;

    before(function (done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
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
    
    it('should connect cluster', function (done) {
      suite.execute('servicefabric cluster connect --connection-endpoint ' + httpEndpoint + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show cluster', function (done) {
      suite.execute('servicefabric cluster show --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({
          connectionEndpoint: httpEndpoint + "/"
        });
        done();
      });
    });

    it('should show cluster manifest', function (done) {
      suite.execute('servicefabric cluster manifest show --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show cluster health', function (done) {
      suite.execute('servicefabric cluster health show --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send cluster health', function (done) {
      suite.execute('servicefabric cluster health send --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show cluster load', function (done) {
      suite.execute('servicefabric cluster load show --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('loadMetricInformation');
        done();
      });
    });

    it('should show node', function (done) {
      suite.execute('servicefabric node show --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        should.notEqual(res.items.length, 0);
        res.items[0].should.have.property('name');
        node1 = res.items[0].name;
        done();
      });
    });

    it('should disable node', function (done) {
      suite.execute('servicefabric node disable ' + node1 + ' --deactivation-intent Restart --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    // it('should delete node state', function (done) {
    //   suite.execute('servicefabric node state delete ' + node1 + ' --json', function (result) {
    //     result.exitStatus.should.equal(0);
    //     done();
    //   });
    // });

    it('should enable node', function (done) {
      suite.execute('servicefabric node enable ' + node1 + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show node health', function (done) {
      suite.execute('servicefabric node health show ' + node1 + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send node health', function (done) {
      suite.execute('servicefabric node health send --node-name ' + node1 + ' --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should copy application package', function (done) {
      suite.execute('servicefabric application package copy ' + applicationPackagePath + ' fabric:ImageStore --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should copy application package', function (done) {
      suite.execute('servicefabric application package copy ' + applicationPackagePath2 + ' fabric:ImageStore --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should register application type', function (done) {
      suite.execute('servicefabric application type register ' + applicationPackageName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should register application type', function (done) {
      suite.execute('servicefabric application type register ' + applicationPackageName2 + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show application type', function (done) {
      suite.execute('servicefabric application type show ' + applicationTypeName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep([{name: applicationTypeName, version: applicationTypeVersion}]);
        done();
      });
    });

    it('should show application manifest', function (done) {
      suite.execute('servicefabric application manifest show --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show service manifest', function (done) {
      suite.execute('servicefabric application manifest show --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should create application', function (done) {
      suite.execute('servicefabric application create --application-name ' + applicationName + ' --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should show application', function (done) {
      suite.execute('servicefabric application show ' + applicationName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({items: [{name: applicationName, typeName: applicationTypeName, typeVersion: applicationTypeVersion}]});
        done();
      });
    });

    it('should show application health', function (done) {
      suite.execute('servicefabric application health show --application-name ' + applicationName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send application health', function (done) {
      suite.execute('servicefabric application health send --application-name ' + applicationName + ' --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should create service', function (done) {
      suite.execute('servicefabric service create --application-name ' + applicationName + ' --service-name ' + serviceName + ' --service-type-name ' + serviceTypeName + ' --service-kind Stateless --instance-count 1 --partition-scheme Singleton --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should show service', function (done) {
      suite.execute('servicefabric service show --application-name ' + applicationName + ' --service-name ' + serviceName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({name: serviceName});
        done();
      });
    });

    it('should update service', function (done) {
      suite.execute('servicefabric service update --service-name ' + serviceName + ' --service-kind Stateless --instance-count 2 --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show service description', function (done) {
      suite.execute('servicefabric service description show --service-name ' + serviceName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.containDeep({applicationName: applicationName, serviceName: serviceName, serviceTypeName: serviceTypeName});
        done();
      });
    });

    // it('should resolve service', function (done) {
    //   suite.execute('servicefabric service resolve --service-name ' + serviceName + ' --json', function (result) {
    //     result.exitStatus.should.equal(0);
    //     done();
    //   });
    // });
    
    it('should show service health', function (done) {
      suite.execute('servicefabric service health show --service-name ' + serviceName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('name');
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send service health', function (done) {
      suite.execute('servicefabric service health send --service-name ' + serviceName + ' --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show partition', function (done) {
      suite.execute('servicefabric partition show --service-name ' + serviceName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        should.notEqual(res.items.length, 0);
        res.items[0].should.have.property('serviceKind');
        res.items[0].should.have.property('partitionInformation');
        partitionId = res.items[0].partitionInformation.id;
        done();
      });
    });

    it('should show partition health', function (done) {
      suite.execute('servicefabric partition health show --partition-id ' + partitionId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('partitionId');
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send partition health', function (done) {
      suite.execute('servicefabric partition health send --partition-id ' + partitionId + ' --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show partition load', function (done) {
      suite.execute('servicefabric partition load show --partition-id ' + partitionId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('partitionId');
        res.should.have.property('primaryLoadMetricReports');
        done();
      });
    });

    it('should reset partition load', function (done) {
      suite.execute('servicefabric partition load reset --partition-id ' + partitionId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show replica', function (done) {
      suite.execute('servicefabric replica show --partition-id ' + partitionId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        should.notEqual(res.items.length, 0);
        res.items[0].should.have.property('serviceKind');
        if (res.items[0].serviceKind === 'Stateless') {
          res.items[0].should.have.property('instanceId');
          replicaId = res.items[0].instanceId;
        }
        else if (res.items[0].serviceKind === 'Stateful') {
          res.items[0].should.have.property('replicaId');
          replicaId = res.items[0].replicaId;
        }
        else {
          should.fail();
        }
        done();
      });
    });

    it('should show replica health', function (done) {
      suite.execute('servicefabric replica health show --partition-id ' + partitionId + ' --replica-id ' + replicaId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('serviceKind');
        res.should.have.property('partitionId');
        res.should.have.property('aggregatedHealthState');
        done();
      });
    });

    it('should send replica health', function (done) {
      suite.execute('servicefabric replica health send --partition-id ' + partitionId + ' --replica-id ' + replicaId + ' --source-id null --property null --health-state Ok --description null --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show replica load', function (done) {
      suite.execute('servicefabric replica load show --partition-id ' + partitionId + ' --replica-id ' + replicaId + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('partitionId');
        res.should.have.property('replicaOrInstanceId');
        res.should.have.property('reportedLoad');
        done();
      });
    });

    it('should start application upgrade', function (done) {
      suite.execute('servicefabric application upgrade start --application-name ' + applicationName + ' --target-application-type-version ' + applicationTypeVersion2 + ' --rolling-upgrade-mode UnmonitoredAuto --force-restart true --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should show application upgrade', function (done) {
      suite.execute('servicefabric application upgrade show --application-name ' + applicationName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        var res = JSON.parse(result.text);
        res.should.have.property('name');
        res.should.have.property('typeName');
        res.should.have.property('targetApplicationTypeVersion');
        done();
      });
    });

    it('should update application upgrade', function (done) {
      suite.execute('servicefabric application upgrade update --application-name ' + applicationName + ' --force-restart false --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should delete service', function (done) {
      suite.execute('servicefabric service delete --service-name ' + serviceName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should delete application', function (done) {
      suite.execute('servicefabric application delete --application-name ' + applicationName + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should unregister application type', function (done) {
      suite.execute('servicefabric application type unregister --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });

    it('should unregister application type', function (done) {
      suite.execute('servicefabric application type unregister --application-type-name ' + applicationTypeName + ' --application-type-version ' + applicationTypeVersion2 + ' --json', function (result) {
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});
