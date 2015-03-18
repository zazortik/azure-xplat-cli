var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var VNetCRUD = require('./vnetCRUD');

var $ = utils.getLocaleString;

function AddressSpace(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.log = this.cli.output;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(AddressSpace.prototype, {
  add: function(resourceGroupName, vnet, ip, options, _) {
    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    var vNetUtil = new VNetUtil();

    // Ensure --address-space is present if user provided --cidr
    var requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.cidr,
      'cidr', {
      'address-space': ip
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space is present if user provided --max-vm-count
    requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.maxVmCount,
      'max-vm-count', {
      'address-space': ip
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Check if virtual network exists
    var vNetCRUD = new VNetCRUD(this.cli, this.networkResourceProviderClient);
    var vNet = vNetCRUD.get(resourceGroupName, vnet, _);
    if(!vNet) {
      throw new Error(util.format('Virtual network "%s" not found', vnet));
    }

    var cidr = null;
    if(options.maxVmCount) {
      if(options.maxVmCount < 0) {
        throw new Error(util.format('max-vm-count parameter must be positive integer', vnet));
      }
      cidr = vNetUtil.getCIDRFromHostsCount(options.maxVmCount);
    } else {
      cidr = options.cidr;
    }

    var verifiedCidr = vNetUtil.verfiyCIDR(cidr);
    if(verifiedCidr.error) {
      throw new Error(error);
    }

    var ipv4Cidr = util.format("%s/%s", ip, cidr);

    var exists = false;
    for(var addressPrefixNum in vNet.virtualNetwork.properties.addressSpace.addressPrefixes) {
      var addressPrefix = vNet.virtualNetwork.properties.addressSpace.addressPrefixes[addressPrefixNum];
      if(addressPrefix === ipv4Cidr) {
        exists = true;
      }
    }
    if(exists) {
      this.log.warn($('Same address range already exists'));
      return;
    } else {
      vNet.virtualNetwork.properties.addressSpace.addressPrefixes.push(ipv4Cidr);
      var progress = this.cli.interaction.progress(util.format($('Adding new address range to address prefixes'), vnet));
      try {
        this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroupName, vnet, vNet.virtualNetwork, _);
      } finally {
        progress.end();
      }
    }
  },

  delete: function(resourceGroupName, vnet, ipv4Cidr, options, _) {
    var vNetCRUD = new VNetCRUD(this.cli, this.networkResourceProviderClient);
    var vNet = vNetCRUD.get(resourceGroupName, vnet, _);
    if(!vNet) {
      throw new Error(util.format('Virtual network "%s" not found', vnet));
    }

    if(vNet.virtualNetwork.properties.addressSpace.addressPrefixes.length === 1) {
      throw new Error(util.format('Cant delete address prefix, only one address prefix exists in virtual network %s', vnet));
    }

    var index = vNet.virtualNetwork.properties.addressSpace.addressPrefixes.indexOf(ipv4Cidr);
    if (index > -1) {
      vNet.virtualNetwork.properties.addressSpace.addressPrefixes.splice(index, 1);
      this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroupName, vnet, vNet.virtualNetwork, _);
    } else {
      throw new Error(util.format('Cant find address prefix "%s"', ipv4Cidr));
    }
  },

  list: function(resourceGroupName, vnet, options, _) {
    var vNetCRUD = new VNetCRUD(this.cli, this.networkResourceProviderClient);
    var vNet = vNetCRUD.get(resourceGroupName, vnet, _);
    if(!vNet) {
      throw new Error(util.format('Virtual network "%s" not found', vnet));
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(vNet.virtualNetwork.properties.addressSpace.addressPrefixes, function (outputData) {
    if (outputData.length === 0) {
      output.warn($('No virtual networks found'));
    } else {
      output.table(outputData, function (row, item) {
        row.cell($('Address prefixes'), item);
      });
    }
    });
  }
});

module.exports = AddressSpace;