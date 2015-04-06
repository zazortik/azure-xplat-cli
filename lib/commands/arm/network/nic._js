var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var ResourceUtils = require('../resource/resourceUtils');
var $ = utils.getLocaleString;

function Nic(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Nic.prototype, {
  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the network interface cards'));
    var nics = null;
    try {
      nics = this.networkResourceProviderClient.networkInterfaces.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(nics.networkInterfaces, function (outputData) {
      if (outputData.length === 0) {
        output.info($('No network interface cards found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('MAC Address'), item.macAddress || '');
        });
      }
    });
  },

  show: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (nic) {
      var resourceInfo = ResourceUtils.getResourceInformation(nic.networkInterface.id);
      interaction.formatOutput(nic.networkInterface, function (nic) {
        output.data($('Id:                  '), nic.id);
        output.data($('Name:                '), nic.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), nic.location);
        output.data($('Provisioning state:  '), nic.provisioningState);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network interface card with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, nicName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the network interface card "%s"'), nicName));
    try {
      var nic = this.networkResourceProviderClient.networkInterfaces.get(resourceGroupName, nicName, _);
      return nic;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  getAll: function(resourceGroupName, _) {
    var progress = this.cli.interaction.progress($('Getting network interface cards'));
    var nics = null;
    try {
      nics = this.networkResourceProviderClient.networkInterfaces.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    return nics;
  },

  delete: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface card with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete network interface card "%s"? [y/n] '), nicName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network interface card "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.deleteMethod(resourceGroupName, nicName, _);
    } finally {
      progress.end();
    }
  }
});

module.exports = Nic;