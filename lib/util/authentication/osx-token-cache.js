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
var encoding = require('./token-cache-encoding');
var parser = require('./osx-keychain-parser');

var securityPath = '/usr/bin/security';
var serviceName = 'azure';
var description = 'azure access token';

/**
 * Constructs a new token cache that stores credentials
 * in the OSX default keychain.
 * @constructor
 */
function KeychainTokenCache() {
  this.entries = [];
}

_.extend(KeychainTokenCache.prototype, {
  /**
   * Removes a collection of entries from the cache in a single batch operation.
   * @param  {Array}   entries  An array of cache entries to remove.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  remove: function remove(entries, callback) {
    var updatedEntries = _.filter(this.entries, function(element) {
      if (_.findWhere(entries, element)) {
        return false;
      }
      return true;
    });

    this.entries = updatedEntries;
    callback();
  };

  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  add: function add(entries, callback) {
    // Remove any entries that are duplicates of the existing
    // cache elements.
    _.each(this.entries, function(element) {
      _.each(entries, function(addElement, index) {
        if (_.isEqual(element, addElement)) {
          entries[index] = null;
        }
      });
    });

    // Add the new entries to the end of the cache.
    entries = _.compact(entries);
    for (var i = 0; i < entries.length; i++) {
      this.entries.push(entries[i]);
    }

    callback(null, true);
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
  find: function find(query, callback) {
    var results = _.where(this.entries, query);
    callback(null, results);
  }
});

module.exports = KeychainTokenCache;
