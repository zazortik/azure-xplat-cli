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

var CLITest = require('../framework/cli-test');

var suite;
var testPrefix = 'cli.network-tests';

describe('cli', function () {
  describe('network', function() {
    before(function (done) {
      suite = new CLITest(testPrefix);
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

    describe('dnsserver', function () {
      var dnsIp = '10.0.0.1';

      afterEach(function (done) {
        suite.execute('network dnsserver unregister %s --quiet --json', dnsIp, function () {
          done();
        });
      });

      it('should create and list', function (done) {
        suite.execute('network dnsserver register %s --json', dnsIp, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          suite.execute('network dnsserver list --json', function (result) {
            result.exitStatus.should.equal(0);

            var dnsservers = JSON.parse(result.text);
            dnsservers.some(function (v) {
              return v.IPAddress === dnsIp;
            }).should.equal(true);

            done();
          });
        });
      });
    });

    describe('vnet', function () {
      var vnetName = 'vnet1';

      afterEach(function (done) {
        suite.execute('network vnet delete %s --quiet --json', vnetName, function () {
          done();
        });
      });

      it('should create basic vnet, show and list', function (done) {
        suite.execute('network vnet create %s --address-space 10.0.0.0 --json --location %s',
          vnetName,
          'West US',
          function (result) {

          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          suite.execute('network vnet list --json', function (result) {
            result.exitStatus.should.equal(0);

            var vnets = JSON.parse(result.text);
            var vnet = vnets.filter(function (v) {
              return v.Name === vnetName;
            })[0];

            vnet.should.not.equal(null);
            vnet.State.should.equal('Created');
            vnet.AddressSpace.AddressPrefixes[0].should.equal('10.0.0.0/8');
            vnet.Subnets[0].Name.should.equal('Subnet-1');
            vnet.Subnets[0].AddressPrefix.should.equal('10.0.0.0/11');

            suite.execute('network vnet show %s --json', vnetName, function (result) {
              result.exitStatus.should.equal(0);

              var vnet = JSON.parse(result.text);
              vnet.should.not.equal(null);
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

        suite.execute('network dnsserver register %s --json --dns-id %s', dnsIp, dnsId, function (result) {
          result.text.should.not.be.null;
          result.exitStatus.should.equal(0);

          suite.execute('network dnsserver list --json', function (result) {
            result.exitStatus.should.equal(0);

            var dnsservers = JSON.parse(result.text);
            var dnsserver = dnsservers.filter(function (v) {
              return v.Name === dnsId;
            })[0];

            dnsserver.should.not.equal(null);

            suite.execute('network vnet create %s --address-space 10.0.0.0 --json --location %s --dns-server-id %s',
              vnetName,
              'West US',
              dnsId,
              function (result) {

              result.text.should.not.be.null;
              result.exitStatus.should.equal(0);

              suite.execute('network vnet show %s --json', vnetName, function (result) {
                result.exitStatus.should.equal(0);

                var vnet = JSON.parse(result.text);
                vnet.should.not.equal(null);
                vnet.State.should.equal('Created');
                vnet.Dns.DnsServers[0].Name.should.equal(dnsId);

                suite.execute('network vnet delete %s --quiet --json', vnetName, function () {
                  suite.execute('network dnsserver unregister %s --quiet --json', dnsIp, function () {
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