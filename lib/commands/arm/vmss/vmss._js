/**
 * Copyright (c) Microsoft.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var fs = require('fs');
var util = require('util');

var networkNic = require('../vm/networkNic');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var certUtils = require('../../../util/certUtils');

var $ = utils.getLocaleString;

function normalizeString(str) {
  return str.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 24).toLowerCase();
}

function getResourceId(subId, rgName, provider, type, name, subType, subName) {
  var format = '/subscriptions/%s/resourceGroups/%s/providers/%s/%s/%s';
  var resourceId = util.format(format, subId, rgName, provider, type, name);
  
  var subFormat = '/%s/%s';
  if (subType || subName) {
    resourceId += util.format(subFormat, subType, subName);
  }
  
  return resourceId;
}

function getContainerAndVhdUri(storageName, containerAndVhdName) {
  if (containerAndVhdName) {
    var format = 'https://%s.blob.core.windows.net/%s';
    var containerUri = util.format(format, storageName, containerAndVhdName);
    return containerUri;
  }
  else {
    return null;
  }
}

function getLinuxConfiguration(adminUsername, adminPassword, sshPublicKeyFile) {
  if (utils.stringIsNullOrEmpty(adminUsername)) {
      throw new Error($('Admin user name cannot be empty or null.'));
  }
  
  if (utils.stringIsNullOrEmpty(adminPassword) && utils.stringIsNullOrEmpty(sshPublicKeyFile)) {
      throw new Error($('Must specify password and/or SSH public key file.'));
  }

  var linuxConfiguration = null;
  if (!utils.stringIsNullOrEmpty(sshPublicKeyFile)) {
    // Get Key Data
    var sshPublickey = fs.readFileSync(sshPublicKeyFile);
    var sshPublickeyPemStr = sshPublickey.toString();

    if (certUtils.isOpenSshRSAPub(sshPublickeyPemStr)) {
      sshPublickeyPemStr = certUtils.openSshRSAPubToX509CertPEM(sshPublickeyPemStr);
    }
    else if (!certUtils.isX509CertPEM(sshPublickeyPemStr)) {
      throw new Error($('Specified SSH certificate is not in PEM or SSH RSA format'));
    }
    
    var sshPublickeyPemDataBase64 = certUtils.extractBase64X509CertFromPEM(sshPublickeyPemStr);
    
    // Set Key Variables
    linuxConfiguration = {
      disablePasswordAuthentication : !utils.stringIsNullOrEmpty(adminPassword) ? null : true
    };
    
    linuxConfiguration.ssh = {
      publicKeys : [
        {
          keyData : sshPublickeyPemDataBase64,
          path : '/home/' + adminUsername + '/.ssh/authorized_keys',
        }
      ]
    };
  }
  
  return linuxConfiguration;
}

function createGroupIfNotExists(resourceManagementClient, resourceGroupName, location, _) {
  try {
    resourceManagementClient.resourceGroups.get(resourceGroupName, _);
  }
  catch (e) {
    if (e.statusCode === 404) {
      resourceManagementClient.resourceGroups.createOrUpdate(resourceGroupName, { location : location }, _);
    }
    else {
      throw e;
    }
  }
}

function createStorageResources(storageManagementClient, resourceGroupName, name, storageType, hash, location, capacity, _) {
    var generateNewStorageAccountName = function (str) {
      if (str && str.length > 20) {
        str = str.slice(0, 20);
      }
      
      return normalizeString(str + hash);
    };
    
    var stoNames = [];
    for (var i = 0; i < capacity; i++) {
      var stoParams = {};
      stoParams.name = generateNewStorageAccountName(name + 'sto' + i.toString());
      stoParams.location = location;
      stoParams.accountType = storageType ? storageType : 'Premium_LRS';
      storageManagementClient.storageAccounts.create(resourceGroupName, stoParams.name, stoParams, _);
      stoNames.push(stoParams.name);
    }
    
    return stoNames;
}

// The spaces for a new line in help message, i.e.
/*
123456789 <- position index
help:    The operation to re-image virtual machines in a virtual machine scale set.
help:      vmss reimage [options] <resource-group-name> <vm-scale-set-name>
*/
var newLineSpacesForHelpMessage = new Array(10).join(' ');

