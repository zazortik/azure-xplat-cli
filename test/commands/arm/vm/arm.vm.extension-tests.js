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
var testUtils = require('../../../util/util');
var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-vm-extension-tests';
var groupPrefix = 'xplatTestGExtension';
var VMTestUtil = require('../../../util/vmTestUtil');
var requiredEnvironment = [{
  name: 'AZURE_VM_TEST_LOCATION',
  defaultValue: 'eastus'
}];
var groupName,
  vmPrefix = 'xplatvmExt',
  nicName = 'xplatnicExt',
  location,
  username = 'azureuser',
  password = 'Brillio@2015',
  storageAccount = 'xplatstoragext',
  storageCont = 'xplatstoragecntext',
  osdiskvhd = 'xplatvhdext',
  vNetPrefix = 'xplatvnetExt',
  subnetName = 'xplatsubnetExt',
  publicipName = 'xplatipExt',
  dnsPrefix = 'xplatdnsext',
  extension = 'VMAccessAgent',
  publisherExt = 'Microsoft.Compute',
  version = '2.0',
  IaasDiagPublisher,
  IaasDiagExtName,
  IaasDiagVersion,
  bgInfoExtension = 'BGInfo',
  bgInfoExtensionVersion = '2.1',
  clientConfig = 'test/data/set-chef-extension-client-config.rb',
  validationPem = 'test/data/set-chef-extension-validation.pem',
  datafile = 'test/data/testdata.json';

describe('arm', function() {
  describe('compute', function() {

    var suite, retry = 5;
    var vmTest = new VMTestUtil();
    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);
      suite.setupSuite(function() {
        location = process.env.AZURE_VM_TEST_LOCATION;
        groupName = suite.generateId(groupPrefix, null);
        vmPrefix = suite.isMocked ? vmPrefix : suite.generateId(vmPrefix, null);
        nicName = suite.isMocked ? nicName : suite.generateId(nicName, null);
        storageAccount = suite.generateId(storageAccount, null);
        storageCont = suite.generateId(storageCont, null);
        osdiskvhd = suite.isMocked ? osdiskvhd : suite.generateId(osdiskvhd, null);
        vNetPrefix = suite.isMocked ? vNetPrefix : suite.generateId(vNetPrefix, null);
        subnetName = suite.isMocked ? subnetName : suite.generateId(subnetName, null);
        publicipName = suite.isMocked ? publicipName : suite.generateId(publicipName, null);
        dnsPrefix = suite.generateId(dnsPrefix, null);

        // Get real values from test/data/testdata.json file and assign to the local variables
        var data = fs.readFileSync(datafile, 'utf8');
        var variables = JSON.parse(data);
        IaasDiagPublisher = variables.IaasDiagPublisher_windows.value;
        IaasDiagExtName = variables.IaasDiagExtName_windows.value;
        IaasDiagVersion = variables.IaasDiagVersion_windows.value;

        done();
      });
    });

    after(function(done) {
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

    describe('vm', function() {

      it('create for extension get and set', function(done) {
        this.timeout(vmTest.timeoutLarge);
        vmTest.checkImagefile(function() {
          vmTest.createGroup(groupName, location, suite, function(result) {
            if (VMTestUtil.winImageUrn === '' || VMTestUtil.winImageUrn === undefined || VMTestUtil.winImageUrn === "undefined") {
              vmTest.GetWindowsSkusList(location, suite, function(result) {
                vmTest.GetWindowsImageList(location, suite, function(result) {
                  var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --json',
                    groupName, vmPrefix, location, nicName, VMTestUtil.winImageUrn, username, password, storageAccount, storageCont,
                    vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix).split(' ');
                  testUtils.executeCommand(suite, retry, cmd, function(result) {
                    result.exitStatus.should.equal(0);
                    done();
                  });
                });
              });
            } else {
              var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --json',
                groupName, vmPrefix, location, nicName, VMTestUtil.winImageUrn, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            }
          });
        });
      });

      it('Uninstall the default BGInfo extension', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension set %s %s %s %s %s -u -q --json', groupName, vmPrefix, bgInfoExtension, publisherExt, bgInfoExtensionVersion).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Enable diagnostics extension on created VM in a resource group', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm enable-diag %s %s -a %s --json', groupName, vmPrefix, storageAccount).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Check diagnostics extension on created VM should pass', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension get %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].publisher.should.equal(IaasDiagPublisher);
          allResources[0].name.should.equal(IaasDiagExtName);
          //allResources[0].typeHandlerVersion.should.equal(IaasDiagVersion);
          done();
        });
      });

      //Set extensions
      it('Set extensions for the created vm', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension set %s %s %s %s %s --json', groupName, vmPrefix, extension, publisherExt, version).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('Extension Get should list all extensions', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension get %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[1].publisher.should.equal(publisherExt);
          allResources[1].name.should.equal(extension);
          allResources[1].typeHandlerVersion.should.equal(version);
          done();
        });
      });

      //Set chef extension
      it('Set Chef extension for the created vm', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension set-chef %s %s --client-config %s --validation-pem %s --json', groupName, vmPrefix, clientConfig, validationPem).split(' ');

        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });


      //Get chef extension
      it('Extension Get-Chef should list only chef extension', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension get-chef %s %s --json', groupName, vmPrefix).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          var allResources = JSON.parse(result.text);
          allResources[0].publisher.should.equal('Chef.Bootstrap.WindowsAzure');
          allResources[0].name.should.equal('ChefClient');
          done();
        });
      });

      it('Uninstall the set extension', function(done) {
        this.timeout(vmTest.timeoutLarge);
        var cmd = util.format('vm extension set %s %s %s %s %s -u -q --json', groupName, vmPrefix, extension, publisherExt, version).split(' ');
        testUtils.executeCommand(suite, retry, cmd, function(result) {
          result.exitStatus.should.equal(0);
          done();
        });
      });

      it('create for extension get and set without bginfo extension', function(done) {
        this.timeout(vmTest.timeoutLarge);
        if (VMTestUtil.winImageUrn === '' || VMTestUtil.winImageUrn === undefined || VMTestUtil.winImageUrn === "undefined") {
          vmTest.GetWindowsSkusList(location, suite, function(result) {
            vmTest.GetWindowsImageList(location, suite, function(result) {
              var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --disable-bginfo-extension --json',
                groupName, vmPrefix + 'nobginfo', location, nicName, VMTestUtil.winImageUrn, username, password, storageAccount, storageCont,
                vNetPrefix, '10.0.0.0/16', subnetName, '10.0.0.0/24', publicipName, dnsPrefix).split(' ');
              testUtils.executeCommand(suite, retry, cmd, function(result) {
                result.exitStatus.should.equal(0);
                done();
              });
            });
          });
        } else {
          var cmd = util.format('vm create %s %s %s Windows -f %s -Q %s -u %s -p %s -o %s -R %s -F %s -P %s -j %s -k %s -i %s -w %s --disable-bginfo-extension --json',
            groupName, vmPrefix + '2', location, nicName + '2', VMTestUtil.winImageUrn, username, password, storageAccount, storageCont,
            vNetPrefix + '2', '10.0.0.0/16', subnetName + '2', '10.0.0.0/24', publicipName + '2', dnsPrefix + '2').split(' ');
          testUtils.executeCommand(suite, retry, cmd, function(result) {
            result.exitStatus.should.equal(0);
            done();
          });
        }
      });

    });
  });
});
