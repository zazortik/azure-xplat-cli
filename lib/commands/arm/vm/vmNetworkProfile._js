var __ = require('underscore');

var NetworkNic = require('./networkNic');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function VMNetworkProfile(cli, resourceGroupName, params, serviceClients) {
  this.cli = cli;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
  this.serviceClients = serviceClients;
}

__.extend(VMNetworkProfile.prototype, {
  generateNetworkProfile: function(_) {
    var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var nicInfo = networkNic.createOrUpdateNICIfRequired(_);

    return {
      profile: {
        networkInterfaces: [{ referenceUri: nicInfo.profile.id }]
      },
      nicInfo: nicInfo
    };
  },

  validateNICs: function(networkInterfaces, _) {
    var networkInterfacesArray = utils.stringTrimEnd(networkInterfaces, ';').split(';');
    var nicIdSpecified = this._isNICIdSpecified(networkInterfacesArray);

    var validNetworkInterfaces = this._returnValidNICs(networkInterfacesArray, nicIdSpecified, _);
    if (validNetworkInterfaces.length === 0) {
      throw new Error($('No valid network interfaces were specified.'));
    }
    return validNetworkInterfaces;
  },

  _returnValidNICs: function(networkInterfaces, nicIdSpecified, _) {
    var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var validNetworkInterfaces = [];

    for (var i = 0; i < networkInterfaces.length; i++) {
      var nic = networkInterfaces[i];
      if (this._isValidNICId(nic)) {
        var nicInfo = networkNic.getNICInfoById(nic, _);
        if (!nicInfo.profile) {
          this.cli.output.warn(util.format($('NIC with id "%s" was not found.'), nic));
          continue;
        }

        validNetworkInterfaces.push({ referenceUri: nicInfo.profile.id });
      } else {
        if (nicIdSpecified) {
          this.cli.output.warn(util.format($('NIC with name "%s" will be ignored, because NIC Id was found in --nics param.'), nic));
        } else {
          var nicInfo = networkNic.getNICInfoByName(this.resourceGroupName, nic, _);
          if (!nicInfo.profile) {
            this.cli.output.warn(util.format($('NIC with name "%s" was not found.'), nic));
            continue;
          }

          validNetworkInterfaces.push({ referenceUri: nicInfo.profile.id });
        }
      }
    }

    return validNetworkInterfaces;
  },

  _isValidNICId: function(nicId) {
    var resourceInfo = utils.parseResourceReferenceUri(nicId);
    if (!resourceInfo.subscriptionId || !resourceInfo.resourceGroupName || !resourceInfo.provider || !resourceInfo.parentResource || !resourceInfo.resourceName) {
      return false;
    }

    return true;
  },

  _isNICIdSpecified: function(networkInterfaces) {
    for (var i = 0; i < networkInterfaces.length; i++) {
      if (this._isValidNICId(networkInterfaces[i])) {
        return true;
      }
    }

    return false;
  }
});

module.exports = VMNetworkProfile;