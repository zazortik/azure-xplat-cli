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

var encoding = require('./token-cache-encoding');
var keychain = require('./osx-keychain');

var description = 'azure access token';

/**
 * Constructs a new token cache that stores credentials
 * in the OSX default keychain.
 * @constructor
 */
function KeychainTokenCache() {
  this._entries = null;
}

//
// Internal helper functions for serializing and
// deserializing cache entries.
//

function deserializeBool(str) {
  return str.toLowerCase() === 'true';
}

function deserializeDate(str) {
  return new Date(str);
}

function deserializeNum(str) {
  return +str;
}

// Mapping of field names that need special handling
// on deserialization (typically type conversions)
// to the appropriate deserializer functions.
var fieldsToConvert = {
  expiresIn: deserializeNum,
  expiresOn: deserializeDate,
  isUserIdDisplayable: deserializeBool,
  isMRRT: deserializeBool
};

function deserializeEntry(entry) {
  return _.chain(entry)
    .pairs()
    .map(function (pair) {
      var key = pair[0], value = pair[1];
      if (_.has(fieldsToConvert, key)) {
        return [key, fieldsToConvert[key](value)];
      }
      return pair;
    })
    .object()
    .value();
}

_.extend(KeychainTokenCache.prototype, {
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
          cb(null, deserializeEntry(encoding.decodeObject(password)));
        });
      }))
      .on('data', function (entry) {
        entries.push(entry);
      })
      .on('end', function (err) {
        if (!err) {
          self._entries = entries;
        }
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
  remove: function remove(entries, callback) {
    var self = this;

    function shouldKeep(entry) {
      if (_.findWhere(entries, entry)) {
        return false;
      }
      return true;
    }

    self._loadEntries(function (err, _entries) {
      if (err) { return callback(err); }

      var grouped = _.groupBy(_entries, shouldKeep);
      var entriesToRemove = grouped[false] || [];
      var entriesToKeep = grouped[true] || [];

      function removeEntry(entry, callback) {
        var key = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
        keychain.remove(key, entry.resource, callback);
      }

      async.eachSeries(entriesToRemove, removeEntry, function (err) {
        if (!err) {
          self._entries = entriesToKeep;
        }
        callback(err);
      });
    });
  },

  /**
   * Adds a collection of entries to the cache in a single batch operation.
   * @param {Array}   entries  An array of entries to add to the cache.
   * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
   *                             first parameter.
   */
  add: function add(entries, callback) {
    var self = this;

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

      function addEntry(entry, callback) {
        var key = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
        var password = encoding.encodeObject(entry);
        keychain.set(key, entry.resource, description, password, function (err) {
          if (err) { return callback(err); }
          self._entries.push(entry);
          callback();
        });
      }

      async.eachSeries(entries, addEntry, callback);
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

    self._loadEntries(function (err, _entries) {
      if (err) { return callback(err); }

      var results = _.where(_entries, query);
      callback(null, results);
    });
  }
});

module.exports = KeychainTokenCache;
