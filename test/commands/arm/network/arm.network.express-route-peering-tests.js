'use strict';

var CLITest = require('../../../framework/arm-cli-test');
var NetworkTestUtil = require('../../../util/networkTestUtil');
var networkUtil = new NetworkTestUtil();
var should = require('should');
var testPrefix = 'arm-network-express-route-peering-tests';
var testUtils = require('../../../util/util');
var util = require('util');
var _ = require('underscore');

var groupName = 'xplatTestGroupERPeering',
  circuitProp = {
    name: 'xplatExpressRouteCircuit',
    serviceProviderName: 'Interxion',
    peeringLocation: 'London',
    skuTier: "Standard",
    skuFamily: 'MeteredData',
    bandwidthInMbps: 50,
    tags: networkUtil.tags
  },
  privatePeeringProp = {
    group: groupName,
    expressRCName: 'xplatExpressRouteCircuit',
    peeringName: 'AzurePrivatePeering',
    type: 'AzurePrivatePeering',
    peerAsn: 100,
    newPeerAsn: 101,
    primaryAddress: "192.168.1.0/30",
    secondaryAddress: "192.168.2.0/30",
    vlanId: 200,
    newVlanId: 199
  },
  publicPeeringProp = {
    group: groupName,
    expressRCName: 'xplatExpressRouteCircuit',
    peeringName: 'AzurePublicPeering',
    type: 'AzurePublicPeering',
    peerAsn: 110,
    newPeerAsn: 111,
    primaryAddress: "192.168.1.0/30",
    secondaryAddress: "192.168.2.0/30",
    vlanId: 210,
    newVlanId: 209
  },
  microsoftPeeringProp = {
    group: groupName,
    expressRCName: 'xplatExpressRouteCircuit',
    peeringName: 'MicrosoftPeering',
    type: 'MicrosoftPeering',
    peerAsn: 120,
    newPeerAsn: 121,
    primaryAddress: "123.0.0.0/30",
    secondaryAddress: "123.0.0.4/30",
    vlanId: 220,
    msAdvertisedPublicPrefixes: "123.1.0.0/24",
    msCustomerAsn: 23,
    msRoutingRegistryName: "ARIN",
    newVlanId: 219,
    newMsAdvertisedPublicPrefixes: "123.2.0.0/24",
    newMsCustomerAsn: 32,
    newMsRoutingRegistryName: "LACNIC"
  },
  premiumTier = 'Premium';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'brazilsouth'
}];

