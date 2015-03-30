var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var ResourceUtils = require('../resource/resourceUtils');
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
    this.show(resourceGroupName, vNetName, subnetName, options, _);
  },

  set: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), subnetName, resourceGroupName));
    }

    if (options.nsgId && options.nsgName) {
      throw new Error(util.format($('Options --nsg-id and nsg-name are mutually exclusive')));
    }

    var parameters = {};
    if (options.addressPrefix) {
      var vNetUtil = new VNetUtil();
      vNetUtil.parseIPv4(options.addressPrefix);
      parameters.addressPrefix = options.addressPrefix;
    }

    var progress = this.cli.interaction.progress(util.format($('Setting subnet "%s"'), subnetName));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroupName, vNetName, subnetName, parameters, _);
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, vNetName, subnetName, options, _);
  },

  list: function (resourceGroupName, vNetName, options, _) {
    var progress = this.cli.interaction.progress($('Getting virtual network subnets '));
    var subnets = null;
    try {
      subnets = this.networkResourceProviderClient.subnets.list(resourceGroupName, vNetName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(subnets.subnets, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No virtual networks found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('ID'), item.id);
          row.cell($('Name'), item.name);
          row.cell($('Address prefix'), item.addressPrefix);
        });
      }
    });
  },

  show: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    var output = this.cli.output;
    if (!subnet) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), subnetName, resourceGroupName));
      }
      return;
    }
    this._showSubnet(subnet.subnet);
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

  delete: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), subnetName, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), subnetName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting subnet "%s"'), subnetName));
    try {
      this.networkResourceProviderClient.subnets.deleteMethod(resourceGroupName, vNetName, subnetName, _);
    } finally {
      progress.end();
    }
  },

  _getSubnetCreateParams: function (resourceGroupName, vNetName, options, _) {
    if (options.nsgId && options.nsgName) {
      throw new Error(util.format($('Options --nsg-id and nsg-name are mutually exclusive')));
    }

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

    if (!addressSpace) {
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

    return parameters;
  },

  _showSubnet: function (subnet) {
    var resourceInformation = ResourceUtils.getResourceInformation(subnet.id);
    this.cli.output.data($('Id:                  '), subnet.id);
    this.cli.output.data($('Name:                '), subnet.name);
    this.cli.output.data($('Type:                '), resourceInformation.resourceType);
    this.cli.output.data($('Address prefix:      '), subnet.addressPrefix);
    this.cli.output.data($('Provisioning state:  '), subnet.provisioningState);
  }
});

module.exports = Subnet;
