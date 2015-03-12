var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');
var NetworkVNetSubnet = require('./networkVNetSubnet');

var $ = utils.getLocaleString;

function NetworkVNet(cli, networkResourceProviderClient, resourceGroupName, params) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.resourceGroupName = resourceGroupName;
  this.params = params;

}

__.extend(NetworkVNet.prototype, {
    _parseVNetCreateParams: function (params, parseSubnetParams) {
      if (!utils.hasAllParams([params.vnetName, params.vnetAddressprefix, params.location])) {
        throw new Error($('To create new virtual network the parameters vnetName, vnetAddressprefix and location are required'));
      }

      var createRequestProfile = {
        properties: {
          addressSpace: {
            addressPrefixes:  [params.vnetAddressprefix]
          },
          dhcpOptions: {
                dnsServers: []
          },
          ipConfigurations: [],
          subnets: []
        },
        location: params.location,
        name: params.vnetName
      };

      var subnetProfile = parseSubnetParams(params);
      createRequestProfile.properties.subnets.push(subnetProfile);
      return createRequestProfile;
    },

    createOrUpdateVNetIfRequired: function (_) {
      if (utils.stringIsNullOrEmpty(this.params.vnetName)) {
        throw new Error($('The parameters vnetName is required'));
      }

      var vnetInfo = {
        vnetName: this.params.vnetName,
        createdNew: false,
        profile: null,
        createRequestProfile: null,
        subnetInfo: null
      };

      var networkVNetSubnet = new NetworkVNetSubnet(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      var vnet = this._getVNet(this.resourceGroupName, this.params.vnetName, _);
      if (vnet) {
        if (!utils.ignoreCaseAndSpaceEquals(vnet.virtualNetwork.location, this.params.location)) {
          throw new Error(util.format($('Found a virtual network with name "%s" but it exists in different region "%s"'), this.params.vnetName, vnet.virtualNetwork.location));
        }

        this.cli.output.info((util.format($('Found an existing virtual network "%s"'), this.params.vnetName)));
        this.cli.output.info($('Verifying subnet'));
        var subnetInfo = networkVNetSubnet.createSubnetIfRequired(_);
        vnetInfo.profile = vnet.virtualNetwork;
        vnetInfo.subnetInfo = subnetInfo;
        return vnetInfo;
      }

      // Create new vnet along with subnet
      vnetInfo.createRequestProfile = this._createNewVNet(this.resourceGroupName, this.params, _);
      vnet = this._getVNet(this.resourceGroupName, this.params.vnetName, _);
      vnetInfo.profile = vnet.virtualNetwork;
      vnetInfo.createdNew = true;

      // Subnet created as a part of request to vnet so we need to build the subnetinfo as below
      vnetInfo.subnetInfo = networkVNetSubnet.getSubnetInfo(this.resourceGroupName, this.params.vnetName, this.params.vnetSubnetName, _);
      vnetInfo.subnetInfo.createdNew = true;
      return vnetInfo;
    },

    _getVNet: function (resourceGroupName, vnetName, _) {
      var progress = this.cli.interaction.progress(util.format($('Looking up the virtual network "%s"'), vnetName));
      try {
        var vnet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroupName, vnetName, _);
        return vnet;
      } catch (e) {
        if (e.code === 'ResourceNotFound') {
          return null;
        }
        throw e;
      } finally {
        progress.end();
      }
    },

    _createNewVNet: function (resourceGroupName, params, _) {
      var networkVNetSubnet = new NetworkVNetSubnet(this.cli, this.networkResourceProviderClient, resourceGroupName, params);
      var progress;
      try {
        progress = this.cli.interaction.progress(util.format($('Creating a new virtual network "%s" with subnet'), params.vnetName));
        var getVNetSubnetProfile = __.bind(networkVNetSubnet.getVNetSubnetProfile, networkVNetSubnet);
        var createRequestProfile = this._parseVNetCreateParams(this.params, getVNetSubnetProfile);
        this.networkResourceProviderClient.virtualNetworks.createOrUpdate(this.resourceGroupName, params.vnetName, createRequestProfile,  _);
        return createRequestProfile;
      } finally {
        progress.end();
      }
    },

    hasAnyVNetParameters: function(params) {
      var allVNetParams = [
        params.vnetName,
        params.vnetDnsserver,
        params.vnetAddressprefix,
        params.vnetSubnetName,
        params.vnetSubnetAddressprefix,
        params.vnetSubnetDnsserver
      ];

      return utils.hasAnyParams(allVNetParams);
    }
  }
);


module.exports = NetworkVNet;