var __ = require('underscore');
var util = require('util');

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

var NetworkNic = require('./networkNic');
var AvailabilitySet = require('./availabilitySet');

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
    var output = this.cli.output;
    var isJson = output.format().json;
    var depth = 0; // 0 recurse
    if (isJson) {
      if (options.depth) {
        if (options.depth === 'full') {
          depth = -1; // full recurse
        } else {
          depth = utils.parseInt(options.depth);
          if (isNaN(depth)) {
            throw new Error($('--depth is an optional parameter but when specified it must be an integer (number of times to recurse) or text "full" (idefinite recursion)'));
          }
        }
      }
    } else {
      if (options.depth) {
        output.warn($('--depth paramater will be ignored when --json option is not specified'));
      }
    }

    var vmResult = this._getVMExpanded(resourceGroupName, name, depth, _);
    if (vmResult) {
      var virtualMachine = vmResult.virtualMachine;
      this.cli.interaction.formatOutput(virtualMachine, function () {
        utils.logLineFormat(virtualMachine, output.data);
      });
    } else {
      if (isJson) {
        output.json({});
      } else {
        output.warn($('No VMs found'));
      }
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
        if (outputData.length !== 0) {
          output.table(outputData, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('ProvisioningState'), item.virtualMachineProperties.provisioningState);
            row.cell($('Location'), item.location);
            row.cell($('Size'), item.virtualMachineProperties.hardwareProfile.virtualMachineSize);
          });
        } else {
          if (output.format().json) {
            output.json([]);
          } else {
            output.info($('No VMs found'));
          }
        }
      });
    } finally {
      progress.end();
    }
  },

  deleteVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var vmResult = this._getVM(resourceGroupName, name, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s'), name, resourceGroupName));
    }

    if (!this.cli.interaction.confirm(util.format($('Delete the virtual machine "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting the virtual machine "%s"'), name));
    try {
      computeManagementClient.virtualMachines.deleteMethod(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  stopVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var vmResult = this._getVM(resourceGroupName, name, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s'), name, resourceGroupName));
    }

    var output = this.cli.output;
    output.warn($('VM shutdown will not release the compute resources so you will be billed for the compute resources that this Virtual Machine uses.'));
    output.info($('To release the compute resources use "azure vm deallocate".'));
    var progress = this.cli.interaction.progress(util.format($('Stopping the virtual machine "%s"'), name));
    try {
      computeManagementClient.virtualMachines.stop(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  restartVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var vmResult = this._getVM(resourceGroupName, name, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s'), name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Restarting the virtual machine "%s"'), name));
    try {
      computeManagementClient.virtualMachines.restart(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  startVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var vmResult = this._getVM(resourceGroupName, name, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s'), name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Starting the virtual machine "%s"'), name));
    try {
      computeManagementClient.virtualMachines.start(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  deallocateVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    var vmResult = this._getVM(resourceGroupName, name, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s'), name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Deallocating the virtual machine "%s"'), name));
    try {
      computeManagementClient.virtualMachines.deallocate(resourceGroupName, name, _);
    } finally {
      progress.end();
    }
  },

  _getVMExpanded: function (resourceGroupName, name, depth, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var vmResult = this._getVM(resourceGroupName, name, serviceClients.computeManagementClient, _);
    if (depth === 0 || vmResult === null) {
      return vmResult;
    }

    if (depth !== -1) {
      depth--;
    }

    var virtualMachine = vmResult.virtualMachine;
    var memoize = {};

    var referenceUri = virtualMachine.id.toLowerCase();
    memoize[referenceUri] = vmResult;
    if (utils.hasValidProperty(virtualMachine.virtualMachineProperties, 'networkProfile')) {
      var networkProfile = virtualMachine.virtualMachineProperties.networkProfile;
      if (networkProfile.networkInterfaces instanceof  Array) {
        var networkNic = new NetworkNic(this.cli, serviceClients.networkResourceProviderClient, resourceGroupName, {});
        for (var i = 0; i < networkProfile.networkInterfaces.length; i++) {
          var networkInterface = networkProfile.networkInterfaces[i];
          networkInterface.expanded = networkNic.getNICExpanded(networkInterface.referenceUri, depth, memoize, _);
        }
      }
    }

    if (utils.hasValidProperty(virtualMachine.virtualMachineProperties, 'availabilitySetReference')) {
      var availabilitySetRef = virtualMachine.virtualMachineProperties.availabilitySetReference;
      if (availabilitySetRef.referenceUri !== null && availabilitySetRef.referenceUri !== undefined) {
        var availabilitySet = new AvailabilitySet(this.cli, serviceClients.computeManagementClient, resourceGroupName, {});
        availabilitySetRef.expanded = availabilitySet.getAvailSetExpanded(availabilitySetRef.referenceUri, depth, memoize, _);
      }
    }

    return memoize[referenceUri];
  },

  attachNewDataDisk: function(resourceGroup, vmName, size, vhdName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);

    var params = {};
    params.dataDiskSize = size;
    params.dataDiskCaching = options.hostCaching;
    params.dataDiskVhd = vhdName;
    params.vmName = vmName;
    params.storageAccountName = options.storageAccountName;
    params.storageAccountContainerName = options.storageAccountContainerName || 'vhds';

    var vmResult = this._getVM(resourceGroup, vmName, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroup));
    }

    if (!options.storageAccountName) {
      params.osDiskUri = vmResult.virtualMachine.virtualMachineProperties.storageProfile.oSDisk.virtualHardDisk.uri;
    } else {
      params.location = vmResult.virtualMachine.location;
    }

    var vmStorageProfile = new VMStorageProfile(this.cli, resourceGroup, params, this._getServiceClients(subscription));
    var newDataDisk = vmStorageProfile.generateDataDiskProfile(_);
    this.cli.output.info(util.format($('New data disk location: %s '), newDataDisk.virtualHardDisk.uri));

    var dataDisks = vmResult.virtualMachine.virtualMachineProperties.storageProfile.dataDisks || [];
    dataDisks.push(newDataDisk);
    this._updateVM(resourceGroup, vmResult.virtualMachine, computeManagementClient, _);
  },

  detachDataDisk: function(resourceGroup, vmName, lun, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);

    var lunAsInt = utils.parseInt(lun);
    if (isNaN(lunAsInt)) {
      throw new Error($('lun must be an integer'));
    }

    var vmResult = this._getVM(resourceGroup, vmName, computeManagementClient, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroupName));
    }

    var vmStorageProfile = new VMStorageProfile(this.cli, resourceGroup, {}, this._getServiceClients(subscription));
    vmStorageProfile.removeDataDiskByLun(vmResult.virtualMachine, lunAsInt);
    this._updateVM(resourceGroup, vmResult.virtualMachine, computeManagementClient, _);
  },

  _getVM: function (resourceGroupName, name, computeManagementClient, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the VM "%s"'), name));
    try {
      var virtualMachine = computeManagementClient.virtualMachines.get(resourceGroupName, name, _);
      return virtualMachine;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  _updateVM: function (resourceGroupName, virtualMachine, computeManagementClient, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating VM "%s"'), virtualMachine.name));
    try {
      var parameters = { virtualMachine: virtualMachine };
      var vmResult = computeManagementClient.virtualMachines.createOrUpdate(resourceGroupName, parameters, _);
      return vmResult;
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