describe('arm', function () {
  describe('network', function () {
    var suite,
      retry = 5;
    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        circuitProp.location = process.env.AZURE_VM_TEST_LOCATION;
        circuitProp.group = suite.isMocked ? groupName : suite.generateId(groupName, null);
        circuitProp.name = suite.isMocked ? circuitProp.name : suite.generateId(circuitProp.name, null);
        privatePeeringProp.peeringName = suite.isMocked ? privatePeeringProp.peeringName : suite.generateId(privatePeeringProp.peeringName, null);
        done();
      });
    });
    after(function (done) {
      networkUtil.deleteGroup(circuitProp.group, suite, function () {
        suite.teardownSuite(done);
      });
    });
    beforeEach(function (done) {
      suite.setupTest(done);
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('express-route peering', function () {
      it('create private peering should pass', function (done) {
        networkUtil.createGroup(circuitProp.group, circuitProp.location, suite, function () {
          networkUtil.createExpressRouteCircuit(circuitProp, suite, function () {
            var cmd = util.format('network express-route peering create {group} {expressRCName} {peeringName} -y {type} ' +
                '-p {peerAsn} -r {primaryAddress} -o {secondaryAddress} -i {vlanId} --json')
              .formatArgs(privatePeeringProp);
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var peering = JSON.parse(result.text);
              peering.name.should.equal(privatePeeringProp.peeringName);
              peering.peeringType.should.equal(privatePeeringProp.type);
              peering.peerASN.should.equal(privatePeeringProp.peerAsn);
              peering.primaryPeerAddressPrefix.should.equal(privatePeeringProp.primaryAddress);
              peering.secondaryPeerAddressPrefix.should.equal(privatePeeringProp.secondaryAddress);
              peering.vlanId.should.equal(privatePeeringProp.vlanId);
              networkUtil.shouldBeSucceeded(peering);
              done();
            });
          });
        });
      });
      it('create public peering should pass', function (done) {
        var cmd = util.format('network express-route peering create {group} {expressRCName} {peeringName} -y {type} ' +
            '-p {peerAsn} -r {primaryAddress} -o {secondaryAddress} -i {vlanId} --json')
          .formatArgs(publicPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(publicPeeringProp.peeringName);
          peering.peeringType.should.equal(publicPeeringProp.type);
          peering.peerASN.should.equal(publicPeeringProp.peerAsn);
          peering.primaryPeerAddressPrefix.should.equal(publicPeeringProp.primaryAddress);
          peering.secondaryPeerAddressPrefix.should.equal(publicPeeringProp.secondaryAddress);
          peering.vlanId.should.equal(publicPeeringProp.vlanId);
          done();
        });
      });
      it('create microsoft peering should not pass', function (done) {
        var cmd = util.format('network express-route peering create {group} {expressRCName} {peeringName} -y {type} ' +
          '-p {peerAsn} -r {primaryAddress} -o {secondaryAddress} -i {vlanId} -l {msCustomerAsn} ' +
          '-f {msAdvertisedPublicPrefixes} -u {msRoutingRegistryName} --json').formatArgs(microsoftPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(1);
          done();
        });
      });
      it('create microsoft peering should pass', function (done) {

        // Removes failed peering.
        var cmd = 'network express-route peering delete {group} {expressRCName} {peeringName} -q --json'.formatArgs(microsoftPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function () {
          circuitProp.skuTier = premiumTier;
          networkUtil.setExpressRoute(circuitProp, suite, function () {
            var cmd = util.format('network express-route peering create {group} {expressRCName} {peeringName} -y {type} ' +
              '-p {peerAsn} -r {primaryAddress} -o {secondaryAddress} -i {vlanId} -l {msCustomerAsn} ' +
              '-f {msAdvertisedPublicPrefixes} -u {msRoutingRegistryName} --json').formatArgs(microsoftPeeringProp);
            testUtils.executeCommand(suite, retry, cmd, function (result) {
              result.exitStatus.should.equal(0);
              var peering = JSON.parse(result.text);
              peering.name.should.equal(microsoftPeeringProp.peeringName);
              peering.peeringType.should.equal(microsoftPeeringProp.type);
              peering.peerASN.should.equal(microsoftPeeringProp.peerAsn);
              peering.primaryPeerAddressPrefix.should.equal(microsoftPeeringProp.primaryAddress);
              peering.secondaryPeerAddressPrefix.should.equal(microsoftPeeringProp.secondaryAddress);
              peering.vlanId.should.equal(microsoftPeeringProp.vlanId);
              peering.microsoftPeeringConfig.customerASN.should.equal(microsoftPeeringProp.msCustomerAsn);
              peering.microsoftPeeringConfig.routingRegistryName.should.equal(microsoftPeeringProp.msRoutingRegistryName);

              networkUtil.shouldBeSucceeded(peering);
              done();
            });
          });
        });
      });

      it('set should modify express-route private peering', function (done) {
        var cmd = util.format('network express-route peering set {group} {expressRCName} {peeringName} -i {newVlanId} --json')
          .formatArgs(privatePeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(privatePeeringProp.peeringName);
          peering.peeringType.should.equal(privatePeeringProp.type);
          peering.peerASN.should.equal(privatePeeringProp.peerAsn);
          peering.primaryPeerAddressPrefix.should.equal(privatePeeringProp.primaryAddress);
          peering.secondaryPeerAddressPrefix.should.equal(privatePeeringProp.secondaryAddress);
          peering.vlanId.should.equal(privatePeeringProp.newVlanId);
          done();
        });
      });
      it('set should modify express-route public peering', function (done) {
        var cmd = util.format('network express-route peering set {group} {expressRCName} {peeringName} -i {newVlanId} --json')
          .formatArgs(publicPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(publicPeeringProp.peeringName);
          peering.peeringType.should.equal(publicPeeringProp.type);
          peering.peerASN.should.equal(publicPeeringProp.peerAsn);
          peering.primaryPeerAddressPrefix.should.equal(publicPeeringProp.primaryAddress);
          peering.secondaryPeerAddressPrefix.should.equal(publicPeeringProp.secondaryAddress);
          peering.vlanId.should.equal(publicPeeringProp.newVlanId);
          done();
        });
      });
      it('set should modify express-route microsoft peering', function (done) {
        var cmd = util.format('network express-route peering set {group} {expressRCName} {peeringName} -i {newVlanId} ' +
          '-l {newMsCustomerAsn} -u {newMsRoutingRegistryName} --json').formatArgs(microsoftPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(microsoftPeeringProp.peeringName);
          peering.peeringType.should.equal(microsoftPeeringProp.type);
          peering.peerASN.should.equal(microsoftPeeringProp.peerAsn);
          peering.primaryPeerAddressPrefix.should.equal(microsoftPeeringProp.primaryAddress);
          peering.secondaryPeerAddressPrefix.should.equal(microsoftPeeringProp.secondaryAddress);
          peering.vlanId.should.equal(microsoftPeeringProp.newVlanId);
          peering.microsoftPeeringConfig.customerASN.should.equal(microsoftPeeringProp.newMsCustomerAsn);
          peering.microsoftPeeringConfig.routingRegistryName.should.equal(microsoftPeeringProp.newMsRoutingRegistryName);
          done();
        });
      });

      it('show should display details of private express-route peering', function (done) {
        var cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(privatePeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(privatePeeringProp.peeringName);
          networkUtil.shouldBeSucceeded(peering);
          done();
        });
      });
      it('show should display details of public express-route peering', function (done) {
        var cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(publicPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(publicPeeringProp.peeringName);
          networkUtil.shouldBeSucceeded(peering);
          done();
        });
      });
      it('show should display details of microsoft express-route peering', function (done) {
        var cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(microsoftPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var peering = JSON.parse(result.text);
          peering.name.should.equal(microsoftPeeringProp.peeringName);
          networkUtil.shouldBeSucceeded(peering);
          done();
        });
      });

      it('list should display all express-routes peerings from resource group', function (done) {
        var cmd = 'network express-route peering list {group} {name} --json'.formatArgs(circuitProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          var allPeering = JSON.parse(result.text);
          _.some(allPeering, function (res) {
            return res.name === privatePeeringProp.peeringName;
          }).should.be.true;
          _.some(allPeering, function (res) {
            return res.name === publicPeeringProp.peeringName;
          }).should.be.true;
          _.some(allPeering, function (res) {
            return res.name === microsoftPeeringProp.peeringName;
          }).should.be.true;
          done();
        });
      });

      it('delete should delete private express-route peering', function (done) {
        var cmd = 'network express-route peering delete {group} {expressRCName} {peeringName} -q --json'.formatArgs(privatePeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(privatePeeringProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('delete should delete public express-route peering', function (done) {
        var cmd = 'network express-route peering delete {group} {expressRCName} {peeringName} -q --json'.formatArgs(publicPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(publicPeeringProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('delete should delete microsoft express-route peering', function (done) {
        var cmd = 'network express-route peering delete {group} {expressRCName} {peeringName} -q --json'.formatArgs(microsoftPeeringProp);
        testUtils.executeCommand(suite, retry, cmd, function (result) {
          result.exitStatus.should.equal(0);
          cmd = 'network express-route peering show {group} {expressRCName} {peeringName} --json'.formatArgs(microsoftPeeringProp);
          testUtils.executeCommand(suite, retry, cmd, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
    });
  });
});