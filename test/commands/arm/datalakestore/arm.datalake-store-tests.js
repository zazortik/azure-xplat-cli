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
var util = require('util');
var fs = require('fs')

var CLITest = require('../../../framework/arm-cli-test');
var log = require('../../../framework/test-logger');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testPrefix = 'arm-cli-datalake-store-tests';
var accountPrefix = 'xplattestadls';
var knownNames = [];

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_TEST_LOCATION',
  defaultValue: 'East US 2'
}, {
  name: 'AZURE_ARM_TEST_RESOURCE_GROUP',
  defaultValue: 'xplattestadlsrg01'
}
];

var suite;
var testLocation;
var testResourceGroup;
var secondResourceGroup;

var accountName;
var filesystemAccountName;

// filesystem variables
var content = 'adls cli test content!';
var contentDir = '.\\importTest.txt';
var firstFolder = 'adlsclifolder01';
var noContentFile = firstFolder + '/emptyfile.txt';
var contentFile = firstFolder + '/contentfile.txt';
var importFile = firstFolder + '/importfile.txt';
var concatFile = firstFolder + '/concatfile.txt';
var moveFolder = 'adlsclifolder02';
var moveFile = firstFolder + '/movefile.txt';

describe('arm', function () {
  before(function (done) {
    suite = new CLITest(this, testPrefix, requiredEnvironment);
    suite.setupSuite(function () {    
      testLocation = process.env.AZURE_ARM_TEST_LOCATION;
      testLocation = testLocation.toLowerCase().replace(/ /g, '');
      testResourceGroup = process.env.AZURE_ARM_TEST_RESOURCE_GROUP;
      secondResourceGroup = suite.generateId(accountPrefix, knownNames);
      accountName = suite.generateId(accountPrefix, knownNames);
      filesystemAccountName = suite.generateId(accountPrefix, knownNames);
      fs.writeFileSync(contentDir, content);
      if(!suite.isPlayback()) {
        suite.execute('group create %s --location %s --json', testResourceGroup, testLocation, function () {
          suite.execute('group create %s --location %s --json', secondResourceGroup, testLocation, function () {
            suite.execute('datalake store account create --accountName %s --resource-group %s --location %s --json', filesystemAccountName, testResourceGroup, testLocation, function () {
              done();
            });
          });
        });
      }
      else {
        done();
      }
    });
  });


  after(function (done) {
    fs.unlinkSync(contentDir);
    if(!suite.isPlayback()) {
      suite.execute('group delete %s --quiet --json', testResourceGroup, function () {
        suite.execute('group delete %s --quiet --json', secondResourceGroup, function () {
          suite.teardownSuite(done);
        });
      });
    }
    else {
      suite.teardownSuite(done);
    }
  });

  beforeEach(function (done) {
    suite.setupTest(done);
  });

  afterEach(function (done) {
    suite.teardownTest(done);
  });

  describe('Data Lake Store Account', function () {
    it('create command should work', function (done) {
      var tags = 'testtag1=testvalue1;testtag2=testvalue2';
      suite.execute('datalake store account create --accountName %s --resource-group %s --location %s --tags %s --json', accountName, testResourceGroup, testLocation, tags, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        Object.keys(accountJson.tags).length.should.be.equal(2);
        done();
      });
    });

    it('create account with same name should fail', function (done) {
      suite.execute('datalake store account create --accountName %s --resource-group %s --location %s --json', accountName, secondResourceGroup, testLocation, function (result) {
        result.exitStatus.should.be.equal(1);
        result.errorText.should.include('belong to another owner'); // note: this error message needs to be updated. once it is, this test will need to be updated as well.
        done();
      });
    });

    it('show command should work', function (done) {
      suite.execute('datalake store account show --accountName %s --resource-group %s --json', accountName, testResourceGroup, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        
        // run it without requiring the resource group as well
        suite.execute('datalake store account show --accountName %s --json', accountName, function (result) {
          result.exitStatus.should.be.equal(0);
          var accountJson = JSON.parse(result.text);
          accountJson.name.should.be.equal(accountName);
          done();
        });
      });
    });

    it('list commands should work', function (done) {
      suite.execute('datalake store account list --json', function (result) {
        result.exitStatus.should.be.equal(0);
        var accountList = JSON.parse(result.text);
        accountList.length.should.be.above(0);
        
        // list within resource group as well.
        suite.execute('datalake store account list --resource-group %s --json', testResourceGroup, function (result) {
          result.exitStatus.should.be.equal(0);
          var accountList = JSON.parse(result.text);
          accountList.length.should.be.above(0);
          done();
        });
      });
    });

    it('updating the account should work', function (done) {
      var tags = 'testtag1=testvalue1;testtag2=testvalue2;testtag3=testvalue3';
      suite.execute('datalake store account set --accountName %s --resource-group %s --tags %s --json', accountName, testResourceGroup, tags, function (result) {
        result.exitStatus.should.be.equal(0);
        var accountJson = JSON.parse(result.text);
        accountJson.name.should.be.equal(accountName);
        Object.keys(accountJson.tags).length.should.be.equal(3);
        done();
      });
    });
    
    it('Delete command should work', function (done) {
      suite.execute('datalake store account delete --accountName %s --quiet --json', accountName, function (result) {
        result.exitStatus.should.be.equal(0);
        suite.execute('datalake store account show --accountName %s --json', accountName, function (result) {
          // confirm that the account no longer exists
          result.exitStatus.should.be.equal(1);
          done();
        });
      });
    });
  });
  describe('Data Lake Store FileSystem', function () {
    it('create and show commands should work', function (done) {
      // create a folder
      suite.execute('datalake store filesystem create --accountName %s --path %s --folder --json', filesystemAccountName, firstFolder, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the folder.
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, firstFolder, function (result) {
          result.exitStatus.should.be.equal(0);
          var folderJson = JSON.parse(result.text);
          folderJson.type.should.be.equal('DIRECTORY');
          folderJson.length.should.be.equal(0);
          
          // create a file with no contents inside of the folder
          suite.execute('datalake store filesystem create --accountName %s --path %s --json', filesystemAccountName, noContentFile, function (result) {
            result.exitStatus.should.be.equal(0);
            // now get the file.
            suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, noContentFile, function (result) {
              result.exitStatus.should.be.equal(0);
              var folderJson = JSON.parse(result.text);
              folderJson.type.should.be.equal('FILE');
              folderJson.length.should.be.equal(0);
              
              // create a file with contents
              suite.execute('datalake store filesystem create --accountName %s --path %s --value %s --json', filesystemAccountName, contentFile, content, function (result) {
                result.exitStatus.should.be.equal(0);
                // now get the file.
                suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, contentFile, function (result) {
                  result.exitStatus.should.be.equal(0);
                  var folderJson = JSON.parse(result.text);
                  folderJson.type.should.be.equal('FILE');
                  folderJson.length.should.be.equal(content.length);
                  
                  // list the contents of the folder, there should be two entries
                  suite.execute('datalake store filesystem list --accountName %s --path %s --json', filesystemAccountName, firstFolder, function (result) {
                    result.exitStatus.should.be.equal(0);
                    var folderJson = JSON.parse(result.text);
                    folderJson.length.should.be.equal(2);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    
    it('import and export should work', function (done) {
      suite.execute('datalake store filesystem import --accountName %s --path %s --destination %s --json', filesystemAccountName, contentDir, importFile, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the file.
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, importFile, function (result) {
          result.exitStatus.should.be.equal(0);
          var folderJson = JSON.parse(result.text);
          folderJson.type.should.be.equal('FILE');
          folderJson.length.should.be.equal(content.length);
          
          // now download the file and make sure it is equal to the content.
          // note we download the file to overwrite the existing file
          // to reduce our footprint on the local filesytem.
          suite.execute('datalake store filesystem export --accountName %s --path %s --destination %s --force --json', filesystemAccountName, importFile, contentDir, function (result) {
            result.exitStatus.should.be.equal(0);
            var downloadedContents = fs.readFileSync(contentDir, 'utf8');
            downloadedContents.should.be.equal(content);
            done();
          });
        });
      });
    });

    it('add content should work', function (done) {
      suite.execute('datalake store filesystem addcontent --accountName %s --path %s --value %s --json', filesystemAccountName, noContentFile, content, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the file.
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, noContentFile, function (result) {
          result.exitStatus.should.be.equal(0);
          var folderJson = JSON.parse(result.text);
          folderJson.type.should.be.equal('FILE');
          folderJson.length.should.be.equal(content.length);
          done();
        });
      });
    });
    
    it('concat should work', function (done) {
      var concatPaths = noContentFile + ',' + contentFile;
      suite.execute('datalake store filesystem concat --accountName %s --paths %s --destination %s --json', filesystemAccountName, concatPaths, concatFile, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the file.
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, concatFile, function (result) {
          result.exitStatus.should.be.equal(0);
          var folderJson = JSON.parse(result.text);
          folderJson.type.should.be.equal('FILE');
          folderJson.length.should.be.equal(content.length*2);
          done();
        });
      });
    });
    
    it('read should work', function (done) {
      var contentFromRead = content + content[0];
      var regexPattern = /.*data:(\s+)(.+)/ig
      suite.execute('datalake store filesystem read --accountName %s --path %s --length %s --offset 0', filesystemAccountName, concatFile, content.length + 1, function (result) {
        result.exitStatus.should.be.equal(0);
        var matches = regexPattern.exec(result.text);
        matches.should.be.ok;
        matches[2].should.be.equal(contentFromRead);
        done();
      });
    });
    
    it('move commands should work', function (done) {
      // move a file
      suite.execute('datalake store filesystem move --accountName %s --path %s --destination %s --json', filesystemAccountName, concatFile, moveFile, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the moved file.
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, moveFile, function (result) {
          result.exitStatus.should.be.equal(0);
          var folderJson = JSON.parse(result.text);
          folderJson.type.should.be.equal('FILE');
          folderJson.length.should.be.equal(content.length * 2);
          
          // get the old file path (should fail)
          suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, concatFile, function (result) {
            result.exitStatus.should.be.equal(1);
            // now move the whole folder
            suite.execute('datalake store filesystem move --accountName %s --path %s --destination %s --json', filesystemAccountName, firstFolder, moveFolder, function (result) {
              result.exitStatus.should.be.equal(0);
              
              // get the moved folder
              suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, moveFolder, function (result) {
                result.exitStatus.should.be.equal(0);
                var folderJson = JSON.parse(result.text);
                folderJson.type.should.be.equal('DIRECTORY');
                folderJson.length.should.be.equal(0);
                  
                // now get the old folder (should fail)
                suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, firstFolder, function (result) {
                  result.exitStatus.should.be.equal(1);
                  // list the contents of the moved folder, there should be two entries
                  suite.execute('datalake store filesystem list --accountName %s --path %s --json', filesystemAccountName, moveFolder, function (result) {
                    result.exitStatus.should.be.equal(0);
                    var folderJson = JSON.parse(result.text);
                    folderJson.length.should.be.equal(2);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    
    it('delete commands should work', function (done) {
      // delete a file
      suite.execute('datalake store filesystem delete --accountName %s --path %s --quiet --json', filesystemAccountName, moveFile, function (result) {
        result.exitStatus.should.be.equal(0);
        // now get the deleted file, which should fail
        suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, moveFile, function (result) {
          result.exitStatus.should.be.equal(1);
          
          // delete the whole folder
          suite.execute('datalake store filesystem delete --accountName %s --path %s --quiet --recurse --json', filesystemAccountName, moveFolder, function (result) {
            result.exitStatus.should.be.equal(0);
            // now get the folder (should fail)
            suite.execute('datalake store filesystem show --accountName %s --path %s --json', filesystemAccountName, moveFolder, function (result) {
              result.exitStatus.should.be.equal(1);
              done();
            });
          });
        });
      });
    });
  });
  
  describe('Data Lake Store FileSystem Permissions', function () {
    var userIdToUse = '027c28d5-c91d-49f0-98c5-d10134b169b3';
    var permissionToRemove = 'user:' + userIdToUse;
    var permissionToSet = permissionToRemove + ':rwx';
    var permissionToUpdate = permissionToRemove + ':-w-';
    var permissionFolder = '/';
    it('show, set and delete entry commands should work', function (done) {
      // show permissions
      suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
        result.exitStatus.should.be.equal(0);
        var permissionJson = JSON.parse(result.text);
        permissionJson.entries.length.should.be.above(0);
        var initialEntryNum = permissionJson.entries.length;
        permissionJson.owner.should.not.be.empty;
        // now add permissions for a specific user.
        suite.execute('datalake store permissions entry set --accountName %s --path %s --aclEntries %s --quiet --json', filesystemAccountName, permissionFolder, permissionToSet, function (result) {
          result.exitStatus.should.be.equal(0);
          // show permissions again to confirm it was added
          suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
            result.exitStatus.should.be.equal(0);
            var permissionJson = JSON.parse(result.text);
            permissionJson.entries.length.should.be.above(initialEntryNum);
            var newEntryNum = permissionJson.entries.length;
            var foundEntry = false;
            for(var i = 0; i < permissionJson.entries.length; i++) {
              if(permissionJson.entries[i].indexOf(permissionToSet) > -1) {
                foundEntry = true;
                break;
              }
            }
            
            foundEntry.should.be.equal(true);
            
            // modify the existing entry
            suite.execute('datalake store permissions entry set --accountName %s --path %s --aclEntries %s --quiet --json', filesystemAccountName, permissionFolder, permissionToUpdate, function (result) {
              result.exitStatus.should.be.equal(0);
              // show permissions again to confirm it was added
              suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
                result.exitStatus.should.be.equal(0);
                var permissionJson = JSON.parse(result.text);
                permissionJson.entries.length.should.be.equal(newEntryNum);
                var foundEntry = false;
                for(var i = 0; i < permissionJson.entries.length; i++) {
                  if(permissionJson.entries[i].indexOf(permissionToUpdate) > -1) {
                    foundEntry = true;
                    break;
                  }
                }
                
                foundEntry.should.be.equal(true);
                // now remove permissions for a specific user.
                suite.execute('datalake store permissions entry delete --accountName %s --path %s --aclEntries %s --quiet --json', filesystemAccountName, permissionFolder, permissionToRemove, function (result) {
                  result.exitStatus.should.be.equal(0);
                  // show permissions again to confirm it was removed
                  suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
                    result.exitStatus.should.be.equal(0);
                    var permissionJson = JSON.parse(result.text);
                    permissionJson.entries.length.should.be.equal(initialEntryNum);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });
    
    it('show, set and delete full ACL commands should work', function (done) {
      // show permissions
      suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
        result.exitStatus.should.be.equal(0);
        var permissionJson = JSON.parse(result.text);
        permissionJson.entries.length.should.be.above(0);
        var initialEntryNum = permissionJson.entries.length;
        permissionJson.owner.should.not.be.empty;
        var aclSpec = permissionJson.entries.toString();
        // now replace the ACL spec with the exact same ACL spec with the addition of one new user as the default user.
        var aclSpec = aclSpec + ',default:' + permissionToSet;
        suite.execute('datalake store permissions set --accountName %s --path %s --aclSpec %s --quiet --json', filesystemAccountName, permissionFolder, aclSpec, function (result) {
          result.exitStatus.should.be.equal(0);
          // show permissions again to confirm it was added
          suite.execute('datalake store permissions show --accountName %s --path %s --json', filesystemAccountName, permissionFolder, function (result) {
            result.exitStatus.should.be.equal(0);
            var permissionJson = JSON.parse(result.text);
            permissionJson.entries.length.should.be.above(initialEntryNum);
            // now attempt to remove the default permissions from the ACL spec. This is not currently allowed and should fail.
            suite.execute('datalake store permissions delete --accountName %s --path %s --defaultAcl --quiet --json', filesystemAccountName, permissionFolder, function (result) {
              result.exitStatus.should.be.equal(1);
              // now we remove the entire ACL. Currently, we do not have ACLs that are inherited since we only support one root ACL.
              // as such, this will currently fail/be prevented.
              suite.execute('datalake store permissions delete --accountName %s --path %s --quiet --json', filesystemAccountName, permissionFolder, function (result) {
                result.exitStatus.should.be.equal(1);
                done();            
             });
           });
          });
        });
      });
    });
  });
});