var __ = require('underscore');
var profile = require('../../../util/profile');

// TODO: replace this once we have arm 'azure-sdk-for-node' publicly available.
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');

var Vnet = require('./vnet');
var DnsServer = require('./dnsserver');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadbalancer');
var Publicip = require('./publicip');
var Nic = require('./nic');
var Nsg = require('./nsg');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
  // TODO: This baseUri will be removed once we have arm 'azure-sdk-for-node' publicly available.
  this.azureServiceBaseUri = 'https://management.azure.com/';
}

__.extend(NetworkClient.prototype, {
  createVNet: function (resourceGroup, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.create(resourceGroup, name, location, options, _);
  },

  setVNet: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.set(resourceGroup, name, options, _);
  },

  deleteVNet: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.delete(resourceGroupName, vnetName, options, _);
  },

  listVNet: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.list(resourceGroupName, _);
  },

  showVNet: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.show(resourceGroupName, vnetName, null, _);
  },

  listDnsServers: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserver = new DnsServer(this.cli, networkResourceProviderClient);
    dnsserver.list(resourceGroupName, vnetName, _);
  },

  registerDnsServer: function (resourceGroupName, vnetName, dnsIp, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserver = new DnsServer(this.cli, networkResourceProviderClient);
    dnsserver.register(resourceGroupName, vnetName, dnsIp, _);
  },

  unregisterDnsServer: function (resourceGroupName, vnetName, dnsIp, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var dnsserver = new DnsServer(this.cli, networkResourceProviderClient);
    dnsserver.unregister(resourceGroupName, vnetName, dnsIp, _);
  },

  createSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.create(resourceGroupName, vNetName, subnetName, options, _);
  },

  updateSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.update(resourceGroupName, vNetName, subnetName, options, _);
  },

  listSubnets: function (resourceGroupName, vNetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.list(resourceGroupName, options, _);
  },

  showSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.show(resourceGroupName, options, _);
  },

  deleteSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.delete(resourceGroupName, options, _);
  },

  listLoadBalancers: function (resourceGroupName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.list(resourceGroupName, params, _);
  },

  showLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.show(resourceGroupName, params, _);
  },

  deleteLoadBalancer: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;
    params.quiet = options.quiet;

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.delete(resourceGroupName, params, _);
  },

  createProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.createProbe(resourceGroupName, lbName, probeName, options, _);
  },

  listProbes: function (resourceGroupName, lbName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.listProbes(resourceGroupName, lbName, options, _);
  },

  deleteProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.deleteProbe(resourceGroupName, lbName, probeName, options, _);
  },

  updateProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.updateProbe(resourceGroupName, lbName, probeName, options, _);
  },

  addLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.addLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  updateLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.updateLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  deleteLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.deleteLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  createInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.createInboundRule(resourceGroupName, options, _);
  },

  updateInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.updateInboundRule(resourceGroupName, options, _);
  },

  deleteInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.deleteInboundRule(resourceGroupName, options, _);
  },

  addFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.addFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  updateFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.updateFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  deleteFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.deleteFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  addBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.addBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  updateBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.updateBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  deleteBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadBalancer = new LoadBalancer(this.cli, networkResourceProviderClient);
    loadBalancer.deleteBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  createPublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var params = {};
    params.name = name;
    params.domainName = options.domainName;
    params.location = options.location;
    params.idletimeout = options.idletimeout;
    params.allocationMethod = options.allocationMethod;

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.create(resourceGroupName, params, _);
  },

  listPublicIPs: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.list(resourceGroupName, options, _);
  },

  showPublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.show(resourceGroupName, name, options, _);
  },

  deletePublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.delete(resourceGroupName, name, options, _);
  },

  listNICs: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nic = new Nic(this.cli, networkResourceProviderClient);
    nic.list(resourceGroupName, options, _);
  },

  showNIC: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nic = new Nic(this.cli, networkResourceProviderClient);
    nic.show(resourceGroupName, name, options, _);
  },

  deleteNIC: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nic = new Nic(this.cli, networkResourceProviderClient);
    nic.delete(resourceGroupName, name, options, _);
  },

  listNSGs: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.list(resourceGroupName, options, _);
  },

  showNSG: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.show(resourceGroupName, nsgName, options, _);
  },

  deleteNSG: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.delete(resourceGroupName, nsgName, options, _);
  },

  listNsgRules: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.listRules(resourceGroupName, nsgName, options, _);
  },

  showNsgRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.showRule(resourceGroupName, nsgName, ruleName, options, _);
  },

  deleteNsgRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.deleteRule(resourceGroupName, nsgName, ruleName, options, _);
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