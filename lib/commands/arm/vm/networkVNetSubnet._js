var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function NetworkVNetSubnet (cli, networkResourceProviderClient, resourceGroupName, params) {
    this.cli = cli;
    this.networkResourceProviderClient = networkResourceProviderClient;
    this.resourceGroupName = resourceGroupName;
    this.params = params;

}

__.extend(NetworkVNetSubnet.prototype, {
    _parseSubnetCreateParams: function (params) {
      if (!utils.hasAllParams([params.vnetName, params.vnetSubnetName, params.vnetSubnetAddressprefix])) {
        throw new Error($('To setup a new subnet the parameters vnetName, vnetSubnetName and vnetSubnetAddressprefix are required'));
      }

      var createRequestProfile = {
        properties: {
          addressPrefix: params.vnetSubnetAddressprefix,
          dhcpOptions: {
            dnsServers: []
          },
          ipConfigurations: []
        },
        name: params.vnetSubnetName
      };

      if (!utils.stringIsNullOrEmpty(params.vnetSubnetDnsserver)) {
        createRequestProfile.properties.dhcpOptions.dnsServers.push(params.vnetSubnetDnsserver);
      }

      return createRequestProfile;
    },

    getVNetSubnetProfile: function (params) {
      return this._parseSubnetCreateParams(params);
    },

    createSubnetIfRequired: function (_) {
      if (utils.stringIsNullOrEmpty(this.params.vnetName)) {
        throw new Error($('The parameters vnetName is required'));
      }

      if (utils.stringIsNullOrEmpty(this.params.vnetSubnetName)) {
        throw new Error($('The parameter vnetSubnetName is required'));
      }

        var subnetInfo = {
          subnetName: this.params.vnetSubnetName,
          vnetName: this.params.vnetName,
          createdNew: false,
          createRequestProfile: {},
          profile: {}
        };

        var subnet = this._getSubnet(this.resourceGroupName, this.params.vnetName, this.params.vnetSubnetName, _);
        if (subnet) {
          this.cli.output.info(util.format($('Subnet with given name "%s" exists under the virtual network "%s", using this subnet'), this.params.vnetSubnetName, this.params.vnetName));
          subnetInfo.profile = subnet.subnet;
          return subnetInfo;
        }

        this.cli.output.info(util.format($('Subnet with given name not found "%s" under the virtual network "%s", creating a new one'), this.params.vnetSubnetName, this.params.vnetName));
        subnetInfo.createRequestProfile = this._createNewSubnet(this.resourceGroupName, this.params, _);
        subnetInfo.createdNew = true;
        subnet = this._getSubnet(this.resourceGroupName, this.params.vnetName, this.params.vnetSubnetName, _);
        subnetInfo.profile = subnet.subnet;
        return subnetInfo;
    },

    getSubnetInfo: function (resourceGroupName, vnetName, subnetName, _) {
      var subnet = this._getSubnet(resourceGroupName, vnetName, subnetName, _);
      return {
        subnetName: subnetName,
        vnetName: vnetName,
        profile: subnet.subnet,
        createRequestProfile: {}
      };
    },

    _getSubnet: function (resourceGroupName, vnetName, subnetName, _) {
      var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s" under the virtual network "%s"'), subnetName, vnetName));
      try {
        var subnet = this.networkResourceProviderClient.subnets.get(resourceGroupName, vnetName, subnetName, _);
        return subnet;
      } catch (e) {
        // Note: Unlike other resources, if resources does not exists azure is not throws 'NotFound' instead of
        // 'ResourceNotFound'
        if (e.code === 'NotFound' || e.code === 'ResourceNotFound') {
          return null;
        }
        throw e;
      } finally {
        progress.end();
      }
    },

    _createNewSubnet: function (resourceGroupName, params, _) {
      var createRequestProfile = this._parseSubnetCreateParams(params);
      var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s" under the virtual network "%s"'), params.vnetSubnetName, params.vnetName));
      try {
        this.networkResourceProviderClient.subnets.createOrUpdate(resourceGroupName, params.vnetName, params.vnetSubnetName, createRequestProfile,  _);
        return createRequestProfile;
      } finally {
        progress.end();
      }
    },

    hasAnySubnetParameters: function(params) {
      var allSubnetParams = [
        params.vnetSubnetName,
        params.vnetSubnetAddressprefix,
        params.vnetSubnetDnsserver
      ];

      return utils.hasAnyParams(allSubnetParams);
    }
  }
);

module.exports = NetworkVNetSubnet;