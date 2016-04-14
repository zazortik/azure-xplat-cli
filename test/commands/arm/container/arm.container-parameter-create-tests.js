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
var path = require('path');
var fs = require('fs');
var util = require('util');
var profile = require('../../../../lib/util/profile');
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-cntn-parameter-create-tests';
var groupPrefix = 'xplatTstCntnGCreate';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'australiasoutheast'
}, {
  name: 'SSHCERT',
  defaultValue: 'test/containerCert.pem'
}];

var groupName,
  location,
  containerPrefix = 'xplatContainer',
  containerPrefix2 = 'xplatContainer2',
  username = 'azureuser',
  password = 'Brillio@2015',
  keydata = 'test',
  paramFileName = 'test/data/containerParam.json',
  paramFileName2 = 'test/data/containerParam2.json',
  sshcert;

var makeCommandStr = function(component, verb, file, others) {
  var cmdFormat = 'container config %s %s --parameter-file %s %s --json';
  return util.format(cmdFormat, component, verb, file, others ? others : '');
};

describe('arm', function() {
  describe('compute', function() {
    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        sshcert = process.env.SSHCERT;
        keydata = fs.readFileSync(sshcert).toString();
        keydata = keydata.replace(' ', '').replace('\r', '').replace('\n', '');
        groupName = suite.generateId(groupPrefix, null);
        containerPrefix = suite.generateId(containerPrefix, null);
        containerPrefix2 = suite.generateId(containerPrefix2, null);
        done();
      });
    });

    after(function(done) {
      this.timeout(vmTest.timeoutLarge * 10);
      vmTest.deleteUsedGroup(groupName, suite, function(result) {
        suite.teardownSuite(done);
      });
    });

    beforeEach(function(done) {
      suite.setupTest(done);
    });

    afterEach(function(done) {
      suite.teardownTest(done);
    });

    describe('cs', function() {

      it('container config set and create DCOS should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var subscription = profile.current.getSubscription();
        vmTest.createGroup(groupName, location, suite, function(result) {
          var cmd = util.format('container config generate --parameter-file %s --json', paramFileName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var cmd = makeCommandStr('container-service', 'set', paramFileName, util.format('--name %s --location %s', containerPrefix, location)).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var cmd = makeCommandStr('container-service', 'delete', paramFileName, util.format('--diagnostics-profile --windows-profile')).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var cmd = makeCommandStr('master-profile', 'set', paramFileName, util.format('--dns-prefix %s', containerPrefix + 'master')).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  var cmd = makeCommandStr('master-profile', 'set', paramFileName, util.format('test --count 1 --parse')).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var cmd = makeCommandStr('agent-pool-profiles', 'set', paramFileName, util.format('--index 0 --name %s --vm-size Standard_A1 --dns-prefix %s', containerPrefix + 'a1', containerPrefix + 'a2')).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                      result.exitStatus.should.equal(0);
                      var cmd = makeCommandStr('orchestrator-profile', 'set', paramFileName, util.format('--orchestrator-type %s', 'DCOS', location)).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        var cmd = makeCommandStr('linux-profile', 'set', paramFileName, util.format('--admin-username %s', username)).split(' ');
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                          result.exitStatus.should.equal(0);
                          var cmd = makeCommandStr('public-keys', 'set', paramFileName, util.format('--index 0 --key-data %s', keydata)).split(' ');
                          testUtils.executeCommand(suite, retry, cmd, function(result) {
                            result.exitStatus.should.equal(0);
                            var cmd = util.format('container create-or-update -g %s --container-service-name %s --parameter-file %s --json', groupName, containerPrefix, paramFileName).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                              result.exitStatus.should.equal(0);
                              done();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      it('container update agent pool profile count should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var updateCount = 2;
        var cmd = makeCommandStr('agent-pool-profiles', 'set', paramFileName, util.format('--index 0 --count %s --parse', updateCount)).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('container create-or-update -g %s --container-service-name %s --parameter-file %s --json', groupName, containerPrefix, paramFileName).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });

      it('container config set and create Swarm should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var subscription = profile.current.getSubscription();
        vmTest.createGroup(groupName, location, suite, function(result) {
          var cmd = util.format('container config generate --parameter-file %s --json', paramFileName2).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            var cmd = makeCommandStr('container-service', 'set', paramFileName2, util.format('--name %s --location %s', containerPrefix2, location)).split(' ');
            testUtils.executeCommand(suite, retry, cmd, function(result) {
              result.exitStatus.should.equal(0);
              var cmd = makeCommandStr('container-service', 'delete', paramFileName2, util.format('--diagnostics-profile --windows-profile')).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                var cmd = makeCommandStr('master-profile', 'set', paramFileName2, util.format('--dns-prefix %s', containerPrefix2 + 'master')).split(' ');
                testUtils.executeCommand(suite, retry, cmd, function(result) {
                  result.exitStatus.should.equal(0);
                  var cmd = makeCommandStr('master-profile', 'set', paramFileName2, util.format('test --count 1 --parse')).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    var cmd = makeCommandStr('agent-pool-profiles', 'set', paramFileName2, util.format('--index 0 --name %s --vm-size Standard_A1 --dns-prefix %s', containerPrefix2 + 'a1', containerPrefix2 + 'a2')).split(' ');
                    testUtils.executeCommand(suite, retry, cmd, function(result) {
                      result.exitStatus.should.equal(0);
                      var cmd = makeCommandStr('orchestrator-profile', 'set', paramFileName2, util.format('--orchestrator-type %s', 'Swarm', location)).split(' ');
                      testUtils.executeCommand(suite, retry, cmd, function(result) {
                        result.exitStatus.should.equal(0);
                        var cmd = makeCommandStr('linux-profile', 'set', paramFileName2, util.format('--admin-username %s', username)).split(' ');
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                          result.exitStatus.should.equal(0);
                          var cmd = makeCommandStr('public-keys', 'set', paramFileName2, util.format('--index 0 --key-data %s', keydata)).split(' ');
                          testUtils.executeCommand(suite, retry, cmd, function(result) {
                            result.exitStatus.should.equal(0);
                            var cmd = util.format('container create-or-update -g %s --container-service-name %s --parameter-file %s --json', groupName, containerPrefix2, paramFileName2).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                              result.exitStatus.should.equal(0);
                              done();
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });

      it('container non-empty list should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('container list -g %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(containerPrefix);
          result.text.should.containEql('DCOS');
          result.text.should.containEql(containerPrefix2);
          result.text.should.containEql('Swarm');
          done();
        });
      });
      
      it('container get should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('container get -g %s --container-service-name %s --json', groupName, containerPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql(containerPrefix);
          result.text.should.containEql('DCOS');
          done();
        });
      });

      it('container delete should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('container delete -g %s --container-service-name %s --json', groupName, containerPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var cmd = util.format('container delete -g %s --container-service-name %s --json', groupName, containerPrefix2).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      
      it('container empty list should pass', function(done) {
        this.timeout(vmTest.timeoutLarge * 10);
        var cmd = util.format('container list -g %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          result.text.should.containEql('[]');
          done();
        });
      });

    });
  });
});
