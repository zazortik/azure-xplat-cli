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
var stream = require('readable-stream');
var util = require('util');

var Transform = stream.Transform;

var encoding = require('./token-cache-encoding');
var credStore = require('./win-credstore');

// Credential store has size limits, and tokens can
// go beyond them. 640k should be enough for everyone,
// right?
//
// As such, we have to be prepared to split a single
// credential across multiple credstore entries. This
// value controls the size of each chunk.

var MAX_CREDENTIAL_BYTES = 2048;

//
// Takes a single entry and credential, returns an array of
// entry/credential pairs ready to go to the credential store.
// @param{string} targetName target name that will be stored
// @param{string} tokens     string that will be stored as the
//                           actual credential.
//
// @returns {array} The possibly split set of entries for the
//                  credential store.
//
function splitEntry(targetName, tokens) {

  // Tokens are ascii, so # of bytes = # of characters.
  var numBytes = tokens.length;

  if (numBytes <= MAX_CREDENTIAL_BYTES) {
    return [ [targetName, tokens] ];
  }

  var numBlocks = Math.floor(numBytes / MAX_CREDENTIAL_BYTES);
  if (numBlocks % MAX_CREDENTIAL_BYTES !== 0) {
    ++numBlocks;
  }

  var blocks = [];

  for(var i = 0; i < numBlocks; ++i) {
    blocks.push([util.format('%s--%d-%d', targetName, i, numBlocks),
      tokens.substr(i * MAX_CREDENTIAL_BYTES, MAX_CREDENTIAL_BYTES)]);
  }

  return blocks;
}

//
// entry joiner. This is written as a transform stream since
// the logic for reading the cred store is also stream based.
//

function JoinerStream() {
  this.entries = {};
  this.splitRe = /^(.*)--(\d+)-(\d+)$/;
  Transform.call(this, {objectMode: true});
}

util.inherits(JoinerStream, Transform);

_.extend(JoinerStream.prototype, {
  _transform: function (chunk, encoding, callback) {
    // object mode, chunk is actually an object of the form
    // { targetName: n, credential: c }
    var targetName = chunk.targetName;
    var credential = chunk.credential;

    var match = targetName.match(this.splitRe);
    if (match !== null) {
      var mainTarget = match[1];
      var blockNum = +match[2];
      var numBlocks = +match[3];

      if (!_.has(this.entries, mainTarget)) {
        this.entries[mainTarget] = [];
      }

      this.entries[mainTarget][blockNum] = credential;

      if (_.compact(this.entries[mainTarget]).length === numBlocks) {
        this.push({
          targetName: mainTarget,
          credential: this.entries[mainTarget].join('')
        });
        delete this.entries[mainTarget];
      }
    } else {
      this.push(chunk);
    }
    callback();
  }
});

/**
 * Constructs a new token cache that stores credentials
 * in the Windows credential store.
 * @constructor
 */
 function CredStoreTokenCache() {
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

_.extend(CredStoreTokenCache.prototype, {
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

    var joiner = new JoinerStream();
    var entries = [];
    credStore.list()
      .pipe(joiner)
      .pipe(es.mapSync(function (entry) {
        // Most fields are stored in targetName,
        // access token and refresh token are stored in
        // credentials.
        var authResult = encoding.decodeObject(entry.targetName);
        var credential = encoding.decodeObject(new Buffer(entry.credential, 'hex').toString('utf8'));
        authResult.accessToken = credential.a;
        authResult.refreshToken = credential.r;

        return deserializeEntry(authResult);
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

      function removeEntry(entry, removeCb) {
        var targetName = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
        async.series([
          function (done) {
            credStore.remove(targetName, function () { done(); });
          },
          function (done) {
            credStore.remove(targetName + '--*', function () { done(); });
          }
        ], removeCb);
      }

      async.eachSeries(entriesToRemove, removeEntry, function (err) {
        if (err) { return callback(err); }
        self._entries = entriesToKeep;
        callback();
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

      // Add the new entries to the credstore
      function addToCredStore(entry, callback) {
        var targetName = encoding.encodeObject(_.omit(entry, ['accessToken', 'refreshToken']));
        var credential = encoding.encodeObject({a: entry.accessToken, r: entry.refreshToken});
        var entryParts = splitEntry(targetName, credential);

        async.eachSeries(entryParts,
          function (entry, entrycb) {
            credStore.set(entry[0], entry[1], entrycb);
          },
          function (err) {
            if (!err) {
              self._entries.push(entry);
            }
            callback(err);
          });
        }

      async.eachSeries(entries, addToCredStore, callback);
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

module.exports = CredStoreTokenCache;
