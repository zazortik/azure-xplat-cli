var __ = require('underscore');
var profile = require('../../../util/profile');

// TODO: replace this once we have arm 'azure-sdk-for-node' publicly available.
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');

var VnetCRUD = require('./vnetCRUD');
var DnsServerCRUD = require('./dnsserverCRUD');
var SubnetCRUD = require('./subnetCRUD');
var LoadBalancerCRUD = require('./loadbalancerCRUD');
var PublicipCRUD = require('./publicipCRUD');
var NicCRUD = require('./nicCRUD');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(NetworkClient.prototype, {
  createVNet: function (resourceGroupName, vNetName, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.create(resourceGroupName, vNetName, location, options, _);
  },

  exportVNet: function (resourceGroupName, vNetName, filePath, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.export(resourceGroupName, vNetName, filePath, _);
  },

  importVNet: function (resourceGroupName, vNetName, filePath, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.import(resourceGroupName, vNetName, filePath, _);
  },

  deleteVNet: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.delete(resourceGroupName, vnetName, options, _);
  },

  listVNet: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.list(resourceGroupName, _);
  },

  showVNet: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vNetCRUD = new VnetCRUD(this.cli, networkResourceProviderClient);
    vNetCRUD.show(resourceGroupName, vnetName, _);
  },

  listDnsServers: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserverCRUD = new DnsServerCRUD(this.cli, networkResourceProviderClient);
    dnsserverCRUD.list(resourceGroupName, vnetName, _);
  },

  registerDnsServer: function (resourceGroupName, vnetName, dnsIp, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserverCRUD = new DnsServerCRUD(this.cli, networkResourceProviderClient);
    dnsserverCRUD.register(resourceGroupName, vnetName, dnsIp, _);
  },

  unregisterDnsServer: function (resourceGroupName, vnetName, dnsIp, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserverCRUD = new DnsServerCRUD(this.cli, networkResourceProviderClient);
    dnsserverCRUD.unregister(resourceGroupName, vnetName, dnsIp, _);
  },

  listSubnets: function (resourceGroupName, vNetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.vNetName = vNetName;

    var subnetCRUD = new SubnetCRUD(this.cli, networkResourceProviderClient);
    subnetCRUD.list(resourceGroupName, params, _);
  },

  showSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.vNetName = vNetName;
    params.subnetName = subnetName;

    var subnetCRUD = new SubnetCRUD(this.cli, networkResourceProviderClient);
    subnetCRUD.show(resourceGroupName, params, _);
  },

  deleteSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.vNetName = vNetName;
    params.subnetName = subnetName;
    params.quiet = options.quiet;

    var subnetCRUD = new SubnetCRUD(this.cli, networkResourceProviderClient);
    subnetCRUD.delete(resourceGroupName, params, _);
  },

  listLoadBalancers: function (resourceGroupName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.list(resourceGroupName, params, _);
  },

  showLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.show(resourceGroupName, params, _);
  },

  deleteLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.delete(resourceGroupName, params, _);
  },

  exportLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.filepath = options.filepath;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.export(resourceGroupName, params, _);
  },

  importLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.filepath = options.filepath;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.import(resourceGroupName, params, _);
  },

  createPublicIP: function (resourceGroupName, name, options, _) {
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

  showPublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.show(resourceGroupName, params, _);
  },

  deletePublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.delete(resourceGroupName, params, _);
  },

  listPublicIPs: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};

    var publicipCRUD = new PublicipCRUD(this.cli, networkResourceProviderClient);
    publicipCRUD.list(resourceGroupName, params, _);
  },

  listNICs: function (resourceGroupName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};

    var nicCRUD = new NicCRUD(this.cli, networkResourceProviderClient);
    nicCRUD.list(resourceGroupName, params, _);
  },

  showNIC: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;

    var nicCRUD = new NicCRUD(this.cli, networkResourceProviderClient);
    nicCRUD.show(resourceGroupName, params, _);
  },

  deleteNIC: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var nicCRUD = new NicCRUD(this.cli, networkResourceProviderClient);
    nicCRUD.delete(resourceGroupName, params, _);
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return subscription.createClient(this._createNetworkResourceProviderClient, this.azureServiceBaseUri);
  },

  _getNetworkProviderClient: function (subName) {
    var subscriptionName = subName;
    var subscription = profile.current.getSubscription(subscriptionName);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    return networkResourceProviderClient;
  },

  _createNetworkResourceProviderClient: function (credentails, baseUri) {
    return new NetWorkResourceProviderClient.NetworkResourceProviderClient(credentails, baseUri);
  }
});

module.exports = NetworkClient;