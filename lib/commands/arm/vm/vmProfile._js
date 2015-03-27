var __ = require('underscore');

function VMProfile(cli, resourceGroupName, params, dependencies) {
  this.cli = cli;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
  this.dependencies = dependencies;
}

__.extend(VMProfile.prototype, {
  generateVMProfile: function(_) {
    var vmProfile = this._parseVMProfileParams(this.params);

    var vmCreateProperties = {
      oSProfile: null,
      hardwareProfile: null,
      availabilitySetReference: null,
      networkProfile: null,
      storageProfile: null
    };

    vmProfile.virtualMachineProperties = vmCreateProperties;

    if (this.params.imageName) {
      var osProfileResult = this.dependencies.vmOsProfile.generateOSProfile();
      vmCreateProperties.oSProfile = osProfileResult.profile;
    }

    var hardwareProfileResult = this.dependencies.vmHardwareProfile.generateHardwareProfile();
    vmCreateProperties.hardwareProfile = hardwareProfileResult.profile;

    var availsetProfileResult = this.dependencies.vmAvailSetProfile.generateAvailabilitySetProfile(_);
    vmCreateProperties.availabilitySetReference = availsetProfileResult.profile;

    var networkProfileResult = this.dependencies.vmNetworkProfile.generateNetworkProfile(_);
    vmCreateProperties.networkProfile = networkProfileResult.profile;

    var storageProfileResult = this.dependencies.vmStorageProfile.generateStorageProfile(_);
    vmCreateProperties.storageProfile = storageProfileResult.profile;

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
      virtualMachineProperties: {},
      name: params.vmName,
      location: params.location,
      tags: {}
    };

    return vmProfile;
  }
});

module.exports = VMProfile;