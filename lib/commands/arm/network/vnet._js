var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var TagUtils = require('../tag/tagUtils');
var ResourceUtils = require('../resource/resourceUtils');

var $ = utils.getLocaleString;

function VNet(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.log = cli.output;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(VNet.prototype, {
  create: function (resourceGroup, name, location, options, _) {
    var vNet = this.get(resourceGroup, name, null, _);

    if (vNet) {
      throw new Error(util.format($('Virtual network "%s" already exists in resource group "%s"'), name, resourceGroup));
    }

    var requestBody = {
      name: name,
      location: location,
      addressSpace: {
        addressPrefixes: []
      },
      dhcpOptions: {
        dnsServers: []
      }
    };

    var vNetUtil = new VNetUtil();

    // handling address prefixes
    if (options.addressPrefixes) {
      console.log(options.addressPrefixes);
      this._handleAddressPrefixes(options, requestBody, vNetUtil);
    } else {
      var defaultAddressPrefix = vNetUtil.defaultAddressSpaceInfo().ipv4Cidr;
      this.log.verbose(util.format($('Using default address prefix: %s'), defaultAddressPrefix));
      requestBody.addressSpace.addressPrefixes.push(defaultAddressPrefix);
    }

    // handling dns servers
    if (options.dnsServers) {
      this._handleDnsServers(options, requestBody, vNetUtil);
    } else {
      this.log.verbose($('No DNS server specified'));
    }

    // handling tags
    if (options.tags) {
      var tags = TagUtils.buildTagsParameter(null, options);
      requestBody.tags = tags;
    } else {
      this.log.verbose($('No tags specified'));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating virtual network "%s"'), name));
    try {
      this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroup, name, requestBody, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    this.show(resourceGroup, name, 'Loading virtual network state', _);
  },

  set: function (resourceGroup, name, options, _) {
    var vNet = this.get(resourceGroup, name, null, _);

    if (!vNet) {
      throw new Error(util.format($('Virtual network "%s" not found in resource group "%s"'), name, resourceGroup));
    }

    var vNetUtil = new VNetUtil();

    // handling address prefixes
    if (options.addressPrefixes) {
      vNet.addressSpace.addressPrefixes = [];
      this._handleAddressPrefixes(options, vNet, vNetUtil);
    }

    // handling dns servers
    if (options.dnsServers) {
      vNet.dhcpOptions.dnsServers = [];
      this._handleDnsServers(options, vNet, vNetUtil);
    } else {
      this.log.verbose($('No DNS server specified'));
    }

    // handling tags
    if (options.tags) {
      var tags = TagUtils.buildTagsParameter(null, options);
      vNet.tags = tags;
    } else {
      this.log.verbose($('No tags specified'));
    }

    var progress = this.cli.interaction.progress(util.format($('Updating virtual network "%s"'), name));
    try {
      this.networkResourceProviderClient.virtualNetworks.createOrUpdate(resourceGroup, name, vNet, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    this.show(resourceGroup, name, 'Loading virtual network state', _);
  },

  delete: function (resourceGroup, name, options, _) {
    var vNet = this.get(resourceGroup, name, null, _);
    if (!vNet) {
      this.log.error(util.format('Virtual network "%s" not found', name));
      return;
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete virtual network %s? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting virtual network "%s"'), name));
    try {
      this.networkResourceProviderClient.virtualNetworks.deleteMethod(resourceGroup, name, _);
    } catch(e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  show: function (resourceGroup, name, message, _) {
    var vNet = this.get(resourceGroup, name, message, _);
    var output = this.cli.output;

    if (!vNet) {
      if (output.format().json) {
        output.json({});
      } else {
        output.info(util.format($('Virtual network "%s" not found'), name));
      }
      return;
    }

    this._showVnet(vNet);
  },

  list: function (resourceGroup, _) {
    var progress = this.cli.interaction.progress('Listing virtual networks');
    var vNets = null;
    try {
      vNets = this.networkResourceProviderClient.virtualNetworks.list(resourceGroup, _);
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
          row.cell($('Address prefixes'), item.addressSpace.addressPrefixes);
          var dnsServers = '';
          if (item.dhcpOptions) {
            dnsServers = item.dhcpOptions.dnsServers;
          }
          row.cell($('DNS servers'), dnsServers);
        });
      }
    });
  },

  get: function (resourceGroup, name, message, _) {
    message = message || util.format($('Looking up virtual network "%s"'), name);
    var progress = this.cli.interaction.progress(message);
    var vNet = null;
    try {
      vNet = this.networkResourceProviderClient.virtualNetworks.get(resourceGroup, name, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }

    return vNet.virtualNetwork;
  },

  _showVnet: function (resource) {
    var resourceInformation = ResourceUtils.getResourceInformation(resource.id);
    this.log.data($('Id:                  '), resource.id);
    this.log.data($('Name:                '), resourceInformation.resourceName || resource.name);
    this.log.data($('Type:                '), resourceInformation.resourceType || resource.type);
    this.log.data($('Location:            '), resource.location);
    this.log.data($('Tags:                '), TagUtils.getTagsInfo(resource.tags));
    this.log.data($('Provisioning state:  '), resource.provisioningState);
    this.log.data($('Address prefixes:    '), resource.addressSpace.addressPrefixes);
    this.log.data($('DNS servers:         '), resource.dhcpOptions.dnsServers);
    this.log.data('');
  },

  _handleDnsServers: function(options, vNet, vNetUtil) {
    var dnsServers = options.dnsServers.split(',');
    for (var dnsNum in dnsServers) {
      var dnsServer = dnsServers[dnsNum];
      var parsedDnsIp = vNetUtil.parseIPv4(dnsServer);
      if (parsedDnsIp.error) {
        throw new Error(parsedDnsIp.error);
      }

      vNet.dhcpOptions.dnsServers.push(dnsServer);
    }
  },

  _handleAddressPrefixes: function(options, vNet, vNetUtil) {
    var addressPrefixes = options.addressPrefixes.split(',');
    for (var addNum in addressPrefixes) {
      var addressPrefix = addressPrefixes[addNum];
      var parsedAddressPrefix = vNetUtil.parseIPv4Cidr(addressPrefix);
      if (parsedAddressPrefix.error) {
        throw new Error(parsedAddressPrefix.error);
      }

      vNet.addressSpace.addressPrefixes.push(addressPrefix);
    }
  }
});

module.exports = VNet;