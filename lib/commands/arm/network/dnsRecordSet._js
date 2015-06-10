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
var constants = require('./constants');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;
var DnsZone = require('./dnsZone');

function DnsRecordSet(cli, dnsManagementClient) {
  this.cli = cli;
  this.dnsManagementClient = dnsManagementClient;
  this.log = this.cli.output;
}

__.extend(DnsRecordSet.prototype, {
  create: function (resourceGroupName, zoneName, name, options, _) {
    var dnsZone = {ifNoneMatch: '*'};

    this._handleRecordSetOptions(dnsZone, options, true);

    var progress = this.cli.interaction.progress(util.format($('Creating DNS record set "%s"'), name));
    try {
      returnedRecordSet = this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this._showDnsRecord(returnedRecordSet);
  },

  set: function (resourceGroupName, zoneName, name, options, _) {
    var dnsZoneCrud = new DnsZone(this.cli, this.dnsManagementClient);
    var dnsZone = dnsZoneCrud.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A DNS zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    options.type = this._validateType(options.type);

    var dnsRecordExists = this.get(resourceGroupName, zoneName, name, options.type, _);
    if (!dnsRecordExists) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" not found in the resource group "%s"'), name, options.type, resourceGroupName));
    }

    dnsZone.recordSet = dnsRecordExists.recordSet;
    this._handleRecordSetOptions(dnsZone, options, false);

    this._deleteRecordsIfEmpty(dnsZone.recordSet);

    var returnedRecordSet;
    var progress = this.cli.interaction.progress(util.format($('Updating DNS record set "%s"'), name));
    try {
      returnedRecordSet = this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this._showDnsRecord(returnedRecordSet);
  },

  delete: function (resourceGroupName, zoneName, name, options, _) {
    options.type = this._validateType(options.type);

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete DNS record set "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting DNS record set "%s"'), name));
    var result;
    try {
      result = this.dnsManagementClient.recordSets.deleteMethod(resourceGroupName, zoneName, name, options.type, options, _);
    } finally {
      progress.end();
    }

    if (result.code === 204) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" not found in the resource group "%s"'), name, options.type, resourceGroupName));
    }
  },

  list: function (resourceGroupName, zoneName, options, _) {
    var self = this;
    var dnsRecords = null;

    var progress = this.cli.interaction.progress($('Looking up the DNS record sets'));
    try {
      if (options.type) {
        options.type = this._validateType(options.type);
        dnsRecords = this.dnsManagementClient.recordSets.list(resourceGroupName, zoneName, options.type, options, _);
      } else {
        dnsRecords = this.dnsManagementClient.recordSets.listAll(resourceGroupName, zoneName, options, _);
      }
    } finally {
      progress.end();
    }

    var output = this.cli.output;

    var nextLink = dnsRecords.nextLink;
    while (nextLink !== undefined) {
      output.silly('Following nextLink');
      var nextRecordSets = this.dnsManagementClient.recordSets.listNext(nextLink, _);
      dnsRecords.recordSets = dnsRecords.recordSets.concat(nextRecordSets.recordSets);
      nextLink = nextRecordSets.nextLink;
    }

    this.cli.interaction.formatOutput(dnsRecords.recordSets, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No DNS records sets found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('TTL'), item.properties.ttl);
          row.cell($('Type'), self._detectType(item.type));
          row.cell($('Tags'), TagUtils.getTagsInfo(item.tags));
        });
      }
    });
  },

  get: function (resourceGroupName, zoneName, name, type, _) {
    type = this._validateType(type);

    var progress = this.cli.interaction.progress(util.format($('Looking up the DNS record set "%s"'), name));
    var dnsRecord = null;
    try {
      dnsRecord = this.dnsManagementClient.recordSets.get(resourceGroupName, zoneName, name, type, _);
    } catch (e) {
      if (e.code !== 'ResourceNotFound' && e.code !== 'NotFound') {
        throw e;
      }
    } finally {
      progress.end();
    }

    return dnsRecord;
  },

  show: function (resourceGroupName, zoneName, name, options, _) {
    options.type = this._validateType(options.type);

    var dnsRecord = this.get(resourceGroupName, zoneName, name, options.type, _);
    var output = this.cli.output;

    if (dnsRecord) {
      this._showDnsRecord(dnsRecord);
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A DNS record with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
      }
    }
  },

  addRecord: function(resourceGroupName, zoneName, name, options, _) {
    var dnsZoneCrud = new DnsZone(this.cli, this.dnsManagementClient);
    var dnsZone = dnsZoneCrud.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A DNS zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    options.type = this._validateType(options.type);

    var dnsRecordExists = this.get(resourceGroupName, zoneName, name, options.type, _);
    if (!dnsRecordExists) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" not found in the resource group "%s"'), name, options.type, resourceGroupName));
    }

    dnsZone.recordSet = dnsRecordExists.recordSet;
    this._handleRecordSetOptions(dnsZone, options, false);

    this._handleRecordSetRecordParameters(dnsZone.recordSet, options, true);

    var returnedRecordSet;
    var progress = this.cli.interaction.progress(util.format($('Updating DNS record set "%s"'), name));
    try {
      returnedRecordSet = this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this._showDnsRecord(returnedRecordSet);
  },

  deleteRecord: function(resourceGroupName, zoneName, name, options, _) {
    options.type = this._validateType(options.type);

    var dnsRecordExists = this.get(resourceGroupName, zoneName, name, options.type, _);
    if (!dnsRecordExists) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" not found in the resource group "%s"'), name, options.type, resourceGroupName));
    }

    var recordSetParams = {recordSet: dnsRecordExists.recordSet};

    this._handleRecordSetRecordParameters(recordSetParams.recordSet, options, false);

    if (!options.quiet && !this.cli.interaction.confirm($('Delete DNS record? [y/n] '), _)) {
      return;
    }

    var returnedRecordSet;
    var progress = this.cli.interaction.progress(util.format($('Updating DNS record set "%s"'), name));
    try {
      returnedRecordSet = this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, recordSetParams, _);
    } finally {
      progress.end();
    }

    this._showDnsRecord(returnedRecordSet);
  },

  _handleRecordSetOptions: function(dnsZone, options, useDefaults) {
    options.type = this._validateType(options.type, useDefaults);

    if (dnsZone.recordSet === null || dnsZone.recordSet === undefined) {
      dnsZone.recordSet = {
        location: constants.DNS_RS_DEFAULT_LOCATION,
        properties: {}
      };
    }

    if (options.ttl) {
      var ttlAsInt = utils.parseInt(options.ttl);

      if (isNaN(ttlAsInt) || (ttlAsInt < 0)) {
        throw new Error($('--ttl value must be positive integer'));
      }

      dnsZone.recordSet.properties.ttl = ttlAsInt;
    } else if (useDefaults) {
      this.log.info(util.format($('--ttl parameter is not specified, using default TTL - "%s"'), constants.DNS_RS_DEFAULT_TTL));
      options.ttl = constants.DNS_RS_DEFAULT_TTL;
      dnsZone.recordSet.properties.ttl = options.ttl;
    }

    if (options.tags === false || !dnsZone.recordSet.tags) {
      dnsZone.recordSet.tags = {};
    }

    if (options.tags) {
      var tags = TagUtils.buildTagsParameter(dnsZone.recordSet.tags, options);
      for (var key in tags) {
        dnsZone.recordSet.tags[key] = tags[key];
      }
    }
  },

  _validateType: function (type, useDefaults) {
    if (type) {
      var index = constants.DNS_RS_TYPES.indexOf(type.toUpperCase());
      if (index < 0) {
        throw new Error(util.format($('DNS Record set type "%s" is not valid. Use -h to see valid record set types.'), type));
      }
    } else if (useDefaults) {
      type = constants.DNS_RS_DEFAULT_TYPE;
      this.log.info(util.format($('--type parameter is not specified, using default type - "%s"'), constants.DNS_RS_DEFAULT_TYPE));
    } else {
      throw new Error($('--type parameter must be specified for this operation'));
    }

    return type;
  },

  _detectType: function(fullTypeName) {
    var type;
    switch (fullTypeName) {
      case 'Microsoft.Network/dnszones' :
      case 'Microsoft.Network/dnszones/NS' : type = 'NS';break;
      case 'Microsoft.Network/dnszones/A' : type = 'A';break;
      case 'Microsoft.Network/dnszones/AAAA' : type = 'AAAA';break;
      case 'Microsoft.Network/dnszones/CNAME' : type = 'CNAME';break;
      case 'Microsoft.Network/dnszones/MX' : type = 'MX';break;
      case 'Microsoft.Network/dnszones/SRV' : type = 'SRV';break;
      case 'Microsoft.Network/dnszones/TXT' : type = 'TXT';break;
      case 'Microsoft.Network/dnszones/SOA' : type = 'SOA';break;
      case 'Microsoft.Network/dnszones/PTR' : type = 'PTR';break;
      default : type = 'UNKNOWN';break;
    }

    return type;
  },

  _deleteRecordsIfEmpty: function (recordSet) {
    if (!recordSet.properties) {
      return;
    }

    var recordTypesForDeletion = ['aRecords', 'aaaaRecords', 'nsRecords', 'mxRecords', 'srvRecords', 'txtRecords', 'soaRecord', 'ptrRecords'];
    for (var i = 0; i < recordTypesForDeletion.length; i++) {
      if(__.isEmpty(recordSet.properties[recordTypesForDeletion[i]])) {
        delete recordSet.properties[recordTypesForDeletion[i]];
      }
    }
  },

  _handleRecordSetRecordParameters: function(recordSet, options, isAddingRecord) {
    // A records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[0]) {
      if (options.ipv4Address) {
        this.log.info(util.format($('--ipv4-address parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.aRecords;
    } else if (options.ipv4Address) {
      if (isAddingRecord) {
        recordSet.properties.aRecords.push({ipv4Address: options.ipv4Address});
      } else {
        var aRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.aRecords, {ipv4Address: options.ipv4Address});
        if (aRecordIndex === null) {
          this.log.warn($('Record A not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.aRecords.splice(aRecordIndex, 1);
        }
      }
    }

    // AAAA records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[1]) {
      if (options.ipv6Address) {
        this.log.info(util.format($('--ipv6-address parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.aaaaRecords;
    } else if (options.ipv6Address) {
      if (isAddingRecord) {
        recordSet.properties.aaaaRecords.push({ipv6Address: options.ipv6Address});
      } else {
        var aaaaRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.aaaaRecords, {ipv6Address: options.ipv6Address});
        if (aaaaRecordIndex === null) {
          this.log.warn($('Record AAAA not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.aaaaRecords.splice(aaaaRecordIndex, 1);
        }
      }
    }

    // CNAME record
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[2]) {
      if (options.cname) {
        this.log.info(util.format($('--cname parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
    } else if (options.cname) {
      if (isAddingRecord) {
        options.cname = utils.trimTrailingChar(options.cname, '.');
        recordSet.properties.cnameRecord = {cname: options.cname};
      } else {
        var cnameRecord = recordSet.properties.cnameRecord.cname === options.cname;
        if (!cnameRecord) {
          this.log.warn($('Record CNAME not found in the record set with parameters specified.'));
        } else {
          delete recordSet.properties.cnameRecord;
        }
      }
    }

    // MX records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[3]) {
      if (options.preference || options.exchange) {
        this.log.info(util.format($('MX parameters will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.mxRecords;
    } else if (options.preference || options.exchange) {
      if (!(options.preference && options.exchange)) {
        throw new Error($('--preference and --exchange parameters must be specified together'));
      }

      if (isNaN(options.preference) || options.preference < 0) {
        throw new Error($('--preference parameter must be positive integer'));
      }

      options.exchange = utils.trimTrailingChar(options.exchange, '.');

      if (isAddingRecord) {
        recordSet.properties.mxRecords.push({preference: options.preference, exchange: options.exchange});
      } else {
        var mxRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.mxRecords, {preference: parseInt(options.preference), exchange: options.exchange});
        if (mxRecordIndex === null) {
          this.log.warn($('Record MX not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.mxRecords.splice(mxRecordIndex, 1);
        }
      }
    }

    // NS records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[4]) {
      if (options.nsdname) {
        this.log.info(util.format($('--nsdname parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.nsRecords;
    } else if (options.nsdname) {
      if (isAddingRecord) {
        recordSet.properties.nsRecords.push({nsdname: options.nsdname});
      } else {
        var nsRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.nsRecords, {nsdname: options.nsdname});
        if (nsRecordIndex === null) {
          this.log.warn($('Record NS not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.nsRecords.splice(nsRecordIndex, 1);
        }
      }
    }

    // SRV records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[5]) {
      if (options.priority || options.weight || options.port || options.target) {
        this.log.info(util.format($('SRV parameters will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.srvRecords;
    } else if (options.priority || options.weight || options.port || options.target) {
      if (!(options.priority && options.weight && options.port && options.target)) {
        throw new Error($('You must specify all SRV parameters if even one is specified'));
      }

      if (isNaN(options.priority) || options.priority < 0) {
        throw new Error($('--priority parameter must be positive integer'));
      }

      if (isNaN(options.weight) || options.weight < 0) {
        throw new Error($('--weight parameter must be positive integer'));
      }

      if (isNaN(options.port) || options.port < 0) {
        throw new Error($('--port parameter must be positive integer'));
      }

      options.target = utils.trimTrailingChar(options.target, '.');

      if (isAddingRecord) {
        recordSet.properties.srvRecords.push({priority: options.priority, weight: options.weight, port: options.port, target: options.target});
      } else {
        var srvRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.srvRecords, {priority: parseInt(options.priority), weight: parseInt(options.weight), port: parseInt(options.port), target: options.target});
        if (srvRecordIndex === null) {
          this.log.warn($('Record SRV not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.srvRecords.splice(srvRecordIndex, 1);
        }
      }
    }

    // TXT records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[6]) {
      if (options.text) {
        this.log.info(util.format($('--text parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.txtRecords;
    } else if (options.text) {
      if (isAddingRecord) {
        recordSet.properties.txtRecords.push({value: options.text});
      } else {
        var txtRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.txtRecords, {value: options.text});
        if (txtRecordIndex === null) {
          this.log.warn($('Record TXT not found in the record set with parameters specified.'));
        } else {
          recordSet.properties.txtRecords.splice(txtRecordIndex, 1);
        }
      }
    }

    // SOA records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[7]) {
      if (options.email || options.expireTime || options.host || options.minimumTtl || options.refreshTime || options.retryTime) {
        this.log.info(util.format($('SOA parameters will be ignored due to type of this DNS record - "%s"'), options.type));
      }
    } else if (options.email || options.expireTime || options.host || options.minimumTtl || options.refreshTime || options.retryTime) {
      if (options.email && options.expireTime && options.host && options.minimumTtl && options.refreshTime && options.retryTime) {
        throw new Error($('You must specify all SOA parameters if even one is specified'));
      }

      if (isNaN(options.expireTime) || options.expireTime < 0) {
        throw new Error($('--expire-time parameter must be positive integer'));
      }

      if (isNaN(options.refreshTime) || options.refreshTime < 0) {
        throw new Error($('--refresh-time parameter must be positive integer'));
      }

      if (isNaN(options.retryTime) || options.retryTime < 0) {
        throw new Error($('--retry-time parameter must be positive integer'));
      }

      if (isNaN(options.minimumTtl) || options.minimumTtl < 255) {
        throw new Error($('--minimumTtl parameter must be in the range [0,255]'));
      }

      if (isAddingRecord) {
        recordSet.properties.soaRecord = {email: options.email, expireTime: options.expireTime, host: options.host, minimumTtl: options.minumumTtl, refreshTime: options.refreshTime, retryTime: options.retryTime};
      } else {
        var soaRecord = ((recordSet.properties.soaRecord.email === options.email) && (recordSet.properties.soaRecord.expireTime === parseInt(options.expireTime)) && (recordSet.properties.soaRecord.host === options.host) &&
        (recordSet.properties.soaRecord.minimumTtl === parseInt(options.minimumTtl)) && (recordSet.properties.soaRecord.refreshTime === parseInt(options.refreshTime)) && (recordSet.properties.soaRecord.retryTime === parseInt(options.retryTime)));
        if (!soaRecord) {
          this.log.warn($('Record SOA not found in the record set with parameters specified.'));
        } else {
          delete recordSet.properties.soaRecord;
        }
      }
    }

    // PTR records
    if (options.type.toUpperCase() !== constants.DNS_RS_TYPES[8]) {
      if (options.ptrdName) {
        this.log.info(util.format($('--ptrd-name parameter will be ignored due to type of this DNS record - "%s"'), options.type));
      }
      delete recordSet.properties.ptrRecords;
    } else {
      if (options.ptrdName) {
        if (isAddingRecord) {
          options.ptrdName = utils.trimTrailingChar(options.ptrdName, '.');
          recordSet.properties.ptrRecords.push({ptrdname: options.ptrdName});
        } else {
          var ptrRecordIndex = utils.indexOfCaseIgnore(recordSet.properties.ptrRecords, {ptrdname: options.ptrdname});
          if (ptrRecordIndex === null) {
            this.log.warn($('Record PTR not found in the record set with parameters specified.'));
          } else {
            recordSet.properties.ptrRecords.splice(ptrRecordIndex, 1);
          }
        }
      }
    }
  },

  _showDnsRecord: function(dnsRecord) {
    var interaction = this.cli.interaction;
    var output = this.cli.output;
    var resourceInfo = ResourceUtils.getResourceInformation(dnsRecord.recordSet.id);
    interaction.formatOutput(dnsRecord.recordSet, function (record) {
      output.nameValue($('Id'), record.id);
      output.nameValue($('Name'), record.name);
      output.nameValue($('Type'), resourceInfo.resourceType);
      output.nameValue($('Location'), record.location);
      output.nameValue($('TTL'), record.properties.ttl);
      output.nameValue($('Tags'), TagUtils.getTagsInfo(record.tags));
      if (!__.isEmpty(record.properties.aRecords)) {
        output.header($('A records'));
        for (var aRecordNum in record.properties.aRecords) {
          var aRecord = record.properties.aRecords[aRecordNum];
          output.nameValue($('IPv4 address'), aRecord.ipv4Address, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.aaaaRecords)) {
        output.header($('AAAA records'));
        for (var aaaaRecordNum in record.properties.aaaaRecords) {
          var aaaaRecord = record.properties.aaaaRecords[aaaaRecordNum];
          output.nameValue($('IPv6 address'), aaaaRecord.ipv6Address, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.cnameRecord)) {
        output.header($('CNAME record'));
        output.nameValue($('CNAME'), record.properties.cnameRecord.cname, 2);
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.mxRecords)) {
        output.header($('MX records'));
        for (var mxRecordNum in record.properties.mxRecords) {
          var mxRecord = record.properties.mxRecords[mxRecordNum];
          output.nameValue($('Preference'), mxRecord.preference, 4);
          output.nameValue($('Mail exchange'), mxRecord.exchange, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.nsRecords)) {
        output.data($('NS records'));
        for (var nsRecordNum in record.properties.nsRecords) {
          var nsRecord = record.properties.nsRecords[nsRecordNum];
          output.nameValue($('Name server domain name'), nsRecord.nsdname, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.srvRecords)) {
        output.header($('SRV records'));
        for (var srvRecordNum in record.properties.srvRecords) {
          var srvRecord = record.properties.srvRecords[srvRecordNum];
          output.nameValue($('Priority'), srvRecord.priority, 4);
          output.nameValue($('Weight'), srvRecord.weight, 4);
          output.nameValue($('Port'), srvRecord.port, 4);
          output.nameValue($('Target'), srvRecord.target, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.txtRecords)) {
        output.header($('TXT records'));
        for (var txtRecordNum in record.properties.txtRecords) {
          var txtRecord = record.properties.txtRecords[txtRecordNum];
          output.nameValue($('Text'), txtRecord.value, 4);
        }
        output.data($(''), '');
      }

      if (!__.isEmpty(record.properties.soaRecord)) {
        var soaRecord = record.properties.soaRecord;
        output.header($('SOA record'));
        output.nameValue($('Email'), soaRecord.email, 2);
        output.nameValue($('Expire time'), soaRecord.expireTime, 2);
        output.nameValue($('Host'), soaRecord.host, 2);
        output.nameValue($('Serial number'), soaRecord.serialNumber, 2);
        output.nameValue($('Minimum TTL'), soaRecord.minimumTtl, 2);
        output.nameValue($('Refresh time'), soaRecord.refreshTime, 2);
        output.nameValue($('Retry time'), soaRecord.retryTime, 2);
        output.nameValue($(''), '');
      }

      if (!__.isEmpty(record.properties.ptrRecords)) {
        output.header($('PTR records'));
        for (var ptrRecordNum in record.properties.ptrRecords) {
          var ptrRecord = record.properties.ptrRecords[ptrRecordNum];
          output.nameValue($('PTR domain name'), ptrRecord.ptrdname, 4);
        }
        output.data($(''), '');
      }
    });
  }
});

module.exports = DnsRecordSet;