var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function Publicip(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Publicip.prototype, {
  create: function (resourceGroupName, name, location, params, _) {
    var publicipProfile = this._parseAndValidatePublicIP(name, location, params);
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
  },

  show: function (resourceGroupName, publicIpName, params, _) {
    var publicIP = this.get(resourceGroupName, publicIpName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (publicIP) {
      interaction.formatOutput(publicIP.publicIpAddress, function () {
        utils.logLineFormat(publicIP.publicIpAddress, output.data);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), publicIpName, resourceGroupName));
      }
    }
  },

  delete: function (resourceGroupName, publicIpName, params, _) {
    var publicIP = this.get(resourceGroupName, publicIpName, _);
    if (!publicIP) {
      throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), publicIpName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete public ip address "%s"? [y/n] '), publicIpName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting public ip address "%s"'), publicIpName));
    try {
      this.networkResourceProviderClient.publicIpAddresses.deleteMethod(resourceGroupName, publicIpName, _);
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
          row.cell($('IP Address'), item.ipAddress || '');
          var dnsName = '';
          if (item.dnsSettings) {
            dnsName = item.dnsSettings.fqdn;
          }
          row.cell($('DNSName'), dnsName);
        });
      }
    });
  },

  get: function (resourceGroupName, publicIpName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the public ip "%s"'), publicIpName));
    try {
      var publicIP = this.networkResourceProviderClient.publicIpAddresses.get(resourceGroupName, publicIpName, _);
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

  _parseAndValidatePublicIP: function (name, location, params) {
    var supportedAllocationTypes = ['Dynamic', 'Static'];

    var publicipProfile = {
      name: name,
      location: location,
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
      if (!utils.stringIsNullOrEmpty(params.allocationMethod)) {
        publicipProfile.publicIpAllocationMethod = utils.verifyParamExistsInCollection(supportedAllocationTypes,
          params.allocationMethod, 'allocationMethod');
      }
    }

    if (params.domainNameLabel) {
      if (utils.stringIsNullOrEmpty(params.domainNameLabel)) {
        throw new Error($('domain name label parameter must be null or empty string'));
      }
      publicipProfile.dnsSettings = {};
      publicipProfile.dnsSettings.domainNameLabel = params.domainNameLabel;
    }

    if (params.fqdn) {
      if (utils.stringIsNullOrEmpty(params.fqdn)) {
        throw new Error($('fqdn parameter must be null or empty string'));
      }
      publicipProfile.dnsSettings = {};
      publicipProfile.dnsSettings.fqdn = params.fqdn;
    }

    if (params.tags) {
      publicipProfile.tags = params.tags;
    }

    return publicipProfile;
  }
});

module.exports = Publicip;