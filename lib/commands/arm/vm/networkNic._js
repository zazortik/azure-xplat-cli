var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');
var NetworkPublicIP = require('./networkPublicIP');
var NetworkVNet = require('./networkVNet');

var $ = utils.getLocaleString;

function NetworkNic(cli, networkResourceProviderClient, resourceGroupName, params) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
}

__.extend(NetworkNic.prototype, {
    createNICIfRequired: function(_) {
      if (utils.stringIsNullOrEmpty(this.params.nicName)) {
        throw new Error($('The parameters nicName is required'));
      }

      if (utils.stringIsNullOrEmpty(this.params.location)) {
        throw new Error($('The parameter location is required'));
      }

      var nicInfo = {
        nicName: this.params.nicName,
        createdNew: false,
        updated: false,
        createRequestProfile: null,
        profile: null,
        vnetInfo: null,
        publicipInfo: null
      };

      var nic = this._getNIC(this.resourceGroupName, this.params.nicName, _);
      if (nic) {
        this.cli.output.info(util.format($('Found an existing NIC "%s"'), this.params.nicName));
        if (!utils.ignoreCaseAndSpaceEquals(nic.networkInterface.location, this.params.location)) {
          throw new Error(util.format($('Existing NIC with name "%s" is hosted in a different region "%s"'), this.params.nicName, nic.networkInterface.location));
        }

        if ((nic.networkInterface.properties.virtualMachine !== undefined) && (nic.networkInterface.properties.virtualMachine.id !== undefined)) {
          var attachedVMName = nic.networkInterface.properties.virtualMachine.id.split(['/']).splice(-1)[0];
          throw new Error(util.format($('The nic "%s" already attached the VM "%s"'), this.params.nicName, attachedVMName));
        }

        // Note: Once ARM supports multiple ip configuration set allowNewIpConfig:true
        var updateInfo = this._updateNICIfRequired(nic, this.params, false, _);
        nicInfo.createdNew = false;
        nicInfo.updated = updateInfo.updated;
        nicInfo.vnetInfo = updateInfo.vnetInfo;
        nicInfo.publicipInfo = updateInfo.publicipInfo;

        if (nicInfo.updated) {
          nic = this._getNIC(this.resourceGroupName, this.params.nicName, _);
        }

        nicInfo.profile = nic.networkInterface;
        return nicInfo;
      }

      this.cli.output.info(util.format($('An nic with given name "%s" not found, creating a new one'), this.params.nicName));
      var r = this._createNewNIC(this.resourceGroupName, this.params, _);

      nicInfo.createdNew = true;
      nicInfo.createRequestProfile = r.createRequestProfile;
      nicInfo.vnetInfo = r.vnetInfo;
      nicInfo.publicipInfo = r.publicipInfo;
      nic = this._getNIC(this.resourceGroupName, this.params.nicName, _);
      nicInfo.profile = nic.networkInterface;
      return nicInfo;
    },

    _getNIC: function (resourceGroupName, nicName, _) {
      var progress = this.cli.interaction.progress(util.format($('Looking up the NIC "%s"'), nicName));
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

    _updateNICIfRequired: function (nic, params, allowNewIpConfig,  _) {
      var nicUpdateInfo = {
        updated: false,
        vnetInfo: null,
        publicipInfo: null
      };

      var existingIpConfiguration;

      var networkInterface = nic.networkInterface;
      var networkVNet = new NetworkVNet(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      if (allowNewIpConfig) {
        // User want to add a new IP config (Azure won't support this currently). To add new config VNet parameters
        // are required. If there is just public ip param without vnet param we will not proceed because we don't know
        // under which ip config we want to add the public ip, we use vnet::subnetId to identify the ip config.
        if (!networkVNet.hasAnyVNetParameters(params)) {
          return nicUpdateInfo;
        }

        this.cli.output.info($('Found virtual network parameters, assuming user want to configure NIC with a virtual network'));
        nicUpdateInfo.vnetInfo = networkVNet.createOrUpdateVNetIfRequired(_);

        var subnetId = nicUpdateInfo.vnetInfo.subnetInfo.profile.id;
        existingIpConfiguration = this._lookupIPConfiguration(networkInterface.properties.ipConfigurations, subnetId);
        if (!existingIpConfiguration) {
          this.cli.output.info(util.format($('NIC does not contain an ip configuration with virtual network subnet having ID "%s""'), subnetId));
          var r = this._createNewIPConfiguration2(subnetId, this.params.nicName, _);
          if (!r.ipConfiguration.properties.publicIpAddress) {
            this.cli.output.info($('public ip parameters is ignored or absent, a new ip configuration with only virtual network subnet will be added to NIC'));
          } else {
            nicUpdateInfo.publicipInfo = r.publicipInfo;
          }

          networkInterface.properties.ipConfigurations.push(r.ipConfiguration);
          this._updateNIC(nic, _);
          nicUpdateInfo.updated = true;
          return nicUpdateInfo;
        }
      } else {
        // Currently Azure support having only one IP Config per NIC
        existingIpConfiguration = networkInterface.properties.ipConfigurations[0];
      }

      if (allowNewIpConfig) {
        this.cli.output.info(util.format($('NIC "%s" contains an ip configuration with a virtual network subnet "%s"'),
          this.params.nicName, this.params.vnetSubnetName));
      } else {
        this.cli.output.info(util.format($('Found an ip configuration with virtual network subnet id "%s" in the NIC "%s"'),
          existingIpConfiguration.properties.subnet.id, this.params.nicName));
      }

      var networkPublicIP = new NetworkPublicIP(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      if (utils.hasValidProperty(existingIpConfiguration.properties.publicIpAddress, 'id')) {
        var publicipId = existingIpConfiguration.properties.publicIpAddress.id.toLocaleLowerCase();
        if (utils.stringIsNullOrEmpty(this.params.publicipName)) {
          this.cli.output.info(util.format($('This NIC ip configuration has a public ip already configured "%s", any public ip parameters will be ignored'), publicipId));
        } else {
          var partialPublicIdFromParams = networkPublicIP.buildIdFromParams();
          if (utils.stringEndsWith(publicipId, partialPublicIdFromParams)) {
            this.cli.output.info(util.format($('The identified NIC ip configuration already configured with the provided public ip "%s"'), this.params.publicipName));
          } else {
            this.cli.output.info(util.format($('This NIC ip configuration already has a public ip configured "%s", using this public ip'), publicipId));
          }
        }

        return nicUpdateInfo;
      }

      if (!networkPublicIP.hasAnyPubIPParameters(this.params)) {
        // User want to create a VM without publicIP (its a valid scenario)
        this.cli.output.info($('This is an NIC without publicIP configured'));
        return nicUpdateInfo;
      }

      var c = this._createNewIPConfiguration2(existingIpConfiguration.properties.subnet.id, this.params.nicName, _);
      if (!c.ipConfiguration.properties.publicIpAddress) {
        this.cli.output.info($('public ip parameters is ignored or absent, using this NIC with subnet'));
        return nicUpdateInfo;
      } else {
        this.cli.output.info(util.format($('Configuring identified NIC ip configuration with public ip "%s"'), params.publicipName));
      }

      existingIpConfiguration.properties.publicIpAddress = c.ipConfiguration.properties.publicIpAddress;
      this._updateNIC(nic, _);
      nicUpdateInfo.publicipInfo = c.publicipInfo;
      nicUpdateInfo.updated = true;
      return nicUpdateInfo;
    },

    _createNewIPConfiguration1: function (nicName, _) {
      var result = {};

      var networkVNet = new NetworkVNet(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      result.vnetInfo = networkVNet.createOrUpdateVNetIfRequired(_);
      var r = this._createNewIPConfiguration2(result.vnetInfo.subnetInfo.profile.id, nicName, _);
      result.ipConfiguration = r.ipConfiguration;
      result.publicipInfo = r.publicipInfo;
      return result;
    },

    _createNewIPConfiguration2: function (subnetId, nicName, _) {
      var newipConfiguration = {
        properties: {
          subnet: {
            id: subnetId
          }
        },
        name: 'ipconfig' + (new Date()).getTime()
      };

      var publicipInfo;
      var networkPublicIP = new NetworkPublicIP(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      if (networkPublicIP.hasAnyPubIPParameters(this.params)) {
        this.cli.output.info($('Found public ip parameters, trying to setup public ip profile'));
        publicipInfo = networkPublicIP.createPublicIPIfRequired(_);

        newipConfiguration.properties.publicIpAddress = {
          id: publicipInfo.profile.id
        };

        if (utils.hasValidProperty(publicipInfo.profile.properties.ipConfiguration, 'id')) {
          // This is not a new public ip and is already attached to an NIC
          var connectedNicIPConfigId = publicipInfo.profile.properties.ipConfiguration.id.split(['/']);
          var connectedNicName = connectedNicIPConfigId.splice(-3, 1)[0];
          var connectedNicResourceGroupName = connectedNicIPConfigId.splice(-6, 1)[0];
          if (utils.ignoreCaseEquals(connectedNicName, nicName) && utils.ignoreCaseEquals(connectedNicResourceGroupName, this.resourceGroupName)) {
            this.cli.output.info($('The public ip is already attached to this NIC'));
          } else {
            this.cli.output.info(util.format($('The given public ip will not be used as it is attached to a different NIC "%s"'), connectedNicName));
            newipConfiguration.properties.publicIpAddress = null;
          }
        }
      }

      return {
        ipConfiguration: newipConfiguration,
        publicipInfo: publicipInfo
      };
    },

    _lookupIPConfiguration: function (ipConfigurations, subnetId) {
      var foundIpConfiguration;
      if (ipConfigurations !== null && ipConfigurations.length > 0) {
        for (var i = 0; i < ipConfigurations.length; i++) {
          if (ipConfigurations[i].properties.subnet) {
            // Observation is: there cannot be a nic network-config without subnet so
            // above check always succeeded
            if (ipConfigurations[i].properties.subnet.id === subnetId) {
              foundIpConfiguration = ipConfigurations[i];
              break;
            }
          }
        }
      }

      return foundIpConfiguration ? foundIpConfiguration : null;
    },

    _updateNIC: function (nic, _) {
      var progress = this.cli.interaction.progress(util.format($('Updating NIC "%s"'), nic.networkInterface.name));
      try {
        this.networkResourceProviderClient.networkInterfaces.createOrUpdate(this.resourceGroupName, nic.networkInterface.name, nic.networkInterface, _);
      } finally {
        progress.end();
      }
    },

    _createNewNIC: function (resourceGroupName, params, _) {
      var createRequestProfile = {
        properties: {
          ipConfigurations: []
        },
        location: params.location,
        name: params.nicName
      };

      var r = this._createNewIPConfiguration1(params.nicName, _);
      if (!r.ipConfiguration.properties.publicIpAddress) {
        this.cli.output.info($('No public ip parameters found, the ip configuration of new NIC will have only subnet configured'));
      }

      createRequestProfile.properties.ipConfigurations.push(r.ipConfiguration);
      var progress = this.cli.interaction.progress(util.format($('Creating NIC "%s"'), params.nicName));
      try {
        this.networkResourceProviderClient.networkInterfaces.createOrUpdate(this.resourceGroupName, params.nicName, createRequestProfile, _);
      } finally {
        progress.end();
      }

      return {
        createRequestProfile: createRequestProfile,
        vnetInfo: r.vnetInfo,
        publicipInfo: r.publicipInfo
      };
    }
  }
);

module.exports = NetworkNic;