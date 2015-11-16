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
var $ = utils.getLocaleString;
var constants = require('./constants');
var tagUtils = require('../tag/tagUtils');
var resourceUtils = require('../resource/resourceUtils');
var VNetUtil = require('../../../util/vnet.util');
var PublicIp = require('./publicIp');
var Subnet = require('./subnet');
var LocalNetworkGateway = require('./localNetworkGateway');

function VirtualNetworkGateway(cli, networkResourceProviderClient) {
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.publicIpCrud = new PublicIp(cli, networkResourceProviderClient);
  this.subnetCrud = new Subnet(cli, networkResourceProviderClient);
  this.lnetGatewayCrud = new LocalNetworkGateway(cli, networkResourceProviderClient);
  this.vnetUtil = new VNetUtil();
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(VirtualNetworkGateway.prototype, {
  /**
   * Virtual network gateway methods
   */
  create: function (resourceGroupName, gatewayName, options, _) {
    var self = this;
    self._validateGateway(options);

    var parameters = self._parseGateway(resourceGroupName, gatewayName, options, _);

    var gateway = self.get(resourceGroupName, gatewayName, _);
    if (gateway) {
      throw new Error(util.format($('A virtual network gateway with name "%s" already exists in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    self._createOrUpdate(resourceGroupName, gatewayName, parameters, true, _);
    self.show(resourceGroupName, gatewayName, options, _);
  },

  set: function (resourceGroupName, gatewayName, options, _) {
    var self = this;
    self._validateGateway(options);

    var gateway = self.get(resourceGroupName, gatewayName, _);
    if (!gateway) {
      throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    var parameters = self._parseGateway(resourceGroupName, gatewayName, options, _, gateway);

    self._createOrUpdate(resourceGroupName, gatewayName, parameters, false, _);
    self.show(resourceGroupName, gatewayName, options, _);
  },

  list: function (resourceGroupName, options, _) {
    var self = this;
    var gateways = null;

    var progress = self.interaction.progress($('Looking up virtual network gateways'));
    try {
      gateways = self.networkResourceProviderClient.virtualNetworkGateways.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(gateways.virtualNetworkGateways, function (data) {
      if (data.length === 0) {
        self.output.warn($('No virtual network gateways found'));
      } else {
        self.output.table(data, function (row, gateway) {
          row.cell($('Name'), gateway.name);
          row.cell($('Location'), gateway.location);
          row.cell($('VPN type'), gateway.vpnType);
          row.cell($('Enable BGP'), gateway.enableBgp);
          row.cell($('Private IP allocation'), gateway.ipConfigurations[0].privateIpAllocationMethod);
          row.cell($('Private IP address'), gateway.ipConfigurations[0].privateIpAddress || '');
        });
      }
    });
  },

  show: function (resourceGroupName, gatewayName, options, _) {
    var self = this;
    var gateway = self.get(resourceGroupName, gatewayName, _);

    self.interaction.formatOutput(gateway, function (gateway) {
      if (gateway !== null) {
        var resourceInformation = resourceUtils.getResourceInformation(gateway.id);
        self.output.nameValue($('Id'), gateway.id);
        self.output.nameValue($('Name'), resourceInformation.resourceName || gateway.name);
        self.output.nameValue($('Type'), resourceInformation.resourceType || gateway.type);
        self.output.nameValue($('Location'), gateway.location);
        self.output.nameValue($('Tags'), tagUtils.getTagsInfo(gateway.tags));
        self.output.nameValue($('Provisioning state'), gateway.provisioningState);
        self.output.nameValue($('VPN type'), gateway.vpnType);
        self.output.nameValue($('Enable BGP'), gateway.enableBgp);

        self.output.header($('IP configurations'));
        gateway.ipConfigurations.forEach(function (ipConfig) {
          self.output.nameValue($('Id'), ipConfig.id, 2);
          self.output.nameValue($('Name'), ipConfig.name, 2);
          self.output.nameValue($('Provisioning state'), ipConfig.provisioningState, 2);
          self.output.nameValue($('Private IP allocation method'), ipConfig.privateIpAllocationMethod, 2);
          self.output.nameValue($('Private IP address'), ipConfig.privateIpAddress, 2);
          self.output.nameValue($('Public IP id'), ipConfig.publicIpAddress.id, 2);
          self.output.nameValue($('Subnet id'), ipConfig.subnet.id, 2);
          self.output.data('');
        });
      } else {
        self.output.warn(util.format($('Virtual network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
      }
    });
  },

  delete: function (resourceGroupName, gatewayName, options, _) {
    var self = this;

    var gateway = self.get(resourceGroupName, gatewayName, _);
    if (!gateway) {
      throw new Error(util.format($('Virtual network gateway "%s" not found in the resource group "%s"'), gatewayName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete virtual network gateway "%s"? [y/n] '), gatewayName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting virtual network gateway "%s"'), gatewayName));
    try {
      self.networkResourceProviderClient.virtualNetworkGateways.deleteMethod(resourceGroupName, gatewayName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, gatewayName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up virtual network gateway "%s"'), gatewayName));
    try {
      var gateway = self.networkResourceProviderClient.virtualNetworkGateways.get(resourceGroupName, gatewayName, _);
      return gateway.virtualNetworkGateway;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  /**
   * Gateway connection methods
   */
  createConnection: function (resourceGroupName, connectionName, options, _) {
    var self = this;

    var parameters = {
      location: options.location,
      virtualNetworkGateway1: {}
    };

    parameters = self._parseConnection(resourceGroupName, parameters, options, true, _);

    var connection = self.getConnection(resourceGroupName, connectionName, _);
    if (connection) {
      throw new Error(util.format($('A virtual network gateway connection with name "%s" already exists in the resource group "%s"'), connectionName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating gateway connection "%s" between "%s" and "%s"'), connectionName, options.vnetGateway1, options.vnetGateway2 || options.lnetGateway2));
    try {
      self.networkResourceProviderClient.virtualNetworkGatewayConnections.createOrUpdate(resourceGroupName, connectionName, parameters, _);
    } finally {
      progress.end();
    }
    self.showConnection(resourceGroupName, connectionName, options, _);
  },

  listConnections: function (resourceGroupName, options, _) {
    var self = this;
    var progress = self.interaction.progress($('Looking up gateway connections'));

    var connections = null;
    try {
      connections = self.networkResourceProviderClient.virtualNetworkGatewayConnections.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(connections.virtualNetworkGatewayConnections, function (data) {
      if (data.length === 0) {
        self.output.warn($('No gateway connections found'));
      } else {
        self.output.table(data, function (row, connection) {
          row.cell($('Name'), connection.name);
          row.cell($('Location'), connection.location);
          row.cell($('Type'), connection.connectionType);
          row.cell($('Routing weight'), connection.routingWeight);
          var vnetGatewayInfo = resourceUtils.getResourceInformation(connection.virtualNetworkGateway1.id);
          row.cell($('Virtual network gateway'), vnetGatewayInfo.resourceName);
          var connectedEntityInfo;
          if (connection.virtualNetworkGateway2) {
            connectedEntityInfo = resourceUtils.getResourceInformation(connection.virtualNetworkGateway2.id);
          } else {
            connectedEntityInfo = resourceUtils.getResourceInformation(connection.localNetworkGateway2.id);
          }
          row.cell($('Connected entity'), connectedEntityInfo.resourceName);
        });
      }
    });
  },

  showConnection: function (resourceGroupName, connectionName, options, _) {
    var self = this;
    var connection = self.getConnection(resourceGroupName, connectionName, _);

    self.interaction.formatOutput(connection, function (connection) {
      if (connection === null) {
        self.output.warn(util.format($('A gateway connection with name "%s" not found in the resource group "%s"'), connectionName, resourceGroupName));
      } else {
        var resourceInfo = resourceUtils.getResourceInformation(connection.id);
        self.output.nameValue($('Id'), connection.id);
        self.output.nameValue($('Name'), connection.name);
        self.output.nameValue($('Type'), resourceInfo.resourceType);
        self.output.nameValue($('Location'), connection.location);
        self.output.nameValue($('Provisioning state'), connection.provisioningState);
        self.output.nameValue($('Tags'), tagUtils.getTagsInfo(connection.tags));
        self.output.nameValue($('Connection type'), connection.connectionType);
        self.output.nameValue($('Routing weight'), connection.routingWeight);
        self.output.nameValue($('Shared key'), connection.sharedKey);
        self.output.nameValue($('Virtual network gateway 1'), connection.virtualNetworkGateway1.id);
        if (connection.virtualNetworkGateway2) {
          self.output.nameValue($('Virtual network gateway 2'), connection.virtualNetworkGateway2.id);
        }
        if (connection.localNetworkGateway2) {
          self.output.nameValue($('Local network gateway 2'), connection.localNetworkGateway2.id);
        }
      }
    });
  },

  deleteConnection: function (resourceGroupName, connectionName, options, _) {
    var self = this;
    var connection = self.getConnection(resourceGroupName, connectionName, _);

    if (!connection) {
      throw new Error(util.format($('A gateway connection with name "%s" not found in the resource group "%s"'), connectionName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete gateway connection "%s"? [y/n] '), connectionName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting gateway connection "%s"'), connectionName));
    try {
      self.networkResourceProviderClient.virtualNetworkGatewayConnections.deleteMethod(resourceGroupName, connectionName, _);
    } finally {
      progress.end();
    }
  },

  getConnection: function (resourceGroupName, connectionName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up gateway connection "%s"'), connectionName));

    try {
      var connection = self.networkResourceProviderClient.virtualNetworkGatewayConnections.get(resourceGroupName, connectionName, _);
      return connection.virtualNetworkGatewayConnection;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  /**
   * Private methods
   */
  _createOrUpdate: function (resourceGroupName, gatewayName, parameters, isCreating, _) {
    var self = this;
    var action = isCreating ? 'Creating' : 'Updating';
    var progress = self.interaction.progress(util.format($('%s virtual network gateway "%s"'), action, gatewayName));
    try {
      self.networkResourceProviderClient.virtualNetworkGateways.createOrUpdate(resourceGroupName, gatewayName, parameters, _);
    } finally {
      progress.end();
    }
  },

  _validateGateway: function (options) {
    var self = this;

    if (options.type) {
      utils.verifyParamExistsInCollection(constants.vpnGateway.type, options.type, '--type');
    }

    if (options.privateIpAddress) {
      var ipValidationResult = self.vnetUtil.parseIPv4(options.privateIpAddress);
      if (ipValidationResult.error) {
        throw new Error($('--private-ip-address parameter is in invalid format'));
      }
    }

    if (options.enableBgp) {
      utils.verifyParamExistsInCollection(['true', 'false'], options.enableBgp, '--enable-bgp');
    }
  },

  _parseGateway: function (resourceGroupName, gatewayName, options, _, gateway) {
    var self = this;

    var parameters = {
      gatewayType: 'Vpn',
      vpnType: constants.vpnGateway.type[0],
      enableBgp: 'false',
      location: '',
      tags: {},
      ipConfigurations: [
        {
          name: 'ip-config',
          privateIpAllocationMethod: 'Static',
          privateIpAddress: '',
          publicIpAddress: {
            id: ''
          },
          subnet: {
            id: ''
          }
        }
      ]
    };

    if (gateway) parameters = gateway;

    if (options.type) {
      parameters.vpnType = options.type;
    }

    if (options.enableBgp) {
      parameters.enableBgp = options.enableBgp;
    }

    if (options.privateIpAddress) {
      parameters.ipConfigurations[0].privateIpAddress = options.privateIpAddress;
    }

    if (options.location) {
      parameters.location = options.location;
    }

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(null, options);
      tagUtils.appendTags(parameters, tags);
    }

    if (options.tags === false) {
      gateway.tags = {};
    }

    if (options.publicIpId) {
      if (options.publicIpName) {
        self.output.warn($('--public-ip-name parameter will be ignored because --public-ip-id and --public-ip-name are mutually exclusive'));
      }
      parameters.ipConfigurations[0].publicIpAddress.id = options.publicIpId;
    } else {
      if (options.publicIpName) {
        var publicip = self.publicIpCrud.get(resourceGroupName, options.publicIpName, _);
        if (!publicip) {
          throw new Error(util.format($('A public ip with name "%s" not found in the resource group "%s"'), options.publicIpName, resourceGroupName));
        }
        parameters.ipConfigurations[0].publicIpAddress.id = publicip.id;
      }
    }

    if (options.subnetId) {
      if (options.vnetName || options.subnetName) {
        self.output.warn($('--vnet-name, --subnet-name parameters will be ignored because --subnet-id and --vnet-name, --subnet-name are mutually exclusive'));
      }
      parameters.ipConfigurations[0].subnet.id = options.subnetId;
    } else {
      if (options.vnetName && options.subnetName) {
        var subnet = self.subnetCrud.get(resourceGroupName, options.vnetName, options.subnetName, _);
        if (!subnet) {
          throw new Error(util.format($('A subnet with name "%s" not found in the resource group "%s"'), options.subnetName, resourceGroupName));
        }
        parameters.ipConfigurations[0].subnet.id = subnet.id;
      }
    }

    return parameters;
  },

  _parseConnection: function (resourceGroupName, connection, options, useDefaults, _) {
    var self = this;

    if (options.type) {
      connection.connectionType = utils.verifyParamExistsInCollection(constants.vpnGateway.connectionType, options.type, '--type');
    } else if (useDefaults) {
      var defType = constants.vpnGateway.connectionType[0];
      self.output.warn(util.format($('Using default connection type: %s'), defType));
      connection.connectionType = defType;
    }

    if (useDefaults && !options.vnetGateway2 && !options.lnetGateway2) {
      throw new Error($('You must specify connected entity with --vnet-gateway2 or --lnet-gateway2 option'));
    }

    if (options.routingWeight) {
      var weight = utils.parseInt(options.routingWeight);
      if (isNaN(weight)) {
        throw new Error($('--weight parameter must be an integer'));
      }
      connection.routingWeight = weight;
    } else if (useDefaults) {
      var defWeight = constants.vpnGateway.defWeight;
      self.output.warn(util.format($('Using default weight: %s'), defWeight));
      connection.routingWeight = defWeight;
    }

    if (options.sharedKey) {
      connection.sharedKey = options.sharedKey;
    }

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(null, options);
      tagUtils.appendTags(connection, tags);
    }

    if (options.vnetGateway1) {
      var gateway1 = self.get(resourceGroupName, options.vnetGateway1, _);
      if (!gateway1) throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), options.vnetGateway1, resourceGroupName));
      connection.virtualNetworkGateway1 = gateway1;
    }

    if (options.vnetGateway2) {
      var gateway2 = self.get(resourceGroupName, options.vnetGateway2, _);
      if (!gateway2) throw new Error(util.format($('A virtual network gateway with name "%s" not found in the resource group "%s"'), options.vnetGateway2, resourceGroupName));
      connection.virtualNetworkGateway2 = gateway2;
    }

    if (options.lnetGateway2) {
      var lnet2 = self.lnetGatewayCrud.get(resourceGroupName, options.lnetGateway2, _);
      if (!lnet2) throw new Error(util.format($('A local network gateway with name "%s" not found in the resource group "%s"'), options.lnetGateway2, resourceGroupName));
      connection.localNetworkGateway2 = lnet2;
    }

    return connection;
  }
});

module.exports = VirtualNetworkGateway;