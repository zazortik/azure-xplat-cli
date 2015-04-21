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
      if (!utils.allParamsAreSet([params.vnetName, params.vnetSubnetName, params.vnetSubnetAddressprefix])) {
        throw new Error($('To setup a new subnet the parameters vnetName, vnetSubnetName and vnetSubnetAddressprefix are required'));
      }

      var createRequestProfile = {
        addressPrefix: params.vnetSubnetAddressprefix,
        dhcpOptions: {
          dnsServers: []
        },
        ipConfigurations: [],
        name: params.vnetSubnetName
      };

      if (!utils.stringIsNullOrEmpty(params.vnetSubnetDnsserver)) {
        createRequestProfile.dhcpOptions.dnsServers.push(params.vnetSubnetDnsserver);
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

      var subnetInfo = this.getSubnetInfoByName(this.resourceGroupName, this.params.vnetName, this.params.vnetSubnetName, _);
      if (subnetInfo.profile) {
        this.cli.output.info(util.format($('Subnet with given name "%s" exists under the virtual network "%s", using this subnet'), subnetInfo.subnetName, subnetInfo.vnetName));
      } else {
        this.cli.output.info(util.format($('Subnet with given name not found "%s" under the virtual network "%s", creating a new one'), subnetInfo.subnetName, subnetInfo.vnetName));
        var createRequestProfile = this._createNewSubnet(subnetInfo.resourceGroupName, this.params, _);
        // Once created, pull the Subnet so we get it's resource ID
        subnetInfo = this.getSubnetInfoByName(subnetInfo.resourceGroupName, subnetInfo.vnetName, subnetInfo.subnetName, _);
        subnetInfo.createdNew = true;
        subnetInfo.createRequestProfile = createRequestProfile;
      }

      return subnetInfo;
    },

    getSubnetInfoById: function (referenceUri, _) {
      var resourceInfo = utils.parseResourceReferenceUri(referenceUri);
      var parentVnetName = resourceInfo.parentResource.split('/')[1];
      return this.getSubnetInfoByName(resourceInfo.resourceGroupName, parentVnetName, resourceInfo.resourceName, _);
    },

    getSubnetInfoByName: function (resourceGroupName, vnetName, subnetName, _) {
      var subnetInfo = {
        vnetName: vnetName,
        subnetName: subnetName,
        resourceGroupName: resourceGroupName,
        createdNew: false,
        createRequestProfile: {},
        profile: null
      };

      var subnet = this._getSubnet(resourceGroupName, vnetName, subnetName, _);
      if (subnet) {
        subnetInfo.profile = subnet.subnet;
      }

      return subnetInfo;
    },

    getSubnetByIdExpanded: function (referenceUri, depth, memoize, dependencies, _) {
      referenceUri = referenceUri.toLowerCase();
      if (memoize[referenceUri]) {
        return memoize[referenceUri];
      }

      var resourceInfo = utils.parseResourceReferenceUri(referenceUri);
      var parentVnetName = resourceInfo.parentResource.split('/')[1];
      var expandedSubnet = this.getSubnetByNameExpanded(resourceInfo.resourceGroupName, parentVnetName, resourceInfo.resourceName, depth, memoize, dependencies, _);
      return expandedSubnet;
    },

    getSubnetByNameExpanded: function (resourceGroupName, vnetName, subnetName, depth, memoize, dependencies, _) {
      var subnet = this._getSubnet(resourceGroupName, vnetName, subnetName, _);
      var expandedSubnet = this._expandSubnet(subnet, depth, memoize);
      return expandedSubnet;
    },

    _expandSubnet: function (subnet, depth, memoize) {
      if (depth === 0 || subnet === null) {
        return subnet;
      }

      if (depth !== -1) {
        depth--;
      }

      var snet = subnet.subnet;
      var referenceUri = snet.id.toLowerCase();

      memoize[referenceUri] = subnet;
      // Subnet is one of the leaf there is no more expandable connected resources references.
      return  memoize[referenceUri];
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
      var progress = this.cli.interaction.progress(util.format($('Creating subnet "%s" [Address prefix "%s"] under the virtual network "%s"'), params.vnetSubnetName, params.vnetSubnetAddressprefix, params.vnetName));
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

      return utils.atLeastOneParameIsSet(allSubnetParams);
    }
  }
);

module.exports = NetworkVNetSubnet;