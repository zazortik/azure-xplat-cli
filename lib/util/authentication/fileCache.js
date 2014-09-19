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

var _ = require('underscore');
var fs = require('fs');

//
// Implementation of the adal token cache that's backed by a disk file
//

/**
 * Constructs a new file token cache.
 * @constructor
 *
 * @param {string} filename filename to store/retrieve data from
 *
 */
function FileTokenStorage(filename) {
  this._filename = filename;
}

_.extend(FileTokenStorage.prototype, {
  _save: function (entries, done) {
    var writeOptions = {
      encoding: 'utf8',
      mode: 384, // Permission 0600 - owner read/write, nobody else has access
      flag: 'w'
    };
    
    fs.writeFile(this._filename, JSON.stringify(entries), writeOptions, done);
  },
  
  loadEntries: function (callback) {
    var entries = [];
    var err;
    try {
      var content = fs.readFileSync(this._filename);
      entries = JSON.parse(content);
      //TODO: verify it works with adal-node
      entries.forEach(function (entry) {
        entry.expiresOn = new Date(entry.expiresOn);
      });
    } catch (ex) {
      if (ex.code !== 'ENOENT') {
        err = ex;
      }
    }
    callback(err, entries);
  },
  
  /**
   * Removes a collection of entries from the cache in a single batch operation.
   * @param  {Array}   entries  An array of cache entries to remove.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  removeEntries: function (entriesToRemove, entriesToKeep, callback) {
    //TODO: verify works for real
    this._save(entriesToKeep, callback);
  },
  
  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  addEntries: function (entries, callback) {
    this._save(entries, callback);
  },
});

module.exports = FileTokenStorage;
