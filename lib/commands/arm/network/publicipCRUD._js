var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function PublicipCRUD(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(PublicipCRUD.prototype, {
  create: function (resourceGroupName, params, _) {
    var createRequestProfile = this._parsePublicIPCreateParams(params);
    var publicIP = this.get(resourceGroupName, params.name, _);
    if (publicIP) {
      throw new Error(util.format($('A public IP with name "%s" already exists in the resource group "%s"'), params.name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating public ip "%s"'), params.name));
    try {
      this.networkResourceProviderClient.publicIpAddresses.createOrUpdate(resourceGroupName, params.name, createRequestProfile,  _);
    } finally {
      progress.end();
    }
  },

  show: function (resourceGroupName, params, _) {
    var publicIP = this.get(resourceGroupName, params.name, _);
    if (!publicIP) {
      throw new Error(util.format($('A public ip with name "%s" not found in the resource group "%s'), params.name, resourceGroupName));
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(publicIP.publicIpAddress, function () {
      utils.logLineFormat(publicIP.publicIpAddress, output.data);
    });
  },

  delete: function (resourceGroupName, params, _) {
    var publicIP = this.get(resourceGroupName, params.name, _);
    if (!publicIP) {
      throw new Error(util.format($('A public ip with name "%s" not found in the resource group "%s'), params.name, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete public ip "%s?" [y/n] '), params.name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting public ip "%s"'), params.name));
    try {
      this.networkResourceProviderClient.publicIpAddresses.deleteMethod(resourceGroupName, params.name, _);
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
        output.info($('No public ip address found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('IP Address'), item.properties.ipAddress || '');
          var dnsName = '';
          if (item.properties.dnsSettings) {
            dnsName = item.properties.dnsSettings.fqdn;
          }
          row.cell($('DNSName'), dnsName);
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

  _parsePublicIPCreateParams: function (params) {
    if (!utils.hasAllParams([params.name, params.domainName, params.location])) {
      throw new Error($('To create new public ip the parameters name, domainName and location are required'));
    }

    var createRequestProfile = {
      properties: {
        dnsSettings: {
          domainNameLabel:  params.domainName
        }
      },
      location: params.location
    };

    if (params.idletimeout) {
      var timeoutAsInt = utils.parseInt(params.idletimeout);
      if (isNaN(timeoutAsInt) || timeoutAsInt === 0) {
        throw new Error($('idletimeout is an optional parameter when it is specified it must be an integer'));
      }
      createRequestProfile.properties.idleTimeoutInMinutes = timeoutAsInt;
    }

    var supportedAllocationTypes = ['Dynamic'];
    if (!utils.stringIsNullOrEmpty(params.allocationMethod)) {
      createRequestProfile.properties.publicIpAllocationMethod  = utils.verifyParamExistsInCollection(supportedAllocationTypes,
          params.allocationMethod,
          'allocationMethod');
    } else {
      createRequestProfile.properties.publicIpAllocationMethod = supportedAllocationTypes[0];
    }

    return createRequestProfile;
  }
});

module.exports = PublicipCRUD;