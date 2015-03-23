var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var $ = utils.getLocaleString;

function SubnetCRUD(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(SubnetCRUD.prototype, {
  create: function (resourceGroupName, vNetName, subnetName, options, _) {
    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), vNetName, resourceGroupName));
    }

    var parameters = this._getSubnetCreateParams(options);
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
  },

  _getSubnetCreateParams: function (options) {
    var parameters = {};
    if (options.dnsServer) {
      parameters.properties.dhcpOptions.dnsServers = options.dnsServer;
    }

    var vNetUtil = new VNetUtil();
    var cidr = options.cidr;
    var maxVmCount = options.maxVmCount;

    if (!cidr && maxVmCount) {
      vNetUtil.parseIPv4(maxVmCount);
      cidr = vNetUtil.getCIDRFromHostsCount(maxVmCount);
    } else {
      cidr = vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(vNetUtil.defaultCidrRange.start);
      this.log.info(util.format($('Using default cidr to %s'), cidr));
    }

    var addressSpace = options.ip4v;
    if (!addressSpace) {
      // If user not provided --address-space default to '10.0.0.0'.
      addressSpace = vNetUtil.defaultAddressSpaceInfo().ipv4Start;
      this.log.info(util.format($('Using default address space start IP: %s'), addressSpace));
    }
    parameters.properties = {
      addressPrefix: addressSpace + '/' + cidr
    };

    return parameters;
  }
});

module.exports = SubnetCRUD;