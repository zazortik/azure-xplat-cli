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
var tagUtils = require('../tag/tagUtils');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');
var constants = require('./constants');
var Publicip = require('./publicip');
var $ = utils.getLocaleString;

function VpnGateway(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.PublicipCrud = new Publicip(cli, networkResourceProviderClient);
}

__.extend(VpnGateway.prototype, {
  createVirtualNetworkGateway: function (resourceGroupName, gatewayName, location, options, _) {
    options.location = location;
    var gatewayProfile = this._parseVirtualNetworkGateway(gatewayName, options, true);
    var gateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    if (gateway) {
      throw new Error(util.format($('A virtual network gateway with name "%s" already exists in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating virtual network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGateway(resourceGroupName, gatewayName, gatewayProfile, _);
    } finally {
      progress.end();
    }
    this.showVirtualNetworkGateway(resourceGroupName, gatewayName, options, _);
  },

  setVirtualNetworkGateway: function (resourceGroupName, gatewayName, location, options, _) {
    var gatewayProfile = this._parseVirtualNetworkGateway(gatewayName, options);
    var gateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    if (gateway) {
      gateway = gateway.virtualNetworkGateway;

      if (options.size) gateway.gatewaySize = gatewayProfile.gatewaySize;
      if (options.vpnClientAddressPool) gateway.vpnClientAddressSpace = gatewayProfile.vpnClientAddressSpace;
      if (options.defaultSites) gateway.defaultSite = gatewayProfile.defaultSite;
      if (options.enableBgp) gateway.enableBgp = gatewayProfile.enableBgp;
      if (options.tags) gateway.tags = gatewayProfile.tags;
      if (options.tags === false) gateway.tags = {};

      this.updateVirtualNetworkGateway(resourceGroupName, gatewayName, gateway, _);
      this.showVirtualNetworkGateway(resourceGroupName, gatewayName, options, _);
    } else {
      throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }
  },

  listVirtualNetworkGateways: function (resourceGroupName, options, _) {
    var vnetGateways = null;
    var progress = this.cli.interaction.progress($('Looking up virtual network gateways'));
    try {
      vnetGateways = this.networkResourceProviderClient.gateways.listVirtualNetworkGateways(resourceGroupName, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(vnetGateways, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No virtual network gateways found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('ID'), item.id);
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Address prefixes'), item.addressSpace.addressPrefixes);
          row.cell($('Gateway IP addess'), item.gatewayIpAddress);
        });
      }
    });
  },

  showVirtualNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var vnetGateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    var output = this.cli.output;

    if (!vnetGateway) {
      if (output.format().json) {
        output.json({});
      } else {
        output.info(util.format($('Virtual network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
      }
      return;
    }

    var resourceInformation = resourceUtils.getResourceInformation(vnetGateway.id);
    this.cli.interaction.formatOutput(vnetGateway, function (resource) {
      output.nameValue($('Id'), resource.id);
      output.nameValue($('Name'), resourceInformation.resourceName || resource.name);
      output.nameValue($('Type'), resourceInformation.resourceType || resource.type);
      output.nameValue($('Location'), resource.location);
      output.nameValue($('Tags'), tagUtils.getTagsInfo(resource.tags));
      output.nameValue($('Provisioning state'), resource.provisioningState);
    });
  },

  deleteVirtualNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var gateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    if (!gateway) {
      throw new Error(utils.format($('Virtual network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete virtual network gateway %s? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting virtual network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.deleteVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  getVirtualNetworkGateway: function (resourceGroupName, gatewayName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up virtual network gateway "%s"'), gatewayName));
    try {
      gateway = this.networkResourceProviderClient.gateways.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        gateway = null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }

    return gateway;
  },

  updateVirtualNetworkGateway: function (resourceGroupName, gatewayName, gatewayParameters, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating virtual network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGateway(resourceGroupName, gatewayName, gatewayParameters, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  addIpConfigToVirtualNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var gatewayProfile = this._parseIpConfig(resourceGroupName, options);
    var gateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    if (gateway) {
      gateway = gateway.virtualNetworkGateway;

      if (!gateway.ipConfigurations) {
        gateway.ipConfigurations = [];
      }
      gateway.ipConfigurations = gateway.ipConfigurations.concat(gatewayProfile.ipConfigurations);

      this.updateVirtualNetworkGateway(resourceGroupName, gatewayName, gateway, _);
      this.showVirtualNetworkGateway(resourceGroupName, gatewayName, options, _);
    } else {
      throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }
  },

  removeIpConfigToVirtualNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var gateway = this.getVirtualNetworkGateway(resourceGroupName, gatewayName, _);
    if (gateway) {
      gateway = gateway.virtualNetworkGateway;

      if (gateway.ipConfigurations) {
        gateway.ipConfigurations = this._removeIpConfigurations(gateway.ipConfigurations, options);
      }

      this.updateVirtualNetworkGateway(resourceGroupName, gatewayName, gateway, _);
      this.showVirtualNetworkGateway(resourceGroupName, gatewayName, options, _);
    } else {
      throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }
  },

  createLocalNetworkGateway: function (resourceGroupName, gatewayName, location, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroupName, gatewayName, _);
    if (localGateway) {
      throw new Error(utils.format($('Local network gateway "%s" already exist in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    localGateway = {location: location};

    this._parseLocalNetworkGatewayParams(localGateway, options);

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(null, options);
      localGateway.tags = tags;
    } else {
      this.log.verbose($('No tags specified'));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateLocalNetworkGateway(resourceGroupName, gatewayName, localGateway, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    this.showLocalNetworkGateway(resourceGroupName, gatewayName, options, _);
  },

  setLocalNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroupName, gatewayName, _);
    if (!localGateway) {
      throw new Error(utils.format($('Local network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    this._parseLocalNetworkGatewayParams(localGateway, options);

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(localGateway.tags, options);
      for (var key in tags) {
        localGateway.tags[key] = tags[key];
      }
    }

    this.updateLocalNetworkGateway(resourceGroupName, gatewayName, localGateway, _);
    this.showLocalNetworkGateway(resourceGroupName, gatewayName, options, _);
  },

  getLocalNetworkGateway: function (resourceGroupName, gatewayName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up local network gateway "%s"'), gatewayName));
    try {
      gateway = this.networkResourceProviderClient.gateways.getLocalNetworkGateway(resourceGroupName, gatewayName, _);
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        gateway = null;
      } else {
        throw e;
      }
    } finally {
      progress.end();
    }

    return gateway;
  },

  updateLocalNetworkGateway: function (resourceGroupName, gatewayName, gatewayParameters, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateLocalNetworkGateway(resourceGroupName, gatewayName, gatewayParameters, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  listLocalNetworkGateways: function (resourceGroupName, options, _) {
    var localGateways = null;
    var progress = this.cli.interaction.progress($('Looking up local network gateways'));
    try {
      localGateways = this.networkResourceProviderClient.gateways.listLocalNetworkGateways(resourceGroupName, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(localGateways, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No local network gateways found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('ID'), item.id);
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Address prefixes'), item.addressSpace.addressPrefixes);
          row.cell($('Gateway IP addess'), item.gatewayIpAddress);
        });
      }
    });
  },

  showLocalNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroupName, gatewayName, _);

    if (!localGateway) {
      if (output.format().json) {
        output.json({});
      } else {
        output.info(util.format($('Local network gateway  "%s" not found'), gatewayName));
      }
      return;
    }

    var resourceInformation = resourceUtils.getResourceInformation(localGateway.id);
    var log = this.log;
    this.cli.interaction.formatOutput(localGateway, function (resource) {
      log.nameValue($('Id'), resource.id);
      log.nameValue($('Name'), resourceInformation.resourceName || resource.name);
      log.nameValue($('Type'), resourceInformation.resourceType || resource.type);
      log.nameValue($('Location'), resource.location);
      log.nameValue($('Tags'), tagUtils.getTagsInfo(resource.tags));
      log.nameValue($('Provisioning state'), resource.provisioningState);
    });
  },

  deleteLocalNetworkGateway: function (resourceGroupName, gatewayName, options, _) {
    var gateway = this.getLocalNetworkGateway(resourceGroupName, gatewayName, _);
    if (!gateway) {
      throw new Error(utils.format($('Local network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete local network gateway %s? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.deleteLocalNetworkGateway(resourceGroupName, name, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  createVirtualNetworkGatewayConnection: function (resourceGroupName, gatewayName, options, _) {
    var connectionProfile = this._parseVirtualNetworkGatewayConnection(gatewayName, options, _);
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
    if (connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" already exists in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating virtual network gateway connection "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, connectionProfile, _);
    } finally {
      progress.end();
    }
    this.showVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, options, _);
  },

  setVirtualNetworkGatewayConnection: function (resourceGroupName, gatewayName, options, _) {
    var connectionProfile = this._parseVirtualNetworkGatewayConnection(gatewayName, options, _);
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
    if (!connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    connection = connection.virtualNetworkGatewayConnection;

    if (options.type) connection.connectionType = connectionProfile.connectionType;
    if (options.gatewayId) connection.virtualNetworkGateway1 = connectionProfile.virtualNetworkGateway1;
    if (options.connectedEntityId) connection.localNetworkGateway2 = connectionProfile.localNetworkGateway2;
    if (options.ipsecSharedKey) connection.sharedKey = connectionProfile.sharedKey;

    var progress = this.cli.interaction.progress(util.format($('Setting virtual network gateway connection "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, connection, _);
    } finally {
      progress.end();
    }
    this.showVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, options, _);
  },

  listVirtualNetworkGatewayConnections: function (resourceGroupName, options, _) {
    var output = this.cli.output;
    var connections = this.getAllVirtualNetworkGatewayConnections(resourceGroupName, options, _);

    this.cli.interaction.formatOutput(connections, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No virtual network connections found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Connection type'), item.connectionType);
          row.cell($('Virtual network gateway 1'), item.virtualNetworkGateway1.name);
          row.cell($('Virtual network gateway 2'), item.virtualNetworkGateway2.name);
          row.cell($('Local network gateway 2'), item.localNetworkGateway2.name);
        });
      }
    });
  },

  showVirtualNetworkGatewayConnection: function (resourceGroupName, gatewayName, options, _) {
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
    var output = this.cli.output;
    if (!connection) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
      }
      return;
    }
    this._showVirtualNetworkGatewayConnection(connection.virtualNetworkGatewayConnection);
  },

  getVirtualNetworkGatewayConnection: function (resourceGroupName, gatewayName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the virtual network gateway connection "%s"'), gatewayName));
    try {
      var connection = this.networkResourceProviderClient.gateways.getVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
      return connection;
    } catch (e) {
      if (e.code === 'NotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  getAllVirtualNetworkGatewayConnections: function (resourceGroupName, options, _) {
    var progress = this.cli.interaction.progress($('Getting the virtual network connections'));
    var connections = null;
    try {
      connections = this.networkResourceProviderClient.gateways.listVirtualNetworkGatewayConnections(resourceGroupName, _);
    } finally {
      progress.end();
    }

    return connections.virtualNetworkGatewayConnections;
  },

  deleteVirtualNetworkGatewayConnection: function (resourceGroupName, gatewayName, options, _) {
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
    if (!connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete virtual network gateway connection "%s"? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting virtual network gateway connection "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.deleteVirtualNetworkGatewayConnection(resourceGroupName, gatewayName, _);
    } finally {
      progress.end();
    }
  },

  setSharedKey: function (resourceGroupName, gatewayId, connectedEntityId, options, _) {
    var gatewayConnection = this._getVirtualNetworkGatewayConnectionByIds(resourceGroupName, gatewayId, connectedEntityId, _);

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    if (options.sharedKey) {
      var progress = this.cli.interaction.progress($('Setting up shared key'));
      var parameters = {value: options.sharedKey};
      try {
        this.networkResourceProviderClient.gateways.setVirtualNetworkGatewayConnectionSharedKey(resourceGroupName, gatewayConnection.name, parameters, _);
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }
    } else {
      this.cli.output.warn($('--shared-key is not specified'));
    }
  },

  resetSharedKey: function (resourceGroupName, gatewayId, connectedEntityId, options, _) {
    var gatewayConnection = this._getVirtualNetworkGatewayConnectionByIds(resourceGroupName, gatewayId, connectedEntityId, _);

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    if (options.keyLength) {
      var progress = this.cli.interaction.progress($('Setting up shared key'));
      try {
        this.networkResourceProviderClient.gateways.resetVirtualNetworkGatewayConnectionSharedKey(resourceGroupName, gatewayConnection.name, options, _);
      } catch (e) {
        throw e;
      } finally {
        progress.end();
      }
    } else {
      this.cli.output.warn($('--key-length is not specified'));
    }
  },

  showSharedKey: function (resourceGroupName, gatewayId, connectedEntityId, options, _) {
    var gatewayConnection = this._getVirtualNetworkGatewayConnectionByIds(resourceGroupName, gatewayId, connectedEntityId, _);

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    var sharedKey = null;

    var progress = this.cli.interaction.progress($('Looking up shared key'));
    try {
      sharedKey = this.networkResourceProviderClient.gateways.getVirtualNetworkGatewayConnectionSharedKey(resourceGroupName, gatewayConnection.name, options, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    if (sharedKey) {
      utils.logLineFormat(sharedKey);
    } else {
      throw new Error($('Shared key not found'));
    }
  },

  _getVirtualNetworkGatewayConnectionByIds: function (resourceGroupName, gatewayId, connectedEntityId, _) {
    var gatewayConnections = this.getAllVirtualNetworkGatewayConnections(resourceGroupName, options, _);
    var gatewayConnection = utils.findFirstCaseIgnore(gatewayConnections, {
      virtualNetworkGateway1: {id: gatewayId},
      virtualNetworkGateway2: {id: connectedEntityId}
    });

    return gatewayConnection;
  },

  _showVirtualNetworkGatewayConnection: function (connection) {
    var log = this.log;
    this.cli.interaction.formatOutput(connection, function (connection) {
      log.nameValue($('Id'), connection.id);
      log.nameValue($('Name'), connection.name);
      log.nameValue($('Type'), connection.type);
      log.nameValue($('Provisioning state'), connection.provisioningState);
      log.nameValue($('Location'), connection.location);
      log.nameValue($('Routing weight'), connection.routingWeight);
      log.nameValue($('Connection type'), connection.connectionType);
      log.nameValue($('Shared key'), connection.sharedKey);

      if (!__.isEmpty(connection.virtualNetworkGateway1)) {
        log.header($('Virtual network gateway 1'));
        log.nameValue($('Id'), connection.virtualNetworkGateway1.id, 2);
        log.nameValue($('Name'), connection.virtualNetworkGateway1.name, 2);
        log.nameValue($('Type'), connection.virtualNetworkGateway1.type, 2);
        log.nameValue($('Location'), connection.virtualNetworkGateway1.location, 2);
        log.nameValue($('Gateway Type'), connection.virtualNetworkGateway1.gatewayType, 2);
        log.nameValue($('Gateway Size'), connection.virtualNetworkGateway1.gatewaySize, 2);
      }

      if (!__.isEmpty(connection.virtualNetworkGateway2)) {
        log.header($('Virtual network gateway 2'));
        log.nameValue($('Id'), connection.virtualNetworkGateway1.id, 2);
        log.nameValue($('Name'), connection.virtualNetworkGateway1.name, 2);
        log.nameValue($('Type'), connection.virtualNetworkGateway1.type, 2);
        log.nameValue($('Location'), connection.virtualNetworkGateway1.location, 2);
        log.nameValue($('Gateway Type'), connection.virtualNetworkGateway1.gatewayType, 2);
        log.nameValue($('Gateway Size'), connection.virtualNetworkGateway1.gatewaySize, 2);
      }

      if (!__.isEmpty(connection.localNetworkGateway2)) {
        log.nameValue($('Local network gateway 2'), 2);
        log.nameValue($('Id'), connection.localNetworkGateway2.id, 2);
        log.nameValue($('Name'), connection.localNetworkGateway2.name, 2);
        log.nameValue($('Type'), connection.localNetworkGateway2.type, 2);
        log.nameValue($('Location'), connection.localNetworkGateway2.location, 2);
        log.nameValue($('Gateway IP Address'), connection.localNetworkGateway2.gatewayIpAddress, 2);
      }

      log.nameValue($('Tags'), tagUtils.getTagsInfo(connection.tags));
    });
  },

  _parseVirtualNetworkGatewayConnection: function (name, options, _) {
    var parameters = {};

    if (options.gatewayId) {
      var gatewayInfo = utils.parseResourceReferenceUri(options.gatewayId);
      var gateway = this.getVirtualNetworkGateway(gatewayInfo.resourceGroupName, gatewayInfo.resourceName, _);
      if (!gateway) {
        throw new Error(util.format($('The virtual network gateway with id %s not found'), options.gatewayId));
      }
      parameters.virtualNetworkGateway1 = gateway.virtualNetworkGateway;
    }

    if (options.connectedEntityId) {
      var entityInfo = utils.parseResourceReferenceUri(options.connectedEntityId);
      var localGateway = this.getLocalNetworkGateway(entityInfo.resourceGroupName, entityInfo.resourceName, _);
      if (!localGateway) {
        throw new Error(util.format($('The local network gateway with id %s not found'), options.connectedEntityId));
      }
      parameters.localNetworkGateway2 = localGateway.localNetworkGateway;
    }

    if (options.type) {
      parameters.connectionType = utils.verifyParamExistsInCollection(constants.gatewayConnectionTypes, options.type, 'type');
    }

    if (options.ipsecSharedKey) {
      parameters.sharedKey = options.ipsecSharedKey;
    }

    return parameters;
  },

  _parseLocalNetworkGatewayParams: function (localGateway, options) {
    var vNetUtil = new VNetUtil();

    if (options.addressSpace) {
      var parsedAddressSpace = vNetUtil.parseIPv4Cidr(options.addressSpace);
      if (parsedAddressSpace.error) {
        throw new Error(parsedAddressSpace.error);
      }

      localGateway.addressSpace = {};
      localGateway.addressSpace.addressPrefixes = [options.addressSpace];
    }

    if (options.ipAddress) {
      var parsedIpAddress = vNetUtil.parseIpv4(options.ipAddress);
      if (parsedIpAddress.error) {
        throw new Error(parsedIpAddress.error);
      }

      localGateway.gatewayIpAddress = options.ipAddress;
    }
  },

  _parseVirtualNetworkGateway: function (name, options, useDefaults) {
    var parameters = {};

    if (options.location) {
      parameters.location = options.location;
    }

    if (options.type) {
      parameters.gatewayType = utils.verifyParamExistsInCollection(constants.vnetGatewayTypes, options.type, 'type');
    } else if (useDefaults) {
      parameters.gatewayType = constants.vnetGatewayTypes[0];
    }

    if (options.size) {
      parameters.gatewaySize = utils.verifyParamExistsInCollection(constants.vnetGatewaySizes, options.size, 'size');
    }

    if (options.vpnclientAddressPool) {
      if (options.gatewayType !== constants.vnetGatewayTypes[0]) {
        throw new Error(util.format($('--vpnclient-address-pool parameter is only valid if the gateway-type is %s'), constants.vnetGatewayTypes[0]));
      }
      var addressPrefixes = options.vpnclientAddressPool.split(',');

      var vNetUtil = new VNetUtil();
      addressPrefixes.forEach(function (addressPrefix) {
        var ipValidationResult = vNetUtil.parseIPv4Cidr(addressPrefix);
        if (ipValidationResult.cidr === null || ipValidationResult.error) {
          throw new Error($('The ip address in --vpnclient-address-pool parameter must be in cidr format (---.---.---.---/cidr)'));
        }
      });

      parameters.vpnClientAddressSpace = {
        addressPrefixes: addressPrefixes
      };
    }

    if (options.defaultSites) {
      var sites = options.defaultSites.split(',');
      sites.forEach(function (site) {
        if (utils.stringIsNullOrEmpty(site)) {
          throw new Error($('The default site in default-sites parameter must not be null or empty string'));
        }
      });
      parameters.defaultSite = sites;
    }

    if (options.enableBgp) {
      parameters.enableBgp = utils.verifyParamExistsInCollection(['true', 'false'], options.enableBgp, 'enable-bgp');
    }

    if (options.tags) {
      parameters.tags = tagUtils.buildTagsParameter(null, options);
    } else {
      this.cli.output.verbose($('No tags specified'));
    }

    return parameters;
  },

  _parseIpConfig: function (resourceGroupName, options, _) {
    var self = this;
    var output = self.cli.output;
    var parameters = {
      ipConfigurations: []
    };

    var item;
    if (options.publicIpId) {
      if (options.publicIpName) output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      item = {
        publicIpAddress: {
          id: options.publicIpId
        }
      };
      parameters.ipConfigurations.push(item);
    } else {
      if (options.publicIpName) {
        var publicip = self.PublicipCrud.get(resourceGroupName, options.publicIpName, _);
        if (!publicip) {
          throw new Error(util.format($('A public ip address  with name "%s" not found in the resource group "%s"'), options.publicIpName, resourceGroupName));
        }
        item = {
          publicIpAddress: {
            id: publicip.publicIpAddress.id
          }
        };
        parameters.ipConfigurations.push(item);
      }
    }

    if (options.subnetId) {
      if (options.subnetName || options.vnetName) {
        output.warn($('--subnet-name, --vnet-name parameters will be ignored because --subnet-name, --vnet-name and --subnet-id are mutually exclusive'));
      }
      item = {
        subnet: {
          id: options.subnetId
        }
      };
      parameters.ipConfigurations.push(item);
    } else {
      if (options.subnetName && options.vnetName) {
        var subnet = self.SubnetCrud.get(resourceGroupName, options.vnetName, options.subnetName, _);
        if (!subnet) {
          throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.subnetName, resourceGroupName));
        }
        item = {
          subnet: {
            id: subnet.id
          }
        };
        parameters.ipConfigurations.push(item);
      }
    }

    return parameters;
  },

  _removeIpConfigurations: function (ipConfigurations, options) {
    for (var i = 0; i < ipConfigurations.length; i++) {
      var item = ipConfigurations[i];
      if (options.publicIpId && item.publicIpAddress.id === options.publicIpId) {
        ipConfigurations.splice(i, 1);
        break;
      }
      if (options.subnetId && item.subnet.id === options.subnetId) {
        ipConfigurations.splice(i, 1);
        break;
      }
    }

    return ipConfigurations;
  }
});

module.exports = VpnGateway;