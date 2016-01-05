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
var constants = require('./constants');
var moment = require('moment');

function ZoneFile(output) {
  this.output = output;
  this.defaultTtl = 3600;
}

__.extend(ZoneFile.prototype, {

  /**
   * Returns JSON object which represents standard zone file structure.
   */
  parse: function (zoneName, text) {
    text = this.removeComments(text);
    text = this.flatten(text);
    return this.parseRRs(zoneName, text);
  },

  /**
   * Generates standard zone file content from Azure DNS zone object.
   */
  generate: function (resourceGroupName, zoneName, recordSets) {
    var ttl = recordSets.recordSets[0].properties.ttl;

    var fileData = '';
    fileData = this.generateHeader(fileData, resourceGroupName, zoneName, ttl);
    fileData = this.generateRRs(fileData, recordSets);
    return fileData;
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

  removeComments: function (text) {
    return text.replace(/;[\s\S]*?$/gm, '');
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
  },

  /**
   * Generate methods
   */
  generateHeader: function (fileData, resourceGroupName, zoneName, ttl) {
    fileData += '; Exported zone file from Azure DNS\r\n';
    fileData += util.format('; Resource Group Name: %s\r\n', resourceGroupName);
    fileData += util.format('; Zone name: %s\n', zoneName);
    fileData += util.format('; Date and time (UTC): %s\r\n\r\n', moment.utc());
    fileData += util.format('$TTL %s\r\n', ttl);
    fileData += util.format('$ORIGIN %s.\r\n\r\n', zoneName);
    return fileData;
  },

  generateRRs: function (fileData, sets) {
    var self = this;

    var index;
    var soaSet = __.find(sets.recordSets, function (rset, rindex) {
      if (rset.properties.soaRecord) {
        index = rindex;
        return true;
      }
    });

    if (typeof index !== 'undefined') {
      fileData += self.generateFromSet(soaSet, 'soaRecord', constants.dnsZone.SOA, soaSet.properties.ttl);
      sets.recordSets.splice(index, 1);
    }

    sets.recordSets.forEach(function (rset) {
      var ttl = rset.properties.ttl;

      fileData += self.generateFromSet(rset, 'aRecords', constants.dnsZone.A, ttl);
      fileData += self.generateFromSet(rset, 'aaaaRecords', constants.dnsZone.AAAA, ttl);
      fileData += self.generateFromSet(rset, 'txtRecords', constants.dnsZone.TXT, ttl);
      fileData += self.generateFromSet(rset, 'ptrRecords', constants.dnsZone.PTR, ttl);
      fileData += self.generateFromSet(rset, 'mxRecords', constants.dnsZone.MX, ttl);
      fileData += self.generateFromSet(rset, 'nsRecords', constants.dnsZone.NS, ttl);
      fileData += self.generateFromSet(rset, 'srvRecords', constants.dnsZone.SRV, ttl);
      fileData += self.generateFromSet(rset, 'cnameRecord', constants.dnsZone.CNAME, ttl);
    });
    return fileData;
  },

  generateFromSet: function (recordSet, propertyName, type, ttl) {
    var self = this;
    var fileData = '';

    var obj = recordSet.properties[propertyName];

    if (!__.isEmpty(obj)) {
      if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
          var record = obj[i];
          var recordName;
          if (i === 0) {
            recordName = recordSet.name;
          } else {
            recordName = utils.setIndent(recordSet.name.length);
          }
          fileData += self.generateRR(recordName, type, ttl, record);
        }
        fileData += '\r\n';
      } else {
        fileData += self.generateRR(recordSet.name, type, ttl, obj);
        fileData += '\r\n';
      }
    }
    return fileData;
  },

  generateRR: function (name, type, ttl, record) {
    var self = this;
    var defClass = constants.dnsZone.recordClasses[0];

    var rr = util.format('%s %s %s %s ', name, ttl, defClass, type);
    switch (type) {
      case constants.dnsZone.SOA:
        var serialNumber = record.serialNumber || moment().format('YYYYMMDDss');
        if (!utils.stringEndsWith(record.host, '.', true)) record.host += '.';
        if (!utils.stringEndsWith(record.email, '.', true)) record.email += '.';
        rr += util.format('%s %s (\r\n\t\t\t\t%s\r\n\t\t\t\t%s\r\n\t\t\t\t%s\r\n\t\t\t\t%s\r\n\t\t\t\t%s\r\n\t\t\t\t)', record.host, record.email,
          serialNumber, record.refreshTime, record.retryTime, record.expireTime, record.minimumTtl);
        break;
      case constants.dnsZone.A:
        rr += record.ipv4Address;
        break;
      case constants.dnsZone.AAAA:
        rr += record.ipv6Address;
        break;
      case constants.dnsZone.CNAME:
        rr += record.cname;
        if (!utils.stringEndsWith(record.cname, '.', true)) rr += '.';
        break;
      case constants.dnsZone.MX:
        rr += util.format('%s %s', record.preference, record.exchange);
        if (!utils.stringEndsWith(record.exchange, '.', true)) rr += '.';
        break;
      case constants.dnsZone.NS:
        rr += record.nsdname;
        if (!utils.stringEndsWith(record.nsdname, '.', true)) rr += '.';
        break;
      case constants.dnsZone.SRV:
        rr += util.format('%s %s %s %s', record.priority, record.weight, record.port, record.target);
        if (!utils.stringEndsWith(record.target, '.', true)) rr += '.';
        break;
      case constants.dnsZone.TXT:
        rr += util.format('"%s"', record.value);
        break;
      case constants.dnsZone.PTR:
        rr += record.ptrdname;
        break;
      default:
        self.output.warn(util.format('Records of type "%s" are not supported, record with name "%s" not exported', type, name));
        return '';
    }

    rr += '\r\n';
    return rr;
  }

});

module.exports = ZoneFile;
