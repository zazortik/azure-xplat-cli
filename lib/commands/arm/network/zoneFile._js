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

var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');

function ZoneFile(output) {
  this.output = output;
  this.defaultTtl = 3600;
}

__.extend(ZoneFile.prototype, {

  parse: function (zoneName, text) {
    text = this.removeComments(text);
    text = this.flatten(text);
    return this.parseRRs(zoneName, text);
  },

  removeComments: function (text) {
    return text.replace(/;[\s\S]*?$/gm, '');
  },

  /**
   * Parse methods
   */

  flatten: function (text) {
    var bracketsPattern = /\([\s\S]*?\)/gim;
    var match = bracketsPattern.exec(text);
    while (match !== null) {
      match.replacement = match[0].replace(/\s+/gm, ' ').replace('(', '').replace(')', '').trim();
      var textAsCharsArray = text.split('');
      textAsCharsArray.splice(match.index, match[0].length, match.replacement); // replace multi-line chars with single-line instead
      text = textAsCharsArray.join('');
      bracketsPattern = /\([\s\S]*?\)/gim;
      match = bracketsPattern.exec(text);
    }

    return text;
  },

  parseRRs: function (zoneName, text) {
    var self = this;
    var res = {
      sets: []
    };

    zoneName = zoneName.toLowerCase();
    if (!utils.stringEndsWith(zoneName, '.', true)) zoneName += '.';

    var rrs = text.split('\n');
    for (var i in rrs) {
      var rr = rrs[i];
      if (!rr || !rr.trim()) {
        continue;
      }
      var recordSet;
      var prevRRname;

      if (utils.stringStartsWith(rr, '$', true)) {
        self.parseDirective(rr, res);
      } else {
        if (res.$origin === undefined) res.$origin = zoneName;
        var baseRR = this.parseRR(rr, res.$origin, zoneName, res.$ttl, prevRRname);
        if (baseRR.error) {
          this.output.warn(baseRR.error);
          prevRRname = baseRR.name;
          continue;
        }
        switch (baseRR.type) {
          case 'SOA':
            recordSet = self.parseSOA(baseRR, res.$origin);
            break;
          case 'NS':
            recordSet = self.parseNS(baseRR, res.$origin);
            break;
          case 'A':
            recordSet = self.parseA(baseRR);
            break;
          case 'AAAA':
            recordSet = self.parseAAAA(baseRR);
            break;
          case 'CNAME':
            recordSet = self.parseCNAME(baseRR, res.$origin);
            break;
          case 'TXT':
            recordSet = self.parseTXT(baseRR);
            break;
          case 'MX':
            recordSet = self.parseMX(baseRR, res.$origin);
            break;
          case '%PTR': // note: PTR is not supported yet on server end
            recordSet = self.parsePTR(baseRR, res.$origin);
            break;
          case 'SRV':
            recordSet = self.parseSRV(baseRR, res.$origin);
            break;
          default:
            this.output.warn(util.format('Record of unsupported type: %s', rr));
            continue;
        }
      }

      if (recordSet) {
        var index = utils.indexOfCaseIgnore(res.sets, {name: recordSet.name, type: recordSet.type});
        if (index === -1) {
          res.sets.push(recordSet); // create new RecordSet
        } else {
          res.sets[index].records.push(recordSet.records[0]); // Use existing Record set
          if (recordSet.ttl !== res.sets[index].ttl) {
            var minttl = recordSet.ttl < res.sets[index].ttl ? recordSet.ttl : res.sets[index].ttl;
            this.output.warn(util.format('The TTLs %s and %s for record set "%s" are conflicts, using lower TTL of %s',
              recordSet.ttl, res.sets[index].ttl, recordSet.name, minttl));

            res.sets[index].ttl = minttl;
          }
        }
        prevRRname = recordSet.name;
        recordSet = undefined;
      }
    }
    return res;
  },

  parse$ORIGIN: function (rr) {
    var self = this;
    var origin = rr.split(/\s+/g)[1];
    if (!utils.stringEndsWith(origin, '.', true)) {
      self.output.warn(util.format('The value "%s" of $ORIGIN directive doesn\'t end with a dot, dot added', origin));
      origin += '.';
    }
    return origin;
  },

  parse$TTL: function (rr) {
    var value = rr.split(/\s+/g)[1];
    var ttl = this.parseTimestamp(value);
    return ttl;
  },

  /**
   * Returns seconds number from 1m, 2h, 3d, 4m TTL time format
   */
  parseTimestamp: function (str) {
    str = str.toLowerCase();

    var seconds = 0;
    var chunk = '';
    var prevChar;

    for (var i = 0, currChar = ''; i < str.length; i++) {
      currChar = str.charAt(i);
      if (!isNaN(parseInt(currChar))) {
        chunk += currChar;
      } else {
        if (i === 0) return undefined;
        if (isNaN(parseInt(prevChar))) return undefined;
        switch (currChar) {
          case 's':
            seconds += chunk * 1;
            break;
          case 'm':
            seconds += chunk * 60;
            break;
          case 'h':
            seconds += chunk * 3600;
            break;
          case 'd':
            seconds += chunk * 86400;
            break;
          case 'w':
            seconds += chunk * 604800;
            break;
          default:
            return undefined;
        }
        chunk = '';
      }
      prevChar = currChar;
    }

    if (chunk.length > 0) seconds += parseInt(chunk);
    return seconds;
  },

  parseRR: function (rr, $origin, zoneName, $ttl, prevRRname) {
    var self = this;
    var res = {
      data: []
    };

    var validTypes = ['SOA', 'NS', 'A', 'AAAA', 'CNAME', 'TXT', 'MX', 'PTR', 'SRV'];
    var validClasses = ['IN', 'CS', 'CH', 'HS'];
    var rrTokens = rr.trim().split(/\s+/g);

    if (rrTokens.length < 3) {
      res.error = util.format('Invalid record format: %s', rr);
      return res;
    }

    var position = 0;
    while (rrTokens.length > 0) {
      var token = rrTokens.shift();
      if (validClasses.indexOf(token.toUpperCase()) !== -1 && (position <= 2)) {
        res.class = token.toUpperCase();
      } else if (validTypes.indexOf(token.toUpperCase()) !== -1 && (position <= 3)) {
        res.type = token.toUpperCase();
      } else if (self.parseTimestamp(token) && (position <= 1)) {
        res.ttl = self.parseTimestamp(token);
      } else if (position === 0) {
        res.name = token;
      } else {
        res.data.push(token);
      }
      position++;
    }

    if (res.data.length < 1) {
      res.error = util.format('Invalid record format: %s', rr);
      return res;
    }

    if (!res.type) {
      res.error = util.format('Record of unsupported type: %s', rr);
      return res;
    }

    if (!res.ttl) res.ttl = $ttl === undefined ? this.defaultTtl : $ttl;
    if (!res.name) res.name = prevRRname;

    var fqdnName = self.convertToFQDN(res.name, $origin);
    if (!utils.stringEndsWith(fqdnName, zoneName, true)) {
      res.error = util.format('The record set with fully-qualified name "%s" does not match the zone name "%s", skipped', fqdnName, zoneName);
      return res;
    }
    res.name = fqdnName;

    return res;
  },

  parseDirective: function (rr, res) {
    var self = this;
    var uRR = rr.toUpperCase();
    if (uRR.indexOf('$ORIGIN') === 0) {
      res.$origin = self.parse$ORIGIN(rr);
    } else if (uRR.indexOf('$TTL') === 0) {
      res.$ttl = self.parse$TTL(rr);
    } else {
      self.output.warn(util.format('Unrecognized directive: %s', rr));
    }
  },

  convertToFQDN: function (value, $origin) {
    if (value === '@') return $origin;
    if (utils.stringEndsWith(value, '.', true)) return value;
    if (!$origin) {
      this.output.warn('$ORIGIN directive is not defined');
      return value;
    } else {
      return value + '.' + $origin;
    }
  },

  parseSOA: function (rr, $origin) {
    var self = this;

    var soa = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        host: rr.data[0],
        email: self.convertToFQDN(rr.data[1], $origin),
        serialNumber: self.parseTimestamp(rr.data[2]),
        refreshTime: self.parseTimestamp(rr.data[3]),
        retryTime: self.parseTimestamp(rr.data[4]),
        expireTime: self.parseTimestamp(rr.data[5]),
        minimumTtl: self.parseTimestamp(rr.data[6])
      }]
    };
    return soa;
  },

  parseNS: function (rr, $origin) {
    var self = this;

    var ns = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        nsdname: self.convertToFQDN(rr.data[0], $origin)
      }]
    };
    return ns;
  },

  parseA: function (rr) {
    var a = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        ipv4Address: rr.data[0]
      }]
    };
    return a;
  },

  parseAAAA: function (rr) {
    var aaaa = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        ipv6Address: rr.data[0]
      }]
    };
    return aaaa;
  },

  parseCNAME: function (rr, $origin) {
    var self = this;
    var cname = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        cname: self.convertToFQDN(rr.data[0], $origin)
      }]
    };
    return cname;
  },

  parseMX: function (rr, $origin) {
    var self = this;
    var mx = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        preference: parseInt(rr.data[0]),
        exchange: self.convertToFQDN(rr.data[1], $origin)
      }]
    };
    return mx;
  },

  parseTXT: function (rr) {
    var value = '';
    var plainText = rr.data.join(' ');
    var matches = plainText.match(/[^"]+(?=(" ")|"$)/g);
    if (matches) {
      value = matches.join('');
    } else {
      value = plainText;
    }

    if (value.length > 255) {
      value = value.substr(0, 255);
      this.output.warn(util.format('TXT record "%s" value exceeds the maximum length of 255 chars, truncated', rr.name));
    }

    var txt = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        value: value.trim()
      }]
    };
    return txt;
  },

  parsePTR: function (rr, $origin) {
    var self = this;
    var ptr = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        ptrdname: self.convertToFQDN(rr.data[0], $origin)
      }]
    };
    return ptr;
  },

  parseSRV: function (rr, $origin) {
    var self = this;
    var srv = {
      name: rr.name,
      type: rr.type,
      ttl: rr.ttl,
      records: [{
        priority: parseInt(rr.data[0]),
        weight: parseInt(rr.data[1]),
        port: parseInt(rr.data[2]),
        target: self.convertToFQDN(rr.data[3], $origin)
      }]
    };
    return srv;
  }

});

module.exports = ZoneFile;
