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
        addressSpace: {
          addressPrefixes: [params.vnetAddressprefix]
        },
        dhcpOptions: {
          dnsServers: []
        },
        ipConfigurations: [],
        subnets: [],
        location: params.location,
        name: params.vnetName
      };

      var subnetProfile = parseSubnetParams(params);
      createRequestProfile.subnets.push(subnetProfile);
      return createRequestProfile;
    },

    createOrUpdateVNetIfRequired: function (_) {
      if (utils.stringIsNullOrEmpty(this.params.vnetName)) {
        throw new Error($('The parameters vnetName is required'));
      }

      var networkVNetSubnet = new NetworkVNetSubnet(this.cli, this.networkResourceProviderClient, this.resourceGroupName, this.params);
      var vnetInfo = this.getVNetInfoByName(this.resourceGroupName, this.params.vnetName, _);
      if (vnetInfo.profile) {
        if (!utils.ignoreCaseAndSpaceEquals(vnetInfo.profile.location, this.params.location)) {
          throw new Error(util.format($('Found a virtual network with name "%s" but it exists in different region "%s"'), vnetInfo.vnetName, vnetInfo.profile.location));
        }

        this.cli.output.info((util.format($('Found an existing virtual network "%s"'), vnetInfo.vnetName)));
        this._printSubnets(vnetInfo.profile.subnets);
        this.cli.output.info($('Verifying subnet'));
        vnetInfo.subnetInfo = networkVNetSubnet.createSubnetIfRequired(_);
      } else {
        // Create new virtual network along with subnet
        var createRequestProfile = this._createNewVNet(vnetInfo.resourceGroupName, this.params, _);
        // Once created, pull the virtual network so we get it's resource ID
        vnetInfo = this.getVNetInfoByName(vnetInfo.resourceGroupName, vnetInfo.vnetName, _);
        vnetInfo.createdNew = true;
        vnetInfo.createRequestProfile = createRequestProfile;
        // Subnet created as a part of request to virtual network so we need to populate the subnetinfo
        vnetInfo.subnetInfo = networkVNetSubnet.getSubnetInfoByName(vnetInfo.resourceGroupName, vnetInfo.vnetName, this.params.vnetSubnetName, _);
        vnetInfo.subnetInfo.createdNew = true;
      }

      return vnetInfo;
    },

    getVNetInfoById: function (referenceUri, _) {
      var resourceInfo = utils.parseResourceReferenceUri(referenceUri);
      return this.getVNetInfoByName(resourceInfo.resourceGroupName, resourceInfo.resourceName, _);
    },

    getVNetInfoByName: function (resourceGroupName, vnetName, _) {
      var vnetInfo = {
        vnetName: vnetName,
        resourceGroupName: resourceGroupName,
        createdNew: false,
        profile: null,
        createRequestProfile: {},
        subnetInfo: {}
      };

      var vnet = this._getVNet(resourceGroupName, vnetName, _);
      if (vnet) {
        vnetInfo.profile = vnet.virtualNetwork;
      }

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
        progress = this.cli.interaction.progress(util.format($('Creating a new virtual network "%s" [address prefix: "%s"] with subnet "%s" [address prefix: "%s"]'), params.vnetName, params.vnetAddressprefix, params.vnetSubnetName, params.vnetSubnetAddressprefix));
        var getVNetSubnetProfile = __.bind(networkVNetSubnet.getVNetSubnetProfile, networkVNetSubnet);
        var createRequestProfile = this._parseVNetCreateParams(this.params, getVNetSubnetProfile);
        this.networkResourceProviderClient.virtualNetworks.createOrUpdate(this.resourceGroupName, params.vnetName, createRequestProfile,  _);
        return createRequestProfile;
      } finally {
        progress.end();
      }
    },

    _printSubnets: function (subnets) {
      var info = this.cli.output.info;
      if (subnets instanceof Array) {
        info('Existing Subnets:');
        subnets.forEach(function (subnet) {
          info('  ' + subnet.name + ':' + subnet.addressPrefix);
        });
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