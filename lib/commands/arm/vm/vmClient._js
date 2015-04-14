var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

// TODO: including the ARM SDK explicitly, this will be removed and resolved from the azure-sdk-for-node package
var ComputeManagementClient = require('./../armsdk/computeManagementClient');
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');
var StorageManagementClient = require('./../armsdk/storageManagementClient');
var VMExtensionProfile = require('./vmExtensionProfile');

var VMStorageProfile = require('./vmStorageProfile');
var VMProfile = require('./vmProfile');
var NetworkNic = require('./networkNic');
var VirtualMachine = require('./virtualMachine');
var AvailabilitySet = require('./../availabilityset/availabilitySet');

var $ = utils.getLocaleString;

function VMClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(VMClient.prototype, {
  createVM: function(resourceGroupName, vmName, location, osType, options, _) {
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
    params.sshPublickeyPemFile = options.sshPublickeyPemFile;
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
    // networkProfile - network interface
    params.nicName = options.nicName;
    params.nicId = options.nicId;
    params.nicIds = options.nicIds;
    params.nicNames = options.nicNames;
    // networkProfile - public IP
    params.publicipName = options.publicIpName;
    params.publicipDomainName = options.publicIpDomainName;
    params.publicipIdletimeout = options.publicIpIdletimeout;
    params.publicipAllocationmethod = options.publicIpAllocationmethod;
    // networkProfile - virtual network
    params.vnetName = options.vnetName;
    params.vnetAddressprefix = options.vnetAddressprefix;
    params.vnetSubnetName = options.vnetSubnetName;
    params.vnetSubnetAddressprefix = options.vnetSubnetAddressprefix;
    // availabilitySetProfile
    params.availsetName = options.availsetName;

    var serviceClients = this._getServiceClients(subscription);
    var vmProfile = new VMProfile(this.cli, resourceGroupName, params, serviceClients);
    var vmCreateProfile = vmProfile.generateVMProfile(_);

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    virtualMachine.createOrUpdateVM(resourceGroupName, vmCreateProfile.profile, true, _);
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

    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var dependencies = {
      virtualMachine: new VirtualMachine(this.cli, serviceClients),
      availabilitySet: new AvailabilitySet(this.cli, serviceClients),
      networkNic: new NetworkNic(this.cli, serviceClients.networkResourceProviderClient)
    };

    var vmResult = dependencies.virtualMachine.getVMByNameExpanded(resourceGroupName, name, depth, {}, dependencies, _);
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
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmsResult = virtualMachine.getVMList(resourceGroupName, _);
    var output = this.cli.output;
    this.cli.interaction.formatOutput(vmsResult.virtualMachines, function (outputData) {
      if (outputData.length !== 0) {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('ProvisioningState'), item.provisioningState);
          row.cell($('Location'), item.location);
          row.cell($('Size'), item.hardwareProfile.virtualMachineSize);
        });
      } else {
        if (output.format().json) {
          output.json([]);
        } else {
          output.info($('No VMs found'));
        }
      }
    });
  },

  deleteVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete the virtual machine "%s"? [y/n] '), name), _)) {
      return;
    }

    virtualMachine.deleteVM(resourceGroupName, name, _);
  },

  stopVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    var output = this.cli.output;
    output.warn($('VM shutdown will not release the compute resources so you will be billed for the compute resources that this Virtual Machine uses.'));
    output.info($('To release the compute resources use "azure vm deallocate".'));
    virtualMachine.stopVM(resourceGroupName, name, _);
  },

  restartVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    virtualMachine.restartVM(resourceGroupName, name, _);
  },

  startVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    virtualMachine.startVM(resourceGroupName, name, _);
  },

  deallocateVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    virtualMachine.deallocateVM(resourceGroupName, name, _);
  },

  captureVM: function(resourceGroupName, name, vhdNamePrefix, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    params = {
      destinationContainerName: options.storageAccountContainerName || 'vhds',
      virtualHardDiskNamePrefix: vhdNamePrefix,
      overwrite: options.overwrite ? true : false
    };

    virtualMachine.captureVM(resourceGroupName, name, params, _);
  },

  generalizeVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    virtualMachine.generalizeVM(resourceGroupName, name, _);
  },

  getInstanceView: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var output = this.cli.output;

    var instanceViewResult = virtualMachine.getInstanceView(resourceGroupName, name, _);
    if (!instanceViewResult) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn($('No VMs found'));
      }
    } else {
      var vmInstanceView = instanceViewResult.instanceView;
      this.cli.interaction.formatOutput(vmInstanceView, function () {
        utils.logLineFormat(vmInstanceView, output.data);
      });
    }
  },

  resetVMAccess: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    options.location = vmResult.virtualMachine.location;
    options.osType = vmResult.virtualMachine.storageProfile.oSDisk.operatingSystemType;
    options.version = options.extensionVersion;
    var vmExtensionProfile = new VMExtensionProfile(this.cli, options);
    var vmAccessExtension = vmExtensionProfile.generateVMAccessExtensionProfile();

    virtualMachine.createOrUpdateVMExtension(resourceGroupName, name, vmAccessExtension.profile, true, _);
  },

  setVM: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);

    var vmResult = virtualMachine.getVM(resourceGroupName, name, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), name, resourceGroupName));
    }

    var vmProfile = new VMProfile(this.cli, resourceGroupName, options, serviceClients);
    vmResult.virtualMachine = vmProfile.updateVMProfile(vmResult.virtualMachine, _);

    if (vmResult.virtualMachine.resources) {
      delete vmResult.virtualMachine.resources;
    }
    virtualMachine.createOrUpdateVM(resourceGroupName, vmResult.virtualMachine, false, _);
  },

  listVMSizesOrLocationVMSizes: function(options, _) {
    if (options.location && options.vmName) {
      throw new Error($('Both --location and --vm-name parameters cannot be specified together.'));
    }

    if (options.vmName) {
      if (!options.resourceGroup) {
        options.resourceGroup = this.cli.interaction.promptIfNotGiven($('Resource group name: '), options.resourceGroup, _);
      }
    } else if (!options.location) {
      throw new Error($('One of the optional parameter --location or --vm-name is required.'));
    }

    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var sizeResult;

    if (options.vmName) {
      var vmResult = virtualMachine.getVM(options.resourceGroup, options.vmName, _);
      if (!vmResult) {
        throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), options.vmName, options.resourceGroup));
      }

      sizeResult = virtualMachine.getVMSizesByVMName(options.resourceGroup, options.vmName, _);
    } else {
      sizeResult = virtualMachine.getVMSizesByLocationName(options.location, _);
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(sizeResult.virtualMachineSizes, function (outputData) {
      if (outputData.length !== 0) {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('CPU Cores'), item.numberOfCores);
          row.cell($('Memory (MB)'), item.memoryInMB);
          row.cell($('Max data-disks'), item.maxDataDiskCount);
          row.cell($('Max data-disk Size (MB)'), item.resourceDiskSizeInMB);
          row.cell($('Max OS-disk Size (MB)'), item.oSDiskSizeInMB);
        });
      } else {
        if (output.format().json) {
          output.json([]);
        } else {
          output.info($('No VM size details found'));
        }
      }
    });
  },

  attachNewDataDisk: function(resourceGroup, vmName, size, vhdName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var params = {};
    params.dataDiskSize = size;
    params.dataDiskCaching = options.hostCaching;
    params.dataDiskVhd = vhdName;
    params.vmName = vmName;
    params.storageAccountName = options.storageAccountName;
    params.storageAccountContainerName = options.storageAccountContainerName || 'vhds';

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var vmResult = virtualMachine.getVM(resourceGroup, vmName, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroup));
    }

    if (!options.storageAccountName) {
      params.osDiskUri = vmResult.virtualMachine.storageProfile.oSDisk.virtualHardDisk.uri;
    } else {
      params.location = vmResult.virtualMachine.location;
    }

    var vmStorageProfile = new VMStorageProfile(this.cli, resourceGroup, params, serviceClients);
    var newDataDisk = vmStorageProfile.generateDataDiskProfile(_);
    this.cli.output.info(util.format($('New data disk location: %s '), newDataDisk.virtualHardDisk.uri));

    var dataDisks = vmResult.virtualMachine.storageProfile.dataDisks || [];
    dataDisks.push(newDataDisk);
    if (vmResult.virtualMachine.resources) {
      delete vmResult.virtualMachine.resources;
    }

    virtualMachine.createOrUpdateVM(resourceGroup, vmResult.virtualMachine, false, _);
  },

  detachDataDisk: function(resourceGroup, vmName, lun, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var lunAsInt = utils.parseInt(lun);
    if (isNaN(lunAsInt)) {
      throw new Error($('lun must be an integer'));
    }

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var vmResult = virtualMachine.getVM(resourceGroup, vmName, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroup));
    }

    var vmStorageProfile = new VMStorageProfile(this.cli, resourceGroup, {}, serviceClients);
    vmStorageProfile.removeDataDiskByLun(vmResult.virtualMachine, lunAsInt);
    if (vmResult.virtualMachine.resources) {
      delete vmResult.virtualMachine.resources;
    }

    virtualMachine.createOrUpdateVM(resourceGroup, vmResult.virtualMachine, false, _);
  },

  setExtension: function(resourceGroupName, vmName, extensionName, publisherName, version, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var vmResult = virtualMachine.getVM(resourceGroupName, vmName, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroupName));
    }

    virtualMachine = vmResult.virtualMachine;
    if (virtualMachine.storageProfile.oSDisk.operatingSystemType === 'Windows') {
      if (!virtualMachine.oSProfile.windowsConfiguration || !virtualMachine.oSProfile.windowsConfiguration.provisionVMAgent) {
        throw new Error($('Provision Guest Agent must be enabled on the VM before setting VM Extension.'));
      }
    }

    if (options.uninstall) {
      this._uninstallExtension(resourceGroupName, vmName, extensionName, serviceClients, _);
      return;
    }

    options.location = vmResult.virtualMachine.location;
    this._createOrUpdateExtension(resourceGroupName, vmName, extensionName, publisherName, version, options, serviceClients, _);
  },

  getExtensions: function(resourceGroup, vmName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var vmResult = virtualMachine.getVM(resourceGroup, vmName, _);
    if (!vmResult) {
      throw new Error(util.format($('Virtual machine "%s" not found under the resource group "%s"'), vmName, resourceGroup));
    }

    var vmResources = vmResult.virtualMachine.resources;
    var output = this.cli.output;
    if(!vmResources || !vmResources.extensions || vmResources.extensions.length === 0) {
      if (output.format().json) {
        output.json([]);
      } else {
        output.warn($('No VM extensions found'));
      }

      return;
    }

    this.cli.interaction.formatOutput(vmResources.extensions, function (outputData) {
      output.table(outputData, function (row, item) {
        row.cell($('Publisher'), item.publisher);
        row.cell($('Name'), item.name);
        row.cell($('Version'), item.typeHandlerVersion);
      });
    });
  },

  createDockerVM: function(resourceGroupName, vmName, location, osType, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var serviceClients = this._getServiceClients(subscription);

    var dockerExtensionParams = {
      dockerPort: options.dockerPort,
      dockerCertDir: options.dockerCertDir,
      version: options.dockerExtensionVersion,
      location: location
    };
    var vmExtensionProfile = new VMExtensionProfile(this.cli, dockerExtensionParams);
    var dockerExtension = vmExtensionProfile.generateDockerExtensionProfile(_);

    this.createVM(resourceGroupName, vmName, location, osType, options, _);
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    virtualMachine.createOrUpdateVMExtension(resourceGroupName, vmName, dockerExtension.profile, true, _);
  },

  _createOrUpdateExtension: function(resourceGroupName, vmName, extensionName, publisherName, version, options, serviceClients, _) {
    options.extensionName = extensionName;
    options.publisherName = publisherName;
    options.version = version;

    var vMExtensionProfile = new VMExtensionProfile(this.cli, options);
    var vmExtension = vMExtensionProfile.generateExtensionProfile();

    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    virtualMachine.createOrUpdateVMExtension(resourceGroupName, vmName, vmExtension.profile, true, _);
  },

  _uninstallExtension: function(resourceGroupName, vmName, extensionName, serviceClients, _) {
    var virtualMachine = new VirtualMachine(this.cli, serviceClients);
    var extension = virtualMachine.getVMExtension(resourceGroupName, vmName, extensionName, _);
    if (!extension) {
      throw new Error(util.format($('Extension "%s" not found under the virtual machine "%s"'), extensionName, vmName));
    }

    if (!this.cli.interaction.confirm(util.format($('Uninstall the virtual machine extension "%s"? [y/n] '), extensionName), _)) {
      return;
    }

    virtualMachine.deleteVMExtension(resourceGroupName, vmName, extensionName, _);
  },

  _getServiceClients: function(subscription) {
    return {
      computeManagementClient: this._getSubscriptionComputeClient(subscription),
      storageManagementClient: this._getSubscriptionStorageClient(subscription),
      networkResourceProviderClient: this._getSubscriptionNetworkClient(subscription)
    };
  },

  _getSubscriptionComputeClient: function (subscription) {
    return utils.createClient(this._createComputeManagementClient,
        subscription._createCredentials(),
        subscription.resourceManagerEndpointUrl);
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return utils.createClient(this._createNetworkResourceProviderClient,
        subscription._createCredentials(),
        subscription.resourceManagerEndpointUrl);
  },

  _getSubscriptionStorageClient: function (subscription) {
    return utils.createClient(this._createStorageManagementClient,
        subscription._createCredentials(),
        subscription.resourceManagerEndpointUrl);
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