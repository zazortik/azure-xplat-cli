var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var ResourceUtils = require('../resource/resourceUtils');
var Nsg = require('./nsg');
var profile = require('../../../util/profile');
var $ = utils.getLocaleString;

function Subnet(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.log = cli.output;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.NsgCrud = new Nsg(cli, networkResourceProviderClient);
}

__.extend(Subnet.prototype, {
  create: function (options, _) {
    var subnet = this.get(options.resourceGroup, options.vnetName, options.name, _);
    if (subnet) {
      throw new Error(util.format($('A subnet with name "%s" already exists in the resource group "%s"'), options.name, options.resourceGroup));
    }

    var parameters = this._getSubnetParams(options, true, _);
    var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s"'), options.name));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(options.resourceGroup, options.vnetName, options.name, parameters, _);
    } finally {
      progress.end();
    }
    this.show(options, _);
  },

  set: function (options, _) {
    var subnet = this.get(options.resourceGroup, options.vnetName, options.name, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.name, options.resourceGroup));
    }

    var subnetProfile = this._getSubnetParams(options, false, _);

    if (options.addressPrefix) subnet.subnet.addressPrefix = subnetProfile.addressPrefix;
    if (options.nsgId) subnet.subnet.networkSecurityGroup = subnetProfile.networkSecurityGroup;
    if (options.nsgName) subnet.subnet.networkSecurityGroup = subnetProfile.networkSecurityGroup;

    var progress = this.cli.interaction.progress(util.format($('Setting subnet "%s"'), options.name));
    try {
      this.networkResourceProviderClient.subnets.createOrUpdate(options.resourceGroup, options.vnetName, options.name, subnet.subnet, _);
    } finally {
      progress.end();
    }
    this.show(options, _);
  },

  list: function (options, _) {
    var progress = this.cli.interaction.progress($('Getting virtual network subnets '));
    var subnets = null;
    try {
      subnets = this.networkResourceProviderClient.subnets.list(options.resourceGroup, options.vnetName, _);
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

  show: function (options, _) {
    var subnet = this.get(options.resourceGroup, options.vnetName, options.name, _);
    var output = this.cli.output;
    if (!subnet) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.name, options.resourceGroup));
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

  delete: function (options, _) {
    var subnet = this.get(options.resourceGroup, options.vnetName, options.name, _);
    if (!subnet) {
      throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.name, options.resourceGroup));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete subnet "%s"? [y/n] '), options.name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting subnet "%s"'), options.name));
    try {
      this.networkResourceProviderClient.subnets.deleteMethod(options.resourceGroup, options.vnetName, options.name, _);
    } finally {
      progress.end();
    }
  },

  _getSubnetParams: function (options, useDefaultSubnetCidr, _) {
    if (options.nsgId && options.nsgName) {
      throw new Error(util.format($('Options --nsg-id and nsg-name are mutually exclusive')));
    }

    var vNetUtil = new VNetUtil();
    var vNet = this.networkResourceProviderClient.virtualNetworks.get(options.resourceGroup, options.vnetName, _);
    if (!vNet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), options.vnetName, options.resourceGroup));
    }

    var addressSpace;
    if (options.addressPrefix) {
      this._validateAddressPrefix(options.addressPrefix);
      addressSpace = options.addressPrefix;
    }

    if (!addressSpace && useDefaultSubnetCidr) {
      var vnetAddressPrefix = vNet.virtualNetwork.addressSpace.addressPrefixes[0];
      if (!vnetAddressPrefix) {
        throw new Error(util.format($('Virtual network "%s" does not contain any address prefix'), options.vnetName));
      }
      addressSpace = vnetAddressPrefix.split('/')[0];
      addressSpace = addressSpace + '/' + vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(parseInt(vnetAddressPrefix.split('/')[1]));
    }

    var parameters = {
      addressPrefix: addressSpace
    };

    if (options.nsgId) {
      this._validateNsgId(options.subscription, this.NsgCrud, options.nsgId, _);
      parameters.networkSecurityGroup = {
        id: options.nsgId
      };
    }

    if (options.nsgName) {
      var nsgId = this._getNsgIdByName(options.resourceGroup, this.NsgCrud, options.nsgName, _);
      parameters.networkSecurityGroup = {
        id: nsgId
      };
    }

    return parameters;
  },

  _showSubnet: function (subnet) {
    var resourceInfo = ResourceUtils.getResourceInformation(subnet.id);

    var log = this.log;
    this.cli.interaction.formatOutput(subnet, function (subnet) {
      log.data($('Id:                  '), subnet.id);
      log.data($('Name:                '), subnet.name);
      log.data($('Type:                '), resourceInfo.resourceType);
      log.data($('Address prefix:      '), subnet.addressPrefix);

      if (subnet.networkSecurityGroup) {
        log.data($('NSG id:              '), subnet.networkSecurityGroup.id);
      }

      log.data($('Provisioning state:  '), subnet.provisioningState);
    });
  },

  _validateAddressPrefix: function (addressPrefix) {
    if (utils.stringIsNullOrEmpty(addressPrefix)) {
      throw new Error($('address prefix parameter must not be null or empty string'));
    }

    var vNetUtil = new VNetUtil();
    var ipValidationResult = vNetUtil.parseIPv4Cidr(addressPrefix);
    if (ipValidationResult.error) {
      throw new Error($(ipValidationResult.error));
    }
    if (ipValidationResult.cidr === null) {
      throw new Error($('The --address-prefix must be in cidr format (---.---.---.---/cidr)'));
    }
  },

  _validateNsgId: function (subscriptionOption, nsgCrud, id, _) {
    if (utils.stringIsNullOrEmpty(id)) {
      throw new Error($('A network security group id must not be null or empty string'));
    }

    var subscription = profile.current.getSubscription(subscriptionOption);
    var subscriptionId = subscription.id;

    var idParts = id.split('/');
    if (idParts[0] === '') {
      idParts.splice(0, 1);
    }
    if (idParts.length !== 8) {
      throw new Error($('incorrect network security group id'));
    }

    var subscriptionIndex = 0;
    var subscriptionIdIndex = 1;
    var resourceGroupsIndex = 2;
    var resourceGroupNameIndex = 3;
    var providersIndex = 4;
    var microsoftNetworkIndex = 5;
    var networkSecurityGroupsIndex = 6;
    var resourceNameIndex = 7;


    if (idParts[subscriptionIndex] !== 'subscriptions' ||
      idParts[subscriptionIdIndex] !== subscriptionId ||
      idParts[resourceGroupsIndex] !== 'resourceGroups' ||
      utils.stringIsNullOrEmpty(idParts[resourceGroupNameIndex]) ||
      idParts[providersIndex] !== 'providers' ||
      idParts[microsoftNetworkIndex] !== 'Microsoft.Network' ||
      idParts[networkSecurityGroupsIndex] !== 'networkSecurityGroups') {
      throw new Error($('incorrect network security group id'));
    }

    var resourceGroupName = idParts[resourceGroupNameIndex];
    var nsgName = idParts[resourceNameIndex];

    if (utils.stringIsNullOrEmpty(nsgName)) {
      throw new Error($('incorrect network security group id'));
    }

    var nsg = nsgCrud.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with id "%s" not found in the resource group "%s"'),
        id, resourceGroupName));
    }
  },

  _getNsgIdByName: function (resourceGroupName, nsgCrud, nsgName, _) {
    if (utils.stringIsNullOrEmpty(nsgName)) {
      throw new Error($('A network security group name must not be null or empty string'));
    }

    var nsg = nsgCrud.get(resourceGroupName, nsgName, _);
    if (!nsg) {
      throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'),
        nsgName, resourceGroupName));
    }

    return nsg.networkSecurityGroup.id;
  }
});

module.exports = Subnet;
