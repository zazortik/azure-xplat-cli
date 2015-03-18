var __ = require('underscore');

var profile = require('../../../util/profile');

var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');
var PublicipCRUD = require('./publicipCRUD');
var VnetCRUD = require('./vnetCRUD');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(NetworkClient.prototype, {
  createVNet: function(resourceGroupName, vNetName, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.create(resourceGroupName, vNetName, location, options, _);
  },

  exportVNet: function(resourceGroupName, vNetName, filePath, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.export(resourceGroupName, vNetName, filePath, _);
  },

  importVNet: function(resourceGroupName, vNetName, filePath, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.import(resourceGroupName, vNetName, filePath, _);
  },

  deleteVNet: function(resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.delete(resourceGroupName, vnetName, options, _);
  },

  listVNet: function(resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
      vNetCRUD.list(resourceGroupName, _);
  },

  showVNet: function(resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
      vNetCRUD.show(resourceGroupName, vnetName, _);
  },

  createPublicIP: function(resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;
    params.domainName = options.domainName;
    params.location = options.location;
    params.idletimeout = options.idletimeout;
    params.allocationMethod = options.allocationMethod;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.create(resourceGroupName, params, _);
  },

  showPublicIP: function(resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.show(resourceGroupName, params, _);
  },

  deletePublicIP: function(resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.delete(resourceGroupName, params, _);
  },

  listPublicIPs: function(resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.list(resourceGroupName, params, _);
  },

  _getNetworkProviderClient: function(subName){
    var subscriptionName = subName;
    var subscription = profile.current.getSubscription(subscriptionName);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    return networkResourceProviderClient;
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return subscription.createClient(this._createNetworkResourceProviderClient, this.azureServiceBaseUri);
  },

  _createNetworkResourceProviderClient: function(credentails, baseUri) {
    return new NetWorkResourceProviderClient.NetworkResourceProviderClient(credentails, baseUri);
  }
});

module.exports = NetworkClient;