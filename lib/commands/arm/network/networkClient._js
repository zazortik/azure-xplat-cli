var __ = require('underscore');
var profile = require('../../../util/profile');

// TODO: replace this once we have arm 'azure-sdk-for-node' publicly available.
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');

var VnetCRUD = require('./vnetCRUD');
var VNetAddressSpace = require('./vnetAddressSpace');
var DnsServerCRUD = require('./dnsserverCRUD');
var SubnetCRUD = require('./subnetCRUD');
var PublicipCRUD = require('./publicipCRUD');
var LoadBalancerCRUD = require('./loadbalancerCRUD');
var NicCRUD = require('./nicCRUD');
var NsgCRUD = require('./nsgCRUD');

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

  addAddressPrefix: function (resourceGroupName, vNetName, ipAddress, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var addressSpace = new VNetAddressSpace(this.cli, networkResourceProviderClient);
    addressSpace.add(resourceGroupName, vNetName, ipAddress, options, _);
  },

  deleteAddressPrefix: function (resourceGroupName, vNetName, ipAddress, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var addressSpace = new VNetAddressSpace(this.cli, networkResourceProviderClient);
    addressSpace.delete(resourceGroupName, vNetName, ipAddress, options, _);
  },

  listAddressPrefix: function (resourceGroupName, vNetName, ipAddress, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var addressSpace = new VNetAddressSpace(this.cli, networkResourceProviderClient);
    addressSpace.list(resourceGroupName, vNetName, options, _);
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

  createSubnet: function (resourceGroupName, vNetName, subnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnetCRUD = new SubnetCRUD(this.cli, networkResourceProviderClient);
    subnetCRUD.create(resourceGroupName, vNetName, subnetName, options, _);
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

  createProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.createProbe(resourceGroupName, lbName, probeName, options, _);
  },

  listProbes: function (resourceGroupName, lbName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.listProbes(resourceGroupName, lbName, options, _);
  },

  deleteProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.deleteProbe(resourceGroupName, lbName, probeName, options, _);
  },

  updateProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.updateProbe(resourceGroupName, lbName, probeName, options, _);
  },

  createInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.lbName = lbName;
    params.inboundRuleName = inboundRuleName;
    params.protocol = options.protocol;
    params.frontendPort = options.frontendPort;
    params.backendPort = options.backendPort;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.createInboundRule(resourceGroupName, params, _);
  },

  updateInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.lbName = lbName;
    params.inboundRuleName = inboundRuleName;
    params.newInboundRuleName = options.newInboundruleName;
    params.protocol = options.protocol;
    params.frontendPort = options.frontendPort;
    params.backendPort = options.backendPort;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.updateInboundRule(resourceGroupName, params, _);
  },

  deleteInboundRule: function (resourceGroupName, lbName, inboundRuleName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var params = {};
    params.lbName = lbName;
    params.inboundRuleName = inboundRuleName;

    var loadbalancerCRUD = new LoadBalancerCRUD(this.cli, networkResourceProviderClient);
    loadbalancerCRUD.deleteInboundRule(resourceGroupName, params, _);
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

  showNIC: function (resourceGroupName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    var params = {};
    params.name = name;

    var nicCRUD = new NicCRUD(this.cli, networkResourceProviderClient);
    nicCRUD.show(resourceGroupName, params, _);
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

  showNIC: function (resourceGroupName, nicName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nicCRUD = new NicCRUD(this.cli, networkResourceProviderClient);
    nicCRUD.show(resourceGroupName, nicName, options, _);
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

  listNSGs: function (resourceGroupName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.list(resourceGroupName, options, _);
  },

  showNSG: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.show(resourceGroupName, nsgName, options, _);
  },

  deleteNSG: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.delete(resourceGroupName, nsgName, options, _);
  },

  listNsgRules: function (resourceGroupName, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.listRules(resourceGroupName, nsgName, options, _);
  },

  showNsgRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.showRule(resourceGroupName, nsgName, ruleName, options, _);
  },

  deleteNsgRule: function (resourceGroupName, nsgName, ruleName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsgCRUD = new NsgCRUD(this.cli, networkResourceProviderClient);
    nsgCRUD.deleteRule(resourceGroupName, nsgName, ruleName, options, _);
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