var __ = require('underscore');

// The dependent profiles required for preparing VM create profile
var VMStorageProfile = require('./vmStorageProfile');
var VMOsProfile = require('./vmOsProfile');
var VMHardwareProfile = require('./vmHardwareProfile');
var VMAvailabilitySetProfile = require('./vmAvailabilitySetProfile');
var VMNetworkProfile = require('./vmNetworkProfile');

function VMProfile(cli, resourceGroupName, params, serviceClients) {
  this.cli = cli;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
  this.serviceClients = serviceClients;
}

__.extend(VMProfile.prototype, {
  generateVMProfile: function(_) {
    // to_delete start:

    /**
    var NetworkNic = require('./networkNic');
    var util = require('util');
    var networkNic = new NetworkNic(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var nicInfo = networkNic.createNICIfRequired(_);
    console.log(util.inspect(nicInfo, { depth: null }));
    process.exit(1);
    **/

    /**
    var NetworkVNet = require('./networkVNet');
    var util = require('util');

    var networkVNet = new NetworkVNet(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var vnetInfo = networkVNet.createOrUpdateVNetIfRequired(_);
    console.log(util.inspect(vnetInfo, { depth: null }));
    process.exit(1);
    **/

    /**
    var NetworkPublicIP = require('./networkPublicIP');
    var util = require('util');

    var networkPublicIP = new NetworkPublicIP(this.cli, this.serviceClients.networkResourceProviderClient, this.resourceGroupName, this.params);
    var pubIpInfo = networkPublicIP.createPublicIPIfRequired(_);
    console.log(util.inspect(pubIpInfo, { depth: null }));
    process.exit(1);
    **/
    // to_delete end:

    var vmProfile = this._parseVMProfileParams(this.params);

    if (this.params.imageName) {
      var vmOsProfile = new VMOsProfile(this.cli, this.params);
      var osProfileResult = vmOsProfile.generateOSProfile();
      vmProfile.oSProfile = osProfileResult.profile;
    }

    var vmHardwareProfile = new VMHardwareProfile(this.cli, this.params);
    var hardwareProfileResult = vmHardwareProfile.generateHardwareProfile();
    vmProfile.hardwareProfile = hardwareProfileResult.profile;

    var vmAvailSetProfile = new VMAvailabilitySetProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    var availsetProfileResult = vmAvailSetProfile.generateAvailabilitySetProfile(_);
    vmProfile.availabilitySetReference = availsetProfileResult.profile;

    var vmNetworkProfile = new VMNetworkProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    var networkProfileResult = vmNetworkProfile.generateNetworkProfile(_);
    vmProfile.networkProfile = networkProfileResult.profile;

    var vmStorageProfile = new VMStorageProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    var storageProfileResult = vmStorageProfile.generateStorageProfile(_);
    vmProfile.storageProfile = storageProfileResult.profile;

    return {
      profile: vmProfile
    };
  },

  _parseVMProfileParams: function(params) {
    if (!params.location) {
      throw new Error($('--location is required.'));
    }

    if (!params.vmName) {
      throw new Error($('--vmName is required'));
    }

    var vmProfile = {
      name: params.vmName,
      location: params.location,
      tags: {},
      oSProfile: null,
      hardwareProfile: null,
      availabilitySetReference: null,
      networkProfile: null,
      storageProfile: null
    };

    return vmProfile;
  }
});

module.exports = VMProfile;