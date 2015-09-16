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
var log = require('../logging');

/**
 * Constructs a new token cache that works with adal-node
 * @constructor
 */
function TokenCache(tokenStorage) {
  this._entries = null;
  this._tokenStorage = tokenStorage;
}

_.extend(TokenCache.prototype, {
  /**
  * Load the cache entries. Does a lazy load,
  * loads from OS on first request, otherwise
  * returns in-memory copy.
  *
  * @param {function(err, Array)} callback callback
  *                               receiving cache entries.
  */
  _loadEntries: function (callback) {
    var self = this;
    if (self._entries !== null) {
      return callback(null, self._entries);
    }
    
    self._tokenStorage.loadEntries(function (err, entries) {
      if (!err) {
        self._entries = entries;
      }
      self._normalizeUserId(entries);
      callback(err, entries);
    });
  },
  
  _normalizeUserId: function (entries) {
    entries.forEach(function (entry) {
      if (entry.userId) {
        entry.userId = entry.userId.toLowerCase();
      }
    });
  },

  isSecureCache: function () {
    return this._tokenStorage.isSecureCache;
  },
  
  setUserIdWhenUseDeviceFlow: function (userId) {
    this._userIdWhenUseDeviceFlow = userId;
  },

  /**
   * Removes a collection of entries from the cache in a single batch operation.
   * @param  {Array}   entries  An array of cache entries to remove.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  remove: function remove(entries, callback) {
    var self = this;
    
    self._normalizeUserId(entries);

    function shouldKeep(entry) {
      //Note, '_findWhere' doesn't do deep comparision, so exlcude fields with object type 
      if (_.findWhere(entries, _.omit(entry, 'expiresOn'))) {
        return false;
      }
      return true;
    }

    self._loadEntries(function (err, _entries) {
      if (err) { return callback(err); }

      var grouped = _.groupBy(_entries, shouldKeep);
      var entriesToRemove = grouped[false] || [];
      var entriesToKeep = grouped[true] || [];
      
      self._tokenStorage.removeEntries(entriesToRemove, entriesToKeep, function (err) {
        if (!err) {
          self._entries = entriesToKeep;
        }
        callback(err);
      });
    });
  },

   /**
   * Clears a collection of entries from the cache in a single batch operation.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  clear: function clear(callback) {
    this._tokenStorage.clear(callback);
  },

  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  add: function add(entries, callback) {
    var self = this;
    if (self._userIdWhenUseDeviceFlow) {
      _.each(entries, function (entry) {
        entry._authority = entry._authority.replace('/common', '/' + entry.tenantId);
      });
    }
    self._normalizeUserId(entries);
    self._loadEntries(function (err, _entries) {
      if (err) { return callback(err); }

      // Remove any entries that are duplicates of the existing
      // cache elements.
      _.each(_entries, function(element) {
        _.each(entries, function(addElement, index) {
          if (_.isEqual(element, addElement)) {
            entries[index] = null;
          }
        });
      });

      // Add the new entries to the end of the cache.
      entries = _.compact(entries);
      
      self._tokenStorage.addEntries(entries, self._entries, function (err) {
        if (!err) {
          entries.forEach(function (entry) {
            self._entries.push(entry);
          });
        } else {
          //ADAL swallows the token-cache errors, so we surface them here.
          log.error(err.message);
          if (err.message.indexOf('Could not add password to keychain') >= 0) {
            var unlock = 'security -v unlock-keychain -p "$password" "/Users/$username/Library/Keychains/login.keychain"';
            log.warn('It seems that the key chain is locked. ' +
                     'Please unlock the key chain by executing this command: ' +
                     unlock);
          }
        }
        callback(err);
      });
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
  find: function find(query, callback) {
    var self = this;
    
    self._normalizeUserId([query]);
    self._loadEntries(function (err, _entries) {
      if (err) { return callback(err); }
      
      if (self._userIdWhenUseDeviceFlow) {
        query.userId = self._userIdWhenUseDeviceFlow.toLowerCase();
      }
      var results = _.where(_entries, query);
      callback(null, results);
    });
  }
});

module.exports = TokenCache;
