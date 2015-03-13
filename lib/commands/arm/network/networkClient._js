var __ = require('underscore');

var profile = require('../../../util/profile');

var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');
var PublicipCRUD = require('./publicipCRUD');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(NetworkClient.prototype, {
  createPublicIP: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
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
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.show(resourceGroupName, params, _);
  },

  deletePublicIP: function(resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.delete(resourceGroupName, params, _);
  },

  listPublicIPs: function(resourceGroupName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.list(resourceGroupName, params, _);
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return subscription.createClient(this._createNetworkResourceProviderClient, this.azureServiceBaseUri);
  },

  _createNetworkResourceProviderClient: function(credentails, baseUri) {
    return new NetWorkResourceProviderClient.NetworkResourceProviderClient(credentails, baseUri);
  }
});

module.exports = NetworkClient;