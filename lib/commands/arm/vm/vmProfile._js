var __ = require('underscore');

var utils = require('../../../util/utils');
// The dependent profiles required for preparing VM create profile
var VMStorageProfile = require('./vmStorageProfile');
var VMOsProfile = require('./vmOsProfile');
var VMHardwareProfile = require('./vmHardwareProfile');
var VMAvailabilitySetProfile = require('./vmAvailabilitySetProfile');
var VMNetworkProfile = require('./vmNetworkProfile');

var $ = utils.getLocaleString;

function VMProfile(cli, resourceGroupName, params, serviceClients) {
  this.cli = cli;
  this.resourceGroupName = resourceGroupName;
  this.params = params;
  this.serviceClients = serviceClients;
}

__.extend(VMProfile.prototype, {
  generateVMProfile: function(_) {
    var vmProfile = this._parseVMProfileParams(this.params);

    var vmStorageProfile = new VMStorageProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    if (this.params.imageName || this.params.imageUrn) {
      // The Operating system profile is valid only when VM is created from platform image
      var vmOsProfile = new VMOsProfile(this.cli, this.params);
      var osProfileResult = vmOsProfile.generateOSProfile();
      vmProfile.oSProfile = osProfileResult.profile;
    } else {
      // VM must be created either from an image (image-name or image-urn) or using an existing OS Disk
      if (!vmStorageProfile.hasAllOSDiskParams(this.params)) {
        throw new Error($('image-name, image-urn or os-disk-vhd parameter is required to create a VM'));
      }
    }

    var vmHardwareProfile = new VMHardwareProfile(this.cli, this.params);
    var hardwareProfileResult = vmHardwareProfile.generateHardwareProfile();
    vmProfile.hardwareProfile = hardwareProfileResult.profile;

    var storageProfileResult = vmStorageProfile.generateStorageProfile(_);
    vmProfile.storageProfile = storageProfileResult.profile;

    var vmAvailSetProfile = new VMAvailabilitySetProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    var availsetProfileResult = vmAvailSetProfile.generateAvailabilitySetProfile(_);
    vmProfile.availabilitySetReference = availsetProfileResult.profile;

    var vmNetworkProfile = new VMNetworkProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
    var networkProfileResult = vmNetworkProfile.generateNetworkProfile(_);
    vmProfile.networkProfile = networkProfileResult.profile;

    return {
      profile: vmProfile
    };
  },

  updateVMProfile: function(virtualMachine, _) {
    if (this.params.nicIds || this.params.nicNames) {
      var vmNetworkProfile = new VMNetworkProfile(this.cli, this.resourceGroupName, this.params, this.serviceClients);
      var validNICs = vmNetworkProfile.validateNICs(_);
      virtualMachine.networkProfile.networkInterfaces = validNICs;
    }

    if (this.params.tags && typeof this.params.tags === 'string') {
      virtualMachine.tags = virtualMachine.tags || {};
      virtualMachine.tags = this._parseTags(virtualMachine.tags, this.params.tags);
    }

    if (this.params.tags === false) {
      virtualMachine.tags = {};
    }

    return virtualMachine;
  },

  _parseTags: function(oldTags, tags) {
    var parsedTags = oldTags;
    utils.stringTrimEnd(tags, ';').split(';').forEach(function (tagValue) {
      var tv = tagValue.split('=');
      if (tv.length === 2) {
        parsedTags[tv[0]] = tv[1];
      } else {
        parsedTags[tv[0]] = '';
      }
    });

    return parsedTags;
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
      storageProfile: null,
      availabilitySetReference: null,
      networkProfile: null
    };

    return vmProfile;
  }
});

module.exports = VMProfile;