exports.init = function (cli) {
  var vmssQuickCreate = cli.category('vmss');
  vmssQuickCreate.command('quick-create [resource-group-name] [name] [location] [image-urn] [capacity] [admin-username] [admin-password]')
  .description($('Commands to create a virtual machine scale set with default resources in a group.\n' + newLineSpacesForHelpMessage +
                 'For \'image-urn\' refer the following command: $ azure vm image list (Example: $ azure vm image list westus canonical)'))
  .usage('[options] [resource-group-name] [name] [location] [image-urn] [capacity] [admin-username] [admin-password]')
  .option('-g, --resource-group-name <resource-group-name>', $('the resource group name'))
  .option('-n, --name <name>', $('the virtual machine name prefix'))
  .option('-l, --location <location>', $('the location'))
  .option('-Q, --image-urn <image-urn>', $('the image reference, e.g. "publisher:offer:skus:version"\n  ' +
          '                                               URN Aliases:\n' +
          '                                                 ' + (utils.getImageAliasList().join('\n                                                 '))))
  .option('-u, --admin-username <admin-username>', $('the user name'))
  .option('-p, --admin-password <admin-password>', $('the password'))
  .option('-z, --vm-size <vm-size>', $('Optional, the virtual machine size, by default [Standard_DS1]'))
  .option('-C, --capacity <capacity>', $('the virtual machine scale set capacity, i.e. number of instances (5 by default)'))
  .option('-M, --ssh-public-key-file <ssh-public-key-file>', $('the path to public key file for SSH authentication,\n' +
          '                                                 & this parameter is valid only when os-type is Linux.'))
  .option('-a, --storage-type <storage-type>', $('Optional, the storage type, by default [Premium_LRS]'))
  .option('-s, --subscription <subscription>', $('the subscription identifier'))
  .execute(function (resourceGroupName, name, location, imageUrn, capacity, adminUsername, adminPassword, options, _) {
    // Read Required Parameters
    options.resourceGroupName = resourceGroupName = cli.interaction.promptIfNotGiven($('resource-group-name: '), resourceGroupName, _);
    options.name = name = cli.interaction.promptIfNotGiven($('name: '), name, _);
    options.capacity = capacity = cli.interaction.promptIfNotGiven($('capacity: '), capacity, _);
    options.location = location = cli.interaction.promptIfNotGiven($('location: '), location, _);
    options.location = location = utils.toLowerCaseAndRemoveSpace(location);
    
    // Require Admin User Name & Password If SSH Key Not Given
    if (!options.sshPublicKeyFile) {
      adminUsername = cli.interaction.promptIfNotGiven($('admin-username: '), adminUsername, _);
      adminPassword = cli.interaction.promptPasswordIfNotGiven($('admin-password: '), adminPassword, _);
    }

    options.adminUsername = adminUsername;
    options.adminPassword = adminPassword;

    // Read Image Parameter
    imageUrn = cli.interaction.promptIfNotGiven($('ImageURN (format: "publisherName:offer:skus:version"): '), imageUrn, _);
    if (imageUrn.indexOf(':') === -1) {
      imageUrn = utils.getImageAliasUrn(imageUrn);
    }
    var imageUrnParts = imageUrn.split(':');
    if (imageUrnParts.length !== 4) {
      throw new Error($('--image-urn must be in the form "publisherName:offer:skus:version"'));
    }

    options.imageReferencePublisher = imageUrnParts[0];
    options.imageReferenceOffer = imageUrnParts[1];
    options.imageReferenceSku = imageUrnParts[2];
    options.imageReferenceVersion = imageUrnParts[3];

    // Generate hash code for dependent resource naming
    var hash = utils.getHash(resourceGroupName + name + location + imageUrn);

    var removeAllSpace = function (str) {
        return (str.replace(/[\(\)\{\}\[\]\.\,\;\:\"\ ']/g, '').toLowerCase());
    };

    var resourceNamePrefix = removeAllSpace(name).slice(0, 5) + '-' +
        removeAllSpace(location).slice(0, 5)  + '-' + hash;

    var resourceName = function (postFix) {
      return resourceNamePrefix + '-' + postFix;
    };
    
    // Setup Linux Configuration
    options.linuxConfiguration = getLinuxConfiguration(options.adminUsername, options.adminPassword, options.sshPublicKeyFile);

    // Setup Default Parameters
    options.skuCapacity = options.capacity ? parseInt(options.capacity) : 5;
    options.skuName = options.vmSize || 'Standard_DS1';
    options.skuTier = 'Standard';
    options.upgradePolicyMode = 'Manual';
    options.computerNamePrefix = options.linuxConfiguration ? name : name.substring(0, 9);
    options.virtualHardDiskContainer = resourceName('disk-container');
    options.osDiskCaching = 'ReadOnly';
    options.osDiskCreateOption = 'FromImage';
    options.osDiskName = resourceName('os-disk');
    
    // Setup Subscription Parameter
    var subscription = profile.current.getSubscription(options.subscription);

    // Create resource group if not exists
    var resourceManagementClient = utils.createResourceClient(subscription);
    createGroupIfNotExists(resourceManagementClient, resourceGroupName, location, _);

    // Create Default Network Resources -- VNet, Subnet, PIP, NIC, LBSet, etc.
    var params = {};
    params.nicName = resourceName('nic');
    params.publicipName = resourceName('pip');
    params.publicipDomainName = resourceName('pip');
    params.publicipName2 = resourceName('pip2');
    params.publicipDomainName2 = resourceName('pip2');
    params.vnetName = resourceName('vnet');
    params.vnetAddressPrefix = '10.0.0.0/16';
    params.vnetSubnetName = resourceName('snet');
    params.vnetSubnetAddressprefix = '10.0.1.0/24';
    params.location = location;
    var networkResourceProviderClient = utils.createNetworkManagementClient(subscription);
    var netNic = new networkNic(cli, networkResourceProviderClient, resourceGroupName, params);
    netNic.createOrUpdateNICIfRequired(_);
    options.networkInterfaceConfigurationName = params.nicName;
    options.ipConfigurationName = params.publicipName;
    options.virtualNetworkName = params.vnetName;
    options.ipConfigurationSubnet = params.vnetSubnetName;
    // Create Public IP for Load Balancer
    var pip2Parameters = {
      dnsSettings: {
        domainNameLabel:  params.publicipDomainName2
      },
      publicIpAllocationMethod: 'Dynamic',
      location: params.location
    };
    networkResourceProviderClient.publicIPAddresses.createOrUpdate(resourceGroupName, params.publicipName2, pip2Parameters, _);
    // Create Load Balancer
    var lbName = resourceName('lb');
    var beName = resourceName('be');
    var natName = resourceName('nat');
    var lbParameters = {
      location : location,
      frontendIPConfigurations : [
        {
          name : 'loadBalancerFrontEnd',
          publicIPAddress : {
            id : getResourceId(subscription.id, resourceGroupName, 'Microsoft.Network', 'publicIPAddresses', params.publicipName2)
          }
        }
      ],
      backendAddressPools : [
        {
          name : beName
        }
      ],
      inboundNatPools : [
        {
          name : natName,
          frontendIPConfiguration : {
            id : getResourceId(subscription.id, resourceGroupName, 'Microsoft.Network', 'loadBalancers', lbName, 'frontendIPConfigurations', 'loadBalancerFrontEnd')
          },
          protocol : 'Tcp',
          frontendPortRangeStart : 50000,
          frontendPortRangeEnd : 50099,
          backendPort : 22
        }
      ]
    };
    networkResourceProviderClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, lbParameters, _);

    // Create 5 Storage Resources by Default
    var storageManagementClient = utils.createStorageResourceProviderClient(subscription);
    var stoNames = createStorageResources(storageManagementClient, resourceGroupName, name, options.storageType, hash, location, 5, _);

    // Setup Parameter Object
    var parametersObj = {
      name : options.name,
      location : options.location,
      overProvision : false,
      sku : {
        capacity : options.skuCapacity,
        name : options.skuName,
        tier : options.skuTier
      },
      upgradePolicy : {
        mode : options.upgradePolicyMode
      },
      virtualMachineProfile : {
        networkProfile : {
          networkInterfaceConfigurations : [
            {
              name : options.networkInterfaceConfigurationName,
              primary : true,
              ipConfigurations : [
                {
                  name : options.ipConfigurationName,
                  subnet : {
                    id : getResourceId(subscription.id, options.resourceGroupName, 'Microsoft.Network', 'virtualNetworks', options.virtualNetworkName, 'subnets', options.ipConfigurationSubnet)
                  },
                  loadBalancerBackendAddressPools : [
                    {
                      id : getResourceId(subscription.id, options.resourceGroupName, 'Microsoft.Network', 'loadBalancers', lbName, 'backendAddressPools', beName)
                    }
                  ],
                  loadBalancerInboundNatPools : [
                    {
                      id : getResourceId(subscription.id, options.resourceGroupName, 'Microsoft.Network', 'loadBalancers', lbName, 'inboundNatPools', natName)
                    }
                  ]
                }
              ]
            }
          ]
        },
        osProfile : {
          computerNamePrefix : options.computerNamePrefix,
          adminPassword : options.adminPassword,
          adminUsername : options.adminUsername,
          linuxConfiguration : options.linuxConfiguration
        },
        storageProfile : {
          imageReference : {
            offer : options.imageReferenceOffer,
            publisher : options.imageReferencePublisher,
            sku : options.imageReferenceSku,
            version : options.imageReferenceVersion
          },
          osDisk : {
            caching : options.osDiskCaching,
            createOption : options.osDiskCreateOption,
            name : options.osDiskName,
            vhdContainers : [
              getContainerAndVhdUri(stoNames[0], options.virtualHardDiskContainer),
              getContainerAndVhdUri(stoNames[1], options.virtualHardDiskContainer),
              getContainerAndVhdUri(stoNames[2], options.virtualHardDiskContainer),
              getContainerAndVhdUri(stoNames[3], options.virtualHardDiskContainer),
              getContainerAndVhdUri(stoNames[4], options.virtualHardDiskContainer)
            ]
          }
        }
      }
    };
    var computeManagementClient = utils.createComputeManagementClient(subscription);
    var result = computeManagementClient.virtualMachineScaleSets.createOrUpdate(options.resourceGroupName, parametersObj.name, parametersObj, _);
    cli.output.json(result);
  });

};
