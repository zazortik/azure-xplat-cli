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
    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    var subnet = this.get(resourceGroupName, vNetName, subnetName, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), vNetName, resourceGroupName));
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
        output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.vNetName, resourceGroupName));
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

  _getSubnetCreateParams: function (resourceGroupName, vNetName, options, _) {
    var parameters = {};
    var vNetUtil = new VNetUtil();

    if (options.dnsServer) {
      parameters.properties.dhcpOptions.dnsServers = options.dnsServer;
    }

    var maxVmCount = options.maxVmCount;
    if (maxVmCount) {
      maxVmCount = parseInt(maxVmCount, 10);
      if (isNaN(maxVmCount)) {
        throw new Error($('--max-vm-count should be an integer value'));
      } else if (maxVmCount < 0) {
        throw new Error($('--max-vm-count should be a positive integer'));
      }
    }

    var cidr = options.cidr;
    if (cidr) {
      cidr = parseInt(cidr, 10);
      if (isNaN(cidr)) {
        throw new Error($('--cidr should be an integer value'));
      } else if (cidr < 0) {
        throw new Error($('--cidr should be a positive integer'));
      }
    } else {
      if (maxVmCount) {
        vNetUtil.parseIPv4(maxVmCount);
        cidr = vNetUtil.getCIDRFromHostsCount(maxVmCount);
      } else {
        var currentVNet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroupName, vNetName, _);
        var vnetCidr = currentVNet.virtualNetwork.properties.addressSpace.addressPrefixes[0].split('/')[1];
        var subnets = currentVNet.virtualNetwork.properties.subnets;
        if (subnets) {
          var lastSubnet = subnets[subnets.length - 1];
          cidr = parseInt(lastSubnet.properties.addressPrefix.split('/')[1]);
        } else {
          if (vnetCidr) {
            cidr = parseInt(vnetCidr);
          } else {
            cidr = vNetUtil.defaultCidrRange.start;
          }
        }
        cidr = vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(cidr);
      }
    }

    var addressSpace;
    if (options.ip4v) {
      vNetUtil.parseIPv4(options.ip4v, '--address-space');
      addressSpace = options.ip4v;
    } else {
      // If user not provided --address-space default to '10.0.0.0'.
      addressSpace = vNetUtil.defaultAddressSpaceInfo().ipv4Start;
    }
    parameters.properties = {
      addressPrefix: addressSpace + '/' + cidr
    };

    return parameters;
  }
});

module.exports = Subnet;