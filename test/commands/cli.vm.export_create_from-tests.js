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
var fs = require('fs');
var testUtils = require('../util/util');
var CLITest = require('../framework/cli-test');
var vmTestUtil = require('../util/asmVMTestUtil');

var suite;
var vmPrefix = 'ClitestVm';
var createdVms = [];
var testPrefix = 'cli.vm.export_create_from-tests';

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
            diskreleasetimeout = 200000,
            file = 'vminfo.json',
            retry = 5;
        testUtils.TIMEOUT_INTERVAL = 5000;
        var vmUtil = new vmTestUtil();

        var vmToUse = {
            Name: null,
            Created: false,
            Delete: false,
            blobDelete: false
        };

        before(function(done) {
            suite = new CLITest(this, testPrefix, requiredEnvironment);
			//location = process.env.AZURE_VM_TEST_LOCATION;
			location = 'West US';
            timeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
            diskreleasetimeout = suite.isPlayback() ? 0 : testUtils.TIMEOUT_INTERVAL;
            suite.setupSuite(done);
        });

        after(function(done) {
            suite.teardownSuite(done);
        });

        beforeEach(function(done) {
            suite.setupTest(function() {
                vmName = suite.generateId(vmPrefix, createdVms);
                done();
            });
        });

        afterEach(function(done) {
            vmUtil.deleteUsedVMExport(vmToUse, timeout, suite, function() {
                suite.teardownTest(done);
            });
        });

        //create a vm from role file
        describe('VM:', function() {
            it('export and delete', function(done) {
                vmUtil.ListDisk('Linux', location, suite, function(diskObj) {
                    vmUtil.createVMExport(vmName, username, password, location, timeout, vmToUse, suite, function() {
                        var domainUrl = 'http://' + diskObj.mediaLinkUri.split('/')[2];
                        var blobUrl = domainUrl + '/disks/' + suite.generateId(vmPrefix, null) + '.vhd';
                        var cmd1 = util.format('vm disk attach-new %s %s %s --json', vmName, 1, blobUrl).split(' ');
                        testUtils.executeCommand(suite, retry, cmd1, function(innerresult) {
                            innerresult.exitStatus.should.equal(0);
                            var cmd = util.format('vm export %s %s --json', vmName, file).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                                result.exitStatus.should.equal(0);
                                fs.existsSync(file).should.equal(true);
                                vmToUse.Delete = true;
                                setTimeout(done, timeout);
                            });
                        });
                    });
                });
            });

            it('Create-from a file', function(done) {
                vmUtil.checkFreeDisk(suite, function(diskname) {
                    var Fileresult = fs.readFileSync(file, 'utf8');
                    var obj = JSON.parse(Fileresult);
                    obj['RoleName'] = vmName;
                    obj['roleName'] = vmName;

                    if (diskname)
                        obj.oSVirtualHardDisk.name = diskname;

                    else
                        diskname = obj.oSVirtualHardDisk.name;

                    diskname = obj.dataVirtualHardDisks[0].name;
                    vmUtil.waitForDiskRelease(diskname, timeout, diskreleasetimeout, suite, function() {
                        var jsonstr = JSON.stringify(obj);
                        fs.writeFileSync(file, jsonstr);
                        var cmd = util.format('vm create-from %s %s --json', vmName, file).split(' ');
                        cmd.push('-l');
                        cmd.push(location);
                        testUtils.executeCommand(suite, retry, cmd, function(result) {
                            result.exitStatus.should.equal(0);

                            cmd = util.format('vm show %s --json', obj['roleName']).split(' ');
                            testUtils.executeCommand(suite, retry, cmd, function(result) {
                                result.exitStatus.should.equal(0);
                                var vmObj = JSON.parse(result.text);
                                vmObj.DataDisks[0].should.not.be.null;
                                vmToUse.Name = vmName;
                                vmToUse.Created = true;
                                fs.unlinkSync('vminfo.json');
                                vmToUse.Delete = true;
                                vmToUse.blobDelete = true;
                                setTimeout(done, timeout);
                            });
                        });
                    });
                });
            });
        });
      
    });
});