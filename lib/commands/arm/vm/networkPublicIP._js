var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function NetworkPublicIP(cli, networkResourceProviderClient, resourceGroupName, params) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
}

__.extend(NetworkPublicIP.prototype, {
    _parsePublicIPCreateParams: function (params) {
      if (!utils.hasAllParams([params.publicipName, params.publicipDomainName, params.location])) {
        throw new Error($('To create new public ip the parameters publicipName, publicipDomainName and location are required'));
      }

      var createRequestProfile = {
        properties: {
          dnsSettings: {
            domainNameLabel:  params.publicipDomainName
          }
        },
        location: params.location
      };

      if (params.publicipIdletimeout) {
        var timeoutAsInt = utils.parseInt(params.publicipIdletimeout);
        if (isNaN(timeoutAsInt) || timeoutAsInt === 0) {
          throw new Error($('publicipIdletimeout is an optional parameter but when it is specified it must be an integer'));
        }
        createRequestProfile.properties.idleTimeoutInMinutes = timeoutAsInt;
      }

      var supportedAllocationTypes = ['Dynamic'];
      if (!utils.stringIsNullOrEmpty(params.publicipAllocationmethod)) {
        createRequestProfile.properties.publicIpAllocationMethod  = utils.verifyParamExistsInCollection(supportedAllocationTypes,
          params.publicipAllocationmethod,
          'publicipAllocationmethod');
      } else {
        createRequestProfile.properties.publicIpAllocationMethod = supportedAllocationTypes[0];
      }

      return createRequestProfile;
    },

    hasAnyPubIPParameters: function (params) {
      var allPublicIPParams = [
        params.publicipName,
        params.publicipDomainname,
        params.publicipIdletimeout,
        params.publicipAllocationmethod];

      return utils.hasAnyParams(allPublicIPParams);
    },

    createPublicIPIfRequired: function(_) {
      if (utils.stringIsNullOrEmpty(this.params.publicipName)) {
        throw new Error($('The parameters publicipName is required'));
      }

      if (utils.stringIsNullOrEmpty(this.params.location)) {
        throw new Error($('The parameter location is required'));
      }

      var publicipInfo = {
        publicipName: this.params.publicipName,
        createdNew: false,
        createRequestProfile: {},
        profile: {}
      };

      var publicIP = this._getPublicIP(this.resourceGroupName, this.params.publicipName, _);
      if (publicIP) {
        if (!utils.ignoreCaseEquals(publicIP.publicIpAddress.location, this.params.location)) {
          throw new Error(util.format($('A public ip with name "%s" already exists in another region "%s"'), this.params.publicipName, this.params.location));
        }

        this.cli.output.info(util.format($('Found an existing PublicIP "%s"'), this.params.publicipName));
        publicipInfo.profile = publicIP.publicIpAddress;
        return publicipInfo;
      }

      this.cli.output.info(util.format($('PublicIP with given name not found "%s", creating a new one'), this.params.publicipName));
      publicipInfo.createRequestProfile = this._createNewPublicIP(this.resourceGroupName, this.params, _);
      publicipInfo.createdNew = true;
      publicIP = this._getPublicIP(this.resourceGroupName, this.params.publicipName, _);
      publicipInfo.profile = publicIP.publicIpAddress;
      return publicipInfo;
    },

    _getPublicIP: function (resourceGroupName, publicipName, _) {
      var progress = this.cli.interaction.progress(util.format($('Looking up the public ip "%s"'), publicipName));
      try {
        var publicIP = this.networkResourceProviderClient.publicIpAddresses.get(resourceGroupName, publicipName, _);
        return publicIP;
      } catch (e) {
        if (e.code === 'ResourceNotFound') {
          return null;
        }
        throw e;
      } finally {
        progress.end();
      }
    },

    _createNewPublicIP: function (resourceGroupName, params, _) {
      var createRequestProfile = this._parsePublicIPCreateParams(params);
      var progress = this.cli.interaction.progress(util.format($('Creating public ip "%s"'), params.publicipName));
      try {
        this.networkResourceProviderClient.publicIpAddresses.createOrUpdate(resourceGroupName, params.publicipName, createRequestProfile,  _);
        return createRequestProfile;
      } finally {
        progress.end();
      }
    },

    buildIdFromParams: function () {
      return ('/resourceGroups/'+ this.resourceGroupName + '/providers/Microsoft.Network/publicIPAddresses/' + this.params.publicipName).toLocaleLowerCase();
    }
  }
);

module.exports = NetworkPublicIP;