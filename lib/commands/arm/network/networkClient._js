var __ = require('underscore');

var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

// TODO: replace this once we have arm 'azure-sdk-for-node' publicly available.
var NetWorkResourceProviderClient = require('./../armsdk/networkResourceProviderClient');
var ComputeManagementClient = require('./../armsdk/computeManagementClient');
var DnsManagementClient = require('./../armsdk/dnsManagementClient');
var TrafficManagerManagementClient = require('./../armsdk/trafficManagerManagementClient');

var Vnet = require('./vnet');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadbalancer');
var Publicip = require('./publicip');
var Nic = require('./nic');
var Nsg = require('./nsg');
var DnsZone = require('./dnszone');
var Traffic = require('./traffic');

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

  deleteVNet: function (resourceGroupName, vnetName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var vnet = new Vnet(this.cli, networkResourceProviderClient);
    vnet.delete(resourceGroupName, vnetName, options, _);
  },

  createSubnet: function (resourceGroup, vnetName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.create(resourceGroup, vnetName, name, options, _);
  },

  setSubnet: function (resourceGroup, vnetName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.set(resourceGroup, vnetName, name, options, _);
  },

  listSubnets: function (resourceGroup, vnetName, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.list(resourceGroup, vnetName, options, _);
  },

  showSubnet: function (resourceGroup, vnetName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.show(resourceGroup, vnetName, name, options, _);
  },

  deleteSubnet: function (resourceGroup, vnetName, name, options, _) {
    var subscription = profile.current.getSubscription(this.subscription);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.delete(resourceGroup, vnetName, name, options, _);
  },

  createLoadBalancer: function (resourceGroupName, lbName, location, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.create(resourceGroupName, lbName, location, options, _);
  },

  listLoadBalancers: function (resourceGroupName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.list(resourceGroupName, _);
  },

  showLoadBalancer: function (resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.show(resourceGroupName, lbName, options, _);
  },

  deleteLoadBalancer: function (resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.delete(resourceGroupName, lbName, options, _);
  },

  createProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.createProbe(resourceGroupName, lbName, probeName, options, _);
  },

  listProbes: function (resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listProbes(resourceGroupName, lbName, options, _);
  },

  setProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.setProbe(resourceGroupName, lbName, probeName, options, _);
  },

  deleteProbe: function (resourceGroupName, lbName, probeName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteProbe(resourceGroupName, lbName, probeName, options, _);
  },

  addFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.addFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  updateFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.updateFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  listFrontEndIPConfigs: function(resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listFrontEndIPConfigs(resourceGroupName, lbName, options, _);
  },

  deleteFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteFrontEndIPConfig(resourceGroupName, lbName, ipConfigName, options, _);
  },

  addBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.addBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  addNicToBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.addNicToBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  removeNicFromBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.removeNicFromBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  listBackendAddressPools: function (resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listBackendAddressPools(resourceGroupName, lbName, options, _);
  },

  deleteBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteBackendAddressPool(resourceGroupName, lbName, poolName, options, _);
  },

  addLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.addLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  updateLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.updateLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  listLoadBalancerRules: function (resourceGroupName, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listLBRules(resourceGroupName, lbName, options, _);
  },

  deleteLoadBalancerRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteLBRule(resourceGroupName, lbName, ruleName, options, _);
  },

  createInboundRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.createInboundRule(resourceGroup, lbName, name, options, _);
  },

  updateInboundRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.updateInboundRule(resourceGroup, lbName, name, options, _);
  },

  listInboundRules: function (resourceGroup, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listInboundRules(resourceGroup, lbName, options, _);
  },

  deleteInboundRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteInboundRule(resourceGroup, lbName, name, options, _);
  },

  createPublicIP: function (resourceGroupName, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    options.location = location;

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.create(resourceGroupName, name, options, _);
  },

  setPublicIP: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var publicip = new Publicip(this.cli, networkResourceProviderClient);
    publicip.set(resourceGroupName, name, options, _);
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

  createNIC: function (resourceGroupName, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    options.location = location;

    var nic = new Nic(this.cli, networkResourceProviderClient);
    nic.create(resourceGroupName, name, options, _);
  },

  setNIC: function (resourceGroupName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nic = new Nic(this.cli, networkResourceProviderClient);
    nic.set(resourceGroupName, name, options, _);
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

  createNSG: function (resourceGroup, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.create(resourceGroup, name, location, options, _);
  },

  setNSG: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.set(resourceGroup, name, options, _);
  },

  listNSGs: function (resourceGroup, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.list(resourceGroup, options, _);
  },

  showNSG: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.show(resourceGroup, name, options, _);
  },

  deleteNSG: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.delete(resourceGroup, name, options, _);
  },

  createNsgRule: function (resourceGroup, nsgName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.createRule(resourceGroup, nsgName, name, options, _);
  },

  setNsgRule: function (resourceGroup, nsgName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.setRule(resourceGroup, nsgName, name, options, _);
  },

  listNsgRules: function (resourceGroup, nsgName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.listRules(resourceGroup, nsgName, options, _);
  },

  showNsgRule: function (resourceGroup, nsgName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.showRule(resourceGroup, nsgName, name, options, _);
  },

  deleteNsgRule: function (resourceGroup, nsgName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var nsg = new Nsg(this.cli, networkResourceProviderClient);
    nsg.deleteRule(resourceGroup, nsgName, name, options, _);
  },

  createDnsZone: function (resourceGroup, zoneName, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsZone = new DnsZone(this.cli, dnsManagementClient);
    dnsZone.create(resourceGroup, zoneName, options, _);
  },

  setDnsZone: function (resourceGroup, zoneName, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsZone = new DnsZone(this.cli, dnsManagementClient);
    dnsZone.set(resourceGroup, zoneName, options, _);
  },

  listDnsZones: function (resourceGroup, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsZone = new DnsZone(this.cli, dnsManagementClient);
    dnsZone.list(resourceGroup, options, _);
  },

  showDnsZone: function (resourceGroup, zoneName, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsZone = new DnsZone(this.cli, dnsManagementClient);
    dnsZone.show(resourceGroup, zoneName, options, _);
  },

  deleteDnsZone: function (resourceGroup, zoneName, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsZone = new DnsZone(this.cli, dnsManagementClient);
    dnsZone.delete(resourceGroup, zoneName, options, _);
  },

  createTrafficManager: function (resourceGroup, name, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);
    var traffic = new Traffic(this.cli, trafficManagerProviderClient);
    traffic.create(resourceGroup, name, options, _);
  },

  _getServiceClients: function (subscriptionName) {
    return {
      computeManagementClient: this._getComputeManagementClient(subscriptionName),
      networkResourceProviderClient: this._getNetworkProviderClient(subscriptionName),
      trafficManagerProviderClient: this._getTrafficManagementClient(subscriptionName)
    };
  },

  _getNetworkProviderClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    var networkResourceProviderClient = this._getSubscriptionNetworkClient(subscription);
    return networkResourceProviderClient;
  },

  _getDnsManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    var dnsManagementClient = this._getSubscriptionDnsClient(subscription);
    return dnsManagementClient;
  },

  _getTrafficManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    var trafficManagementClient = this._getSubscriptionTrafficClient(subscription);
    return trafficManagementClient;
  },

  _getSubscriptionDnsClient: function (subscription) {
    return utils.createClient(this._createDnsManagementClient,
      subscription._createCredentials(),
      subscription.resourceManagerEndpointUrl);
  },

  _getComputeManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    var computeManagementClient = this._getSubscriptionComputeClient(subscription);
    return computeManagementClient;
  },

  _getSubscriptionTrafficClient: function (subscription) {
    return utils.createClient(this._createTrafficManagementClient,
      subscription._createCredentials(),
      subscription.resourceManagerEndpointUrl);
  },

  _createDnsManagementClient: function (credentails, baseUri) {
    return new DnsManagementClient.DnsManagementClient(credentails, baseUri);
  },

  _getSubscriptionNetworkClient: function (subscription) {
    return utils.createClient(this._createNetworkResourceProviderClient,
      subscription._createCredentials(),
      subscription.resourceManagerEndpointUrl);
  },

  _getSubscriptionComputeClient: function (subscription) {
    return utils.createClient(this._createComputeManagementClient,
      subscription._createCredentials(),
      subscription.resourceManagerEndpointUrl);
  },

  _createComputeManagementClient: function (credentails, baseUri) {
    return new ComputeManagementClient.ComputeManagementClient(credentails, baseUri);
  },

  _createNetworkResourceProviderClient: function (credentails, baseUri) {
    return new NetWorkResourceProviderClient.NetworkResourceProviderClient(credentails, baseUri);
  },

  _createTrafficManagementClient: function (credentails, baseUri) {
    return new TrafficManagerManagementClient.TrafficManagerManagementClient(credentails, baseUri);
  }
});

module.exports = NetworkClient;