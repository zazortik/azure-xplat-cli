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
var sinon = require('sinon');
var util = require('util');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var isForceMocked = !process.env.NOCK_OFF;

var utils = require('../../lib/util/utils');
var CLITest = require('../framework/cli-test');

var vmPrefix = 'clitestvm';

var suite;
var testPrefix = 'cli.vm.endpoint.create_multi_list-tests';

var currentRandom = 0;

describe('cli', function() {
  describe('vm', function() {
    var vmName;

    before(function(done) {
      suite = new CLITest(testPrefix, [], isForceMocked);

      if (suite.isMocked) {
        sinon.stub(crypto, 'randomBytes', function() {
          return (++currentRandom).toString();
        });

        utils.POLL_REQUEST_INTERVAL = 0;
      }
      suite.setupSuite(done);
    });

    after(function(done) {
      if (suite.isMocked) {
        crypto.randomBytes.restore();
      }

      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        vmName = process.env.TEST_VM_NAME;
        done();
      });
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    //create single endpoint
    describe('Endpoint:', function() {
      it('Create and List', function(done) {
        var vmEndpointName = 'TestEndpoint';
        var lbSetName = 'Lb_Set_Test';
        var probPathName = '/prob/listner1';
        suite.execute('vm endpoint create -n %s -o %s %s %s %s -u -b %s -t %s -r tcp -p %s --json',
          vmEndpointName, 'tcp', vmName, 8080, 80, lbSetName, 4444, probPathName, function(result) {
            result.exitStatus.should.equal(0);
            suite.execute('vm endpoint list %s --json', vmName, function(result) {
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

        suite.execute(cmd, function(result) {
          result.exitStatus.should.equal(0);

          suite.execute('vm endpoint list %s --json', vmName, function(result) {
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
            suite.execute('vm show %s --json', vmName, function(result) {
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
  });
});