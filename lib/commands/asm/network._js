//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var crypto = require('crypto');
var fs = require('fs');
var util = require('util');

var profile = require('../../util/profile');
var utils = require('../../util/utils');

var VNetUtil = require('./network/vnetUtil');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var network = cli.category('network')
    .description($('Commands to manage your Networks'));

  var log = cli.output;

  network.command('export <file-path>')
    .usage('[options] <file-path>')
    .description($('Export the current Network configuration to a file'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(exportNetworkConfig);

  network.command('import <file-path>')
    .usage('[options] <file-path>')
    .description($('Set the Network configuration from a json file'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(importNetworkConfig);

  var dnsserver = network.category('dnsserver')
  .description($('Commands to manage your DNS Servers'));

  dnsserver.command('list')
    .usage('[options]')
    .description($('List DNS Servers registered in current Network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(listDNSServers);

  dnsserver.command('register [dnsIp]')
    .usage('[options] <dnsIp>')
    .description($('Register a DNS Server with current Network'))
    .option('-p, --dns-ip <name>', $('the IP address of the DNS server entry'))
    .option('-i, --dns-id <name>', $('the name identifier of the DNS server entry'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(registerDNSServer);

  dnsserver.command('unregister [dnsIp]')
    .usage('[options] <dnsIp>')
    .description($('Unregister a DNS Server registered in the current Azure Network by dns-id or dns-ip'))
    .option('-p, --dns-ip <name>', $('the IP address of the DNS server entry'))
    .option('-i, --dns-id <name>', $('the name identifier of the DNS server entry'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(unregisterDNSServer);

  var vnet = network.category('vnet')
  .description($('Commands to manage your Virtual Networks'));

  vnet.command('list')
    .usage('[options]')
    .description($('List your Azure Virtual Networks'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(listVNet);

  vnet.command('show [vnet]')
    .usage('<vnet> [options]')
    .description($('Show details about an Virtual Network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(showVNet);

  vnet.command('delete [vnet]')
    .usage('[options] <vnet>')
    .description($('Delete a virtual network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(deleteVNet);

  vnet.command('create [vnet]')
    .usage('[options] <vnet>')
    .description($('Create a Virtual Network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-e, --address-space <ipv4>', $('the address space for the virtual network'))
    .option('-m, --max-vm-count <number>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <number>', $('the address space network mask in CIDR format'))
    .option('-p, --subnet-start-ip <ipv4>', $('the start IP address of subnet'))
    .option('-n, --subnet-name <name>', $('the name for the subnet'))
    .option('-c, --subnet-vm-count <number>', $('the maximum number of VMs in the subnet'))
    .option('-r, --subnet-cidr <number>', $('the subnet network mask in CIDR format'))
    .option('-l, --location <name>', $('the location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-d, --dns-server-id <dns-id>', $('the name identifier of the DNS server'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(createVNet);

  function exportNetworkConfig(filePath, options, cmdCallback) {
    var progress = cli.interaction.progress($('Getting network configuration'));
    getNetworkConfig(options, function (error, networkConfiguration) {
      progress.end();
      if (!error) {
        var networkConfigAsString = JSON.stringify(networkConfiguration);
        fs.writeFile(filePath, networkConfigAsString, function (err) {
          if (err) {
            return cmdCallback(err);
          } else {
            log.info(util.format($('Network Configuration exported to %s'), filePath));
            return cmdCallback();
          }
        });
      } else {
        return cmdCallback(error);
      }
    });
  }

  function importNetworkConfig(filePath, options, cmdCallback) {
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    log.verbose(util.format($('Loading configuration file: %s'), filePath));
    var jsonFile = fs.readFileSync(filePath, 'utf8');
    var networkConfiguration = JSON.parse(stripBOM(jsonFile));
    var progress = cli.interaction.progress($('Setting Network Configuration'));
    setNetworkConfig(options, networkConfiguration, function (error) {
      progress.end();
      return cmdCallback(error);
    });
  }

  function listDNSServers(options, cmdCallback) {
    var progress = cli.interaction.progress($('Getting network configuration'));
    getNetworkConfig(options, function (error, networkConfiguration) {
      progress.end();
      if (!error) {
        var vnetConfiguration =  networkConfiguration.VirtualNetworkConfiguration;
        if (vnetConfiguration && vnetConfiguration.Dns && vnetConfiguration.Dns.DnsServers instanceof Array) {
          if (vnetConfiguration.Dns.DnsServers.length > 0) {
            log.table(vnetConfiguration.Dns.DnsServers, function(row, item) {
              row.cell($('DNS Server ID'), item.Name);
              row.cell($('DNS Server IP'), item.IPAddress);
            });
            return cmdCallback();
          }
        }

        if (log.format().json) {
          log.json([]);
        } else {
          log.info($('No DNS servers found'));
        }
      } else {
        return cmdCallback(error);
      }
    });
  }

  function registerDNSServer(dnsIp, options, _) {
    dnsIp = cli.interaction.promptIfNotGiven($('DNS IP: '), dnsIp, _);

    var dnsId = null;
    if (options.dnsId) {
      var dnsIdPattern = /^[a-z][a-z0-9\-]{0,19}$/i;
      if (dnsIdPattern.test(options.dnsId) === false) {
        throw new Error($('--dns-id can contain only letters, numbers and hyphens with no more than 20 characters. It must start with a letter'));
      }
      dnsId = options.dnsId;
    } else {
      dnsId = util.format($('DNS-%s'), crypto.randomBytes(8).toString('hex'));
    }

    var vnetUtil = new VNetUtil();
    var parsedDnsIp = vnetUtil.parseIPv4(dnsIp);
    if (parsedDnsIp.error) {
      throw new Error(parsedDnsIp.error);
    }

    dnsIp = vnetUtil.octectsToString(parsedDnsIp.octects);

    var networkConfiguration;
    var progress = cli.interaction.progress($('Getting network configuration'));
    try {
      networkConfiguration = getNetworkConfig(options, _);
    } finally {
      progress.end();
    }

    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (!vnetConfiguration.Dns) {
      vnetConfiguration.Dns = {};
    }

    if (!vnetConfiguration.Dns.DnsServers) {
      vnetConfiguration.Dns.DnsServers = [];
    }

    for (var i = 0; i < vnetConfiguration.Dns.DnsServers.length; i++) {
      if (utils.ignoreCaseEquals(vnetConfiguration.Dns.DnsServers[i].Name, dnsId)) {
        throw new Error(util.format($('A DNS server entry with name identifier %s already exists'), dnsId));
      }

      if (vnetConfiguration.Dns.DnsServers[i].IPAddress === dnsIp) {
        throw new Error(util.format($('A DNS server entry with ip address %s already exists'), dnsIp));
      }
    }

    vnetConfiguration.Dns.DnsServers.push({Name: dnsId, IPAddress: dnsIp });
    if (!options.dnsId) {
      log.info(util.format($('Name identifier for the DNS server is %s'), dnsId));
    }

    progress = cli.interaction.progress($('Updating Network Configuration'));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function unregisterDNSServer(dnsIp, options, _) {
    if (!options.dnsId && !dnsIp) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS IP: '), dnsIp, _);
    } else {
      dnsIp = dnsIp;
    }

    if (options.dnsId && dnsIp) {
      throw new Error($('Either --dns-id or --dns-ip must be present not both'));
    }

    var filterProperty = null;
    var filterValue = null;

    if (options.dnsId) {
      filterProperty = 'Name';
      filterValue = options.dnsId;
    } else {
      filterProperty = 'IPAddress';
      var vnetUtil = new VNetUtil();

      var parsedDnsIP = vnetUtil.parseIPv4(dnsIp, '--dns-ip');
      if (parsedDnsIP.error) {
        throw new Error(parsedDnsIP.error);
      }

      filterValue = vnetUtil.octectsToString(parsedDnsIP.octects);
    }

    var networkConfiguration;
    var progress = cli.interaction.progress($('Getting network configuration'));
    try {
      networkConfiguration = getNetworkConfig(options, _);
    } finally {
      progress.end();
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (!vnetConfiguration || !vnetConfiguration.Dns ||
      !(vnetConfiguration.Dns.DnsServers instanceof Array) || (vnetConfiguration.Dns.DnsServers.length === 0)) {
      throw new Error($('No DNS server registered with the Network'));
    }

    var dnsEntryIndex = -1;
    for (var i = 0; i < vnetConfiguration.Dns.DnsServers.length; i++) {
      if (vnetConfiguration.Dns.DnsServers[i][filterProperty].toLowerCase() == filterValue.toLowerCase()) {
        dnsEntryIndex = i;
        break;
      }
    }

    if (dnsEntryIndex == -1) {
      throw new Error(util.format($('A DNS server entry with %s %s not found'), options.dnsId ? $('name identifer') : $('ip address'), filterValue));
    }

    var dnsNameIdentifier = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].Name.toLowerCase();
    var dnsIPAddress = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].IPAddress;
    var dnsIdAndIp = dnsNameIdentifier + ' ( ' + dnsIPAddress + ' )';

    if (vnetConfiguration.VirtualNetworkSites instanceof Array) {
      for (var j = 0; j < vnetConfiguration.VirtualNetworkSites.length; j++) {
        var virtualNetworkSite = vnetConfiguration.VirtualNetworkSites[j];
        if (virtualNetworkSite.DnsServersRef instanceof Array) {
          for (var k = 0; k < virtualNetworkSite.DnsServersRef.length; k++) {
            if(virtualNetworkSite.DnsServersRef[k].Name.toLowerCase() == dnsNameIdentifier) {
              throw new Error(util.format($('You cannot unregister this DNS entry, it is being referenced by the virtual network %s'), virtualNetworkSite.Name));
            }
          }
        }
      }
    }

    if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the DNS server entry %s %s ? [y/n] '), dnsIdAndIp), _)) {
      return;
    }

    vnetConfiguration.Dns.DnsServers.splice(dnsEntryIndex, 1);

    progress = cli.interaction.progress(util.format($('Deleting the DNS server entry %s'), dnsIdAndIp));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function listVNet(options, _) {
    var virtualNetworkSites;
    var progress = cli.interaction.progress($('Getting virtual networks'));
    try {
      virtualNetworkSites = getVirtualNetworkSites(options, _);
    } finally {
      progress.end();
    }

    cli.interaction.formatOutput(virtualNetworkSites, function(outputData) {
      if(outputData.length === 0) {
        log.info($('No virtual networks defined'));
      } else {
        log.table(outputData, function (row, vnet) {
          row.cell($('Name'), vnet.Name);
          row.cell($('Status'), vnet.State);
          row.cell($('AffinityGroup'), vnet.AffinityGroup);
        });
      }
    });
  }

  function showVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

    var virtualNetworkSites;
    var progress = cli.interaction.progress($('Getting virtual networks'));
    try {
      virtualNetworkSites = getVirtualNetworkSites(options, _);
    } finally {
      progress.end();
    }

    if (virtualNetworkSites) {
      var virtualNetworkSite = null;
      for (var i = 0; i < virtualNetworkSites.length; i++) {
        if (utils.ignoreCaseEquals(virtualNetworkSites[i].Name, vnet)) {
          virtualNetworkSite = virtualNetworkSites[i];
          break;
        }
      }

      if (virtualNetworkSite) {
        if (log.format().json) {
          log.json(virtualNetworkSite);
        } else {
          utils.logLineFormat(virtualNetworkSite, log.data);
        }
      } else {
        log.info(util.format($('Virtual network with name %s not found'), vnet));
      }
    } else {
      log.info($('No virtual networks found'));
    }
  }

  function deleteVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

    var networkConfiguration;
    var progress = cli.interaction.progress($('Getting network configuration'));
    try {
      networkConfiguration = getNetworkConfig(options, _);
    } finally {
      progress.end();
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.VirtualNetworkSites instanceof Array &&
      vnetConfiguration.VirtualNetworkSites.length > 0) {
      var index = -1;
      for (var i = 0; i < vnetConfiguration.VirtualNetworkSites.length; i++) {
        if (utils.ignoreCaseEquals(vnetConfiguration.VirtualNetworkSites[i].Name, vnet)) {
          index = i;
          break;
        }
      }

      if (index !== -1) {
        if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the virtual network %s ? [y/n] '), vnet), _)) {
          return;
        }

        vnetConfiguration.VirtualNetworkSites.splice(index, 1);
        progress = cli.interaction.progress(util.format($('Deleting the virtual network %s'), vnet));
        try {
          setNetworkConfig(options, networkConfiguration, _);
        } finally {
          progress.end();
        }
      } else {
        log.info(util.format($('Virtual network with name %s not found'), vnet));
      }
    } else {
      log.info($('No virtual networks found'));
    }
  }

  function createVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

    if (!options.location && !options.affinityGroup) {
      throw new Error($('Either --location or --affinity-group must be present'));
    } else if (options.location && options.affinityGroup) {
      throw new Error($('Either --location or --affinity-group must be present not both'));
    }

    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    if (options.subnetCidr && options.subnetVmCount) {
      throw new Error($('Both optional parameters --subnet-cidr and --subnet-vm-count cannot be specified together'));
    }

    // Ensure --address-space is present if user provided --cidr
    var requiredOptCheckResult = ensureRequiredParams(
      options.cidr,
      'cidr',
      {
        'address-space': options.addressSpace
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space is present if user provided --max-vm-count
    requiredOptCheckResult = ensureRequiredParams(
      options.maxVmCount,
      'max-vm-count',
      {
        'address-space': options.addressSpace
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space and --cidr or --max-vm-count is present if user
    // provided --subnet-start-ip
    requiredOptCheckResult = ensureRequiredParams(
      options.subnetStartIp,
      'subnet-start-ip',
      {
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
    requiredOptCheckResult = ensureRequiredParams(
      options.subnetCidr,
      'subnet-cidr',
      {
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
    requiredOptCheckResult = ensureRequiredParams(
      options.subnetVmCount,
      'subnet-vm-count',
      {
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
      // The affinity group for VNet
      affinityGroup: null,
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

    if (namePattern.test(options.subnetName) === false) {
      throw new Error($('The name can contain only letters, numbers and hyphens with no more than 63 characters. It must start with a letter or number'));
    }

    vnetInput.name = vnet;

    var vnetUtil = new VNetUtil();

    // Set the start IP address of the address space.
    var addressSpaceStartIP = null;
    if (!options.addressSpace) {
      // If user not provided --address-space default to '10.0.0.0'.
      addressSpaceStartIP = vnetUtil.defaultAddressSpaceInfo().ipv4Start;
      log.info(util.format($('Using default address space start IP: %s'), addressSpaceStartIP));
    } else {
      addressSpaceStartIP = options.addressSpace;
    }

    // Parse address space start ip and get the octect representation.
    var parsedAddressSpaceStartIP =
      vnetUtil.parseIPv4(addressSpaceStartIP, '--address-space');
    if (parsedAddressSpaceStartIP.error) {
      throw new Error(parsedAddressSpaceStartIP.error);
    }

    // Ensure to remove any leading zeros in the IP for e.g. '01.002.0.1'.
    addressSpaceStartIP =
      vnetUtil.octectsToString(parsedAddressSpaceStartIP.octects);

    // Get the private address space info for the given address space.
    // Hint user if the address space does not fall in the allowed
    // private address space ranges.
    var addressSpaceInfoForAddressSpace =
      vnetUtil.getPrivateAddressSpaceInfo(parsedAddressSpaceStartIP.octects);
    if (!addressSpaceInfoForAddressSpace) {
      log.error(util.format($('The given --address-space %s is not a valid private address'), addressSpaceStartIP));
      log.help($('The valid address space ranges are:'));
      for(var key in vnetUtil.privateAddressSpacesInfo) {
        var addressSpaceInfo = vnetUtil.privateAddressSpacesInfo[key];
        log.help(addressSpaceInfo.ipv4Cidr +
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
      }

      cidr = vnetUtil.getCIDRFromHostsCount(maxVmCount);
      log.info(util.format($('The cidr calculated for the given --max-vm-count %s is %s'), maxVmCount, cidr));
    } else if (options.cidr) {
      cidr = parseInt(options.cidr, 10);
    } else {
      cidr = vnetInput.addressSpaceInfo.startCidr;
      log.info(util.format($('Using default address space cidr: %s'), cidr));
    }

    // Check the given address space cidr fall in the cidr range for the private
    // address space the given address space belongs to.
    var verifyCidrResult = vnetUtil.verfiyCIDR(cidr,
      { start: vnetInput.addressSpaceInfo.startCidr, end: vnetInput.addressSpaceInfo.endCidr },
      options.cidr ? '--cidr' : null
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.cidr = cidr;
    vnetInput.addressSpaceNetworkMask =
      vnetUtil.getNetworkMaskFromCIDR(vnetInput.cidr).octects;
    // From the address space and cidr calculate the ip range, we use this to
    // set the default subnet start ip and to validate that the subnet start
    // ip fall within the range defined for the address space.
    vnetInput.addressSpaceRange =
      vnetUtil.getIPRange(
        vnetInput.addressSpaceStartIPOctects,
        vnetInput.addressSpaceNetworkMask);

    // Set the subnet start ip
    if (!options.subnetStartIp) {
      vnetInput.subnetStartIPOctects = vnetInput.addressSpaceRange.start;
      vnetInput.subnetStartIP =
        vnetUtil.octectsToString(vnetInput.subnetStartIPOctects);
      log.info(util.format($('Using default subnet start IP: %s'), vnetInput.subnetStartIP));
    } else {
      var parsedSubnetStartIP = vnetUtil.parseIPv4(options.subnetStartIp, '--subnet-start-ip');
      if (parsedSubnetStartIP.error) {
        throw new Error(parsedSubnetStartIP.error);
      }

      vnetInput.subnetStartIPOctects = parsedSubnetStartIP.octects;
      vnetInput.subnetStartIP = vnetUtil.octectsToString(vnetInput.subnetStartIPOctects);
    }

    // Checks the given subnet start ip falls in the address space range.
    var isSubNetInRange = vnetUtil.isIPInRange(
      vnetInput.addressSpaceRange.start,
      vnetInput.addressSpaceRange.end,
      vnetInput.subnetStartIPOctects
    );

    if (!isSubNetInRange) {
      var addressSpaceRange = vnetInput.addressSpaceStartIP + '/' + vnetInput.cidr + ' [' +
        vnetUtil.octectsToString(vnetInput.addressSpaceRange.start) +
        ', ' +
        vnetUtil.octectsToString(vnetInput.addressSpaceRange.end) + ']';
      log.help(util.format($('The given subnet (--subnet-start-ip) should belongs to the address space %s'),
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

      subnetCidr = vnetUtil.getCIDRFromHostsCount(subnetVmCount);
      log.info(util.format($('The cidr calculated for the given --subnet-vm-count %s is %s'),
        subnetVmCount,
        subnetCidr));

    } else if (options.subnetCidr) {
      subnetCidr = parseInt(options.subnetCidr, 10);
    } else {
      subnetCidr = vnetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(vnetInput.cidr);
      log.info(util.format($('Using default subnet cidr: %s'), subnetCidr));
    }

    verifyCidrResult = vnetUtil.verfiyCIDR(subnetCidr,
      { start:vnetInput.cidr, end:vnetInput.addressSpaceInfo.endCidr },
      options.subnetCidr ? '--subnet-cidr' : 'calculated from --subnet-vm-count'
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.subnetCidr = subnetCidr;

    log.verbose(util.format($('Address Space [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.addressSpaceStartIP,
      vnetInput.cidr,
      vnetUtil.getHostsCountForCIDR(vnetInput.cidr).hostsCount));

    log.verbose(util.format($('Subnet [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.subnetStartIP,
      vnetInput.subnetCidr,
      vnetUtil.getHostsCountForCIDR(vnetInput.subnetCidr).hostsCount));

    var networkConfiguration;
    var progress = cli.interaction.progress($('Getting network configuration'));
    try {
      networkConfiguration = getNetworkConfig(options, _);
    } finally {
      progress.end();
    }

    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (!(vnetConfiguration.VirtualNetworkSites instanceof Array)) {
      networkConfiguration.VirtualNetworkConfiguration.VirtualNetworkSites = [];
    }

    for (var i = 0; i < vnetConfiguration.VirtualNetworkSites.length; i++) {
      var virtualNeworkSite = vnetConfiguration.VirtualNetworkSites[i];

      if (utils.ignoreCaseEquals(virtualNeworkSite.Name, vnetInput.name)) {
        throw new Error(util.format($('A virtual network with name %s already exists'), vnetInput.name));
      }
    }

    if (options.dnsServerId) {
      var dnsServerNameIps = [];
      if (vnetConfiguration.Dns && vnetConfiguration.Dns.DnsServers instanceof Array) {
        for (var j = 0; j < vnetConfiguration.Dns.DnsServers.length; j++) {
          if (vnetConfiguration.Dns.DnsServers[j].Name.toLowerCase() == options.dnsServerId.toLowerCase()) {
            vnetInput.dnsServerId = vnetConfiguration.Dns.DnsServers[j].Name;
            log.info(util.format($('Using DNS server %s (%s)'), vnetConfiguration.Dns.DnsServers[j].Name, vnetConfiguration.Dns.DnsServers[j].IPAddress));
            break;
          }

          dnsServerNameIps.push(util.format($('%s (%s)'), vnetConfiguration.Dns.DnsServers[j].Name, vnetConfiguration.Dns.DnsServers[j].IPAddress ));
        }
      }

      if (!vnetInput.dnsServerId) {
        log.error(util.format($('A DNS server entry with name identifier %s not found'), options.dnsServerId));
        if (dnsServerNameIps.length > 0) {
          log.help($('You have following DNS servers registered:'));
          for (var k = 0; k < dnsServerNameIps.length; k++) {
            log.help(dnsServerNameIps[k]);
          }
        }

        log.help($('To register a new DNS server see the command "azure network dnsserver"'));
        throw new Error($('DNS server entry with the name identifier not found'));
      }
    }

    var affinityGroup;
    progress = cli.interaction.progress($('Getting or creating affinity group'));
    try {
      affinityGroup = getOrCreateAffinityGroup(options, _);
    } finally {
      progress.end();
    }

    log.info(util.format($('Using affinity group %s'), affinityGroup.Name));
    vnetInput.affinityGroup = affinityGroup.Name;
    var virtualNetworkSite = getVirtualNetworkSiteObject(vnetInput);
    vnetConfiguration.VirtualNetworkSites.push(virtualNetworkSite);

    progress = cli.interaction.progress($('Updating Network Configuration'));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function getVirtualNetworkSiteObject(vnetInput) {
    var virtualNetWorkSite = {
      Name: vnetInput.name,
      AffinityGroup: vnetInput.affinityGroup,
      AddressSpace: [],
      Subnets: [],
      DnsServersRef: []
    };

    virtualNetWorkSite.AddressSpace.push(vnetInput.addressSpaceStartIP + '/' + vnetInput.cidr);
    virtualNetWorkSite.Subnets.push(
      {
        AddressPrefix: vnetInput.subnetStartIP + '/' + vnetInput.subnetCidr,
        Name: vnetInput.subnetName
      }
    );

    if (vnetInput.dnsServerId) {
      virtualNetWorkSite.DnsServersRef.push({Name: vnetInput.dnsServerId});
    }

    return virtualNetWorkSite;
  }

  function getOrCreateAffinityGroup(options, callback) {
    var channel = utils.createServiceManagementService(profile.current.getSubscription(options.subscription), log);
    var progress = null;

    var _getLocations = function(locationsCallBack) {
      progress = cli.interaction.progress($('Getting locations'));
      utils.doServiceManagementOperation(channel, 'listLocations', function (error, response) {
        progress.end();
        locationsCallBack(error, response);
      });
    };

    var _getAffinityGroups = function(locationsCallBack) {
      progress = cli.interaction.progress($('Getting affinity groups'));
      utils.doServiceManagementOperation(channel, 'listAffinityGroups', function (error, response) {
        progress.end();
        locationsCallBack(error, response);
      });
    };

    var _affinityGroupSupportsPersistentVMRole = function(afg) {
      if (afg.Capabilities === '') {
        return false;
      }

      for(var key in afg.Capabilities) {
        if (key === 'Capability') {
          var capability = afg.Capabilities[key];
          if (capability instanceof Array) {
            if (afg.Capabilities[key].indexOf('PersistentVMRole') != -1) {
              return true;
            }
          }
        }
      }

      return false;
    };

    var _locationSupportsPersistentVMRole = function(loc) {
      if (loc.AvailableServices === '') {
        return false;
      }

      for(var key in loc.AvailableServices) {
        if (key === 'AvailableService') {
          var service = loc.AvailableServices[key];
          if (service instanceof Array) {
            if (loc.AvailableServices[key].indexOf('PersistentVMRole') != -1) {
              return true;
            }
          }
        }
      }

      return false;
    };

    _getAffinityGroups(function(error, agResponse) {
      if (error) {
        return callback(error, null);
      }

      if (options.affinityGroup) {
        var affinityGroupName = options.affinityGroup.toLowerCase();
        var affinityGroup = null;
        for (var i = 0; i < agResponse.body.length; i++) {
          if (agResponse.body[i].Name.toLowerCase() === affinityGroupName) {
            affinityGroup = agResponse.body[i];
            break;
          }
        }

        if (affinityGroup === null) {
          return callback(
            util.format($('Affinity group with name "%s" not found'), options.affinityGroup),
            null
          );
        }

        if (!_affinityGroupSupportsPersistentVMRole(affinityGroup)) {
          log.error(util.format($('The given affinity group "%s" does not support PersistentVMRole service'), options.affinityGroup));

          log.help($('You should create virtual network in an affinity group that support PersistentVMRole service'));

          var vmroleSupportedAffinityGroupNames = [];
          for (var j = 0; j < agResponse.body.length; j++) {
            if (_affinityGroupSupportsPersistentVMRole(agResponse.body[j])) {
              vmroleSupportedAffinityGroupNames.push(agResponse.body[j].Name + ' (' + agResponse.body[j].Location + ')');
            }
          }

          if (vmroleSupportedAffinityGroupNames.length > 0) {
            log.help($('Following affinity groups in your subscription supports PersistentVMRole service'));
            for (var k = 0; k < vmroleSupportedAffinityGroupNames.length; k++) {
              log.help(vmroleSupportedAffinityGroupNames[k]);
            }
          } else {
            log.help($('There is no affinity groups in your subscription that supports PersistentVMRole service'));
            log.help($('To create a new affinity group use --location option'));
          }

          return callback(new Error($('affinity group does not support PersistentVMRole service')));
        }

        return callback(null,
          { Name: affinityGroup.Name, Location: affinityGroup.Location, New: false });
      } else {
        _getLocations(function(error, locResponse) {
          if (error) {
            return callback(error, null);
          }

          var locationName = options.location.toLowerCase();
          var location = null;
          for (var i = 0; i < locResponse.body.length; i++) {
            if (locResponse.body[i].Name.toLowerCase() == locationName) {
              location = locResponse.body[i];
              break;
            }
          }

          if (location === null) {
            return callback(new Error(util.format($('Location with name "%s" not found'), options.location)));
          }

          if (!_locationSupportsPersistentVMRole(location)) {
            log.error(util.format($('The given location "%s" does not support PersistentVMRole service'), options.location));

            log.help($('You should create virtual network in a location that supports PersistentVMRole service'));

            var vmroleSupportedLocationNames = [];
            for (var j = 0; j < locResponse.body.length; j++) {
              if (_locationSupportsPersistentVMRole(locResponse.body[j])) {
                vmroleSupportedLocationNames.push(locResponse.body[j].Name);
              }
            }

            if (vmroleSupportedLocationNames.length > 0) {
              log.help($('Following locations supports PersistentVMRole service'));
              for (var k = 0; k < vmroleSupportedLocationNames.length; k++) {
                log.help(vmroleSupportedLocationNames[k]);
              }
            }

            return callback(new Error($('location does not support PersistentVMRole service')));
          }

          var affinityGroup = null;
          for (var m = 0; m < agResponse.body.length; m++) {
            if (agResponse.body[m].Location.toLowerCase() === locationName) {
              affinityGroup = agResponse.body[m];
              break;
            }
          }

          var createNewAG = (affinityGroup === null) ||
            !_affinityGroupSupportsPersistentVMRole(affinityGroup);

          if (createNewAG) {
            var agName =  'AG-CLI-' + crypto.randomBytes(8).toString('hex');
            var affinityGroupOptions = {
              Label: agName,
              Description: undefined,
              Location: location.Name
            };
            progress = cli.interaction.progress(util.format($('Creating new affinity group %s'), agName));
            utils.doServiceManagementOperation(channel, 'createAffinityGroup', agName, affinityGroupOptions, function (error) {
              progress.end();
              if (error) {
                return callback(error, null);
              }

              return callback(null,
                { Name: agName, Location: affinityGroupOptions.Location, New: true });
            });
          } else {
            return callback(null,
              {
                Name: affinityGroup.Name,
                Location: affinityGroup.Location,
                New: false
              });
          }
        });
      }
    });
  }

  function getNetworkConfig(options, callback) {
    var channel = utils.createServiceManagementService(profile.current.getSubscription(options.subscription), log);

    utils.doServiceManagementOperation(channel, 'getNetworkConfig', function(error, response) {
      if (!error) {
        delete response.body['$'];
        return callback(null, response.body);
      } else {
        if (error.code === 'ResourceNotFound') {
          return callback(null, {});
        }

        return callback(error, response);
      }
    });
  }

  function setNetworkConfig(options, networkConfiguration, callback) {
    var channel = utils.createServiceManagementService(profile.current.getSubscription(options.subscription), log);
    utils.doServiceManagementOperation(channel, 'setNetworkConfig', networkConfiguration, function(error) {
      return callback(error);
    });
  }

  function getVirtualNetworkSites(options, callback) {
    var channel = utils.createServiceManagementService(profile.current.getSubscription(options.subscription), log);

    utils.doServiceManagementOperation(channel, 'listVirtualNetworkSites', function(error, response) {
      if (!error) {
        return callback(null, response.body);
      } else {
        return callback(error, response);
      }
    });
  }

  function ensureRequiredParams(param, paramName, dependentParams) {
    var result = {
      error: null,
      emptyParams: null,
      requiredParams: null,
      allEmpty: false
    };

    var arrayToString = function (array, combine) {
      var arrayAsString = null;
      if (array.length == 1) {
        arrayAsString = array[0];
      } else if (array.length > 1) {
        var last = ' ' + combine + ' ' + array.pop();
        arrayAsString = array.join(',');
        arrayAsString += last;
      }

      return arrayAsString;
    };

    var emptyParams = [];
    var requiresParams = [];
    if (typeof param != 'undefined') {
      for (var key in dependentParams) {
        if (typeof dependentParams[key] == 'undefined') {
          emptyParams.push(key);
          requiresParams.push(key);
        } else if (typeof dependentParams[key] == 'object') {
          var emptyParams2 = [];
          var requiresParams2 = [];
          for(var key2 in dependentParams[key]) {
            requiresParams2.push(key2);
            if (typeof dependentParams[key][key2] == 'undefined') {
              emptyParams2.push(key2);
            }
          }

          if (emptyParams2.length == requiresParams2.length) {
            emptyParams.push('"' + arrayToString(emptyParams2, 'or') + '"');
          }

          requiresParams.push('"' + arrayToString(requiresParams2, 'or') + '"');
        } else {
          requiresParams.push(key);
        }
      }
    }

    if (emptyParams.length > 0) {
      var singleEmpty = emptyParams.length == 1;
      var singleRequired = requiresParams.length == 1;
      result.allEmpty = (emptyParams.length == requiresParams.length);
      result.emptyParams = arrayToString(emptyParams, 'and');
      result.requiredParams = arrayToString(requiresParams, 'and');

      result.error = 'The parameter(s) ' + result.requiredParams +
       (singleRequired? ' is': ' are') +
       ' required when ' + paramName + ' is specified but ' +
       (result.allEmpty ? 'none of them present' :
         ('the parameter(s) ' + result.emptyParams + (singleEmpty? ' is': ' are') + ' not present' ));
    }

    return result;
  }
};