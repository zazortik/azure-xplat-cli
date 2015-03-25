var __ = require('underscore');
var util = require('util');
var fs = require('fs');

var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');

var $ = utils.getLocaleString;

function VNetCRUD(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.log = cli.output;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(VNetCRUD.prototype, {
  create: function (resourceGroupName, vnet, location, options, _) {
    var vNet = this.get(resourceGroupName, vnet, _);

    if (vNet) {
      throw new Error(util.format($('Virtual network "%s" already exists in resource group "%s"'), vnet, resourceGroupName));
    }

    if (!location) {
      throw new Error($('Parameter --location must be present'));
    }

    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    if (options.subnetCidr && options.subnetVmCount) {
      throw new Error($('Both optional parameters --subnet-cidr and --subnet-vm-count cannot be specified together'));
    }

    var vNetUtil = new VNetUtil();

    // Ensure --address-space is present if user provided --cidr
    var requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.cidr,
      'cidr', {
        'address-space': options.addressSpace
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space is present if user provided --max-vm-count
    requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.maxVmCount,
      'max-vm-count', {
        'address-space': options.addressSpace
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space and --cidr or --max-vm-count is present if user
    // provided --subnet-start-ip
    requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.subnetStartIp,
      'subnet-start-ip', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        }
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space, subnet-start-ip and --cidr or --max-vm-count
    // is present if user provided --subnet-cidr
    requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.subnetCidr,
      'subnet-cidr', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        },
        'subnet-start-ip': options.subnetStartIp
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space, subnet-start-ip and --cidr or --max-vm-count
    // is present if user provided --subnet-vm-count
    requiredOptCheckResult = vNetUtil.ensureRequiredParams(
      options.subnetVmCount,
      'subnet-vm-count', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        },
        'subnet-start-ip': options.subnetStartIp
    });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    var vnetInput = {
      // The name of the VNet
      name: null,
      // The VNet's address space start IP
      addressSpaceStartIP: null,
      addressSpaceStartIPOctects: null,
      // Info about the private address space that address space belongs to
      addressSpaceInfo: null,
      // CIDR for the address space
      cidr: null,
      // The network mask for the address space calculated from CIDR
      addressSpaceNetworkMask: null,
      // The address space range calculated from address space start ip and CIDR
      addressSpaceRange: null,
      // The name for the first subnet in the address space
      subnetName: null,
      // The start ip address of the subnet
      subnetStartIPOctects: null,
      subnetStartIP: null,
      // The subnet cidr
      subnetCidr: null,
      // dns server id identifying DNS server for this VNet
      dnsServerId: null
    };

    var namePattern = /^[a-z0-9][a-z0-9\-]{0,62}$/i;
    if (options.subnetName) {
      if (namePattern.test(options.subnetName) === false) {
        throw new Error($('The --subnet-name can contain only letters, numbers and hyphens with no more than 63 characters. It must start with a letter or number'));
      }

      vnetInput.subnetName = options.subnetName;
    } else {
      vnetInput.subnetName = 'Subnet-1';
    }

    vnetInput.name = vnet;

    // Set the start IP address of the address space.
    var addressSpaceStartIP = null;
    if (!options.addressSpace) {
      // If user not provided --address-space default to '10.0.0.0'.
      addressSpaceStartIP = vNetUtil.defaultAddressSpaceInfo().ipv4Start;
      this.log.info(util.format($('Using default address space start IP: %s'), addressSpaceStartIP));
    } else {
      addressSpaceStartIP = options.addressSpace;
    }

    // Parse address space start ip and get the octect representation.
    var parsedAddressSpaceStartIP = vNetUtil.parseIPv4(addressSpaceStartIP, '--address-space');
    if (parsedAddressSpaceStartIP.error) {
      throw new Error(parsedAddressSpaceStartIP.error);
    }

    // Ensure to remove any leading zeros in the IP for e.g. '01.002.0.1'.
    addressSpaceStartIP = vNetUtil.octectsToString(parsedAddressSpaceStartIP.octects);

    // Get the private address space info for the given address space.
    // Hint user if the address space does not fall in the allowed
    // private address space ranges.
    var addressSpaceInfoForAddressSpace = vNetUtil.getPrivateAddressSpaceInfo(parsedAddressSpaceStartIP.octects);
    if (!addressSpaceInfoForAddressSpace) {
      this.log.error(util.format($('The given --address-space %s is not a valid private address'), addressSpaceStartIP));
      this.log.help($('The valid address space ranges are:'));
      for (var key in vNetUtil.privateAddressSpacesInfo) {
        var addressSpaceInfo = vNetUtil.privateAddressSpacesInfo[key];
        this.log.help(addressSpaceInfo.ipv4Cidr +
        '  [' + addressSpaceInfo.ipv4Start + ', ' + addressSpaceInfo.ipv4End + ']');
      }

      throw new Error($('Invalid --address-space value'));
    }

    vnetInput.addressSpaceStartIP = addressSpaceStartIP;
    vnetInput.addressSpaceStartIPOctects = parsedAddressSpaceStartIP.octects;
    vnetInput.addressSpaceInfo = addressSpaceInfoForAddressSpace;

    // Set the address space cidr
    var cidr = null;
    if (options.maxVmCount) {
      var maxVmCount = parseInt(options.maxVmCount, 10);
      if (isNaN(maxVmCount)) {
        throw new Error($('--vm-count should be an integer value'));
      } else if (maxVmCount < 0) {
        throw new Error($('--vm-count should be a positive integer'));
      }

      cidr = vNetUtil.getCIDRFromHostsCount(maxVmCount);
      this.log.info(util.format($('The cidr calculated for the given --max-vm-count %s is %s'), maxVmCount, cidr));
    } else if (options.cidr) {
      cidr = parseInt(options.cidr, 10);
    } else {
      cidr = vnetInput.addressSpaceInfo.startCidr;
      this.log.info(util.format($('Using default address space cidr: %s'), cidr));
    }

    // Check the given address space cidr fall in the cidr range for the private
    // address space the given address space belongs to.
    var verifyCidrResult = vNetUtil.verfiyCIDR(cidr, {
        start: vnetInput.addressSpaceInfo.startCidr,
        end: vnetInput.addressSpaceInfo.endCidr
      },
      options.cidr ? '--cidr' : null
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.cidr = cidr;
    vnetInput.addressSpaceNetworkMask = vNetUtil.getNetworkMaskFromCIDR(vnetInput.cidr).octects;
    // From the address space and cidr calculate the ip range, we use this to
    // set the default subnet start ip and to validate that the subnet start
    // ip fall within the range defined for the address space.
    vnetInput.addressSpaceRange = vNetUtil.getIPRange(
      vnetInput.addressSpaceStartIPOctects,
      vnetInput.addressSpaceNetworkMask
    );

    // Set the subnet start ip
    if (!options.subnetStartIp) {
      vnetInput.subnetStartIPOctects = vnetInput.addressSpaceRange.start;
      vnetInput.subnetStartIP = vNetUtil.octectsToString(vnetInput.subnetStartIPOctects);
      this.log.info(util.format($('Using default subnet start IP: %s'), vnetInput.subnetStartIP));
    } else {
      var parsedSubnetStartIP = vNetUtil.parseIPv4(options.subnetStartIp, '--subnet-start-ip');
      if (parsedSubnetStartIP.error) {
        throw new Error(parsedSubnetStartIP.error);
      }

      vnetInput.subnetStartIPOctects = parsedSubnetStartIP.octects;
      vnetInput.subnetStartIP = vNetUtil.octectsToString(vnetInput.subnetStartIPOctects);
    }

    // Checks the given subnet start ip falls in the address space range.
    var isSubNetInRange = vNetUtil.isIPInRange(
      vnetInput.addressSpaceRange.start,
      vnetInput.addressSpaceRange.end,
      vnetInput.subnetStartIPOctects
    );

    if (!isSubNetInRange) {
      var addressSpaceRange = vnetInput.addressSpaceStartIP + '/' + vnetInput.cidr + ' [' +
        vNetUtil.octectsToString(vnetInput.addressSpaceRange.start) + ', ' + vNetUtil.octectsToString(vnetInput.addressSpaceRange.end) + ']';
      this.log.help(util.format($('The given subnet (--subnet-start-ip) should belongs to the address space %s'),
        addressSpaceRange));
      throw new Error($('The subnet is not in the address space'));
    }

    // Set the subnet cidr
    var subnetCidr = null;
    if (options.subnetVmCount) {
      var subnetVmCount = parseInt(options.subnetVmCount, 10);
      if (isNaN(subnetVmCount)) {
        throw new Error($('--subnet-vm-count should be an integer value'));
      }

      subnetCidr = vNetUtil.getCIDRFromHostsCount(subnetVmCount);
      this.log.info(util.format($('The cidr calculated for the given --subnet-vm-count %s is %s'),
        subnetVmCount,
        subnetCidr));

    } else if (options.subnetCidr) {
      subnetCidr = parseInt(options.subnetCidr, 10);
    } else {
      subnetCidr = vNetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(vnetInput.cidr);
      this.log.info(util.format($('Using default subnet cidr: %s'), subnetCidr));
    }

    verifyCidrResult = vNetUtil.verfiyCIDR(subnetCidr, {
        start: vnetInput.cidr,
        end: vnetInput.addressSpaceInfo.endCidr
      },
      options.subnetCidr ? '--subnet-cidr' : 'calculated from --subnet-vm-count'
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.subnetCidr = subnetCidr;

    this.log.verbose(util.format($('Address Space [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.addressSpaceStartIP,
      vnetInput.cidr,
      vNetUtil.getHostsCountForCIDR(vnetInput.cidr).hostsCount)
    );

    this.log.verbose(util.format($('Subnet [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.subnetStartIP,
      vnetInput.subnetCidr,
      vNetUtil.getHostsCountForCIDR(vnetInput.subnetCidr).hostsCount)
    );

    var verifiedSubnetDns = vNetUtil.parseIPv4(options.subnetDnsServer);
    if(verifiedSubnetDns.error) {
      throw new Error(verifiedSubnetDns.error);
    }

    var tagsObj = {};
    if (options.tags) {
      var tags = options.tags.split(',');
      for (var i = 0; i < tags.length; i++) {
        tagsObj[i] = tags[i];
      }
    }

    var requestParams =
    {
      name: vnet,
      location: location,
      tags: tagsObj,
      properties: {
        addressSpace: {
          addressPrefixes: [
            util.format($('%s/%s'), vnetInput.addressSpaceStartIP, vnetInput.cidr)
          ]
        },
        subnets: [
          {
            name: vnetInput.subnetName,
            properties: {
              addressPrefix: util.format($('%s/%s'), vnetInput.subnetStartIP, vnetInput.subnetCidr),
              dhcpOptions: {
                dnsServers: [options.subnetDnsServer]
              }
            }
          }
        ]
      }
    };

    if(options.dnsServer) {
      requestParams.properties.dhcpOptions = {};
      requestParams.properties.dhcpOptions.dnsServers = [options.dnsServer];
    }

    var progress = this.cli.interaction.progress(util.format($('Creating virtual network "%s"'), vnet));
    try {
      this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroupName, vnet, requestParams, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, virtualNetworkName, options, _) {
    var vNet = this.get(resourceGroupName, virtualNetworkName, _);
    if (!vNet) {
      this.log.error(util.format('Virtual network "%s" not found', virtualNetworkName));
      return;
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete virtual network %s? [y/n] '), virtualNetworkName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting virtual network "%s"'), virtualNetworkName));
    try {
      this.networkResourceProviderClient.virtualNetworks.deleteMethod(resourceGroupName, virtualNetworkName, _);
    } finally {
      progress.end();
    }
  },

  show: function (resourceGroupName, virtualNetworkName, _) {
    var vNet = this.get(resourceGroupName, virtualNetworkName, _);
    var output = this.cli.output;

    if(!vNet) {
      if (output.format().json) {
        output.json({});
      } else {
        output.info(util.format($('Virtual network "%s" not found'), virtualNetworkName));
      }
      return;
    }

    this.cli.interaction.formatOutput(vNet.virtualNetwork, function () {
      utils.logLineFormat(vNet.virtualNetwork, output.data);
    });
  },

  list: function (resourceGroupName, _) {
    var progress = this.cli.interaction.progress('Listing virtual networks');
    var vNets = null;
    try {
      vNets = this.networkResourceProviderClient.virtualNetworks.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(vNets.virtualNetworks, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No virtual networks found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('ID'), item.id);
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
        });
      }
    });
  },

  export: function (resourceGroupName, virtualNetworkName, filePath, _) {
    var vNet = this.get(resourceGroupName, virtualNetworkName, _);

    if (vNet) {
      var progress = this.cli.interaction.progress(util.format($('Exporting Network Configuration to "%s"'), filePath));
      try {
        var networkConfigAsString = JSON.stringify(vNet.virtualNetwork);
        fs.writeFileSync(filePath, networkConfigAsString);
      } finally {
        progress.end();
      }
    } else {
      throw new Error(util.format('Virtual network "%s" not found', virtualNetworkName));
    }
  },

  import: function (resourceGroupName, virtualNetworkName, filePath, _) {
    var progress = this.cli.interaction.progress(util.format($('Loading configuration file: %s'), filePath));
    var jsonString = null;
    try {
      jsonString = fs.readFileSync(filePath, 'utf8');
    } finally {
      progress.end();
    }
    if (jsonString) {
      var networkConfiguration = JSON.parse(jsonString);

      progress = this.cli.interaction.progress($('Setting virtual network configuration'));
      try {
        this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroupName, virtualNetworkName, networkConfiguration, _);
      } finally {
        progress.end();
      }
    }
  },

  get: function (resourceGroupName, virtualNetworkName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up virtual network "%s"'), virtualNetworkName));
    var vNet = null;
    try {
      vNet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroupName, virtualNetworkName, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }

    return vNet;
  },

  update: function (resourceGroupName, vnetName, vnetProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating virtual network "%s"'), vnetName));
    try {
      this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnetProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  }
});

module.exports = VNetCRUD;