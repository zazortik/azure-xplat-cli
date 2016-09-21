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
var constants = require('../../../../lib/commands/arm/network/constants');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();
var should = require('should');
var testUtils = require('../../../util/util');
var testPrefix = 'arm-network-application-gateway-tests';
var util = require('util');
var utils = require('../../../../lib/util/utils');

var location, groupName = 'xplatTestGroupCreateAppGw3',
  gatewayProp = {
    name: 'xplatTestAppGw',
    vnetName: 'xplatTestVnet',
    vnetAddress: '10.0.0.0/8',
    subnetName: 'xplatTestSubnet',
    subnetAddress: '10.0.0.0/11',
    servers: '1.1.1.1',
    defSslCertName: 'cert01',
    defaultSslCertPath: 'test/data/sslCert.pfx',
    httpSettingsProtocol: constants.appGateway.settings.protocol[0],
    httpSettingsPortAddress: 111,
    portValue: 112,
    httpListenerProtocol: 'Https',
    ruleType: constants.appGateway.routingRule.type[0],
    skuName: 'Standard_Small',
    skuTier: 'Standard',
    capacity: 2,
    tags: networkUtil.tags,
    newCapacity: 5,
    newTags: networkUtil.newTags,
    configName: 'ipConfig01',
    frontendIpName: 'testFronteEndIp',
    publicIpName: 'xplatTestPublicIp',
    portName: 'xplatTestPoolName',
    portAddress: 123,
    poolName: 'xplatTestPoolName',
    poolServers: '4.4.4.4',
    httpSettingsName: 'xplatTestHttpSettings',
    httpSettingsName1: 'xplatTestHttpSettings1',
    httpSettingsPort: 234,
    httpSettingsPort1: 345,
    cookieBasedAffinity: 'Disabled',
    httpProtocol: 'Http',
    httpsProtocol: 'Https',
    httpListenerName: 'xplatTestListener',
    defHttpListenerName: 'listener01',
    ruleName: 'xplatTestRule',
    probeName: 'xplatTestProbe',
    probePublicIpName: 'probePublicIp',
    probePort: 90,
    hostName: 'contoso.com',
    path: '/',
    interval: 30,
    timeout: 120,
    unhealthyThreshold: 8,
    urlPathMapName: 'urlPathMapName01',
    urlPathMapName2: 'urlPathMapName02',
    urlMapRuleName: 'urlMapRuleName01',
    urlMapRuleName2: 'urlMapRuleName02',
    defHttpSettingName: constants.appGateway.settings.name,
    defPoolName: constants.appGateway.pool.name,
    mapPath: '/test',
    newUrlMapRuleName: 'rule01',
    newMapPath: '/test01',
    newMapPath1: '/test02',
    sslCertName: 'cert02',
    sslFile: 'test/data/cert02.pfx',
    sslPassword: 'pswd',
    disabledSslProtocols: 'TLSv1_0,TLSv1_2',
    authCertName: 'TestAuthCert',
    certificateFile: 'test/data/auth-cert.pfx',
    certificateFileNew: 'test/data/auth-cert-2.pfx'
  };

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
        groupName = suite.isMocked ? groupName : suite.generateId(groupName, null);

        gatewayProp.group = groupName;
        gatewayProp.location = location;
        gatewayProp.name = suite.isMocked ? gatewayProp.name : suite.generateId(gatewayProp.name, null);
        gatewayProp.vnetName = suite.isMocked ? gatewayProp.vnetName : suite.generateId(gatewayProp.vnetName, null);
        gatewayProp.subnetName = suite.isMocked ? gatewayProp.subnetName : suite.generateId(gatewayProp.subnetName, null);
        gatewayProp.configName = suite.isMocked ? gatewayProp.configName : suite.generateId(gatewayProp.configName, null);
        gatewayProp.frontendIpName = suite.isMocked ? gatewayProp.frontendIpName : suite.generateId(gatewayProp.frontendIpName, null);
        gatewayProp.publicIpName = suite.isMocked ? gatewayProp.publicIpName : suite.generateId(gatewayProp.publicIpName, null);
        gatewayProp.poolName = suite.isMocked ? gatewayProp.poolName : suite.generateId(gatewayProp.poolName, null);
        gatewayProp.portName = suite.isMocked ? gatewayProp.portName : suite.generateId(gatewayProp.portName, null);
        gatewayProp.httpListenerName = suite.isMocked ? gatewayProp.httpListenerName : suite.generateId(gatewayProp.httpListenerName, null);
        gatewayProp.httpSettingsName = suite.isMocked ? gatewayProp.httpSettingsName : suite.generateId(gatewayProp.httpSettingsName, null);
        gatewayProp.ruleName = suite.isMocked ? gatewayProp.ruleName : suite.generateId(gatewayProp.ruleName, null);
        gatewayProp.probeName = suite.isMocked ? gatewayProp.probeName : suite.generateId(gatewayProp.probeName, null);
        gatewayProp.urlPathMapName = suite.isMocked ? gatewayProp.urlPathMapName : suite.generateId(gatewayProp.urlPathMapName, null);
        gatewayProp.urlMapRuleName = suite.isMocked ? gatewayProp.urlMapRuleName : suite.generateId(gatewayProp.urlMapRuleName, null);
        gatewayProp.sslCertName = suite.isMocked ? gatewayProp.sslCertName : suite.generateId(gatewayProp.sslCertName, null);
        done();
      });
    });
    after(function (done) {
      this.timeout(hour);
      //networkUtil.deleteGroup(groupName, suite, function () {
        suite.teardownSuite(done);
      //});
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
        networkUtil.createGroup(gatewayProp.group, gatewayProp.location, suite, function () {
          networkUtil.createVnet(gatewayProp.group, gatewayProp.vnetName, gatewayProp.location, gatewayProp.vnetAddress, suite, function () {
            networkUtil.createSubnet(gatewayProp.group, gatewayProp.vnetName, gatewayProp.subnetName, gatewayProp.subnetAddress, suite, function () {
              var cmd = util.format('network application-gateway create {group} {name} -l {location} -e {vnetName} -m {subnetName} ' +
                '-r {servers} -y {defaultSslCertPath} -x {sslPassword} -i {httpSettingsProtocol} -o {httpSettingsPortAddress} -f {cookieBasedAffinity} ' +
                '-j {portValue} -b {httpListenerProtocol} -w {ruleType} -a {skuName} -u {skuTier} -z {capacity} -t {tags} --json').formatArgs(gatewayProp);
              testUtils.executeCommand(suite, retry, cmd, function (result) {
                result.exitStatus.should.equal(0);
                var appGateway = JSON.parse(result.text);
                appGateway.name.should.equal(gatewayProp.name);
                appGateway.location.should.equal(gatewayProp.location);
                appGateway.sku.name.should.equal(gatewayProp.skuName);
                appGateway.sku.tier.should.equal(gatewayProp.skuTier);
                appGateway.sku.capacity.should.equal(gatewayProp.capacity);

                var frontendPort = appGateway.frontendPorts[0];
                frontendPort.port.should.equal(gatewayProp.portValue);

                var backendHttpSettings = appGateway.backendHttpSettingsCollection[0];
                backendHttpSettings.port.should.equal(gatewayProp.httpSettingsPortAddress);
                backendHttpSettings.protocol.toLowerCase().should.equal(gatewayProp.httpSettingsProtocol.toLowerCase());
                backendHttpSettings.cookieBasedAffinity.should.equal(gatewayProp.cookieBasedAffinity);

                var httpListener = appGateway.httpListeners[0];
                httpListener.protocol.toLowerCase().should.equal(gatewayProp.httpListenerProtocol.toLowerCase());

                networkUtil.shouldHaveTags(appGateway);
                networkUtil.shouldBeSucceeded(appGateway);
                done();
              });
            });
          });
        });
      });

      it('set should modify application gateway', function (done) {
        var cmd = 'network application-gateway set {group} {name} -z {newCapacity} -t {newTags} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);
          appGateway.sku.capacity.should.equal(gatewayProp.newCapacity);
          networkUtil.shouldAppendTags(appGateway);
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('show should display details of application gateway', function (done) {
        var cmd = 'network application-gateway show {group} {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('list should display all application gateways from all resource groups', function (done) {
        var cmd = 'network application-gateway list --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (appGw) {
            return appGw.name === gatewayProp.name;
          }).should.be.true;
          done();
        });
      });

      it('list should display application gateways from specified resource group', function (done) {
        var cmd = 'network application-gateway list {group} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var gateways = JSON.parse(result.text);
          _.some(gateways, function (appGw) {
            return appGw.name === gatewayProp.name;
          }).should.be.true;
          done();
        });
      });

      it('stop should pass', function (done) {
        var cmd = 'network application-gateway stop {group} {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('start should pass', function (done) {
        var cmd = 'network application-gateway start {group} {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('start should not fail already started application gateway', function (done) {
        var cmd = 'network application-gateway start {group} {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('frontend-ip create should create public frontend ip in application gateway', function (done) {
        networkUtil.createPublicIpLegacy(gatewayProp.group, gatewayProp.publicIpName, gatewayProp.location, suite, function () {
          var cmd = 'network application-gateway frontend-ip create {group} {name} {frontendIpName} -p {publicIpName} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(gatewayProp.name);

            var frontendIp = appGateway.frontendIPConfigurations[1];
            frontendIp.name.should.equal(gatewayProp.frontendIpName);
            networkUtil.shouldBeSucceeded(frontendIp);
            done();
          });
        });
      });

      it('frontend-port create should create new frontend port in application gateway', function (done) {
        var cmd = 'network application-gateway frontend-port create {group} {name} {portName} -p {portAddress} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var frontendPort = appGateway.frontendPorts[1];
          frontendPort.name.should.equal(gatewayProp.portName);
          frontendPort.port.should.equal(gatewayProp.portAddress);
          networkUtil.shouldBeSucceeded(frontendPort);
          done();
        });
      });

      it('ssl cert create should create ssl certificate in application gateway', function (done) {
        var cmd = util.format('network application-gateway ssl-cert create {group} {name} {sslCertName} ' +
          '-f {sslFile} -p {sslPassword} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var sslCert = appGateway.sslCertificates[1];
          sslCert.name.should.equal(gatewayProp.sslCertName);
          networkUtil.shouldBeSucceeded(sslCert);
          done();
        });
      });

      it('ssl cert delete should delete ssl certificate from application gateway', function (done) {
        var cmd = util.format('network application-gateway ssl-cert delete {group} {name} {sslCertName} -q --json')
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var sslCertificates = appGateway.sslCertificates;
          _.some(sslCertificates, function (cert) {
            return cert.name === gatewayProp.sslCertName;
          }).should.be.false;
          done();
        });
      });

      it('address-pool create command should create new address pool in application gateway', function (done) {
        var cmd = 'network application-gateway address-pool create {group} {name} {poolName} -r {poolServers} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var addressPool = appGateway.backendAddressPools[1];
          addressPool.name.should.equal(gatewayProp.poolName);

          var pools = gatewayProp.poolServers.split(',');
          var index = 0;
          addressPool.backendAddresses.forEach(function (address) {
            address.ipAddress.should.equal(pools[index]);
            index++;
          });

          networkUtil.shouldBeSucceeded(addressPool);
          done();
        });
      });

      it('http-settings create command should create new http settings in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-settings create {group} {name} {httpSettingsName} ' +
          '-o {httpSettingsPort} -c {cookieBasedAffinity} -p {httpProtocol} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var setting = appGateway.backendHttpSettingsCollection[1];
          setting.name.should.equal(gatewayProp.httpSettingsName);
          setting.port.should.equal(gatewayProp.httpSettingsPort);
          setting.cookieBasedAffinity.should.equal(gatewayProp.cookieBasedAffinity);
          setting.protocol.should.equal(gatewayProp.httpProtocol);
          networkUtil.shouldBeSucceeded(setting);
          done();
        });
      });

      it('http-listener create command should create new http listener in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-listener create {group} {name} {httpListenerName} ' +
          '-i {frontendIpName} -p {portName} -r {httpProtocol} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var listener = appGateway.httpListeners[1];
          listener.name.should.equal(gatewayProp.httpListenerName);
          listener.protocol.should.equal(gatewayProp.httpProtocol);
          networkUtil.shouldBeSucceeded(listener);
          done();
        });
      });

      it('http-listener set command should modify new http listener in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-listener set {group} {name} {defHttpListenerName} ' +
          '-r {httpsProtocol} -c {defSslCertName} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var listener = utils.findFirstCaseIgnore(appGateway.httpListeners, {name: gatewayProp.defHttpListenerName});
          listener.name.should.equal(gatewayProp.defHttpListenerName);
          listener.protocol.should.equal(gatewayProp.httpsProtocol);
          networkUtil.shouldBeSucceeded(listener);
          done();
        });
      });

      it('rule create command should create new request routing rule in application gateway', function (done) {
        var cmd = util.format('network application-gateway rule create {group} {name} {ruleName} -i {httpSettingsName} ' +
          '-l {httpListenerName} -p {poolName} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var rule = appGateway.requestRoutingRules[1];
          rule.name.should.equal(gatewayProp.ruleName);
          networkUtil.shouldBeSucceeded(rule);
          done();
        });
      });

      it('probe create should create probe in application gateway', function (done) {
        networkUtil.createPublicIpLegacy(groupName, gatewayProp.probePublicIpName, gatewayProp.location, suite, function () {
          var cmd = util.format('network application-gateway probe create {group} {name} {probeName} -o {port} -p {httpProtocol} ' +
            '-d {hostName} -f {path} -i {interval} -u {timeout} -e {unhealthyThreshold} --json').formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(gatewayProp.name);

            var probe = appGateway.probes[0];
            probe.name.should.equal(gatewayProp.probeName);
            probe.protocol.should.equal(gatewayProp.httpProtocol);
            probe.host.should.equal(gatewayProp.hostName);
            probe.path.should.equal(gatewayProp.path);
            probe.interval.should.equal(gatewayProp.interval);
            probe.timeout.should.equal(gatewayProp.timeout);
            probe.unhealthyThreshold.should.equal(gatewayProp.unhealthyThreshold);
            networkUtil.shouldBeSucceeded(probe);
            done();
          });
        });
      });

      it('url path map create should create map in application gateway', function (done) {
        var cmd = util.format('network application-gateway url-path-map create {group} {name} {urlPathMapName} ' +
          '-r {urlMapRuleName} -p {mapPath} -i {defHttpSettingName} -a {defPoolName} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var urlPathMap = appGateway.urlPathMaps[0];
          urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
          urlPathMap.pathRules[0].name.should.equal(gatewayProp.urlMapRuleName);
          networkUtil.shouldBeSucceeded(urlPathMap);
          done();
        });
      });

      it('url path map show should display created URL path map application gateway', function (done) {
        var cmd = 'network application-gateway url-path-map show {group} {name} {urlPathMapName} --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var urlPathMap = JSON.parse(result.text);
          urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
          networkUtil.shouldBeSucceeded(urlPathMap);
          done();
        });
      });

      it('url path map list should display all URL path maps from application gateway', function (done) {
        var cmd = 'network application-gateway url-path-map list {group} {name} {urlPathMapName} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var urlPathMaps = JSON.parse(result.text);
          _.some(urlPathMaps, function(urlPathMap) {
            return urlPathMap.name === gatewayProp.urlPathMapName
          }).should.be.true;
          done();
        });
      });

      it('url path map rule create 2nd should create map rule in application gateway', function (done) {
        var cmd = util.format('network application-gateway url-path-map rule create {group} {name} {newUrlMapRuleName} ' +
          '-u {urlPathMapName} -p {newMapPath} -i {httpSettingsName} -a {poolName} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var urlPathMap = utils.findFirstCaseIgnore( appGateway.urlPathMaps, {name: gatewayProp.urlPathMapName});
          urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
          _.some(urlPathMap.pathRules, function (rule) {
            return (rule.name === gatewayProp.newUrlMapRuleName);
          }).should.be.true;
          networkUtil.shouldBeSucceeded(urlPathMap);
          done();
        });
      });

      it('url path map rule show should display created rule of URL path map', function (done) {
        var cmd = 'network application-gateway url-path-map rule show {group} {name} {urlPathMapName} {newUrlMapRuleName} --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var urlPathMapRule = JSON.parse(result.text);
          urlPathMapRule.name.should.equal(gatewayProp.newUrlMapRuleName);
          done();
        });
      });

      it('url path map rule list should display all rules from URL path map', function (done) {
        var cmd = 'network application-gateway url-path-map rule list {group} {name} {urlPathMapName} {urlMapRuleName} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var urlPathMapRules = JSON.parse(result.text);
          _.some(urlPathMapRules, function(urlPathMapRule) {
            return urlPathMapRule.name === gatewayProp.newUrlMapRuleName
          }).should.be.true;
          done();
        });
      });

      it('url path map rule set should modify map in application gateway', function (done) {
        var cmd = util.format('network application-gateway http-settings create {group} {name} {httpSettingsName1} ' +
          '-o {httpSettingsPort1} -c {cookieBasedAffinity} -p {httpProtocol} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = util.format('network application-gateway url-path-map rule set {group} {name} {newUrlMapRuleName} ' +
            '-u {urlPathMapName} -p {newMapPath1} -i {httpSettingsName1} --json').formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(gatewayProp.name);

            var urlPathMap = utils.findFirstCaseIgnore( appGateway.urlPathMaps, {name: gatewayProp.urlPathMapName});
            urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
            _.some(urlPathMap.pathRules, function (rule) {
              return (rule.name === gatewayProp.newUrlMapRuleName && rule.backendHttpSettings && rule.backendAddressPool);
            }).should.be.true;
            networkUtil.shouldBeSucceeded(urlPathMap);
            done();
          });
        });
      });

      it('url path map set should modify map in application gateway', function (done) {
        var cmd = util.format('network application-gateway url-path-map set {group} {name} {urlPathMapName} ' +
          '-i {httpSettingsName1} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var urlPathMap = utils.findFirstCaseIgnore( appGateway.urlPathMaps, {name: gatewayProp.urlPathMapName});
          urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
          urlPathMap.defaultBackendHttpSettings.should.not.be.empty;
          urlPathMap.defaultBackendAddressPool.should.not.be.empty;
          networkUtil.shouldBeSucceeded(urlPathMap);
          done();
        });
      });

      // Changed application gateway state to "Stopped" in this test case.
      it('url path map rule delete should remove map rule in application gateway', function (done) {
        networkUtil.stopAppGateway(gatewayProp, suite, function () {
          var cmd = util.format('network application-gateway url-path-map rule delete {group} {name} {newUrlMapRuleName} ' +
            '-u {urlPathMapName} -q --json').formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(gatewayProp.name);

            var urlPathMap = appGateway.urlPathMaps[0];
            urlPathMap.name.should.equal(gatewayProp.urlPathMapName);
            _.some(urlPathMap.pathRules, function (rule) {
              return (rule.name === gatewayProp.newUrlMapRuleName);
            }).should.be.false;
            networkUtil.shouldBeSucceeded(urlPathMap);
            done();
          });
        });
      });

      it('url-path-map delete should remove url path map from application gateway', function (done) {
        var cmd = 'network application-gateway url-path-map delete {group} {name} {urlPathMapName} -q --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);
          var urlPathMaps = appGateway.probes;
          _.some(urlPathMaps, function (map) {
            return map.name === gatewayProp.urlPathMapName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('probe delete should remove probe from application gateway', function (done) {
        var cmd = 'network application-gateway probe delete {group} {name} {probeName} -q --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);

          var probes = appGateway.probes;
          _.some(probes, function (probe) {
            return probe.name === gatewayProp.probeName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('rule delete should remove request routing rule from application gateway', function (done) {
        networkUtil.stopAppGateway(gatewayProp, suite, function () {
          var cmd = 'network application-gateway rule delete {group} {name} {ruleName} -q --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);

            var rules = appGateway.requestRoutingRules;
            _.some(rules, function (rule) {
              return rule.name === gatewayProp.ruleName;
            }).should.be.false;
            networkUtil.shouldBeSucceeded(appGateway);
            done();
          });
        });
      });

      it('http-listener delete should remove http listener from application gateway', function (done) {
        var cmd = 'network application-gateway http-listener delete {group} {name} {httpListenerName} -q --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var listeners = appGateway.httpListeners;
          _.some(listeners, function (listener) {
            return listener.name === gatewayProp.httpListenerName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('frontend-port delete should remove frontend port from application gateway', function (done) {
        this.timeout(hour);
        var cmd = 'network application-gateway frontend-port delete {group} {name} {portName} -q --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var ports = appGateway.frontendPorts;
          _.some(ports, function (port) {
            return port.name === gatewayProp.portName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('frontend-ip delete should remove public frontend ip from application gateway', function (done) {
        var cmd = 'network application-gateway frontend-ip delete {group} {name} {frontendIpName} -q --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var frontendIps = appGateway.frontendIPConfigurations;
          _.some(frontendIps, function (ip) {
            return ip.name === gatewayProp.frontendIpName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('http-settings delete should remove http settings from application gateway', function (done) {
        var cmd = 'network application-gateway http-settings delete {group} {name} {httpSettingsName} -q --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var settings = appGateway.backendHttpSettingsCollection;
          _.some(settings, function (setting) {
            return setting.name === gatewayProp.httpSettingsName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('address-pool delete should remove address pool from application gateway', function (done) {
        var cmd = 'network application-gateway address-pool delete {group} {name} {poolName} -q --json'
          .formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);

          var pools = appGateway.backendAddressPools;
          _.some(pools, function (pool) {
            return pool.name === gatewayProp.poolName;
          }).should.be.false;
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('ssl-policy create should create application gateway ssl policy', function (done) {
        var cmd = 'network application-gateway ssl-policy create -g {group} --disable-ssl-protocols {disabledSslProtocols} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          gatewayProp.disabledSslProtocols.split(',').forEach(function(item) { output.disabledSslProtocols.should.containEql(item) });
          done();
        });
      });

      it('ssl-policy show should display application gateway ssl policy details', function (done) {
        var cmd = 'network application-gateway ssl-policy show -g {group} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          gatewayProp.disabledSslProtocols.split(',').forEach(function(item) { output.disabledSslProtocols.should.containEql(item) });
          done();
        });
      });

      it('ssl-policy delete should delete application gateway ssl policy', function (done) {
        var cmd = 'network application-gateway ssl-policy delete -g {group} --quiet --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = 'network application-gateway ssl-policy show -g {group} --gateway-name {name} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.should.be.empty;
            done();
          });
        });
      });

      it('auth-cert create should create application gateway authentication certificate', function (done) {
        var cmd = 'network application-gateway auth-cert create -g {group} -n {authCertName} --cert-file {certificateFile} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          output.name.should.equal(gatewayProp.authCertName);
          done();
        });
      });

      it('auth-cert show should display application gateway authentication certificate details', function (done) {
        var cmd = 'network application-gateway auth-cert show -g {group} -n {authCertName} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          output.name.should.equal(gatewayProp.authCertName);
          done();
        });
      });

      it('auth-cert set should update application gateway authentication certificate', function (done) {
        var cmd = 'network application-gateway auth-cert set -g {group} -n {authCertName} --cert-file {certificateFileNew} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var output = JSON.parse(result.text);
          output.name.should.equal(gatewayProp.authCertName);
          done();
        });
      });

      it('auth-cert list should display all application gateway authentication certificate in resource group', function (done) {
        var cmd = 'network application-gateway auth-cert list -g {group} --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var outputs = JSON.parse(result.text);
          _.some(outputs, function (output) {
            return output.name === gatewayProp.authCertName;
          }).should.be.true;
          done();
        });
      });

      it('auth-cert delete should delete application gateway authentication certificate', function (done) {
        var cmd = 'network application-gateway auth-cert delete -g {group} -n {authCertName} --quiet  --gateway-name {name} --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = 'network application-gateway auth-cert show -g {group} -n {authCertName} --gateway-name {name} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var output = JSON.parse(result.text);
            output.should.be.empty;
            done();
          });
        });
      });

      it('delete should delete application gateway', function (done) {
        var cmd = 'network application-gateway delete {group} {name} -q --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('create again should pass', function (done) {
        var cmd = util.format('network application-gateway create {group} {name} -l {location} -e {vnetName} -m {subnetName} ' +
          '-r {servers} -y {defaultSslCertPath} -x {sslPassword} -i {httpSettingsProtocol} -o {httpSettingsPortAddress} -f {cookieBasedAffinity} ' +
          '-j {portValue} -b {httpListenerProtocol} -w {ruleType} -a {skuName} -u {skuTier} -z {capacity} -t {tags} --json').formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var appGateway = JSON.parse(result.text);
          appGateway.name.should.equal(gatewayProp.name);
          appGateway.location.should.equal(gatewayProp.location);
          appGateway.sku.name.should.equal(gatewayProp.skuName);
          appGateway.sku.tier.should.equal(gatewayProp.skuTier);
          appGateway.sku.capacity.should.equal(gatewayProp.capacity);

          var frontendPort = appGateway.frontendPorts[0];
          frontendPort.port.should.equal(gatewayProp.portValue);

          var backendHttpSettings = appGateway.backendHttpSettingsCollection[0];
          backendHttpSettings.port.should.equal(gatewayProp.httpSettingsPortAddress);
          backendHttpSettings.protocol.toLowerCase().should.equal(gatewayProp.httpSettingsProtocol.toLowerCase());
          backendHttpSettings.cookieBasedAffinity.should.equal(gatewayProp.cookieBasedAffinity);

          var httpListener = appGateway.httpListeners[0];
          httpListener.protocol.toLowerCase().should.equal(gatewayProp.httpListenerProtocol.toLowerCase());

          networkUtil.shouldHaveTags(appGateway);
          networkUtil.shouldBeSucceeded(appGateway);
          done();
        });
      });

      it('delete should delete application gateway without waiting', function (done) {
        var cmd = 'network application-gateway delete {group} {name} -q --nowait --json'.formatArgs(gatewayProp);
        testUtils.executeCommand(suite, retry, cmd, function (deleteResult) {
          deleteResult.exitStatus.should.equal(0);
          var cmd = 'network application-gateway show {group} {name} --json'.formatArgs(gatewayProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            var appGateway = JSON.parse(result.text);
            appGateway.name.should.equal(gatewayProp.name);
            networkUtil.shouldBeDeleted(appGateway);
            done();
          });
        });
      });
    });
  });
});
