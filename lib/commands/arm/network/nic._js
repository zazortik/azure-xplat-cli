var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var Subnet = require('./subnet');
var Nsg = require('./nsg');
var Publicip = require('./publicip');
var VNetUtil = require('../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
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
    if (params.subnetId || (params.subnetName && params.subnetVnetName)) {
      var nic = this.get(resourceGroupName, nicName, _);
      if (nic) {
        throw new Error(util.format($('A network interface with name "%s" already exists in the resource group "%s"'), nicName, resourceGroupName));
      }

      var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);
      var progress = this.cli.interaction.progress(util.format($('Creating network interface "%s"'), nicName));
      try {
        this.networkResourceProviderClient.networkInterfaces.createOrUpdate(resourceGroupName, nicName, nicProfile, _);
      } finally {
        progress.end();
      }
      this.show(resourceGroupName, nicName, params, _);
    } else {
      throw new Error($('--subnet-id or --subnet-name, --subnet-vnet-name parameters must be provided'));
    }
  },

  set: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    var nicProfile = this._parseAndValidateNIC(resourceGroupName, nicName, params, _);

    if (params.privateIpAddress) {
      nic.networkInterface.ipConfigurations[0].privateIpAddress = params.privateIpAddress;
      nic.networkInterface.ipConfigurations[0].privateIpAllocationMethod = 'Static';
    }

    if (params.subnetId || (params.subnetName && params.subnetVnetName)) {
      nic.networkInterface.ipConfigurations[0].subnet = nicProfile.ipConfigurations[0].subnet;
    }

    var optionalNsgId = utils.getOptionalArg(params.networkSecurityGroupId);
    if (optionalNsgId.hasValue) {
      if (optionalNsgId.value !== null) {
        nic.networkInterface.networkSecurityGroup = nicProfile.networkSecurityGroup;
      } else {
        delete nic.networkInterface.networkSecurityGroup;
      }
    } else if (params.networkSecurityGroupName) {
      nic.networkInterface.networkSecurityGroup = nicProfile.networkSecurityGroup;
    }

    var optionalPublicipId = utils.getOptionalArg(params.publicIpId);
    if (optionalPublicipId.hasValue) {
      if (optionalPublicipId.value !== null) {
        nic.networkInterface.ipConfigurations[0].publicIpAddress = nicProfile.ipConfigurations[0].publicIpAddress;
      } else {
        delete nic.networkInterface.ipConfigurations[0].publicIpAddress;
      }
    } else if (params.publicIpName) {
      nic.networkInterface.ipConfigurations[0].publicIpAddress = nicProfile.ipConfigurations[0].publicIpAddress;
    }

    if (params.tags) {
      tagUtils.appendTags(nic.networkInterface, nicProfile.tags);
    }

    if (params.tags === false) {
      nic.networkInterface.tags = {};
    }

    this.update(resourceGroupName, nicName, nic.networkInterface, _);
    this.show(resourceGroupName, nicName, params, _);
  },

  list: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the network interfaces'));
    var nics = null;
    try {
      nics = this.networkResourceProviderClient.networkInterfaces.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(nics.networkInterfaces, function (outputData) {
      if (outputData.length === 0) {
        output.info($('No network interfaces found'));
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
      var resourceInfo = resourceUtils.getResourceInformation(nic.networkInterface.id);
      interaction.formatOutput(nic.networkInterface, function (nic) {
        output.data($('Id:                    '), nic.id);
        output.data($('Name:                  '), nic.name);
        output.data($('Type:                  '), resourceInfo.resourceType);
        output.data($('Location:              '), nic.location);
        output.data($('Provisioning state:    '), nic.provisioningState);
        if (nic.macAddress) {
          output.data($('MAC address:           '), nic.macAddress);
        }
        if (nic.networkSecurityGroup) {
          output.data($('Network security group:'), nic.networkSecurityGroup.id);
        }
        if (nic.virtualMachine) {
          output.data($('Virtual machine:       '), nic.virtualMachine.id);
        }

        if (!__.isEmpty(nic.ipConfigurations)) {
          output.data($('IP configurations:     '), '');
          for (var configNum in nic.ipConfigurations) {
            var config = nic.ipConfigurations[configNum];
            output.data($('   Name:                        '), config.name);
            output.data($('   Provisioning state:          '), config.provisioningState);
            if (config.publicIpAddress) {
              output.data($('   Public IP address:           '), config.publicIpAddress);
            }
            output.data($('   Private IP address:          '), config.privateIpAddress);
            output.data($('   Private IP Allocation Method:'), config.privateIpAllocationMethod);
            output.data($('   Subnet:                      '), config.subnet.id);
            output.data($(''), '');
          }
        } else {
          output.data($('IP configurations:     '), '');
        }

        if (!__.isEmpty(nic.tags)) {
          output.data($('Tags:                '), tagUtils.getTagsInfo(nic.tags));
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, nicName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the network interface "%s"'), nicName));
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

  delete: function (resourceGroupName, nicName, params, _) {
    var nic = this.get(resourceGroupName, nicName, _);
    if (!nic) {
      throw new Error(util.format($('A network interface with name "%s" not found in the resource group "%s"'), nicName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete network interface "%s"? [y/n] '), nicName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting network interface "%s"'), nicName));
    try {
      this.networkResourceProviderClient.networkInterfaces.deleteMethod(resourceGroupName, nicName, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, nicName, nicProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating network interface "%s"'), nicName));
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
    var output = self.cli.output;
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

    if (params.subnetId) {
      if (params.subnetName || params.subnetVnetName) {
        output.warn($('--subnet-name, --subnet-vnet-name parameters will be ignored because --subnet-name, --subnet-vnet-name and --subnet-id are mutually exclusive'));
      }
      nicProfile.ipConfigurations[0].subnet = {
        id: params.subnetId
      };
    } else {
      if (params.subnetName && params.subnetVnetName) {
        var subnet = self.SubnetCrud.get(resourceGroupName, params.subnetVnetName, params.subnetName, _);
        if (!subnet) {
          throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), params.subnetName, resourceGroupName));
        }
        nicProfile.ipConfigurations[0].subnet = {
          id: subnet.subnet.id
        };
      }
    }

    if (params.networkSecurityGroupId) {
      if (params.networkSecurityGroupName) output.warn($('--network-security-group-name parameter will be ignored because --network-security-group-id and --network-security-group-name are mutually exclusive'));
      nicProfile.networkSecurityGroup = {
        id: params.networkSecurityGroupId
      };
    } else {
      if (params.networkSecurityGroupName) {
        var nsg = self.NsgCrud.get(resourceGroupName, params.networkSecurityGroupName, _);
        if (!nsg) {
          throw new Error(util.format($('A network security group with name "%s" not found in the resource group "%s"'), params.networkSecurityGroupName, resourceGroupName));
        }
        nicProfile.networkSecurityGroup = {
          id: nsg.networkSecurityGroup.id
        };
      }
    }

    if (params.publicIpId) {
      if (params.publicIpName) output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      nicProfile.ipConfigurations[0].publicIpAddress = {
        id: params.publicIpId
      };
    } else {
      if (params.publicIpName) {
        var publicip = self.PublicipCrud.get(resourceGroupName, params.publicIpName, _);
        if (!publicip) {
          throw new Error(util.format($('A public ip address  with name "%s" not found in the resource group "%s"'), params.publicIpName, resourceGroupName));
        }
        nicProfile.ipConfigurations[0].publicIpAddress = {
          id: publicip.publicIpAddress.id
        };
      }
    }

    if (params.location) {
      nicProfile.location = params.location;
    }

    if (params.tags) {
      nicProfile.tags = tagUtils.buildTagsParameter(null, params);
    }

    return nicProfile;
  }
});

module.exports = Nic;