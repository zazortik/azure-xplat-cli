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
function FileCache(filename) {
  this.filename = filename;
  this._entryData = null;

  Object.defineProperty(this, '_entries', {
    enumerable: false,
    configurable: false,
    get: function () {
      if (this._entryData === null) {
        this._entryData = [];
        try {
          var content = fs.readFileSync(this.filename);
          this._entryData = JSON.parse(content);
          this._entryData.forEach(function (entry) {
            entry.expiresOn = new Date(entry.expiresOn);
          });
        } catch (ex) {
          if (ex.code !== 'ENOENT') {
            throw ex;
          }
        }
      }
      return this._entryData;
    }
  });
}

_.extend(FileCache.prototype, {
  _save: function (done) {
    var writeOptions = {
      encoding: 'utf8',
      mode: 384, // Permission 0600 - owner read/write, nobody else has access
      flag: 'w'
    };

    fs.writeFile(this.filename, JSON.stringify(this._entries), writeOptions, done);
  },

  /**
   * Removes a collection of entries from the cache in a single batch operation.
   * @param  {Array}   entries  An array of cache entries to remove.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  remove: function(entries, callback) {
    var updatedEntries = _.filter(this._entries, function(element) {
      if (_.findWhere(entries, element)) {
        return false;
      }
      return true;
    });

    this._entryData = updatedEntries;
    this._save(callback);
  },

  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  add: function(entries, callback) {
    // Remove any entries that are duplicates of the existing
    // cache elements.
    _.each(this._entries, function(element) {
      _.each(entries, function(addElement, index) {
        if (_.isEqual(element, addElement)) {
          entries[index] = null;
        }
      });
    });

    // Add the new entries to the end of the cache.
    entries = _.compact(entries);
    for (var i = 0; i < entries.length; i++) {
      this._entries.push(entries[i]);
    }

    this._save(function (err) {
      callback(err, true);
    });
  },

  /**
   * Finds all entries in the cache that match all of the passed in values.
   * @param  {object}   query    This object will be compared to each entry in the cache.  Any entries that
   *                             match all of the values in this object will be returned.  All the values
   *                             in the passed in object must match values in a potentialy returned object
   *                             exactly.  The returned object may have more values than the passed in query
   *                             object.
   * @param  {TokenCacheFindCallback} callback
   */
  find: function(query, callback) {
    var results = _.where(this._entries, query);
    callback(null, results);
  }
});

module.exports = FileCache;
