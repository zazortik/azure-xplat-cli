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

var os = require('os');
var should = require('should');

var WinTokenStorage = require('../../../lib/util/authentication/win-token-storage');

describe ('Win credentials storage', function () {
	if (os.platform() !== 'win32') {
    console.log('These tests only run on Windows');
    return;
  }
  
	it('is empty after clear is called', function(done) {		
		//create token storage
		var storage = new WinTokenStorage();
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
});