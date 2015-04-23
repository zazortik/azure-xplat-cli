var __ = require('underscore');

var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

var Vnet = require('./vnet');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadBalancer');
var Publicip = require('./publicip');
var Nic = require('./nic');
var Nsg = require('./nsg');
var DnsZone = require('./dnsZone');
var TrafficManager = require('./trafficManager');
var VpnGateway = require('./vpnGateway');

function NetworkClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
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
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.list(resourceGroup, vnetName, options, _);
  },

  showSubnet: function (resourceGroup, vnetName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

    var subnet = new Subnet(this.cli, networkResourceProviderClient);
    subnet.show(resourceGroup, vnetName, name, options, _);
  },

  deleteSubnet: function (resourceGroup, vnetName, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);

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

  listFrontEndIPConfigs: function (resourceGroupName, lbName, options, _) {
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

  createInboundNatRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.createInboundNatRule(resourceGroup, lbName, name, options, _);
  },

  updateInboundNatRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.updateInboundNatRule(resourceGroup, lbName, name, options, _);
  },

  listInboundNatRules: function (resourceGroup, lbName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.listInboundNatRules(resourceGroup, lbName, options, _);
  },

  deleteInboundNatRule: function (resourceGroup, lbName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);
    var loadBalancer = new LoadBalancer(this.cli, serviceClients);
    loadBalancer.deleteInboundNatRule(resourceGroup, lbName, name, options, _);
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

  createTrafficManager: function (resourceGroupName, name, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);

    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.create(resourceGroupName, name, options, _);
  },

  setTrafficManager: function (resourceGroupName, name, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);
    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.set(resourceGroupName, name, options, _);
  },

  listTrafficManagers: function (resourceGroupName, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);

    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.list(resourceGroupName, options, _);
  },

  showTrafficManager: function (resourceGroupName, name, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);

    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.show(resourceGroupName, name, options, _);
  },

  deleteTrafficManager: function (resourceGroupName, name, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);

    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.delete(resourceGroupName, name, options, _);
  },

  checkDNSNameAvailability: function (resourceGroupName, relativeDnsName, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);

    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.checkDnsAvailability(resourceGroupName, relativeDnsName, options, _);
  },

  createTrafficManagerEndpoint: function (resourceGroup, profileName, endpointName, endpointLocation, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);
    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    options.location = endpointLocation;
    trafficManager.createEndpoint(resourceGroup, profileName, endpointName, options, _);
  },

  setTrafficManagerEndpoint: function (resourceGroup, profileName, endpointName, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);
    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.setEndpoint(resourceGroup, profileName, endpointName, options, _);
  },

  deleteTrafficManagerEndpoint: function (resourceGroup, profileName, endpointName, options, _) {
    var trafficManagerProviderClient = this._getTrafficManagementClient(this.subscription);
    var trafficManager = new TrafficManager(this.cli, trafficManagerProviderClient);
    trafficManager.deleteEndpoint(resourceGroup, profileName, endpointName, options, _);
  },

  listVirtualNetworkGateways: function (resourceGroup, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.listVirtualNetworkGateways(resourceGroup, options, _);
  },

  _getServiceClients: function (subscriptionName) {
    return {
      computeManagementClient: this._getComputeManagementClient(subscriptionName),
      networkResourceProviderClient: this._getNetworkProviderClient(subscriptionName),
      trafficManagerProviderClient: this._getTrafficManagementClient(subscriptionName)
    };
  },

  _getComputeManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createComputeResourceProviderClient(subscription);
  },

  _getNetworkProviderClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createNetworkResourceProviderClient(subscription);
  },

  _getTrafficManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createTrafficManagerResourceProviderClient(subscription);
  },

  _getDnsManagementClient: function (subscriptionName) {
    var subscription = profile.current.getSubscription(subscriptionName);
    return utils.createDnsResourceProviderClient(subscription);
  }
});

module.exports = NetworkClient;