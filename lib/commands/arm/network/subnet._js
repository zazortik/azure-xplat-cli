var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var $ = utils.getLocaleString;

function Subnet(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(Subnet.prototype, {
  create: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), subnetName, resourceGroupName));
    }

    var parameters = this._getSubnetCreateParams(resourceGroupName, vNetName, options, _);
    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), subnetName));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroupName, vNetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), subnetName, resourceGroupName));
    }

    var parameters = this._getSubnetCreateParams(resourceGroupName, vNetName, options, _);
    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), subnetName));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroupName, vNetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
  },

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
    var output = this.cli.output;
    var interaction = this.cli.interaction;
    if (subnet) {
      interaction.formatOutput(subnet.subnet, function () {
        utils.logLineFormat(subnet.subnet, output.data);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.subnetName, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, vNetName, subnetName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var subnet = this.networkResourceProviderClient.subnets.get(resourceGroupName, vNetName, subnetName, _);
      return subnet;
    } catch (e) {
      if (e.code === 'NotFound') {
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
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.subnetName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), params.subnetName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting subnet "%s"'), params.subnetName));
    try {
      this.networkResourceProviderClient.subnets.deleteMethod(resourceGroupName, params.vNetName, params.subnetName, _);
    } finally {
      progress.end();
    }
  },

  _getSubnetCreateParams: function (resourceGroupName, vNetName, options, _) {
    var vNetUtil = new VNetUtil();
    var vNet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroupName, vNetName, _);
    if (!vNet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), vNetName, resourceGroupName));
    }

    var addressSpace;
    if (options.addressPrefix) {
      vNetUtil.parseIPv4(options.addressPrefix, '--address-prefix');
      addressSpace = options.addressPrefix;
    }

    if(!addressSpace){
      var vnetAddressPrefix = vNet.virtualNetwork.addressSpace.addressPrefixes[0];
      if (!vnetAddressPrefix) {
        throw new Error(util.format($('Virtual network "%s" does not contain any address prefix'), vNetName));
      }
      addressSpace = vnetAddressPrefix.split('/')[0];
      addressSpace = addressSpace + '/' + vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(parseInt(vnetAddressPrefix.split('/')[1]));
    }
    var parameters = {
      addressPrefix: addressSpace
    };
    console.log('addressSpace' + addressSpace);

    return parameters;
  }
});

module.exports = Subnet;
