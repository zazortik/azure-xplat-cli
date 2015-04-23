var __ = require('underscore');
var tagUtils = require('../tag/tagUtils');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');
var constants = require('./constants');
var $ = utils.getLocaleString;

function VpnGateway(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(VpnGateway.prototype, {
  /*createVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    //TODO: implement
  },

  setVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    //TODO: implement
  },*/

  listVirtualNetworkGateways: function (resourceGroupName, vnetName, options, _) {
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
      output.data($('Id:                  '), resource.id);
      output.data($('Name:                '), resourceInformation.resourceName || resource.name);
      output.data($('Type:                '), resourceInformation.resourceType || resource.type);
      output.data($('Location:            '), resource.location);
      output.data($('Tags:                '), tagUtils.getTagsInfo(resource.tags));
      output.data($('Provisioning state:  '), resource.provisioningState);
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
    } catch(e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  getVirtualNetworkGateway: function (resourceGroup, gatewayName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up virtual network gateway "%s"'), gatewayName));
    try {
      gateway = this.networkResourceProviderClient.gateways.getVirtualNetworkGateway(resourceGroup, gatewayName, _);
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

  updateVirtualNetworkGateway: function(resourceGroup, gatewayName, gatewayParameters, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating virtual network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGateway(resourceGroup, gatewayName, gatewayParameters, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  /*addIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    //TODO: implement
  },

  removeIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    //TODO: implement
  },*/

  createLocalNetworkGateway: function (resourceGroup, gatewayName, location, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroup, gatewayName, _);
    if (localGateway) {
      throw new Error(utils.format($('Local network gateway "%s" already exist in the resource group "%s"'), gatewayName, resourceGroup));
    }

    localGateway = { location: location };

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

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(null, options);
      localGateway.tags = tags;
    } else {
      this.log.verbose($('No tags specified'));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateLocalNetworkGateway(resourceGroup, gatewayName, localGateway, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }

    this.showLocalNetworkGateway(resourceGroup, gatewayName, options, _);
  },

  setLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroup, gatewayName, _);
    if (!localGateway) {
      throw new Error(utils.format($('Local network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroup));
    }

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

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(localGateway.tags, options);
      for (var key in tags) {
        localGateway.tags[key] = tags[key];
      }
    }

    this.updateLocalNetworkGateway(resourceGroup, gatewayName, localGateway, _);
    this.showLocalNetworkGateway(resourceGroup, gatewayName, options, _);
  },

  getLocalNetworkGateway: function (resourceGroup, gatewayName, _) {
    var gateway = null;
    var progress = this.cli.interaction.progress(util.format($('Looking up local network gateway "%s"'), gatewayName));
    try {
      gateway = this.networkResourceProviderClient.gateways.getLocalNetworkGateway(resourceGroup, gatewayName, _);
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

  updateLocalNetworkGateway: function(resourceGroup, gatewayName, gatewayParameters, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateLocalNetworkGateway(resourceGroup, gatewayName, gatewayParameters, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  listLocalNetworkGateways: function (resourceGroup, options, _) {
    var localGateways = null;
    var progress = this.cli.interaction.progress($('Looking up local network gateways'));
    try {
      localGateways = this.networkResourceProviderClient.gateways.listLocalNetworkGateways(resourceGroup, _);
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

  showLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var localGateway = this.getLocalNetworkGateway(resourceGroup, gatewayName, _);

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
      log.data($('Id:                  '), resource.id);
      log.data($('Name:                '), resourceInformation.resourceName || resource.name);
      log.data($('Type:                '), resourceInformation.resourceType || resource.type);
      log.data($('Location:            '), resource.location);
      log.data($('Tags:                '), tagUtils.getTagsInfo(resource.tags));
      log.data($('Provisioning state:  '), resource.provisioningState);
    });
  },

  deleteLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var gateway = this.getLocalNetworkGateway(resourceGroup, gatewayName, _);
    if (!gateway) {
      throw new Error(utils.format($('Local network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroup));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete local network gateway %s? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting local network gateway "%s"'), gatewayName));
    try {
      this.networkResourceProviderClient.gateways.deleteLocalNetworkGateway(resourceGroup, name, _);
    } catch(e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  createVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var connectionProfile = this._parseVirtualNetworkGatewayConnection(name, options, _);
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroup, name, _);
    if (connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" already exists in the resource group "%s"'), name, resourceGroup));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating virtual network gateway connection "%s"'), name));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGatewayConnection(resourceGroup, name, connectionProfile, _);
    } finally {
      progress.end();
    }
    this.showVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  setVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var connectionProfile = this._parseVirtualNetworkGatewayConnection(name, options, _);
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroup, name, _);
    if (!connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    connection = connection.virtualNetworkGatewayConnection;

    if (options.type) connection.connectionType = connectionProfile.connectionType;
    if (options.gatewayId) connection.virtualNetworkGateway1 = connectionProfile.virtualNetworkGateway1;
    if (options.connectedEntityId) connection.localNetworkGateway2 = connectionProfile.localNetworkGateway2;
    if (options.ipsecSharedKey) connection.sharedKey = connectionProfile.sharedKey;

    var progress = this.cli.interaction.progress(util.format($('Setting virtual network gateway connection "%s"'), name));
    try {
      this.networkResourceProviderClient.gateways.createOrUpdateVirtualNetworkGatewayConnection(resourceGroup, name, connection, _);
    } finally {
      progress.end();
    }
    this.showVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  listVirtualNetworkGatewayConnections: function (resourceGroup, options, _) {
    var progress = this.cli.interaction.progress($('Getting the virtual network connections'));
    var connections = null;
    try {
      connections = this.networkResourceProviderClient.gateways.listVirtualNetworkGatewayConnections(resourceGroup, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(connections.virtualNetworkGatewayConnections, function (outputData) {
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

  showVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroup, name, _);
    var output = this.cli.output;
    if (!connection) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), name, resourceGroup));
      }
      return;
    }
    this._showVirtualNetworkGatewayConnection(connection.virtualNetworkGatewayConnection);
  },

  getVirtualNetworkGatewayConnection: function (resourceGroup, name, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the virtual network gateway connection "%s"'), name));
    try {
      var connection = this.networkResourceProviderClient.gateways.getVirtualNetworkGatewayConnection(resourceGroup, name, _);
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

  deleteVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var connection = this.getVirtualNetworkGatewayConnection(resourceGroup, name, _);
    if (!connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" not found in the resource group "%s"'), name, resourceGroup));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete virtual network gateway connection "%s"? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting virtual network gateway connection "%s"'), name));
    try {
      this.networkResourceProviderClient.gateways.deleteVirtualNetworkGatewayConnection(resourceGroup, name, _);
    } finally {
      progress.end();
    }
  },

  setSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var gatewayConnections = this.getAllVirtualNetworkGatewayConnections(resourceGroup, options, _);
    var gatewayConnection = utils.findFirstCaseIgnore(gatewayConnections, {virtualNetworkGateway1:  {id: vnetGatewayId}, virtualNetworkGateway2:  {id: connectedEntityId}});

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    if (options.sharedKey) {
      var progress = this.cli.interaction.progress($('Setting up shared key'));
      var parameters = {value: options.sharedKey};
      try {
        this.networkResourceProviderClient.gateways.setVirtualNetworkGatewayConnectionSharedKey(resourceGroup, gatewayConnection.name, parameters, _);
      } catch(e) {
        throw e;
      } finally {
        progress.end();
      }
    } else {
      this.cli.output.warn($('--shared-key is not specified'));
    }
  },

  resetSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var gatewayConnections = this.getAllVirtualNetworkGatewayConnections(resourceGroup, options, _);
    var gatewayConnection = utils.findFirstCaseIgnore(gatewayConnections, {virtualNetworkGateway1:  {id: vnetGatewayId}, virtualNetworkGateway2:  {id: connectedEntityId}});

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    if (options.keyLength) {
      var progress = this.cli.interaction.progress($('Setting up shared key'));
      try {
        this.networkResourceProviderClient.gateways.resetVirtualNetworkGatewayConnectionSharedKey(resourceGroup, gatewayConnection.name, options, _);
      } catch(e) {
        throw e;
      } finally {
        progress.end();
      }
    } else {
      this.cli.output.warn($('--key-length is not specified'));
    }
  },

  showSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var gatewayConnections = this.getAllVirtualNetworkGatewayConnections(resourceGroup, options, _);
    var gatewayConnection = utils.findFirstCaseIgnore(gatewayConnections, {
      virtualNetworkGateway1: {id: vnetGatewayId},
      virtualNetworkGateway2: {id: connectedEntityId}
    });

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    var sharedKey = null;

    var progress = this.cli.interaction.progress($('Looking up shared key'));
    try {
      sharedKey = this.networkResourceProviderClient.gateways.getVirtualNetworkGatewayConnectionSharedKey(resourceGroup, gatewayConnection.name, options, _);
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

  _showVirtualNetworkGatewayConnection: function (connection) {
    var log = this.log;
    this.cli.interaction.formatOutput(connection, function (connection) {
      log.data($('Id:                       '), connection.id);
      log.data($('Name:                     '), connection.name);
      log.data($('Type:                     '), connection.type);
      log.data($('Provisioning state:       '), connection.provisioningState);
      log.data($('Location:                 '), connection.location);
      log.data($('Routing weight:           '), connection.routingWeight);
      log.data($('Connection type:          '), connection.connectionType);
      if (connection.sharedKey) {
        log.data($('Shared key:          '), connection.sharedKey);
      }

      if (!__.isEmpty(connection.virtualNetworkGateway1)) {
        log.data($('Virtual network gateway 1:'), '');
        log.data($('   Id:                       '), connection.virtualNetworkGateway1.id);
        log.data($('   Name:                     '), connection.virtualNetworkGateway1.name);
        log.data($('   Type:                     '), connection.virtualNetworkGateway1.type);
        log.data($('   Location:                 '), connection.virtualNetworkGateway1.location);
        log.data($('   Gateway Type:             '), connection.virtualNetworkGateway1.gatewayType);
        log.data($('   Gateway Size:             '), connection.virtualNetworkGateway1.gatewaySize);
      }

      if (!__.isEmpty(connection.virtualNetworkGateway2)) {
        log.data($('Virtual network gateway 2:'), '');
        log.data($('   Id:                       '), connection.virtualNetworkGateway1.id);
        log.data($('   Name:                     '), connection.virtualNetworkGateway1.name);
        log.data($('   Type:                     '), connection.virtualNetworkGateway1.type);
        log.data($('   Location:                 '), connection.virtualNetworkGateway1.location);
        log.data($('   Gateway Type:             '), connection.virtualNetworkGateway1.gatewayType);
        log.data($('   Gateway Size:             '), connection.virtualNetworkGateway1.gatewaySize);
      }

      if (!__.isEmpty(connection.localNetworkGateway2)) {
        log.data($('Local network gateway 2:'), '');
        log.data($('   Id:                       '), connection.localNetworkGateway2.id);
        log.data($('   Name:                     '), connection.localNetworkGateway2.name);
        log.data($('   Type:                     '), connection.localNetworkGateway2.type);
        log.data($('   Location:                 '), connection.localNetworkGateway2.location);
        log.data($('   Gateway IP Address:       '), connection.localNetworkGateway2.gatewayIpAddress);
      }

      if (!__.isEmpty(connection.tags)) {
        log.data($('Tags:                 '), tagUtils.getTagsInfo(connection.tags));
      }
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
  }
});

module.exports = VpnGateway;