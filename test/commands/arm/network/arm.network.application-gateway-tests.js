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
var _ = require('underscore');
var CLITest = require('../../../framework/arm-cli-test');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();
var should = require('should');
var testUtils = require('../../../util/util');
var testPrefix = 'arm-network-application-gateway-tests';
var util = require('util');

var location, groupName,
  groupPrefix = 'xplatTestGroupCreateAppGw',
  appGwPrefix = 'xplatTestAppGw',
  vnetPrefix = 'xplatTestVnet',
  vnetAddressPrefix = '10.0.0.0/8',
  subnetPrefix = 'xplatTestSubnet',
  subnetAddressPrefix = '10.0.0.0/11',
  servers = '1.1.1.1',
  tags = networkUtil.tags,
  newTags = networkUtil.newTags,
  updatedCapacity = 5,
  configPrefix = 'ipConfig01',
  frontendIpPrefix = 'testFronteEndIp',
  publicIpPrefix = 'xplatTestPublicIp',
  poolPrefix = 'xplatTestPoolName',
  poolServers = '4.4.4.4',
  portPrefix = 'xplatTestPoolName',
  portAddress = 123,
  httpListenerPrefix = 'xplatTestListener',
  httpSettingsPrefix = 'xplatTestHttpSettings',
  httpSettingsPort = 234,
  cookieBasedAffinity = 'Disabled',
  httpProtocol = 'Http',
  rulePrefix = 'xplatTestRule',
  probePrefix = 'xplatTestProbe',
  probePublicIpPrefix = 'probePublicIp',
  probePort = 90,
  hostName = 'contoso.com',
  path = '/',
  interval = 30,
  timeout = 120,
  unhealthyThreshold = 8;

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];

