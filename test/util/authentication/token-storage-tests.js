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

var fs = require('fs');
var os = require('os');
var path = require('path');
var uuid = require('node-uuid');

var should = require('should');

var WinTokenStorage = require('../../../lib/util/authentication/win-token-storage');
var OsxTokenStorage = require('../../../lib/util/authentication/osx-token-storage');
var FileTokenStore = require('../../../lib/util/authentication/file-token-storage');

function isWindows() {
  return os.platform() === 'win32';
}

function isOsx() {
  return os.platform() === 'darwin';
}

// This code will look a little weird.
// This function is used to define the actual
// tests for each storage. The outer
// describe calls will call this function to
// hook up the tests to the larger suite.
//
// This allows us to define the actual test criteria
// once and reuse them across multiple different
// storage implementations.
function addStorageTests(storage) {
  it('is empty after clear is called', function(done) {
    //add item to token storage
    var newEntries = [{
    "accessToken" : "ABCD",
    "refreshToken" : "FREFDO",
    "userId" : "foo@microsoft.com",
    "tenantId" : "72f988bf-86f1-45aq-91ab-2d7gd011db47",
    "_authority" : "https://login.windows.net/72f988bf-86f1-45aq-91ab-2d7gd011db47"}];
    storage.addEntries(newEntries, [], function(err) {
      if (err) { return done(err); }
      //verify items in the storage
      storage.loadEntries(function(err, entries) {
        if (err) { return done(err); }
        entries.length.should.be.greaterThan(0);
        //clean the items in the storage
        storage.clear(function(err) {
          if (err) { return done(err); }
          storage.loadEntries(function(err, entries) {
            if (err) { return done(err); }
            entries.should.have.length(0);
            done();
          });
        });
      });
    });
  });
}

// Test for windows, osx storage
[
  ['Win', isWindows, WinTokenStorage],
  ['OSX', isOsx, OsxTokenStorage],
].forEach(function (entry) {
  var title = entry[0];
  var canRun = entry[1];
  var Store = entry[2];

  if (canRun()) {
    describe(title + ' credentials storage', function () {
      var storage = new Store();
      var originalTokenContents;

      before(function (done) {
        // Save contents of token store so we can put it back afterwards
        originalTokenContents = storage.loadEntries(function (err, entries) {
          originalTokenContents = entries;
          done(err);
        });
      });

      after(function (done) {
        storage.clear(function () {
          storage.addEntries(originalTokenContents, [], done);
        });
      });

      addStorageTests(storage);
    });
  }
});

// And test for file storage

// Function to grap temp directory - case of function
// changed from node 0.8 to 0.10, so grab one or the other.
var getTmpDir = (os.tmpdir || os.tmpDir).bind(os);

describe('File credentials storage', function () {
  var tempPath = path.join(getTmpDir(), 'store-' + uuid.v4());

  var storage = new FileTokenStore(tempPath);

  after(function() {
    //delete file
    fs.unlinkSync(tempPath);
  });

  addStorageTests(storage);
});
