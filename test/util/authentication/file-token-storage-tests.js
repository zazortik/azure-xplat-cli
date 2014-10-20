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
var os = require('os');
var fs = require('fs');
var path = require('path');
var uuid = require('node-uuid');

var TokenStore = require('../../../lib/util/authentication/file-token-storage');

describe ('File token storage', function () {
	var tempPath = path.join(os.tmpdir(), 'store-' + uuid.v4());

	after(function() {	
		//delete file	
		fs.unlinkSync(tempPath);
	});

	it('is empty after clear is called', function(done) {		
		//create token storage
		var storage = new TokenStore(tempPath);
		//add item to token storage
		var newEntries = [{'userid':'test@hotmail.com'}];
		storage.addEntries(newEntries, [], function(err) {
			if (err) { return done(err); }
			//verify items in the storage
			storage.loadEntries(function(err, entries) {
        if (err) { return done(err); }
        entries.should.have.length(newEntries.length); 
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
