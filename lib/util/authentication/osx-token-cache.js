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
var async = require('async');
var es = require('event-stream');

var deserializer = require('./token-entry-deserializer.js');
var encoding = require('./token-cache-encoding');
var keychain = require('./osx-keychain');

var description = 'azure access token';

/**
 * Constructs a new token cache that stores credentials
 * in the OSX default keychain.
 * @constructor
 */
function KeychainTokenStorage() {}

_.extend(KeychainTokenStorage.prototype, {
  /**
  * Load the cache entries. 
  *
  * @param {function(err, Array)} callback callback
  *                               receiving cache entries.
  */
  loadEntries: function (callback) {
    var entries = [];
    keychain.list()
      .pipe(es.map(function (entry, cb) {
        if (entry.desc !== description) {
          // Not ours, drop it.
          return cb();
        }

        // Get the password, that's the actual entry
        keychain.get(entry.acct, entry.svce, function (err, password) {
          if (err) {
            return cb(err);
          }
          cb(null, deserializer.deserializeEntry(encoding.decodeObject(password)));
        });
      }))
      .on('data', function (entry) {
        entries.push(entry);
      })
      .on('end', function (err) {
        callback(err, entries);
      });
  },

  isSecureCache: true,

  /**
   * Removes a collection of entries from the cache in a single batch operation.
   * @param  {Array}   entries  An array of cache entries to remove.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  removeEntries: function (entriesToRemove, entriesToKeep, callback) {
    function removeEntry(entry, callback) {
      var key = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
      keychain.remove(key, entry.resource, callback);
    }
    
    async.eachSeries(entriesToRemove, removeEntry, callback);
  },

  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  addEntries: function (entries, callback) {
    function addEntry(entry, callback) {
      var key = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
      var password = encoding.encodeObject(entry);
      keychain.set(key, entry.resource, description, password, callback);
    }
    
    async.eachSeries(entries, addEntry, callback);
  },
});

module.exports = KeychainTokenStorage;
