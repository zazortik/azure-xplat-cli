var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;
var DnsZone = require('./dnszone');

function DnsRecords(cli, dnsManagementClient) {
  this.cli = cli;
  this.dnsManagementClient = dnsManagementClient;
  this.log = this.cli.output;

  this.DEFAULT_LOCATION = 'global';
  this.RECORDSET_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'SRV', 'TXT', 'SOA']; // PTR
  this.DEFAULT_RECORDSET_TYPE = this.RECORDSET_TYPES[0];
  this.DEFAULT_TTL = 4;
}

__.extend(DnsRecords.prototype, {
  create: function (resourceGroupName, zoneName, name, options, _) {
    var dnsZoneCrud = new DnsZone(this.cli, this.dnsManagementClient);
    var dnsZone = dnsZoneCrud.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A DNS zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    this._handleRecordSetOptions(dnsZone, options, true);

    var dnsRecordExists = this.get(resourceGroupName, zoneName, name, options.type, _);
    if (dnsRecordExists) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" already exists in the resource group "%s"'), name, options.type, resourceGroupName));
    }


    var progress = this.cli.interaction.progress(util.format($('Creating DNS record set "%s"'), name));
    try {
      this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this.show(resourceGroupName, zoneName, name, options, _);
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

    var progress = this.cli.interaction.progress(util.format($('Updating DNS record set "%s"'), name));
    try {
      this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this.show(resourceGroupName, zoneName, name, options, _);
  },

  delete: function (resourceGroupName, zoneName, name, options, _) {
    options.type = this._validateType(options.type);

    var dnsZoneCrud = new DnsZone(this.cli, this.dnsManagementClient);
    var dnsZone = dnsZoneCrud.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A DNS zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    var dnsRecordExists = this.get(resourceGroupName, zoneName, name, options.type, _);
    if (!dnsRecordExists) {
      throw new Error(util.format($('DNS Record set "%s" of type "%s" not found in the resource group "%s"'), name, options.type, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete DNS record set "%s"? [y/n] '), name), _)) {
      return;
    }
  
    var progress = this.cli.interaction.progress(util.format($('Deleting DNS record set "%s"'), name));
    try {
      this.dnsManagementClient.recordSets.deleteMethod(resourceGroupName, zoneName, name, options.type, parameters, _);
    } finally {
      progress.end();
    }
  },

  list: function (resourceGroupName, zoneName, options, _) {
    var dnsZoneCrud = new DnsZone(this.cli, this.dnsManagementClient);

    var dnsZone = dnsZoneCrud.get(resourceGroupName, zoneName, _);

    if (!dnsZone) {
      throw new Error($('DNS zone not found'));
    }

    var dnsRecords = null;

    if (options.type) {
      options.type = this._validateType(options.type);	
      var progress1 = this.cli.interaction.progress($('Looking up the DNS record sets'));
      try {
        dnsRecords = this.dnsManagementClient.recordSets.list(resourceGroupName, zoneName, options.type, _);
      } catch (e) {
        throw e;
      } finally {
        progress1.end();
      }
    } else {
	  var progress2 = this.cli.interaction.progress($('Looking up the DNS record sets'));
      try {
        dnsRecords = this.dnsManagementClient.recordSets.listAll(resourceGroupName, zoneName, _);
      } catch (e) {
        throw e;
      } finally {
        progress2.end();
      }   	
    }    

    var output = this.cli.output;
    this.cli.interaction.formatOutput(dnsRecords.recordSets, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No DNS records sets found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('TTL'), item.properties.ttl);
          row.cell($('Type'), item.type);
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
      if (e.code !== 'ResourceNotFound' && e.code != 'NotFound') {
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
    var interaction = this.cli.interaction;

    if (dnsRecord) {
      var resourceInfo = ResourceUtils.getResourceInformation(dnsRecord.recordSet.id);
      interaction.formatOutput(dnsRecord.recordSet, function (record) {
        output.data($('Id:                  '), record.id);
        output.data($('Name:                '), record.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), record.location);
        output.data($('TTL:                 '), record.properties.ttl);
        if (!__.isEmpty(record.tags)) {
          output.data($('Tags:              '), TagUtils.getTagsInfo(record.tags));
        } else {
          output.data($('Tags:'), '');
        }

        if (!__.isEmpty(record.properties.aRecords)) {
          output.data($('A records:          '), '');
          for (var aRecordNum in record.properties.aRecords) {
          	var aRecord = record.properties.aRecords[aRecordNum];
          	output.data($('   IPv4 address:'), aRecord.ipv4Address);
          	output.data($(''), '');
          }
        }

        if (!__.isEmpty(record.properties.aaaaRecords)) {
          output.data($('AAAA records:       '), '');
          for (var aaaaRecordNum in record.properties.aaaaRecords) {
          	var aaaaRecord = record.properties.aaaaRecords[aaaaRecordNum];
          	output.data($('   IPv6 address:'), aaaaRecord.ipv6Address);
          	output.data($(''), '');
          }
        }

        if (!__.isEmpty(record.properties.cnameRecord)) {
          output.data($('CNAME record:      '), '');
          output.data($('   CNAME:'), record.properties.cnameRecord.cname);
          output.data($(''), '');
        }

        if (!__.isEmpty(record.properties.mxRecords)) {
          output.data($('MX records:        '), '');
          for (var mxRecordNum in record.properties.mxRecords) {
          	var mxRecord = record.properties.mxRecords[mxRecordNum];
          	output.data($('   Preference:'), mxRecord.preference);
          	output.data($('   Exchange:'), mxRecord.exchange);
          	output.data($(''), '');
          }
        }

        if (!__.isEmpty(record.properties.nsRecords)) {
          output.data($('NS records:                '), '');
          for (var nsRecordNum in record.properties.nsRecords) {
          	var nsRecord = record.properties.nsRecords[nsRecordNum];
          	output.data($('   Domain name:'), nsRecord.nsdname);
          	output.data($(''), '');
          }
        }

        if (!__.isEmpty(record.properties.srvRecords)) {
          output.data($('SRV records:                '), '');
          for (var srvRecordNum in record.properties.srvRecords) {
          	var srvRecord = record.properties.srvRecords[srvRecordNum];
          	output.data($('   Priority:'), srvRecord.priority);
          	output.data($('   Weight:'), srvRecord.weight);
          	output.data($('   Port:'), srvRecord.port);
          	output.data($('   Target:'), srvRecord.target);
          }
        }

        if (!__.isEmpty(record.properties.txtRecords)) {
          output.data($('TXT records:                '), '');
          for (var txtRecordNum in record.properties.txtRecords) {
          	var txtRecord = record.properties.txtRecords[txtRecordNum];
          	output.data($('   Text:'), txtRecord.value);
          	output.data($(''), '');
          }
        }

        if (!__.isEmpty(record.properties.soaRecord)) {
          output.data($('TXT record:                '), '');
          output.data($('   Email:'), record.properties.soaRecord.email);
          output.data($('   Expire time:'), record.properties.soaRecord.expireTime);
          output.data($('   Host:'), record.properties.soaRecord.host);
          output.data($('   Serial number:'), record.properties.soaRecord.serialNumber);
          output.data($('   Minimum TTL:'), record.properties.soaRecord.minimumTtl);
          output.data($('   Refresh time:'), record.properties.soaRecord.refreshTime);
          output.data($('   Retry time:'), record.properties.soaRecord.retryTime);
          output.data($(''), '');
        }
      });
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

    this._handleRecordSetRecordParameters(dnsZone.recordSet, options);

    var progress = this.cli.interaction.progress(util.format($('Updating DNS record set "%s"'), name));
    try {
      this.dnsManagementClient.recordSets.createOrUpdate(resourceGroupName, zoneName, name, options.type, dnsZone, _);
    } finally {
      progress.end();
    }

    this.show(resourceGroupName, zoneName, name, options, _);
  },

  /*deleteRecord: function(resourceGroupName, zoneName, name, options, _) {

  },*/

  _handleRecordSetOptions: function(dnsZone, options, useDefaults) {
    options.type = this._validateType(options.type, useDefaults);

    if (dnsZone.recordSet === null || dnsZone.recordSet === undefined) {
      dnsZone.recordSet = {
        location: this.DEFAULT_LOCATION,
        properties: {}
      };
    }

    if (options.ttl) {
      if (options.ttl < 1 || options.ttl > 255) {
        throw new Error($('--ttl value must be between 1 and 255'));
      }
      dnsZone.recordSet.properties.ttl = options.ttl;
    } else if (useDefaults) {
      this.log.info(util.format($('--ttl parameter is not specified, using default TTL - "%s"'), this.DEFAULT_TTL));
      options.ttl = this.DEFAULT_TTL;
      dnsZone.recordSet.properties.ttl = options.ttl;
    }

    if (options.tags === false) {
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
      var index = this.RECORDSET_TYPES.indexOf(type.toUpperCase());
      if (index < 0) {
        throw new Error(util.format($('DNS Record set type "%s" is not valid. Use -h to see valid record set types.'), type));
      }
    } else if (useDefaults) {
      type = this.DEFAULT_RECORDSET_TYPE;
      this.log.info(util.format($('--type parameter is not specified, using default type - "%s"'), this.DEFAULT_RECORDSET_TYPE));
    } else {
      throw new Error($('--type parameter must be specified for this operation'));
    }

    return type;
  },

  _deleteRecordsIfEmpty: function (recordSet) {
  	if (recordSet.properties) {
  	  if(__.isEmpty(recordSet.properties.aRecords)) {
  	  	delete recordSet.properties.aRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.aaaaRecords)) {
  	  	delete recordSet.properties.aaaaRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.nsRecords)) {
  	  	delete recordSet.properties.nsRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.mxRecords)) {
  	  	delete recordSet.properties.mxRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.srvRecords)) {
  	  	delete recordSet.properties.srvRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.txtRecords)) {
  	  	delete recordSet.properties.txtRecords;
  	  }

  	  if(__.isEmpty(recordSet.properties.soaRecord)) {
  	  	delete recordSet.properties.soaRecord;
  	  }

  	  if(__.isEmpty(recordSet.properties.ptrRecords)) {
  	  	delete recordSet.properties.ptrRecords;
  	  }
  	}
  },

  _handleRecordSetRecordParameters: function(recordSet, options) {
  	// A records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[0]) {
  	  if (options.ipv4Address) {
  	  	this.log.info(util.format($('--ipv4-address parameter will be ignored due to type of this DNS record - "%s"'), options.type));
  	  }
  	  delete recordSet.properties.aRecords;
  	} else if (options.ipv4Address) {
  	  recordSet.properties.aRecords.push({ipv4Address: options.ipv4Address});
  	}

  	// AAAA records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[1]) {
  	  if (options.ipv6Address) {
  	  	this.log.info(util.format($('--ipv6-address parameter will be ignored due to type of this DNS record - "%s"'), options.type));
  	  }
      delete recordSet.properties.aaaaRecords;
  	} else if (options.ipv6Address) {
  	  recordSet.properties.aaaaRecords.push({ipv6Address: options.ipv6Address});
  	}

  	// CNAME record
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[2]) {
  	  if (options.cname) {
  	  	this.log.info(util.format($('--cname parameter will be ignored due to type of this DNS record - "%s"'), options.type));
  	  }
  	} else if (options.cname) {
  	  options.cname = utils.trimTrailingChar(options.cname, '.');
  	  recordSet.properties.cnameRecord = {cname: options.cname};
  	}

  	// MX records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[3]) {
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

  	  recordSet.properties.mxRecords.push({preference: options.preference, exchange: options.exchange});
  	}

  	// NS records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[4]) {
  	  if (options.nsdname) {
  	  	this.log.info(util.format($('--nsdname parameter will be ignored due to type of this DNS record - "%s"'), options.type));
  	  }
	  delete recordSet.properties.nsRecords;
  	} else if (options.nsdname) {
  	  recordSet.properties.nsRecords.push({nsdname: options.nsdname});
  	}

  	// SRV records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[5]) {
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

  	  recordSet.properties.srvRecords.push({priority: options.priority, weight: options.weight, port: options.port, target: options.target});
  	}

  	// TXT records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[6]) {
  	  if (options.text) {
  	  	this.log.info(util.format($('--text parameter will be ignored due to type of this DNS record - "%s"'), options.type));
  	  }
	  delete recordSet.properties.txtRecords;
  	} else if (options.text) {
  	  recordSet.properties.txtRecords.push({value: options.text});
  	}

  	// SOA records
  	if (options.type.toUpperCase() !== this.RECORDSET_TYPES[7]) {
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

  	  recordSet.properties.soaRecord = {email: options.email, expireTime: options.expireTime, host: options.host, minimumTtl: options.minumumTtl, refreshTime: options.refreshTime, retryTime: options.retryTime};
  	}

  	delete recordSet.properties.ptrRecords;
  }
});

module.exports = DnsRecords;