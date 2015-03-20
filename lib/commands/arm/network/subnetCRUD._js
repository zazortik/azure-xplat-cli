var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function SubnetCRUD(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(SubnetCRUD.prototype, {
  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting virtual network subnets '));
    var subnets = null;
    try {
      subnets = this.networkResourceProviderClient.subnets.list(resourceGroupName, params.vNetName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(subnets.subnets, function (outputData) {
      if (outputData.length === 0) {
        output.info($('No virtual network subnets found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Address prefix'), item.properties.addressPrefix || '');
        });
      }
    });
  },

  show: function (resourceGroupName, params, _) {
    var subnet = this.get(resourceGroupName, params.vNetName, params.subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.vNetName, resourceGroupName));
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(subnet.subnet, function () {
      utils.logLineFormat(subnet.subnet, output.data);
    });
  },

  get: function (resourceGroupName, vNetName, subnetName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var subnet = this.networkResourceProviderClient.subnets.get(resourceGroupName, vNetName, subnetName, _);
      return subnet;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, params, _) {
    var subnet = this.get(resourceGroupName, params.vNetName, params.subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.vNetName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), params.vNetName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting subnet "%s"'), params.vNetName));
    try {
      this.networkResourceProviderClient.subnets.deleteMethod(resourceGroupName, params.vNetName, params.subnetName, _);
    } finally {
      progress.end();
    }
  }
});

module.exports = SubnetCRUD;