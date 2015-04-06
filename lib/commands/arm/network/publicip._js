var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Publicip(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Publicip.prototype, {
  create: function (resourceGroupName, name, params, _) {
    var publicipProfile = this._parseAndValidatePublicIP(name, params);
    var publicip = this.get(resourceGroupName, name, _);
    if (publicip) {
      throw new Error(util.format($('A public ip address with name "%s" already exists in the resource group "%s"'), name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating public ip address "%s"'), name));
    try {
      this.networkResourceProviderClient.publicIpAddresses.createOrUpdate(resourceGroupName, name, publicipProfile, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, name, params, _);
  },

  set: function (resourceGroupName, name, params, _) {
    var publicipProfile = this._parseAndValidatePublicIP(name, params);
    var publicip = this.get(resourceGroupName, name, _);
    if (!publicip) {
      throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
    }

    this._createDnsSettingsIfNotExist(publicip.publicIpAddress);

    if (params.idletimeout) publicip.publicIpAddress.idleTimeoutInMinutes = publicipProfile.idleTimeoutInMinutes;
    if (params.allocationMethod) publicip.publicIpAddress.publicIpAllocationMethod = publicipProfile.publicIpAllocationMethod;
    if (params.domainNameLabel) publicip.publicIpAddress.dnsSettings.domainNameLabel = publicipProfile.dnsSettings.domainNameLabel;
    if (params.reverseFqdn) publicip.publicIpAddress.dnsSettings.reverseFqdn = publicipProfile.dnsSettings.reverseFqdn;

    this.update(resourceGroupName, name, publicip.publicIpAddress, _);
    this.show(resourceGroupName, name, params, _);
  },

  show: function (resourceGroupName, name, params, _) {
    var publicIP = this.get(resourceGroupName, name, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (publicIP) {
      var resourceInfo = ResourceUtils.getResourceInformation(publicIP.publicIpAddress.id);
      interaction.formatOutput(publicIP.publicIpAddress, function (publicip) {
        output.data($('Id:                  '), publicip.id);
        output.data($('Name:                '), publicip.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), publicip.location);
        output.data($('Provisioning state:  '), publicip.provisioningState);
        output.data($('Allocation method:   '), publicip.publicIpAllocationMethod);
        output.data($('IP Address:          '), publicip.ipAddress);
        output.data($('Idle timeout:        '), publicip.idleTimeoutInMinutes);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
      }
    }
  },

  delete: function (resourceGroupName, name, params, _) {
    var publicIP = this.get(resourceGroupName, name, _);
    if (!publicIP) {
      throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete public ip address "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting public ip address "%s"'), name));
    try {
      this.networkResourceProviderClient.publicIpAddresses.deleteMethod(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the public ip addresses'));
    var publicIPs = null;
    try {
      publicIPs = this.networkResourceProviderClient.publicIpAddresses.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(publicIPs.publicIpAddresses, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No public ip address found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Allocation'), item.publicIpAllocationMethod);
          row.cell($('IP Address'), item.ipAddress || '');
          row.cell($('Idle timeout'), item.idleTimeoutInMinutes || '');
          var dnsName = '';
          if (item.dnsSettings) {
            dnsName = item.dnsSettings.fqdn;
          }
          row.cell($('DNS Name'), dnsName);
        });
      }
    });
  },

  get: function (resourceGroupName, name, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the public ip "%s"'), name));
    try {
      var publicIP = this.networkResourceProviderClient.publicIpAddresses.get(resourceGroupName, name, _);
      return publicIP;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, name, publicIpProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating public ip address "%s"'), name));
    try {
      this.networkResourceProviderClient.publicIpAddresses.createOrUpdate(resourceGroupName, name, publicIpProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  _parseAndValidatePublicIP: function (name, params) {
    var supportedAllocationTypes = ['Dynamic', 'Static'];
    var self = this;

    var publicipProfile = {
      name: name,
      publicIpAllocationMethod: supportedAllocationTypes[0]
    };

    if (params.idletimeout) {
      var timeoutAsInt = utils.parseInt(params.idletimeout);
      if (isNaN(timeoutAsInt) || timeoutAsInt === 0) {
        throw new Error($('idletimeout parameter must be an integer'));
      }
      publicipProfile.idleTimeoutInMinutes = timeoutAsInt;
    }

    if (params.allocationMethod) {
      if (utils.stringIsNullOrEmpty(params.allocationMethod)) {
        throw new Error($('allocation method parameter must not be null or empty string'));
      }
      publicipProfile.publicIpAllocationMethod = utils.verifyParamExistsInCollection(supportedAllocationTypes,
        params.allocationMethod, 'allocationMethod');
    }

    if (params.domainNameLabel) {
      if (utils.stringIsNullOrEmpty(params.domainNameLabel)) {
        throw new Error($('domain name label parameter must not be null or empty string'));
      }
      self._createDnsSettingsIfNotExist(publicipProfile);
      publicipProfile.dnsSettings.domainNameLabel = params.domainNameLabel;
    }

    if (params.reverseFqdn) {
      if (utils.stringIsNullOrEmpty(params.reverseFqdn)) {
        throw new Error($('reverse fqdn parameter must not be null or empty string'));
      }
      self._createDnsSettingsIfNotExist(publicipProfile);
      publicipProfile.dnsSettings.reverseFqdn = params.reverseFqdn;
    }

    if (params.tags) {
      publicipProfile.tags = TagUtils.buildTagsParameter(null, params);
    }

    if (params.location) {
      publicipProfile.location = params.location;
    }

    return publicipProfile;
  },

  _createDnsSettingsIfNotExist: function (publicip) {
    if (!publicip.dnsSettings) publicip.dnsSettings = {};
  }
});

module.exports = Publicip;