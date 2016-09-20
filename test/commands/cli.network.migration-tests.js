'use strict';

var should = require('should');
var util = require('util');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var testPrefix = 'cli.network.migration-tests';
var networkTestUtil = require('../util/asmNetworkTestUtil');

var vnetPrefix = 'CliTestVnet',
  vnetAddressSpace = '10.0.0.0',
  vnetCidr = '20',
  subnetStartIp = '10.0.0.0',
  subnetCidr = '23',
  location;

var ripPrefix = 'cliTestRip',
    nsgPrefix = 'cliTestNSG',
    rtPrefix  = 'cliTestRT';

var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'West US'
}];

describe('cli', function() {
  describe('network', function () {
    var suite, timeout, retry = 5, hour = 60 * 60000;
    var networkUtil = new networkTestUtil();

    before(function (done) {
      suite = new CLITest(this, testPrefix, requiredEnvironment);
      suite.setupSuite(function () {
        vnetPrefix = suite.generateId(vnetPrefix, null);
        ripPrefix = suite.generateId(ripPrefix, null);
        nsgPrefix = suite.generateId(nsgPrefix, null);
        rtPrefix = suite.generateId(rtPrefix, null);
        timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
        done();
      });
    });
    after(function (done) {
      this.timeout(hour);
      networkUtil.deleteRIP(ripPrefix, suite, function () {
        networkUtil.deleteVnet(vnetPrefix, suite, function () {
          networkUtil.deleteNSG(nsgPrefix, suite, function () {
            networkUtil.deleteRouteTable(rtPrefix, suite, function () {
              suite.teardownSuite(done);
            });
          })
        });
      });
    });
    beforeEach(function (done) {
      suite.setupTest(function () {
        location = process.env.AZURE_VM_TEST_LOCATION;
        done();
      });
    });
    afterEach(function (done) {
      suite.teardownTest(done);
    });

    describe('vnet', function() {
      this.timeout(hour);
      it('validate migration should pass', function(done) {
        networkUtil.createVnet(vnetPrefix, vnetAddressSpace, vnetCidr, subnetStartIp, subnetCidr, location, timeout, suite, function() {
          var cmd = util.format('network vnet validate-migration %s --json', vnetPrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('prepare migration should pass', function(done) {
        var cmd = util.format('network vnet prepare-migration %s --json', vnetPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('abort migration should pass', function(done) {
        var cmd = util.format('network vnet abort-migration %s --json', vnetPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    describe('reserved-ip', function() {
      this.timeout(hour);
      it('validate migration should pass', function(done) {
        networkUtil.createReservedIp(ripPrefix, location, suite, function() {
          var cmd = util.format('network reserved-ip validate-migration %s --json', ripPrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('prepare migration should pass', function(done) {
        var cmd = util.format('network reserved-ip prepare-migration %s --json', ripPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('abort migration should pass', function(done) {
        var cmd = util.format('network reserved-ip abort-migration %s --json', ripPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    describe('nsg', function() {
      this.timeout(hour);
      it('validate migration should pass', function(done) {
        networkUtil.createNSG(nsgPrefix, location, suite, function() {
          var cmd = util.format('network nsg validate-migration %s --json', nsgPrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('prepare migration should pass', function(done) {
        var cmd = util.format('network nsg prepare-migration %s --json', nsgPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('abort migration should pass', function(done) {
        var cmd = util.format('network nsg abort-migration %s --json', nsgPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });

    describe('route-table', function() {
      this.timeout(hour);
      it('validate migration should pass', function(done) {
        networkUtil.createRouteTable(rtPrefix, location, suite, function() {
          var cmd = util.format('network route-table validate-migration %s --json', rtPrefix).split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
      it('prepare migration should pass', function(done) {
        var cmd = util.format('network route-table prepare-migration %s --json', rtPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
      it('abort migration should pass', function(done) {
        var cmd = util.format('network route-table abort-migration %s --json', rtPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });
    });
  });
});