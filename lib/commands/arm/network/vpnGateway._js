var __ = require('underscore');
var tagUtils = require('../tag/tagUtils');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var resourceUtils = require('../resource/resourceUtils');

var $ = utils.getLocaleString;

function VpnGateway(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(VpnGateway.prototype, {
  /*
  TODO: uncomment this
  createVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    //TODO: implement command
  },

  setVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    //TODO: implement command
  },

  listVirtualNetworkGateways: function (resourceGroup, vnetName, options, _) {
    //TODO: implement command
  },

  showVirtualNetworkGateway: function (resourceGroup, name, options, _) {
    //TODO: implement command
  },

  addIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    //TODO: implement command
  },

  removeIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    //TODO: implement command
  },
  */

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

  /*
  createVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    //TODO: implement command
  },

  setVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    //TODO: implement command
  },

  listVirtualNetworkGatewayConnections: function (resourceGroup, options, _) {
    //TODO: implement command
  },

  showVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    //TODO: implement command
  },

  deleteVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    //TODO: implement command
  },
  */

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
    var gatewayConnection = utils.findFirstCaseIgnore(gatewayConnections, {virtualNetworkGateway1:  {id: vnetGatewayId}, virtualNetworkGateway2:  {id: connectedEntityId}});

    if (!gatewayConnection) {
      throw new Error($('Virtual network gateway connection not found'));
    }

    var sharedKey = null;

    var progress = this.cli.interaction.progress($('Looking up shared key'));
    try {
      sharedKey = this.networkResourceProviderClient.gateways.getVirtualNetworkGatewayConnectionSharedKey(resourceGroup, gatewayConnection.name, options, _);
    } catch(e) {
      throw e;
    } finally {
      progress.end();
    }

    if (sharedKey) {
      utils.logLineFormat(sharedKey);
    } else {
      throw new Error($('Shared key not found'));
    }
  }
});

module.exports = VpnGateway;