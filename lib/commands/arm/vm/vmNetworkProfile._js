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
    var networkProfile = {
      profile: {
        networkInterfaces: []
      }
    };

    if (this.params.nicIds || this.params.nicNames) {
      var nicParamsSpecified = utils.atLeastOneParameIsSet([this.params.nicName,
                                                   this.params.nicId,
                                                   this.params.subnetId,
                                                   this.params.vnetName,
                                                   this.params.vnetSubnetName,
                                                   this.params.vnetSubnetAddressprefix,
                                                   this.params.vnetAddressprefix ]);
      if (nicParamsSpecified) {
        this.cli.output.warn(('Found --nic-ids or --nic-names parameters. --nic-name, --nic-id, --subnet-id and any --vnet-* parameters will be ignored'));
      }
      var validNICs = this.validateNICs(_);
      networkProfile.profile.networkInterfaces = validNICs;
    } else {
      var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
      var nicInfo = networkNic.createOrUpdateNICIfRequired(_);
      networkProfile.profile.networkInterfaces.push({ referenceUri: nicInfo.profile.id });
    }

    return networkProfile;
  },

  validateNICs: function(_) {
    var networkInterfaces = [];
    if (this.params.nicIds) {
      networkInterfaces = this._validateNICsById(_);
    }

    if (this.params.nicNames) {
      if (this.params.nicIds) {
        this.cli.output.warn($('--nic-names parameter will be ignored, because --nic-ids is specified.'));
      } else {
        networkInterfaces = this._validateNICsByName(_);
      }
    }

    if (networkInterfaces.length === 0) {
      throw new Error($('No valid network interfaces were specified.'));
    }

    return networkInterfaces;
  },

  _validateNICsById: function(_) {
    var validNetworkInterfaces = [];
    var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var networkInterfaces = utils.stringTrimEnd(this.params.nicIds, ',').split(',');
    for (var i = 0; i < networkInterfaces.length; i++) {
      var nicId = networkInterfaces[i];
      var nicInfo = networkNic.getNICInfoById(nicId, _);
      if (!nicInfo.profile) {
        this.cli.output.warn(util.format($('NIC with id "%s" was not found.'), nicId));
        continue;
      }

      // Set first NIC as primary
      validNetworkInterfaces.push({ referenceUri: nicInfo.profile.id, primary: validNetworkInterfaces.length === 0 });
    }

    return validNetworkInterfaces;
  },

  _validateNICsByName: function(_) {
    var validNetworkInterfaces = [];
    var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var networkInterfaces = utils.stringTrimEnd(this.params.nicNames, ',').split(',');
    for (var i = 0; i < networkInterfaces.length; i++) {
      var nicName = networkInterfaces[i];
      var nicInfo = networkNic.getNICInfoByName(this.resourceGroupName, nicName, _);
      if (!nicInfo.profile) {
        this.cli.output.warn(util.format($('NIC with name "%s" was not found.'), nicName));
        continue;
      }

      // Set first NIC as primary
      validNetworkInterfaces.push({ referenceUri: nicInfo.profile.id, primary: validNetworkInterfaces.length === 0 });
    }

    return validNetworkInterfaces;
  }
});

module.exports = VMNetworkProfile;