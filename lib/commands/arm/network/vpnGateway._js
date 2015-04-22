var __ = require('underscore');
// TODO: uncomment this
// var utils = require('../../../util/utils');
// var $ = utils.getLocaleString;

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

  createLocalNetworkGateway: function (resourceGroup, gatewayName, location, options, _) {
    //TODO: implement command
  },

  setLocalNetworkGateway: function (resourceGroup, gatewayName, location, options, _) {
    //TODO: implement command
  },

  listLocalNetworkGateways: function (resourceGroup, options, _) {
    //TODO: implement command
  },

  showLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    //TODO: implement command
  },

  deleteLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    //TODO: implement command
  },

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

  setSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    //TODO: implement command
  },

  resetSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    //TODO: implement command
  },

  showSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    //TODO: implement command
  },
  */
});

module.exports = VpnGateway;