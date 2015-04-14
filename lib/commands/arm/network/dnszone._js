var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function DnsZone(cli, dnsManagementClient) {
  this.cli = cli;
  this.dnsManagementClient = dnsManagementClient;
}

__.extend(DnsZone.prototype, {
  create: function (resourceGroupName, zoneName, params, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var dnsZone = this.get(resourceGroupName, zoneName, _);
    if (dnsZone) {
      throw new Error(util.format($('A dns zone with name "%s" already exists in the resource group "%s"'), zoneName, resourceGroupName));
    }

    var zoneProfile = {
      zone: {
        properties: {
          eTag: null
        },
        location: 'global'
      },
      ifNoneMatch: '*'
    };

    if (params.tags) {
      zoneProfile.zone.tags = TagUtils.buildTagsParameter(null, params);
    }

    var progress = this.cli.interaction.progress(util.format($('Creating dns zone "%s"'), zoneName));
    try {
      this.dnsManagementClient.zones.createOrUpdate(resourceGroupName, zoneName, zoneProfile, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, zoneName, params, _);
  },

  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the dns zones'));
    var dnsZones = null;
    try {
      dnsZones = this.dnsManagementClient.zones.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(dnsZones.zones, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No dns zones found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Type'), item.type);
          row.cell($('eTag'), item.properties.eTag);
        });
      }
    });
  },

  get: function (resourceGroupName, zoneName, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var progress = this.cli.interaction.progress(util.format($('Looking up the dns zone "%s"'), zoneName));
    try {
      var dnsZone = this.dnsManagementClient.zones.get(resourceGroupName, zoneName, _);
      return dnsZone;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  set: function (resourceGroupName, zoneName, params, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var dnsZone = this.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A dns zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    if (params.tags) {
      var tags = TagUtils.buildTagsParameter(null, params);
      TagUtils.appendTags(dnsZone.zone, tags);
    }

    if (params.tags === false) {
      dnsZone.zone.tags = {};
    }

    if (params.ignoreEtag === true) {
      dnsZone.zone.properties.eTag = '*';
    }

    this.update(resourceGroupName, zoneName, dnsZone, _);
    this.show(resourceGroupName, zoneName, params, _);
  },

  show: function (resourceGroupName, zoneName, params, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var dnsZone = this.get(resourceGroupName, zoneName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (dnsZone) {
      var resourceInfo = ResourceUtils.getResourceInformation(dnsZone.zone.id);
      interaction.formatOutput(dnsZone.zone, function (zone) {
        output.data($('Id:                  '), zone.id);
        output.data($('Name:                '), zone.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), zone.location);
        output.data($('eTag:                '), zone.properties.eTag);
        if (!__.isEmpty(zone.tags)) {
          output.data($('Tags:                '), TagUtils.getTagsInfo(zone.tags));
        }
      });
      // TODO: show the entire DNS zone including all record sets
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A dns zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
      }
    }
  },

  delete: function (resourceGroupName, zoneName, params, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var dnsZone = this.get(resourceGroupName, zoneName, _);
    if (!dnsZone) {
      throw new Error(util.format($('A dns zone with name "%s" not found in the resource group "%s"'), zoneName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete dns zone "%s"? [y/n] '), zoneName), _)) {
      return;
    }

    var parameters = {
      ifMatch: dnsZone.zone.properties.eTag
    };

    var progress = this.cli.interaction.progress(util.format($('Deleting dns zone "%s"'), zoneName));
    try {
      this.dnsManagementClient.zones.deleteMethod(resourceGroupName, zoneName, parameters, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, zoneName, zoneProfile, _) {
    zoneName = utils.trimTrailingChar(zoneName, '.');
    var progress = this.cli.interaction.progress(util.format($('Updating dns zone "%s"'), zoneName));
    try {
      this.dnsManagementClient.zones.createOrUpdate(resourceGroupName, zoneName, zoneProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  }
});

module.exports = DnsZone;