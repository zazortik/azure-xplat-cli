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

var __ = require('underscore');
var crypto = require('crypto');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('./../../../util/vnet.util');
var NetworkConfig = require('./networkConfig');
var $ = utils.getLocaleString;

function DnsServer(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
  this.networkConfig = new NetworkConfig(cli, networkManagementClient);
}

__.extend(DnsServer.prototype, {
  list: function (options, _) {
    var output = this.cli.output;

    var networkConfiguration = this.networkConfig.get(_);
    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.Dns.DnsServers && vnetConfiguration.Dns.DnsServers.length > 0) {
      output.table(vnetConfiguration.Dns.DnsServers, function (row, item) {
        row.cell($('DNS Server ID'), item.Name);
        row.cell($('DNS Server IP'), item.IPAddress);
      });
    } else {
      if (output.format().json) {
        output.json([]);
      } else {
        output.warn($('No DNS servers found'));
      }
    }
  },

  register: function (dnsIp, options, _) {
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

    var networkConfiguration = this.networkConfig.get(_);

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
        throw new Error(util.format($('A DNS Server with name identifier %s already exists'), dnsId));
      }

      if (vnetConfiguration.Dns.DnsServers[i].IPAddress === dnsIp) {
        throw new Error(util.format($('A DNS Server with ip address %s already exists'), dnsIp));
      }
    }

    vnetConfiguration.Dns.DnsServers.push({
      Name: dnsId,
      IPAddress: dnsIp
    });
    if (!options.dnsId) {
      this.cli.output.info(util.format($('Name Identifier for the DNS Server is %s'), dnsId));
    }

    var progress = this.cli.interaction.progress($('Registering DNS Server'));
    try {
      this.networkConfig.set(networkConfiguration, _);
    } finally {
      progress.end();
    }
  },

  unregister: function (dnsIp, options, _) {
    if (options.dnsId && dnsIp) {
      throw new Error($('Either --dns-id or --dns-ip must be present not both'));
    }

    if (!options.dnsId && !dnsIp) {
      dnsIp = this.cli.interaction.promptIfNotGiven($('DNS IP: '), dnsIp, _);
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

    var networkConfiguration = this.networkConfig.get(_);

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.Dns.DnsServers.length === 0) {
      throw new Error($('No DNS Servers registered with the Network'));
    }

    var dnsEntryIndex = -1;
    for (var i = 0; i < vnetConfiguration.Dns.DnsServers.length; i++) {
      if (vnetConfiguration.Dns.DnsServers[i][filterProperty].toLowerCase() == filterValue.toLowerCase()) {
        dnsEntryIndex = i;
        break;
      }
    }

    if (dnsEntryIndex == -1) {
      throw new Error(util.format($('A DNS Server with %s %s not found'), options.dnsId ? $('Name Identifier') : $('IP Address'), filterValue));
    }

    var dnsNameIdentifier = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].Name.toLowerCase();
    var dnsIPAddress = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].IPAddress;
    var dnsIdAndIp = dnsNameIdentifier + '(' + dnsIPAddress + ')';

    for (var j = 0; j < vnetConfiguration.VirtualNetworkSites.length; j++) {
      var site = vnetConfiguration.VirtualNetworkSites[j];
      if (site.DnsServersRef) {
        for (var k = 0; k < site.DnsServersRef.length; k++) {
          if (site.DnsServersRef[k].Name.toLowerCase() === dnsNameIdentifier) {
            throw new Error(util.format($('You cannot unregister this DNS Server, it is being referenced by the virtual network %s'), site.Name));
          }
        }
      }
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete the DNS Server %s ? [y/n] '), dnsIdAndIp), _)) {
      return;
    }

    vnetConfiguration.Dns.DnsServers.splice(dnsEntryIndex, 1);

    var progress = this.cli.interaction.progress(util.format($('Deleting the DNS Server %s'), dnsIdAndIp));
    try {
      this.networkConfig.set(networkConfiguration, _);
    } finally {
      progress.end();
    }
  }
});

module.exports = DnsServer;
