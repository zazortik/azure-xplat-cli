var __ = require('underscore');

var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

// TODO: including the ARM SDK explicitly, this will be removed and resolved from the azure-sdk-for-node package
var ComputeManagementClient = require('./../armsdk/computeManagementClient');
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');
var StorageManagementClient = require('./../armsdk/storageManagementClient');

// The profiles required for preparing VM create profile
var VMStorageProfile = require('./vmStorageProfile');
var VMOsProfile = require('./vmOsProfile');
var VMHardwareProfile = require('./vmHardwareProfile');
var VMAvailabilitySetProfile = require('./vmAvailabilitySetProfile');
var VMNetworkProfile = require('./vmNetworkProfile');

var $ = utils.getLocaleString;

function VMClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(VMClient.prototype, {
  createVM: function(resourceGroupName, vmName, nicName, location, osType, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var params = {};
    // General
    params.subscriptionId = subscription.id;
    params.vmName = vmName;
    params.location = location;
    params.imageName = options.imageName;
    // hardwareProfile
    params.vmSize = options.vmSize;
    // osProfile
    params.computerName = params.vmName;
    params.adminUsername = options.adminUsername;
    params.adminPassword = options.adminPassword;
    params.osType = osType;
    // storageProfile - storage accountweb
    params.storageAccountName = options.storageAccountName;
    params.storageAccountContainerName = options.storageAccountContainerName || 'vhds';
    // storageProfile.osDiskProfile
    params.osDiskType = params.osType;
    params.osDiskCaching = options.osDiskCaching;
    params.osDiskVhd = options.osDiskVhd;
    // storageProfile.dataDiskProfile
    params.dataDiskCaching = options.dataDiskCaching;
    params.dataDiskVhd = options.dataDiskVhd;
    params.dataDiskSize = options.dataDiskSize;
    // networkProfile - network interface card
    params.nicName = nicName;
    // networkProfile - public IP
    params.publicipName = options.publicipName;
    params.publicipDomainName = options.publicipDomainName;
    params.publicipIdletimeout = options.publicipIdletimeout;
    params.publicipAllocationmethod = options.publicipAllocationmethod;
    // networkProfile - virtual network
    params.vnetName = options.vnetName;
    params.vnetAddressprefix = options.vnetAddressprefix;
    params.vnetSubnetName = options.vnetSubnetName;
    params.vnetSubnetAddressprefix = options.vnetSubnetAddressprefix;
    // availabilitySetProfile
    params.availsetName = options.availsetName;

    var serviceClients = this._getServiceClients(subscription);

    var vmCreateProperties = {
      hardwareProfile: null,
      storageProfile: null,
      oSProfile: null,
      networkProfile: null,
      availabilitySetReference: null
    };

    var vmCreateProfile = {
      virtualMachine: {
        virtualMachineProperties: vmCreateProperties,
        name: params.vmName,
        location: params.location,
        tags: {}
      }
    };

    if (params.imageName) {
      var vmOsProfile = new VMOsProfile(this.cli, params);
      var osProfileResult = vmOsProfile.generateOSProfile();
      vmCreateProperties.oSProfile = osProfileResult.profile;
    }

    var vmHardwareProfile = new VMHardwareProfile(this.cli, params);
    var hardwareProfileResult = vmHardwareProfile.generateHardwareProfile();
    vmCreateProperties.hardwareProfile = hardwareProfileResult.profile;

    var vmAvailSetProfile = new VMAvailabilitySetProfile(this.cli, resourceGroupName, params, serviceClients);
    var availsetProfileResult = vmAvailSetProfile.generateAvailabilitySetProfile(_);
    vmCreateProperties.availabilitySetReference = availsetProfileResult.profile;

    var vmNetworkProfile = new VMNetworkProfile(this.cli, resourceGroupName, params, serviceClients);
    var networkProfileResult = vmNetworkProfile.generateNetworkProfile(_);
    vmCreateProperties.networkProfile = networkProfileResult.profile;

    var vmStorageProfile = new VMStorageProfile(this.cli, resourceGroupName, params, serviceClients);
    var storageProfileResult = vmStorageProfile.generateStorageProfile(_);
    vmCreateProperties.storageProfile = storageProfileResult.profile;

    var progress = this.cli.interaction.progress($('Creating VM'));
    try {
      serviceClients.computeManagementClient.virtualMachines.createOrUpdate(resourceGroupName, vmCreateProfile, _);
    } finally {
      progress.end();
    }
  },

  showVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var progress = this.cli.interaction.progress($('Getting virtual machine'));
    try {
      var result = computeManagementClient.virtualMachines.get(resourceGroupName, name, _);
      var output = this.cli.output;
      this.cli.interaction.formatOutput(result.virtualMachine, function () {
        utils.logLineFormat(result.virtualMachine, output.data);
      });
    } finally {
      progress.end();
    }
  },

  listVM: function(resourceGroupName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var progress = this.cli.interaction.progress($('Listing virtual machines'));
    try {
      var result = computeManagementClient.virtualMachines.list(resourceGroupName, _);
      var output = this.cli.output;
      this.cli.interaction.formatOutput(result.virtualMachines, function (outputData) {
        if (outputData.length === 0) {
          output.info($('No VMs found'));
        } else {
          output.table(outputData, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('ProvisioningState'), item.virtualMachineProperties.provisioningState);
            row.cell($('Location'), item.location);
            row.cell($('Size'), item.virtualMachineProperties.hardwareProfile.virtualMachineSize);
          });
        }
      });
    } finally {
      progress.end();
    }
  },

  _getServiceClients: function(subscription) {
    return {
      computeManagementClient: this._getSubscriptionComputeClient(subscription),
      storageManagementClient: this._getSubscriptionStorageClient(subscription),
      networkResourceProviderClient: this._getSubscriptionNetworkClient(subscription)
    };
  },

  _getSubscriptionComputeClient: function (subscription) {
    return subscription.createClient(this._createComputeManagementClient, this.azureServiceBaseUri);
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return subscription.createClient(this._createNetworkResourceProviderClient, this.azureServiceBaseUri);
  },

  _getSubscriptionStorageClient: function (subscription) {
    return subscription.createClient(this._createStorageManagementClient, this.azureServiceBaseUri);
  },

  _createComputeManagementClient: function(credentails, baseUri) {
    return new ComputeManagementClient.ComputeManagementClient(credentails, baseUri);
  },

  _createNetworkResourceProviderClient: function(credentails, baseUri) {
    return new NetWorkResourceProviderClient.NetworkResourceProviderClient(credentails, baseUri);
  },

  _createStorageManagementClient: function(credentails, baseUri) {
    return new StorageManagementClient.StorageManagementClient(credentails, baseUri);
  }
});

module.exports = VMClient;