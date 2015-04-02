var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var Subnet = require('./subnet');
var Nsg = require('./nsg');
var Publicip = require('./publicip');
var VNetUtil = require('../../../util/vnet.util');
var TagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Nic(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.SubnetCrud = new Subnet(cli, networkResourceProviderClient);
  this.NsgCrud = new Nsg(cli, networkResourceProviderClient);
  this.PublicipCrud = new Publicip(cli, networkResourceProviderClient);
}

__.extend(Nic.prototype, {
  create: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (nic) {
      throw new Error(util.format($('A network interface card with name "%s" already exists in the resource group "%s"'), nicName, resourceGroupName));
    }

    var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);

    var progress = this.cli.interaction.progress(util.format($('Creating network interface card "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nicProfile, _);
    } finally {
      progress.end();
    }
  },

  set: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface card with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);

    if (params.privateIpAddress) nic.networkInterface.ipConfigurations[0].privateIpAddress = params.privateIpAddress;
    if (params.subnetName && params.subnetVnetName) {
      nic.networkInterface.ipConfigurations[0].subnet = nicProfile.ipConfigurations[0].subnet;
    }
    if (params.networkSecurityGroupName) nic.networkInterface.networkSecurityGroup = nicProfile.networkSecurityGroup;
    if (params.publicIpName) {
      nic.networkInterface.ipConfigurations[0].publicIpAddress = nicProfile.ipConfigurations[0].publicIpAddress;
    }

    this.update(resourceGroupName, nicName, nic.networkInterface, _);
  },

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
  },

  update: function (resourceGroupName, nicName, nicProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating network interface card "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nicProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  _parseAndValidateNIC: function (resourceGroupName, nicName, params, _) {
    var self = this;
    var vNetUtil = new VNetUtil();

    var nicProfile = {
      ipConfigurations: [
        {
          name: 'NIC-config'
        }
      ]
    };

    if (params.privateIpAddress) {
      var ipValidationResult = vNetUtil.parseIPv4(params.privateIpAddress);
      if (ipValidationResult.error) {
        throw new Error($('public ip address parameter is in invalid format'));
      }
      nicProfile.ipConfigurations[0].privateIpAllocationMethod = 'Static';
      nicProfile.ipConfigurations[0].privateIpAddress = params.privateIpAddress;
    }

    if (params.subnetName && params.subnetVnetName) {
      var subnet = self.SubnetCrud.get(resourceGroupName, params.subnetVnetName, params.subnetName, _);
      if (!subnet) {
        throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.subnetName, resourceGroupName));
      }
      nicProfile.ipConfigurations[0].subnet = {
        id: subnet.subnet.id
      };
    }

    if (params.networkSecurityGroupName) {
      var nsg = self.NsgCrud.get(resourceGroupName, params.networkSecurityGroupName, _);
      if (!nsg) {
        throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), params.networkSecurityGroupName, resourceGroupName));
      }
      nicProfile.networkSecurityGroup = {
        id: nsg.networkSecurityGroup.id
      };
    }

    if (params.publicIpName) {
      var publicip = self.PublicipCrud.get(resourceGroupName, params.publicIpName, _);
      if (!publicip) {
        throw new Error(util.format($('A public ip address  with name "%s" not found in the resource group "%s"'), params.publicIpName, resourceGroupName));
      }
      nicProfile.ipConfigurations[0].publicIpAddress = {
        id: publicip.publicIpAddress.id
      };
    }

    if (params.location) {
      nicProfile.location = params.location;
    }

    if (params.tags) {
      nicProfile.tags = TagUtils.buildTagsParameter(null, params);
    }

    return nicProfile;
  }
});

module.exports = Nic;