describe('arm', function () {
  describe('network', function () {
    var suite, retry = 5, hour = 60 * 60000;
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.isMocked ? groupPrefix : suite.generateId(groupPrefix, null);
        appGwPrefix = suite.isMocked ? appGwPrefix : suite.generateId(appGwPrefix, null);
        vnetPrefix = suite.isMocked ? vnetPrefix : suite.generateId(vnetPrefix, null);
        subnetPrefix = suite.isMocked ? subnetPrefix : suite.generateId(subnetPrefix, null);
        configPrefix = suite.isMocked ? configPrefix : suite.generateId(configPrefix, null);
        frontendIpPrefix = suite.isMocked ? frontendIpPrefix : suite.generateId(frontendIpPrefix, null);
        publicIpPrefix = suite.isMocked ? publicIpPrefix : suite.generateId(publicIpPrefix, null);
        poolPrefix = suite.isMocked ? poolPrefix : suite.generateId(poolPrefix, null);
        portPrefix = suite.isMocked ? portPrefix : suite.generateId(portPrefix, null);
        httpListenerPrefix = suite.isMocked ? httpListenerPrefix : suite.generateId(httpListenerPrefix, null);
        rulePrefix = suite.isMocked ? rulePrefix : suite.generateId(rulePrefix, null);
        probePrefix = suite.isMocked ? probePrefix : suite.generateId(probePrefix, null);
        done();
      });
    });
    after(function (done) {
      this.timeout(hour);
      networkUtil.deleteGroup(groupName, suite, function () {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('application-gateway', function () {
      this.timeout(hour);

      it('create should pass', function (done) {
        networkUtil.createGroup(groupName, location, suite, function () {
          networkUtil.createVnet(groupName, vnetPrefix, location, vnetAddressPrefix, suite, function () {
            networkUtil.createSubnet(groupName, vnetPrefix, subnetPrefix, subnetAddressPrefix, suite, function () {
              var cmd = util.format('network application-gateway create %s %s --location %s --vnet-name %s' +
                ' --subnet-name %s --servers %s --tags %s --json',
                groupName, appGwPrefix, location, vnetPrefix, subnetPrefix, servers, tags).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                var appGateway = JSON.parse(result.text);
                appGateway.name.should.equal(appGwPrefix);
                appGateway.location.should.equal(location);
                networkUtil.shouldHaveTags(appGateway);
                networkUtil.shouldBeSucceeded(appGateway);
                done();
              });
            });
          });
        });
      });

      it('set should modify application gateway', function (done) {
        var cmd = util.format('network application-gateway set %s %s --capacity %s --tags %s --json',
          groupName, appGwPrefix, updatedCapacity, newTags).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);
          appGateway.sku.capacity.should.equal(updatedCapacity);
          networkUtil.shouldAppendTags(appGateway);
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('show should display details of application gateway', function (done) {
        var cmd = util.format('network application-gateway show %s %s --json', groupName, appGwPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('list should display all application gateways from all resource groups', function (done) {
        var cmd = util.format('network application-gateway list --json').split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (appGw) {
            return appGw.name === appGwPrefix;
          }).should.be.true;
          done();
        });
      });

      it('list should display application gateways from specified resource group', function (done) {
        var cmd = util.format('network application-gateway list %s --json', groupName).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (appGw) {
            return appGw.name === appGwPrefix;
          }).should.be.true;
          done();
        });
      });

      it('stop should pass', function (done) {
        this.timeout(hour);
        var cmd = util.format('network application-gateway stop %s %s --json', groupName, appGwPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('start should pass', function (done) {
        this.timeout(hour);
        var cmd = util.format('network application-gateway start %s %s --json', groupName, appGwPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('start should not fail already started application gateway', function (done) {
        var cmd = util.format('network application-gateway start %s %s --json', groupName, appGwPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('frontend-ip add should create public frontend ip in application gateway ', function (done) {
        networkUtil.createPublicIp(groupName, publicIpPrefix, location, suite, function () {
          var cmd = util.format('network application-gateway frontend-ip add %s %s %s --public-ip-name %s --json',
            groupName, appGwPrefix, frontendIpPrefix, publicIpPrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(appGwPrefix);

            var frontendIp = appGateway.frontendIPConfigurations[1];
            frontendIp.name.should.equal(frontendIpPrefix);
            networkUtil.shouldBeSucceeded(frontendIp);
            done();
          });
        });
      });

      it('frontend-port add should create new frontend port in application gateway', function (done) {
        var cmd = util.format('network application-gateway frontend-port add %s %s %s --port %s --json',
          groupName, appGwPrefix, portPrefix, portAddress).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);

          var frontendPort = appGateway.frontendPorts[1];
          frontendPort.name.should.equal(portPrefix);
          frontendPort.port.should.equal(portAddress);
          networkUtil.shouldBeSucceeded(frontendPort);
          done();
        });
      });

      it('address-pool add command should create new address pool in application gateway', function (done) {
        var cmd = util.format('network application-gateway address-pool add %s %s %s --servers %s --json',
          groupName, appGwPrefix, poolPrefix, poolServers).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);

          var addressPool = appGateway.backendAddressPools[1];
          addressPool.name.should.equal(portPrefix);

          var pools = poolServers.split(',');
          var index = 0;
          addressPool.backendAddresses.forEach(function (address) {
            address.ipAddress.should.equal(pools[index]);
            index++;
          });

          networkUtil.shouldBeSucceeded(addressPool);
          done();
        });
      });

      it('http-settings add command should create new http settings in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-settings add %s %s %s --port %s --cookie-based-affinity %s ' +
          '--protocol %s --json',
          groupName, appGwPrefix, httpSettingsPrefix, httpSettingsPort, cookieBasedAffinity, httpProtocol).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);

          var setting = appGateway.backendHttpSettingsCollection[1];
          setting.name.should.equal(httpSettingsPrefix);
          setting.port.should.equal(httpSettingsPort);
          setting.cookieBasedAffinity.should.equal(cookieBasedAffinity);
          setting.protocol.should.equal(httpProtocol);
          networkUtil.shouldBeSucceeded(setting);
          done();
        });
      });

      it('http-listener add command should create new http listener in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-listener add %s %s %s --frontend-ip-name %s --frontend-port-name %s --json',
          groupName, appGwPrefix, httpListenerPrefix, frontendIpPrefix, portPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);

          var listener = appGateway.httpListeners[1];
          listener.name.should.equal(httpListenerPrefix);
          listener.protocol.should.equal(httpProtocol);
          networkUtil.shouldBeSucceeded(listener);
          done();
        });
      });

      it('rule add command should create new request routing rule in application gateway', function (done) {
        var cmd = util.format('network application-gateway rule add %s %s %s --http-settings-name %s ' +
          '--http-listener-name %s  --address-pool-name %s --json',
          groupName, appGwPrefix, rulePrefix, httpSettingsPrefix, httpListenerPrefix, poolPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(appGwPrefix);

          var rule = appGateway.requestRoutingRules[1];
          rule.name.should.equal(rulePrefix);
          networkUtil.shouldBeSucceeded(rule);
          done();
        });
      });

      it('probe add should create probe in application gateway ', function (done) {
        networkUtil.createPublicIp(groupName, probePublicIpPrefix, location, suite, function () {
          var cmd = util.format('network application-gateway probe add %s %s %s --port %s  --protocol %s --host-name %s ' +
            '--path %s --interval %s --timeout %s --unhealthy-threshold %s --json',
            groupName, appGwPrefix, probePrefix, probePort, httpProtocol, hostName, path, interval, timeout,
            unhealthyThreshold).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(appGwPrefix);

            var probe = appGateway.probes[0];
            probe.name.should.equal(probePrefix);
            probe.protocol.should.equal(httpProtocol);
            probe.host.should.equal(hostName);
            probe.path.should.equal(path);
            probe.interval.should.equal(interval);
            probe.timeout.should.equal(timeout);
            probe.unhealthyThreshold.should.equal(unhealthyThreshold);
            networkUtil.shouldBeSucceeded(probe);
            done();
          });
        });
      });

      // Changed application gateway state to "Stopped" in this test case.
      it('probe remove should remove probe from application gateway', function (done) {
        networkUtil.stopAppGateway(groupName, appGwPrefix, suite, function () {
          var cmd = util.format('network application-gateway probe remove %s %s %s -q --json', groupName, appGwPrefix,
            probePrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(appGwPrefix);

            var probes = appGateway.probes;
            _.some(probes, function (probe) {
              return probe.name === probePrefix;
            }).should.be.false;
            networkUtil.shouldBeSucceeded(appGateway);
            done();
          });
        });
      });

      it('rule remove should remove request routing rule from application gateway', function (done) {
        networkUtil.stopAppGateway(groupName, appGwPrefix, suite, function () {
          var cmd = util.format('network application-gateway rule remove %s %s %s -q --json',
            groupName, appGwPrefix, rulePrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);

            var rules = appGateway.requestRoutingRules;
            _.some(rules, function (rule) {
              return rule.name === rulePrefix;
            }).should.be.false;
            networkUtil.shouldBeSucceeded(appGateway);
            done();
          });
        });
      });

      it('http-listener remove should remove http listener from application gateway', function (done) {
        var cmd = util.format('network application-gateway http-listener remove %s %s %s -q --json',
          groupName, appGwPrefix, httpListenerPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var listeners = appGateway.httpListeners;
          _.some(listeners, function (listener) {
            return listener.name === httpListenerPrefix;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('frontend-port remove should remove frontend port from application gateway', function (done) {
        this.timeout(hour);
        var cmd = util.format('network application-gateway frontend-port remove %s %s %s -q --json',
          groupName, appGwPrefix, portPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var ports = appGateway.frontendPorts;
          _.some(ports, function (port) {
            return port.name === portPrefix;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('frontend-ip remove should remove public frontend ip from application gateway', function (done) {
        var cmd = util.format('network application-gateway frontend-ip remove %s %s %s -q --json',
          groupName, appGwPrefix, frontendIpPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var frontendIps = appGateway.frontendIPConfigurations;
          _.some(frontendIps, function (ip) {
            return ip.name === frontendIpPrefix;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('http-settings remove should remove http settings from application gateway', function (done) {
        var cmd = util.format('network application-gateway http-settings remove %s %s %s -q --json',
          groupName, appGwPrefix, httpSettingsPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var settings = appGateway.backendHttpSettingsCollection;
          _.some(settings, function (setting) {
            return setting.name === httpSettingsPrefix;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('address-pool remove should remove address pool from application gateway', function (done) {
        var cmd = util.format('network application-gateway address-pool remove %s %s %s -q --json',
          groupName, appGwPrefix, poolPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var pools = appGateway.backendAddressPools;
          _.some(pools, function (pool) {
            return pool.name === poolPrefix;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('delete should delete application gateway', function (done) {
        var cmd = util.format('network application-gateway delete %s %s -q --json', groupName, appGwPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});