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
var util = require('util');
var _ = require('underscore');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');

var suite;
var vmPrefix = 'ClitestVm';
var testPrefix = 'cli.vm.endpoint-tests';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('vm', function() {
    var vmName,
      location,
      timeout,
      username = 'azureuser',
      password = 'PassW0rd$',
      vmEndpointName = 'TestEndpoint',
      retry = 5;

    before(function(done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
      vmName = suite.isMocked ? 'XplattestVm' : suite.generateId(vmPrefix, null);
    });

    after(function(done) {
      if (suite.isMocked)
        suite.teardownSuite(done);
      else {
        deleteUsedVM(function() {
          suite.teardownSuite(done);
        });
      }
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        timeout = suite.isMocked ? 0 : 5000;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //create single endpoint
    describe('Endpoint:', function() {
      it('Create and List', function(done) {
        createVM(function() {
          var lbSetName = 'Lb_Set_Test';
          var probPathName = '/prob/listner1';
          var cmd = util.format('vm endpoint create -n %s -o %s %s %s %s -u -b %s -t %s -r tcp -p %s --json',
            vmEndpointName, 'tcp', vmName, 8080, 80, lbSetName, 4444, probPathName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm endpoint list %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var epList = JSON.parse(result.text);
              var epExists = epList.some(function(ep) {
                return ep.name.toLowerCase() === vmEndpointName.toLowerCase();
              });
              epExists.should.be.ok;
              done();
            });
          });
        });
      });
    });

    // create multiple endpoints
    describe('Endpoint:', function() {
      it('Create multiple', function(done) {
        var endPoints = {
          OnlyPP: {
            PublicPort: 3333
          },
          PPAndLP: {
            PublicPort: 4444,
            LocalPort: 4454
          },
          PPLPAndLBSet: {
            PublicPort: 5555,
            LocalPort: 5565,
            Protocol: 'tcp',
            EnableDirectServerReturn: false,
            LoadBalancerSetName: 'LbSet1'
          },
          PPLPLBSetAndProb: {
            PublicPort: 6666,
            LocalPort: 6676,
            Protocol: 'tcp',
            EnableDirectServerReturn: false,
            LoadBalancerSetName: 'LbSet2',
            ProbProtocol: 'http',
            ProbPort: 7777,
            ProbPath: '/prob/listner1'
          }
        };

        var cmd = util.format(
          'node cli.js vm endpoint create-multiple %s %s,%s:%s,%s:%s:%s:%s:%s,%s:%s:%s:%s:%s:%s:%s:%s --json',
          vmName,
          // EndPoint1
          endPoints.OnlyPP.PublicPort,
          // EndPoint2
          endPoints.PPAndLP.PublicPort, endPoints.PPAndLP.LocalPort,
          // EndPoint3
          endPoints.PPLPAndLBSet.PublicPort, endPoints.PPLPAndLBSet.LocalPort, endPoints.PPLPAndLBSet.Protocol, endPoints.PPLPAndLBSet.EnableDirectServerReturn, endPoints.PPLPAndLBSet.LoadBalancerSetName,
          // EndPoint4
          endPoints.PPLPLBSetAndProb.PublicPort, endPoints.PPLPLBSetAndProb.LocalPort, endPoints.PPLPLBSetAndProb.Protocol, endPoints.PPLPLBSetAndProb.EnableDirectServerReturn, endPoints.PPLPLBSetAndProb.LoadBalancerSetName,
          endPoints.PPLPLBSetAndProb.ProbProtocol, endPoints.PPLPLBSetAndProb.ProbPort, endPoints.PPLPLBSetAndProb.ProbPath).split(' ');

        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);

          cmd = util.format('vm endpoint list %s --json', vmName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var allEndPointList = JSON.parse(result.text);

            // Verify endpoint creation with only lb port
            var endPointListOnlyLb = allEndPointList.filter(
              function(element, index, array) {

                return (element.localPort === endPoints.OnlyPP.PublicPort);
              });

            endPointListOnlyLb.length.should.be.equal(1);
            (endPointListOnlyLb[0].Port === endPointListOnlyLb[0].Port).should.be.true;

            // Verify endpoint creation with lb port and vm port
            var endPointListLbAndVm = allEndPointList.filter(
              function(element, index, array) {
                return (element.localPort === endPoints.PPAndLP.LocalPort);
              });

            endPointListLbAndVm.length.should.be.equal(1);
            (endPointListLbAndVm[0].port === endPoints.PPAndLP.PublicPort).should.be.true;

            // Verify endpoint creation with lbSetName and prob option
            cmd = util.format('vm show %s --json', vmName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var vmInfo = JSON.parse(result.text);

              (vmInfo.Network.Endpoints.length >= 4).should.be.true;

              var endPointListLbVmAndSet = vmInfo.Network.Endpoints.filter(
                function(element, index, array) {
                  return (element.localPort === endPoints.PPLPAndLBSet.LocalPort);
                });

              endPointListLbVmAndSet.length.should.be.equal(1);

              endPointListLbVmAndSet[0].loadBalancedEndpointSetName.should.be.equal('LbSet1');

              var endPointListLbVmSetAndProb = vmInfo.Network.Endpoints.filter(
                function(element, index, array) {
                  return (element.localPort === endPoints.PPLPLBSetAndProb.LocalPort);
                });
              endPointListLbVmSetAndProb.length.should.be.equal(1);
              endPointListLbVmSetAndProb[0].loadBalancedEndpointSetName.should.be.equal(endPoints.PPLPLBSetAndProb.LoadBalancerSetName);
              endPointListLbVmSetAndProb[0].loadBalancerProbe.protocol.should.be.equal(endPoints.PPLPLBSetAndProb.ProbProtocol);
              endPointListLbVmSetAndProb[0].loadBalancerProbe.port.should.be.equal(endPoints.PPLPLBSetAndProb.ProbPort);
              done();
            });
          });
        });
      });
    });

    describe('Endpoint:', function() {
      it('Update', function(done) {
        var newEPName = 'updatedEP';
        vmEndpointName = 'TestEndpoint';
        var cmd = util.format('vm endpoint list %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var epList = JSON.parse(result.text);
          var ep = _.first(epList);
          vmEndpointName = ep.name;
          cmd = util.format('vm endpoint update %s -t %s -l %s -n %s -o tcp %s --json',
            vmName, 8081, 8082, newEPName, vmEndpointName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            cmd = util.format('vm endpoint show %s -e %s --json', vmName, newEPName).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              ep = JSON.parse(result.text);
              ep.Network.Endpoints[0].Name.should.equal(newEPName);
              setTimeout(done, timeout);
            });
          });
        });
      });

      it('Delete', function(done) {
        var cmd = util.format('vm endpoint list %s --json', vmName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var ep = _.first(JSON.parse(result.text));
          vmEndpointName = ep.name;
          cmd = util.format('vm endpoint delete %s %s --json', vmName, vmEndpointName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            setTimeout(done, timeout);
          });
        });
      });
    });

    function createVM(callback) {
      getImageName('Linux', function(imagename) {
        var cmd = util.format('vm create %s %s %s %s --json', vmName, imagename, username, password).split(' ');
        cmd.push('-l');
        cmd.push(location);
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          setTimeout(callback, timeout);
        });
      });
    }
    // Get name of an image of the given category

    function getImageName(category, callBack) {
      var cmd = util.format('vm image list --json').split(' ');
      testUtils.executeCommand(suite, retry, cmd, function(result) {
        result.exitStatus.should.equal(0);
        var imageList = JSON.parse(result.text);
        imageList.some(function(image) {
          if ((image.operatingSystemType || image.oSDiskConfiguration.operatingSystem).toLowerCase() === category.toLowerCase() && image.category.toLowerCase() === 'public') {
            vmImgName = image.name;
            return true;
          }
        });
        callBack(vmImgName);
      });
    }

    function deleteUsedVM(callback) {
      var cmd = util.format('vm delete %s -b -q --json', vmName).split(' ');
      setTimeout(function() {
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          return callback();
        });
      }, timeout);
    }
  });
});
