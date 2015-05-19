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

var utils = require('../../../util/utils');
var profile = require('../../../util/profile');

var Vnet = require('./vnet');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadBalancer');
var Publicip = require('./publicip');
var Nic = require('./nic');
var Nsg = require('./nsg');
var DnsZone = require('./dnsZone');
var DnsRecordSet = require('./dnsRecordSet');
var TrafficManager = require('./trafficManager');
var VpnGateway = require('./vpnGateway');

var $ = utils.getLocaleString;

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
    var serviceClients = this._getServiceClients(this.subscription);
    options.location = location;

    var nic = new Nic(this.cli, serviceClients);
    nic.create(resourceGroupName, name, options, _);
  },

  setNIC: function (resourceGroupName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.set(resourceGroupName, name, options, _);
  },

  listNICs: function (resourceGroupName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.list(resourceGroupName, options, _);
  },

  showNIC: function (resourceGroupName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.show(resourceGroupName, name, options, _);
  },

  deleteNIC: function (resourceGroupName, name, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.delete(resourceGroupName, name, options, _);
  },

  addAddressPoolToNic: function (resourceGroupName, nicName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.addAddressPoolToNic(resourceGroupName, nicName, options, _);
  },

  removeAddressPoolFromNic: function (resourceGroupName, nicName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.removeAddressPoolFromNic(resourceGroupName, nicName, options, _);
  },

  addInboundRuleToNic: function (resourceGroupName, nicName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.addInboundRuleToNic(resourceGroupName, nicName, options, _);
  },

  removeInboundRuleFromNic: function (resourceGroupName, nicName, options, _) {
    var serviceClients = this._getServiceClients(this.subscription);

    var nic = new Nic(this.cli, serviceClients);
    nic.removeInboundRuleFromNic(resourceGroupName, nicName, options, _);
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

  createDnsRecordSet: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.create(resourceGroup, zoneName, name, options, _);
  },

  setDnsRecordSet: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.set(resourceGroup, zoneName, name, options, _);
  },

  listDnsRecordSets: function (resourceGroup, zoneName, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.list(resourceGroup, zoneName, options, _);
  },

  showDnsRecordSet: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.show(resourceGroup, zoneName, name, options, _);
  },

  deleteDnsRecordSet: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.delete(resourceGroup, zoneName, name, options, _);
  },

  addDnsRecord: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    this._promptRecordParameters(options.type, options, _);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.addRecord(resourceGroup, zoneName, name, options, _);
  },

  deleteDnsRecord: function (resourceGroup, zoneName, name, options, _) {
    var dnsManagementClient = this._getDnsManagementClient(this.subscription);

    this._promptRecordParameters(options.type, options, _);

    var dnsRecordSet = new DnsRecordSet(this.cli, dnsManagementClient);
    dnsRecordSet.deleteRecord(resourceGroup, zoneName, name, options, _);
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

  createVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.createVirtualNetworkGateway(resourceGroup, name, location, options, _);
  },

  setVirtualNetworkGateway: function (resourceGroup, name, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.setVirtualNetworkGateway(resourceGroup, name, location, options, _);
  },

  listVirtualNetworkGateways: function (resourceGroup, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.listVirtualNetworkGateways(resourceGroup, options, _);
  },

  showVirtualNetworkGateway: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.showVirtualNetworkGateway(resourceGroup, name, options, _);
  },

  deleteVirtualNetworkGateway: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.deleteVirtualNetworkGateway(resourceGroup, name, options, _);
  },

  addIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.addIpConfigToVirtualNetworkGateway(resourceGroup, vnetGatewayName, options, _);
  },

  removeIpConfigToVirtualNetworkGateway: function (resourceGroup, vnetGatewayName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.removeIpConfigToVirtualNetworkGateway(resourceGroup, vnetGatewayName, options, _);
  },

  createLocalNetworkGateway: function (resourceGroup, gatewayName, location, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.createLocalNetworkGateway(resourceGroup, gatewayName, location, options, _);
  },

  setLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.setLocalNetworkGateway(resourceGroup, gatewayName, options, _);
  },

  listLocalNetworkGateways: function (resourceGroup, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.listLocalNetworkGateways(resourceGroup, options, _);
  },

  showLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.showLocalNetworkGateway(resourceGroup, gatewayName, options, _);
  },

  deleteLocalNetworkGateway: function (resourceGroup, gatewayName, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.deleteLocalNetworkGateway(resourceGroup, gatewayName, options, _);
  },

  createVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.createVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  setVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.setVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  listVirtualNetworkGatewayConnections: function (resourceGroup, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.listVirtualNetworkGatewayConnections(resourceGroup, options, _);
  },

  showVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.showVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  deleteVirtualNetworkGatewayConnection: function (resourceGroup, name, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.deleteVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
  },

  setSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.setSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
  },

  resetSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.resetSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
  },

  showSharedKey: function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
    var networkResourceProviderClient = this._getNetworkProviderClient(this.subscription);
    var vpnGateway = new VpnGateway(this.cli, networkResourceProviderClient);
    vpnGateway.showSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
  },

  _promptRecordParameters: function (type, options, _) {
    if (type.toLowerCase() === 'a') {
      options.ipv4Address = this.cli.interaction.promptIfNotGiven($('IPv4 address for A record type: '), options.ipv4Address, _);
    }

    if (type.toLowerCase() === 'aaaa') {
      options.ipv6Address = this.cli.interaction.promptIfNotGiven($('IPv6 address for AAAA record type: '), options.ipv6Address, _);
    }

    if (type.toLowerCase() === 'cname') {
      options.cname = this.cli.interaction.promptIfNotGiven($('Canonical name for CNAME record type: '), options.cname, _);
    }

    if (type.toLowerCase() === 'mx') {
      options.preference = this.cli.interaction.promptIfNotGiven($('Preference for MX record type: '), options.preference, _);
      options.exchange = this.cli.interaction.promptIfNotGiven($('Exchange for MX record type: '), options.exchange, _);
    }

    if (type.toLowerCase() === 'ns') {
      options.nsdname = this.cli.interaction.promptIfNotGiven($('Domain name for NS record type: '), options.nsdname, _);
    }

    if (type.toLowerCase() === 'srv') {
      options.priority = this.cli.interaction.promptIfNotGiven($('Priority for SRV record type: '), options.priority, _);
      options.weight = this.cli.interaction.promptIfNotGiven($('Weight for SRV record type: '), options.weight, _);
      options.port = this.cli.interaction.promptIfNotGiven($('Port for SRV record type: '), options.port, _);
      options.target = this.cli.interaction.promptIfNotGiven($('Target for SRV record type: '), options.target, _);
    }

    if (type.toLowerCase() === 'soa') {
      options.email = this.cli.interaction.promptIfNotGiven($('Email for SOA record type: '), options.email, _);
      options.expireTime = this.cli.interaction.promptIfNotGiven($('Expire time for SOA record type: '), options.expireTime, _);
      options.serialNumber = this.cli.interaction.promptIfNotGiven($('Serial number for SOA record type: '), options.serialNumber, _);
      options.host = this.cli.interaction.promptIfNotGiven($('Host for SOA record type: '), options.host, _);
      options.minimumTtl = this.cli.interaction.promptIfNotGiven($('Minimum TTL for SOA record type: '), options.minimumTtl, _);
      options.refreshTime = this.cli.interaction.promptIfNotGiven($('Refresh time for SOA record type: '), options.refreshTime, _);
      options.retryTime = this.cli.interaction.promptIfNotGiven($('Retry time for SOA record type: '), options.retryTime, _);
    }

    if (type.toLowerCase() === 'txt') {
      options.text = this.cli.interaction.promptIfNotGiven($('Text for TXT record type: '), options.text, _);
    }

    if (type.toLowerCase() === 'soa') {
      options.email = this.cli.interaction.promptIfNotGiven($('Email for SOA record type: '), options.email, _);
      options.expireTime = this.cli.interaction.promptIfNotGiven($('Expire time for SOA record type: '), options.expireTime, _);
      options.serialNumber = this.cli.interaction.promptIfNotGiven($('Serial number for SOA record type: '), options.serialNumber, _);
      options.host = this.cli.interaction.promptIfNotGiven($('Host for SOA record type: '), options.host, _);
      options.minimumTtl = this.cli.interaction.promptIfNotGiven($('Minimum TTL for SOA record type: '), options.minimumTtl, _);
      options.refreshTime = this.cli.interaction.promptIfNotGiven($('Refresh time for SOA record type: '), options.refreshTime, _);
      options.retryTime = this.cli.interaction.promptIfNotGiven($('Retry time for SOA record type: '), options.retryTime, _);
    }

    if (type.toLowerCase() === 'ptr') {
      options.ptrdName = this.cli.interaction.promptIfNotGiven($('Ptr domain name for PTR record type: '), options.ptrdName, _);
    }
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