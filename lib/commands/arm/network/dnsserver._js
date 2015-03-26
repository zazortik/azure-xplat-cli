var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;
var VNet = require('./vnet');

function DnsServer(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.VNet = new VNet(this.cli, this.networkResourceProviderClient);
}

__.extend(DnsServer.prototype, {
  list: function (resourceGroupName, vNetName, _) {
    var vnet = this.VNet.get(resourceGroupName, vNetName, _);
    if (!vnet) {
      throw new Error(util.format($('A virtual network with name "%s" not found in the resource group "%s"'), vNetName, resourceGroupName));
    }

    var output = this.cli.output;
    var hasDns = this._hasDnsServers(vnet.virtualNetwork);
    this.cli.interaction.formatOutput(vnet.virtualNetwork, function (outputData) {
      if (hasDns) {
        output.table(outputData.properties.dhcpOptions.dnsServers, function (row, item) {
          row.cell($('IP Address'), item);
        });
      } else {
        output.info($('No dns servers found'));
      }
    });
  },

  register: function (resourceGroupName, vnetName, dnsIp, _) {
    var vnet = this.VNet.get(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('A virtual network with name "%s" not found in the resource group "%s"'), vnetName, resourceGroupName));
    }

    var vnetProfile = vnet.virtualNetwork;
    this._createDnsIfNotExist(vnetProfile);
    var dnsServers = vnetProfile.properties.dhcpOptions.dnsServers;

    if(!__.contains(dnsServers, dnsIp)) {
      vnetProfile.properties.dhcpOptions.dnsServers.push(dnsIp);
      this.VNet.update(resourceGroupName, vnetName, vnetProfile, _);
    } else {
      this.cli.output.error(util.format($('A DNS Server with IP "%s" already registered'), dnsIp));
    }
  },

  unregister: function (resourceGroupName, vnetName, dnsIp, _) {
    var vnet = this.VNet.get(resourceGroupName, vnetName, _);
    if (!vnet) {
      throw new Error(util.format($('A virtual network with name "%s" not found in the resource group "%s"'), vnetName, resourceGroupName));
    }

    var vnetProfile = vnet.virtualNetwork;
    this._createDnsIfNotExist(vnetProfile);
    var dnsServers = vnetProfile.properties.dhcpOptions.dnsServers;

    if(__.contains(dnsServers, dnsIp)) {
      dnsServers = __.without(dnsServers, dnsIp);
      vnetProfile.properties.dhcpOptions.dnsServers = dnsServers;
      this.VNet.update(resourceGroupName, vnetName, vnetProfile, _);
    } else {
      this.cli.output.error(util.format($('A DNS Server with IP "%s" not found'), dnsIp));
    }
  },

  _hasDnsServers: function (vnet) {
    var prop = vnet.properties;
    return (prop.dhcpOptions && prop.dhcpOptions.dnsServers && prop.dhcpOptions.dnsServers.length !== 0);
  },

  _createDnsIfNotExist: function (vnet) {
    if (!vnet.properties.dhcpOptions) vnet.properties.dhcpOptions = {};
    if (!vnet.properties.dhcpOptions.dnsServers) vnet.properties.dhcpOptions.dnsServers = [];
  }
});

module.exports = DnsServer;