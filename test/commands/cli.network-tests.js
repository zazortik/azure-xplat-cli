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

var executeCommand = require('../framework/cli-executor').execute;
var MockedTestUtils = require('../framework/mocked-test-utils');

var suiteUtil;
var testPrefix = 'cli.network-tests';

var executeCmd = function (cmd, callback) {
  if (suiteUtil.isMocked && !suiteUtil.isRecording) {
    cmd.push('-s');
    cmd.push(process.env.AZURE_SUBSCRIPTION_ID);
  }

  executeCommand(cmd, callback);
};

describe('cli', function(){
  describe('network', function() {
    before(function (done) {
      suiteUtil = new MockedTestUtils(testPrefix);
      suiteUtil.setupSuite(done);
    });

    after(function (done) {
      suiteUtil.teardownSuite(done);
    });

    beforeEach(function (done) {
      suiteUtil.setupTest(done);
    });

    afterEach(function (done) {
      suiteUtil.teardownTest(done);
    });

    describe('dnsserver', function () {
      var dnsIp = '10.0.0.1';

      afterEach(function (done) {
        var cmd = ('node cli.js network dnsserver unregister ' + dnsIp + ' --quiet --json').split(' ');
        executeCmd(cmd, function () {
          done();
        });
      });

      it('should create and list', function (done) {
        var cmd = ('node cli.js network dnsserver register ' + dnsIp + ' --json').split(' ');
        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          cmd = ('node cli.js network dnsserver list --json').split(' ');
          executeCmd(cmd, function (result) {
            result.exitStatus.should.equal(0);

            var dnsservers = JSON.parse(result.text);
            var dnsserver = dnsservers.filter(function (v) {
              return v.IPAddress === dnsIp;
            })[0];

            should.exist(dnsserver);

            done();
          });
        });
      });
    });

    describe('vnet', function () {
      var vnetName = 'vnet1';

      afterEach(function (done) {
        var cmd = ('node cli.js network vnet delete ' + vnetName + ' --quiet --json').split(' ');
        executeCmd(cmd, function () {
          done();
        });
      });

      it('should create basic vnet, show and list', function (done) {
        var cmd = ('node cli.js network vnet create ' + vnetName + ' --address-space 10.0.0.0 --json').split(' ');
        cmd.push('--location');
        cmd.push('West US');

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          cmd = ('node cli.js network vnet list --json').split(' ');
          executeCmd(cmd, function (result) {
            result.exitStatus.should.equal(0);

            var vnets = JSON.parse(result.text);
            var vnet = vnets.filter(function (v) {
              return v.Name === vnetName;
            })[0];

            should.exist(vnet);
            vnet.State.should.equal('Created');
            vnet.AddressSpace.AddressPrefixes[0].should.equal('10.0.0.0/8');
            vnet.Subnets[0].Name.should.equal('Subnet-1');
            vnet.Subnets[0].AddressPrefix.should.equal('10.0.0.0/11');

            cmd = ('node cli.js network vnet show ' + vnetName + ' --json').split(' ');
            executeCmd(cmd, function (result) {
              result.exitStatus.should.equal(0);

              var vnet = JSON.parse(result.text);
              should.exist(vnet);
              vnet.State.should.equal('Created');
              vnet.AddressSpace.AddressPrefixes[0].should.equal('10.0.0.0/8');
              vnet.Subnets[0].Name.should.equal('Subnet-1');
              vnet.Subnets[0].AddressPrefix.should.equal('10.0.0.0/11');

              done();
            });
          });
        });
      });
	  
      it('should create vnet with dns-server-id option and show', function (done) {
        var dnsIp = '66.77.88.99';
        var dnsId = 'dns-cli-0';

        var cmd = ('node cli.js network dnsserver register ' + dnsIp + ' --json').split(' ');
        cmd.push('--dns-id');
        cmd.push(dnsId);

        executeCmd(cmd, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          cmd = ('node cli.js network dnsserver list --json').split(' ');
          executeCmd(cmd, function (result) {
            result.exitStatus.should.equal(0);

            var dnsservers = JSON.parse(result.text);
            var dnsserver = dnsservers.filter(function (v) {
              return v.Name === dnsId;
            })[0];

            should.exist(dnsserver);
            var cmd = ('node cli.js network vnet create ' + vnetName + ' --address-space 10.0.0.0 --json').split(' ');
            cmd.push('--location');
            cmd.push('West US');
            cmd.push('--dns-server-id');
            cmd.push(dnsId);

            executeCmd(cmd, function (result) {
              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);
              cmd = ('node cli.js network vnet show ' + vnetName + ' --json').split(' ');
              executeCmd(cmd, function (result) {
                result.exitStatus.should.equal(0);

                var vnet = JSON.parse(result.text);
                should.exist(vnet);
                vnet.State.should.equal('Created');
                vnet.Dns.DnsServers[0].Name.should.equal(dnsId);
                cmd = ('node cli.js network vnet delete ' + vnetName + ' --quiet --json').split(' ');
                executeCmd(cmd, function () {
                  cmd = ('node cli.js network dnsserver unregister ' + dnsIp + ' --quiet --json').split(' ');
                  executeCmd(cmd, function () {
                    done();
                  });
                })
              });
            });
          });
        });
      });
    });
  });
});
