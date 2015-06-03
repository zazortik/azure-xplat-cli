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
var util = require('util');
var utils = require('../../../util/utils');
var constants = require('./constants');
var $ = utils.getLocaleString;

function VpnGateway(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(VpnGateway.prototype, {

  create: function (networkName, options, _) {
    var parameters = this._parseGateway(options);
    var progress = this.cli.interaction.progress(util.format($('Creating gateway for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.create(networkName, parameters, _);
    } finally {
      progress.end();
    }
    this.show(networkName, options, _);
  },

  show: function (networkName, options, _) {
    var gateway = this.get(networkName, _);
    var output = this.cli.output;

    if (!gateway) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('Gateway not found for the virtual network "%s"'), networkName));
      }
      return;
    }

    this.cli.interaction.formatOutput(gateway, function (gateway) {
      output.nameValue($('VIP Address'), gateway.vipAddress);
      output.nameValue($('Gateway type'), gateway.gatewayType);
      output.nameValue($('Gateway size'), gateway.gatewaySKU);
      output.nameValue($('State'), gateway.state);
      if (gateway.defaultSite) {
        output.nameValue($('Local network default site name'), gateway.defaultSite.name);
      }
      if (gateway.lastEvent) {
        output.header($('Last event'));
        output.nameValue($('Timestamp'), gateway.lastEvent.timestamp, 2);
        output.nameValue($('ID'), gateway.lastEvent.id, 2);
        output.nameValue($('Message'), gateway.lastEvent.message, 2);
        output.nameValue($('Data'), gateway.lastEvent.data, 2);
      }
    });
  },

  delete: function (networkName, options, _) {
    var gateway = this.get(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete gateway for the virtual network %s? [y/n] '), networkName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting gateway for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.deleteMethod(networkName, _);
    } finally {
      progress.end();
    }
  },

  resize: function (networkName, sku, options, _) {
    var gateway = this.get(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    options.sku = sku;
    var parameters = this._parseGateway(options);
    var progress = this.cli.interaction.progress(util.format($('Resizing gateway for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.resize(networkName, parameters, _);
    } finally {
      progress.end();
    }
  },

  reset: function (networkName, options, _) {
    var gateway = this.get(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    var parameters = {
      gatewaySKU: 'Default'
    };

    var progress = this.cli.interaction.progress(util.format($('Resetting gateway for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.reset(networkName, parameters, _);
    } finally {
      progress.end();
    }
  },

  setDefaultSite: function (networkName, siteName, options, _) {
    var gateway = this.get(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    var parameters = {
      defaultSite: siteName
    };

    var progress = this.cli.interaction.progress(util.format($('Setting local network default site for the virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.setDefaultSites(networkName, parameters, _);
    } finally {
      progress.end();
    }
  },

  removeDefaultSite: function (networkName, options, _) {
    var gateway = this.get(networkName, _);
    if (!gateway) {
      throw new Error(utils.format($('Gateway not found for the virtual network "%s"'), networkName));
    }

    var progress = this.cli.interaction.progress(util.format($('Removing local network default site configured in a virtual network "%s"'), networkName));
    try {
      this.networkManagementClient.gateways.removeDefaultSites(networkName, _);
    } finally {
      progress.end();
    }
  },

  listConnections: function (networkName, options, _) {
    var progress = this.cli.interaction.progress($('Getting the network connections'));
    var connectionList = null;
    try {
      connectionList = this.networkManagementClient.gateways.listConnections(networkName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(connectionList.connections, function (outputData) {
      if (outputData || outputData.length === 0) {
        output.warn($('No VPN gateway connections found'));
      } else {
        var indent = 0;
        output.header('Connections', indent, true);

        indent += 2;
        var counter = 0;
        outputData.forEach(function (item) {
          output.header(util.format($('Connection %s', counter)), indent);
          indent += 2;
          output.nameValue('Local network site name', item.localNetworkSiteName, indent);
          output.nameValue('State', item.connectivityState, indent);
          output.nameValue('Bytes of data transferred in', item.ingressBytesTransferred, indent);
          output.nameValue('Bytes of data transferred out', item.egressBytesTransferred, indent);
          output.nameValue('Last connection established', item.lastConnectionEstablished, indent);

          if (item.allocatedIpAddresses) {
            output.list('VPN Client IP Addresses', item.allocatedIpAddresses, indent);
          }

          if (item.lastEvent) {
            output.nameValue('Last event ID', item.lastEvent.id, indent);
            output.nameValue('Last event message', item.lastEvent.message, indent);
            output.nameValue('Last event timestamp', item.lastEvent.timestamp, indent);
          }
          indent -= 2;
          counter++;
        });
      }
    });
  },

  get: function (networkName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up network gateway in virtual network "%s"'), networkName));
    try {
      gateway = this.networkManagementClient.gateways.get(networkName, _);
    } catch (e) {
      if (e.code === 'BadRequest') {
        gateway = null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }

    return gateway;
  },

  setSharedKey: function(vnetName, keyValue, options, _) {
	  var progress = this.cli.interaction.progress(util.format($('Setting up shared key for vnet "%s"'), vnetName));

    this._validateDefaultSite(vnetName, options, _);

    options.value = keyValue;
    try {
      this.networkManagementClient.gateways.setSharedKey(vnetName, options.siteName, options, _);
    } finally {
      progress.end();
    }
  },

  resetSharedKey: function(vnetName, keyLength, options, _) {
	  options.keyLength = keyLength;

    this._validateDefaultSite(vnetName, options, _);

	var progress = this.cli.interaction.progress(util.format($('Resetting shared key for vnet "%s"'), vnetName));
    try {
      this.networkManagementClient.gateways.resetSharedKey(vnetName, options.siteName, options, _);
    } finally {
      progress.end();
    }
  },

  listVpnDevices: function(options, _) {
	var progress = this.cli.interaction.progress($('Listing VPN devices'));
	var devices = null;
    try {
      devices = this.networkManagementClient.gateways.listSupportedDevices(_);
  	} finally {
      progress.end();
    }

    var output = this.cli.output;

    // creating array for proper results output
    var devicesArray = [];
    devices.vendors.forEach(function (item) {
	  item.platforms.forEach(function (platform) {
	  	platform.oSFamilies.forEach(function (os) {
	  	  devicesArray.push({name: item.name, platform: platform.name, os: os.name});
	  	});
	  });
    });

    this.cli.interaction.formatOutput(devicesArray, function (outputData) {
      output.table(outputData, function (row, item) {
        row.cell($('Vendor'), item.name);
        row.cell($('Platform'), item.platform);
        row.cell($('OS Family'), item.os);
      });
    });
  },

  getScriptForVpnDevice: function(vnetName, options, _) {
	options.oSFamily = options.osFamily;

	var progress = this.cli.interaction.progress($('Getting script for VPN device'));
	var script = null;
    try {
      script = this.networkManagementClient.gateways.getDeviceConfigurationScript(vnetName, options, _);
  	} finally {
      progress.end();
    }

    this.cli.output.log(script);
  },

  startVpnDiagnosticsSession: function(vnetName, options, _) {
    options.captureDurationInSeconds = options.duration;
    options.customerStorageKey = options.storageAccountKey;
    options.customerStorageName = options.storageAccountName;

    var progress = this.cli.interaction.progress(util.format($('Starting diagnostics session in a virtual network "%s"'), vnetName));
    var session;
    try {
      session = this.networkManagementClient.gateways.startDiagnostics(vnetName, options, _);
    } finally {
      progress.end();
    }
  },

  stopVpnDiagnosticsSession: function(vnetName, options, _) {
    var progress = this.cli.interaction.progress(util.format($('Stopping diagnostics session in a virtual network "%s"'), vnetName));
    var session;
    try {
      session = this.networkManagementClient.gateways.stopDiagnostics(vnetName, options, _);
    } finally {
      progress.end();
    }
  },

  getVpnDiagnosticsSession: function(vnetName, options, _) {
    var progress = this.cli.interaction.progress(util.format($('Getting diagnostics session in a virtual network "%s"'), vnetName));
    var session;
    try {
      session = this.networkManagementClient.gateways.getDiagnostics(vnetName, _);
    } finally {
      progress.end();
    }

    this.cli.output.nameValue('Diagnostics URL', session.diagnosticsUrl);
  },

  _validateDefaultSite: function(vnetName, options, _) {
    if(!options.siteName) {
      var gateway = this.getVirtualNetworkGateway(vnetName, _);
      if (!gateway) {
        throw new Error(util.format($('Gateway not found for virtual network "%s"'), vnetName));
      } else {
        if (!gateway.defaultSite.name) {
          throw new Error(util.format($('Default local network site is not set for virtual network "%s"'), vnetName));
        }

        options.siteName = gateway.defaultSite.name;
      }
    }
  },

  _parseGateway: function (options) {
    var gateway = {};

    if (options.type) {
      gateway.gatewayType = utils.verifyParamExistsInCollection(constants.vpnGateway.type,
        options.type, 'type');
    }
    if (options.sku) {
      gateway.gatewaySKU = utils.verifyParamExistsInCollection(constants.vpnGateway.sku,
        options.sku, 'sku');
    }
    return gateway;
  }
});

module.exports = VpnGateway;