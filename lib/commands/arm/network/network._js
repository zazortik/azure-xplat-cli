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

'use strict';

var util = require('util');
var utils = require('../../../util/utils');
var profile = require('../../../util/profile/index');
var constants = require('./constants');
var $ = utils.getLocaleString;

var VirtualNetwork = require('./virtualNetwork');
var Subnet = require('./subnet');
var LoadBalancer = require('./loadBalancer');
var PublicIp = require('./publicIp');
var Nic = require('./nic');
var Nsg = require('./nsg');
var DnsZone = require('./dnsZone');
var TrafficManager = require('./trafficManager');
var RouteTable = require('./routeTable');
var LocalNetworkGateway = require('./localNetworkGateway');
var VirtualNetworkGateway = require('./virtualNetworkGateway');
var AppGateway = require('./appGateway');
var ExpressRoute = require('./expressRoute');

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage network resources'));

  var vnet = network.category('vnet')
    .description($('Commands to manage virtual networks'));

  vnet.command('create [resource-group] [name] [location]')
    .description('Create a virtual network')
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-l, --location <location>', $('the location'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes for this virtual network.' +
    '\n     For example, -a "10.0.0.0/24,10.0.1.0/24"' +
    '\n     Default value is 10.0.0.0/8'))
    .option('-d, --dns-servers <dns-servers>', $('the comma separated list of DNS servers IP addresses'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var virtualNetwork = new VirtualNetwork(cli, networkManagementClient);
      virtualNetwork.create(resourceGroup, name, options, _);
    });

  vnet.command('set [resource-group] [name]')
    .description('Set virtual network')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes for this virtual network.' +
    '\n     For example, -a "10.0.0.0/24,10.0.1.0/24"' +
    '\n     This list will be appended to the current list of address prefixes.' +
    '\n     The address prefixes in this list should not overlap between them.' +
    '\n     The address prefixes in this list should not overlap with existing address prefixes in the vnet.'))
    .option('-d, --dns-servers [dns-servers]', $('the comma separated list of DNS servers IP addresses.' +
    '\n     This list will be appended to the current list of DNS server IP addresses.'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var virtualNetwork = new VirtualNetwork(cli, networkManagementClient);
      virtualNetwork.set(resourceGroup, name, options, _);
    });

  vnet.command('list [resource-group]')
    .description('Get all virtual networks')
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var virtualNetwork = new VirtualNetwork(cli, networkManagementClient);
      virtualNetwork.list(options, _);
    });

  vnet.command('show [resource-group] [name]')
    .description('Get a virtual network')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var virtualNetwork = new VirtualNetwork(cli, networkManagementClient);
      virtualNetwork.show(resourceGroup, name, options, _);
    });

  vnet.command('delete [resource-group] [name]')
    .description('Delete a virtual network')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var virtualNetwork = new VirtualNetwork(cli, networkManagementClient);
      virtualNetwork.delete(resourceGroup, name, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage virtual network subnets'));

  subnet.command('create [resource-group] [vnet-name] [name]')
    .description($('Create virtual network subnet'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix in CIDR format'))
    .option('-w, --network-security-group-id <network-security-group-id>', util.format($('the network security group identifier.' +
    '\n     e.g. %s'), constants.help.id.nsg))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name'))
    .option('-i, --route-table-id <route-table-id>', util.format($('the route table identifier.' +
    '\n     e.g. %s'), constants.help.id.routeTable))
    .option('-r, --route-table-name <route-table-name>', $('the route table name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);
      options.addressPrefix = cli.interaction.promptIfNotGiven($('Address prefix: '), options.addressPrefix, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var subnet = new Subnet(cli, networkManagementClient);
      subnet.create(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('set [resource-group] [vnet-name] [name]')
    .description($('Set a virtual network subnet'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix in CIDR format'))
    .option('-w, --network-security-group-id [network-security-group-id]', util.format($('the network security group identifier.' +
    '\n     e.g. %s'), constants.help.id.nsg))
    .option('-o, --network-security-group-name [network-security-group-name]', $('the network security group name'))
    .option('-i, --route-table-id [route-table-id]', util.format($('the route table identifier.' +
    '\n     e.g. %s'), constants.help.id.routeTable))
    .option('-r, --route-table-name [route-table-name]', $('the route table name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var subnet = new Subnet(cli, networkManagementClient);
      subnet.set(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('list [resource-group] [vnet-name]')
    .description($('Get all virtual network subnets'))
    .usage('[options] <resource-group> <vnet-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var subnet = new Subnet(cli, networkManagementClient);
      subnet.list(resourceGroup, vnetName, options, _);
    });

  subnet.command('show [resource-group] [vnet-name] [name]')
    .description($('Get a virtual network subnet'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var subnet = new Subnet(cli, networkManagementClient);
      subnet.show(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('delete [resource-group] [vnet-name] [name]')
    .description($('Delete a subnet of a virtual network'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the subnet name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var subnet = new Subnet(cli, networkManagementClient);
      subnet.delete(resourceGroup, vnetName, name, options, _);
    });

  var lb = network.category('lb')
    .description($('Commands to manage load balancers'));

  lb.command('create [resource-group] [name] [location]')
    .description($('Create a load balancer'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.create(resourceGroup, name, options, _);
    });

  lb.command('set [resource-group] [name]')
    .description($('Set a load balancer'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.set(resourceGroup, name, options, _);
    });

  lb.command('list [resource-group]')
    .description($('Get all load balancers'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.list(options, _);
    });

  lb.command('show [resource-group] [name]')
    .description($('Get a load balancer'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.show(resourceGroup, name, options, _);
    });

  lb.command('delete [resource-group] [name]')
    .description($('Delete a load balancer'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.delete(resourceGroup, name, options, _);
    });

  var lbFrontendIP = lb.category('frontend-ip')
    .description('Commands to manage frontend ip configurations of a load balancer');

  lbFrontendIP.command('create [resource-group] [lb-name] [name]')
    .description($('Add a frontend ip configuration to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-u, --public-ip-id <public-ip-id>', util.format($('the public ip address identifier.' +
    '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip address name.' +
    '\n     This public ip must exist in the same resource group as the load balancer.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-b, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
    '\n     e.g. %s'), constants.help.id.subnet))
    .option('-e, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the virtual network name in which subnet exists.' +
    '\n     This virtual network must exist in the same resource group as the load balancer.' +
    '\n     Please use subnet-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend IP configuration name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createFrontendIP(resourceGroup, lbName, name, options, _);
    });

  lbFrontendIP.command('set [resource-group] [lb-name] [name]')
    .description($('Set a frontend ip configuration of a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address [private-ip-address]', $('the private ip address'))
    .option('-u, --public-ip-id <public-ip-id>', util.format($('the public ip address identifier.' +
    '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip address name.' +
    '\n     This public ip must exist in the same resource group as the load balancer.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-b, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
    '\n     e.g. %s'), constants.help.id.subnet))
    .option('-e, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the virtual network name in which subnet exists.' +
    '\n     This virtual network must exist in the same resource group as the load balancer.' +
    '\n     Please use subnet-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend IP configuration name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.setFrontendIP(resourceGroup, lbName, name, options, _);
    });

  lbFrontendIP.command('list [resource-group] [lb-name]')
    .description($('Get all frontend ip configurations in the load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listFrontendIPs(resourceGroup, lbName, options, _);
    });

  lbFrontendIP.command('delete [resource-group] [lb-name] [name]')
    .description($('Delete a frontend ip configuration from a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend ip configuration name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteFrontendIP(resourceGroup, lbName, name, options, _);
    });

  var lbProbe = lb.category('probe')
    .description($('Commands to manage probes of a load balancer'));

  lbProbe.command('create [resource-group] [lb-name] [name]')
    .description($('Add a probe to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the probe'))
    .option('-p, --protocol <protocol>', $('the probe protocol'))
    .option('-o, --port <port>', $('the probe port'))
    .option('-f, --path <path>', $('the probe path'))
    .option('-i, --interval <interval>', $('the probe interval in seconds'))
    .option('-c, --count <count>', $('the number of probes'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createProbe(resourceGroup, lbName, name, options, _);
    });

  lbProbe.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set a probe of a load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the probe'))
    .option('-p, --protocol <protocol>', $('the probe protocol'))
    .option('-o, --port <port>', $('the probe port'))
    .option('-f, --path <path>', $('the probe path'))
    .option('-i, --interval <interval>', $('the probe interval in seconds'))
    .option('-c, --count <count>', $('the number of probes'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.setProbe(resourceGroup, lbName, name, options, _);
    });

  lbProbe.command('list [resource-group] [lb-name]')
    .description($('Get all probes in a load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listProbes(resourceGroup, lbName, options, _);
    });

  lbProbe.command('delete [resource-group] [lb-name] [name]')
    .description($('Delete a probe from a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the probe name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteProbe(resourceGroup, lbName, name, options, _);
    });

  var lbAddressPool = lb.category('address-pool')
    .description('Commands to manage backend address pools of a load balancer');

  lbAddressPool.command('create [resource-group] [lb-name] [name]')
    .description($('Add a backend address pool to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  lbAddressPool.command('list [resource-group] [lb-name]')
    .description($('Get all backend address pools in the load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listBackendAddressPools(resourceGroup, lbName, options, _);
    });

  lbAddressPool.command('delete [resource-group] [lb-name] [name]')
    .description($('Delete a backend address pool from a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  var lbRule = lb.category('rule')
    .description($('Commands to manage load balancer rules'));

  lbRule.command('create [resource-group] [lb-name] [name]')
    .description($('Add a load balancing rule to a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', util.format($('enable floating point ip [%s]'), constants.bool))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-a, --probe-name <probe-name>', $('the name of the probe defined in the same load balancer'))
    .option('-d, --load-distribution <load-distribution>', $('client session persistence'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration in the same load balancer'))
    .option('-o, --backend-address-pool-name <backend-address-pool-name>', $('the name of the backend address pool defined in the same load balancer'))
    .option('-a, --probe-name <probe-name>', $('the name of the probe defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createBalancingRule(resourceGroup, lbName, name, options, _);
    });

  lbRule.command('set [resource-group] [lb-name] [name]')
    .description($('Set a load balancing rule of a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', util.format($('enable floating point ip [%s]'), constants.bool))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-a, --probe-name [probe-name]', $('the name of the probe defined in the same load balancer'))
    .option('-d, --load-distribution <load-distribution>', $('client session persistence'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration in the same load balancer'))
    .option('-o, --backend-address-pool-name <backend-address-pool-name>', $('the name of the backend address pool defined in the same load balancer'))
    .option('-a, --probe-name [probe-name]', $('the name of the probe defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.setBalancingRule(resourceGroup, lbName, name, options, _);
    });

  lbRule.command('list [resource-group] [lb-name]')
    .description($('Get all load balancing rules of a load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listBalancingRules(resourceGroup, lbName, options, _);
    });

  lbRule.command('delete [resource-group] [lb-name] [name]')
    .description($('Delete a load balancing rule from a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteBalancingRule(resourceGroup, lbName, name, options, _);
    });

  var lbInboundNatRule = lb.category('inbound-nat-rule')
    .description($('Commands to manage load balancer inbound NAT rules'));

  lbInboundNatRule.command('create [resource-group] [lb-name] [name]')
    .description($('Add a load balancing inbound NAT rule to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', util.format($('enable floating point ip [%s]'), constants.bool))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  lbInboundNatRule.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set a load balancing inbound NAT rule of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', util.format($('enable floating point ip [%s]'), constants.bool))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.setInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  lbInboundNatRule.command('list [resource-group] [lb-name]')
    .usage('[options] <resource-group> <lb-name>')
    .description($('Get all load balancing inbound NAT rules of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listInboundNatRules(resourceGroup, lbName, options, _);
    });

  lbInboundNatRule.command('delete [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Delete a load balancing inbound NAT rule from a load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  var lbInboundNatPool = lb.category('inbound-nat-pool')
    .description($('Commands to manage load balancer inbound NAT pools'));

  lbInboundNatPool.command('create [resource-group] [lb-name] [name]')
    .description($('Add a load balancing inbound NAT pool to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT pool'))
    .option('-p, --protocol <protocol>', util.format($('the pool protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port-range-start  <frontend-port-range-start>', util.format($('the frontend port range start %s'), utils.toRange(constants.portBounds)))
    .option('-e, --frontend-port-range-end <frontend-port-range-end>', util.format($('the frontend port range end %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-i, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.createInboundNatPool(resourceGroup, lbName, name, options, _);
    });

  lbInboundNatPool.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set a load balancing inbound NAT pool of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT pool'))
    .option('-p, --protocol <protocol>', util.format($('the pool protocol [%s]'), constants.lb.protocols))
    .option('-f, --frontend-port-range-start  <frontend-port-range-start>', util.format($('the frontend port range start %s'), utils.toRange(constants.portBounds)))
    .option('-e, --frontend-port-range-end <frontend-port-range-end>', util.format($('the frontend port range end %s'), utils.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), utils.toRange(constants.portBounds)))
    .option('-i, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.setInboundNatPool(resourceGroup, lbName, name, options, _);
    });

  lbInboundNatPool.command('list [resource-group] [lb-name]')
    .usage('[options] <resource-group> <lb-name>')
    .description($('Get all load balancing inbound NAT pools of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.listInboundNatPools(resourceGroup, lbName, options, _);
    });

  lbInboundNatPool.command('delete [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Delete a load balancing inbound NAT pool from a load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT pool'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound NAT pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var loadBalancer = new LoadBalancer(cli, networkManagementClient);
      loadBalancer.deleteInboundNatPool(resourceGroup, lbName, name, options, _);
    });

  var publicip = network.category('public-ip')
    .description($('Commands to manage public ip addresses'));

  publicip.command('create [resource-group] [name] [location]')
    .description($('Create a public ip address'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-l, --location <location>', $('the location'))
    .option('-d, --domain-name-label <domain-name-label>', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', util.format($('the allocation method, valid values are' +
    '\n     [%s], default is %s'), constants.publicIp.allocation, constants.publicIp.allocation[0]))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-f, --reverse-fqdn <reverse-fqdn>', $('the reverse fqdn'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var publicip = new PublicIp(cli, networkManagementClient);
      publicip.create(resourceGroup, name, options, _);
    });

  publicip.command('set [resource-group] [name]')
    .description($('Set a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-d, --domain-name-label [domain-name-label]', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', util.format($('the allocation method, valid values are' +
    '\n     [%s], default is %s'), constants.publicIp.allocation, constants.publicIp.allocation[0]))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-f, --reverse-fqdn <reverse-fqdn>', $('the reverse fqdn'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var publicip = new PublicIp(cli, networkManagementClient);
      publicip.set(resourceGroup, name, options, _);
    });

  publicip.command('list [resource-group]')
    .description($('Get all public ip addresses'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var publicip = new PublicIp(cli, networkManagementClient);
      publicip.list(options, _);
    });

  publicip.command('show [resource-group] [name]')
    .description($('Get a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public IP'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var publicip = new PublicIp(cli, networkManagementClient);
      publicip.show(resourceGroup, name, options, _);
    });

  publicip.command('delete [resource-group] [name]')
    .description($('Delete a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public IP'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var publicip = new PublicIp(cli, networkManagementClient);
      publicip.delete(resourceGroup, name, options, _);
    });

  var nic = network.category('nic')
    .description($('Commands to manage network interfaces'));

  nic.command('create [resource-group] [name] [location]')
    .description($('Create a network interface'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-l, --location <location>', $('the location'))
    .option('-u, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
    '\n     e.g. %s'), constants.help.id.subnet))
    .option('-k, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-w, --network-security-group-id <network-security-group-id>', util.format($('the network security group identifier.' +
    '\n     e.g. %s'), constants.help.id.nsg))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name.' +
    '\n     This network security group must exist in the same resource group as the nic.' +
    '\n     Please use network-security-group-id if that is not the case.'))
    .option('-i, --public-ip-id <public-ip-id>', util.format($('the public IP identifier.' +
    '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-p, --public-ip-name <public-ip-name>', $('the public IP name.' +
    '\n     This public ip must exist in the same resource group as the nic.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-d, --lb-address-pool-ids <lb-address-pool-ids>', util.format($('the comma separated list of load balancer address pool identifiers' +
    '\n     e.g. %s'), constants.help.id.lbAddressPool))
    .option('-e, --lb-inbound-nat-rule-ids <lb-inbound-nat-rule-ids>', util.format($('the comma separated list of load balancer inbound NAT rule identifiers' +
    '\n     e.g. %s'), constants.help.id.lbInboundNatRule))
    .option('-a, --private-ip-address <private-ip-address>', $('the private IP address'))
    .option('-r, --internal-dns-name-label <internal-dns-name-label>', $('the internal DNS name label'))
    .option('-f, --enable-ip-forwarding <enable-ip-forwarding>', util.format($('enable ip forwarding [%s]'), constants.bool))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.create(resourceGroup, name, options, _);
    });

  nic.command('set [resource-group] [name]')
    .description($('Set a network interface'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-u, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
    '\n     e.g. %s'), constants.help.id.subnet))
    .option('-k, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-w, --network-security-group-id [network-security-group-id]', util.format($('the network security group identifier.' +
    '\n     e.g. %s'), constants.help.id.nsg))
    .option('-o, --network-security-group-name [network-security-group-name]', $('the network security group name.' +
    '\n     This network security group must exist in the same resource group as the nic.' +
    '\n     Please use network-security-group-id if that is not the case.'))
    .option('-i, --public-ip-id [public-ip-id]', util.format($('the public IP identifier.' +
    '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-p, --public-ip-name [public-ip-name]', $('the public IP name.' +
    '\n     This public ip must exist in the same resource group as the nic.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-d, --lb-address-pool-ids [lb-address-pool-ids]', util.format($('the comma separated list of load balancer address pool identifiers' +
    '\n     e.g. %s'), constants.help.id.lbAddressPool))
    .option('-e, --lb-inbound-nat-rule-ids [lb-inbound-nat-rule-ids]', util.format($('the comma separated list of load balancer inbound NAT rule identifiers' +
    '\n     e.g. %s'), constants.help.id.lbInboundNatRule))
    .option('-a, --private-ip-address <private-ip-address>', $('the private IP address'))
    .option('-r, --internal-dns-name-label [internal-dns-name-label]', $('the internal DNS name label'))
    .option('-f, --enable-ip-forwarding <enable-ip-forwarding>', util.format($('enable ip forwarding [%s]'), constants.bool))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.set(resourceGroup, name, options, _);
    });

  nic.command('list [resource-group]')
    .description($('Get all network interfaces'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-m, --virtual-machine-scale-set-name <virtual-machine-scale-set-name>', $('the name of the virtual machine scale set'))
    .option('-i, --virtual-machine-index <virtual-machine-index>', $('the index of the virtual machine in scale set'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.list(options, _);
    });

  nic.command('show [resource-group] [name]')
    .description($('Get a network interface'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-m, --virtual-machine-scale-set-name <virtual-machine-scale-set-name>', $('the name of the virtual machine scale set'))
    .option('-i, --virtual-machine-index <virtual-machine-index>', $('the index of virtual machine in scale set'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.show(resourceGroup, name, options, _);
    });

  nic.command('delete [resource-group] [name]')
    .description($('Delete a network interface'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.delete(resourceGroup, name, options, _);
    });

  var nicAddressPool = nic.category('address-pool')
    .description($('Commands to manage backend address pools of the network interface'));

  nicAddressPool.command('create [resource-group] [name]')
    .description($('Add a backend address pool to a NIC'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-address-pool-id <lb-address-pool-id>', util.format($('the load balancer backend address pool identifier' +
    '\n   e.g. %s'), constants.help.id.lbAddressPool))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.'))
    .option('-a, --lb-address-pool-name <lb-address-pool-name>', $('the name of the address pool that exists in the load balancer' +
    '\n   Please use --lb-address-pool-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.createBackendAddressPool(resourceGroup, name, options, _);
    });

  nicAddressPool.command('delete [resource-group] [name]')
    .description($('Delete a backend address pool from a NIC'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-address-pool-id <lb-address-pool-id>', util.format($('the load balancer backend address pool identifier' +
    '\n   e.g. %s'), constants.help.id.lbAddressPool))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.'))
    .option('-a, --lb-address-pool-name <lb-address-pool-name>', $('the name of the address pool that exists in the load balancer' +
    '\n   Please use --lb-address-pool-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.deleteBackendAddressPool(resourceGroup, name, options, _);
    });

  var nicInboundRule = nic.category('inbound-nat-rule')
    .description($('Commands to manage inbound NAT rules of the network interface'));

  nicInboundRule.command('create [resource-group] [name]')
    .description($('Add an inbound NAT rule to a NIC'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-inbound-nat-rule-id <lb-inbound-nat-rule-id>', util.format($('the inbound NAT rule identifier.' +
    '\n   e.g. %s'), constants.help.id.lbInboundNatRule))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.'))
    .option('-r, --lb-inbound-nat-rule-name <lb-inbound-nat-rule-name>', $('the name of the inbound NAT rule that exists in the load balancer.' +
    '\n   Please use --inbound-nat-rule-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.createInboundNatRule(resourceGroup, name, options, _);
    });

  nicInboundRule.command('delete [resource-group] [name]')
    .description($('Delete an inbound NAT rule from a NIC'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-inbound-nat-rule-id <lb-inbound-nat-rule-id>', util.format($('the inbound NAT rule identifier.' +
    '\n   e.g. %s'), constants.help.id.lbInboundNatRule))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.'))
    .option('-r, --lb-inbound-nat-rule-name <lb-inbound-nat-rule-name>', $('the name of the inbound NAT rule that exists in the load balancer.' +
    '\n   Please use --inbound-nat-rule-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nic = new Nic(cli, networkManagementClient);
      nic.deleteInboundNatRule(resourceGroup, name, options, _);
    });

  var nsg = network.category('nsg')
    .description($('Commands to manage network security groups'));

  nsg.command('create [resource-group] [name] [location]')
    .description($('Create a network security group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.create(resourceGroup, name, location, options, _);
    });

  nsg.command('set [resource-group] [name]')
    .description($('Set a network security group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.set(resourceGroup, name, options, _);
    });

  nsg.command('list [resource-group]')
    .description($('Get all network security groups'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.list(options, _);
    });

  nsg.command('show [resource-group] [name]')
    .description($('Get a network security group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.show(resourceGroup, name, options, _);
    });

  nsg.command('delete [resource-group] [name]')
    .description($('Delete a network security group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.delete(resourceGroup, name, options, _);
    });

  var nsgRule = nsg.category('rule')
    .description($('Commands to manage network security group rules'));

  nsgRule.command('create [resource-group] [nsg-name] [name]')
    .description($('Create a network security group rule'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-d, --description <description>', $('the description'))
    .option('-p, --protocol <protocol>', util.format($('the protocol [%s]'), constants.nsg.protocols))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', util.format($('the source port range [%s-%s]'), constants.nsg.portMin, constants.nsg.portMax))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', util.format($('the destination port range [%s-%s]'), constants.nsg.portMin, constants.nsg.portMax))
    .option('-c, --access <access>', util.format($('the access mode [%s]'), constants.nsg.access))
    .option('-y, --priority <priority>', util.format($('the priority [%s-%s]'), constants.nsg.priorityMin, constants.nsg.priorityMax))
    .option('-r, --direction <direction>', util.format($('the direction [%s]'), constants.nsg.direction))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the security rule: '), name, _);
      options.priority = cli.interaction.promptIfNotGiven($('Priority: '), options.priority, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.createRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRule.command('set [resource-group] [nsg-name] [name]')
    .description($('Set a network security group rule'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-d, --description <description>', $('the description'))
    .option('-p, --protocol <protocol>', util.format($('the protocol [%s]'), constants.nsg.protocols))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', util.format($('the source port range [%s-%s]'), constants.nsg.portMin, constants.nsg.portMax))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', util.format($('the destination port range [%s-%s]'), constants.nsg.portMin, constants.nsg.portMax))
    .option('-c, --access <access>', util.format($('the access mode [%s]'), constants.nsg.access))
    .option('-y, --priority <priority>', util.format($('the priority [%s-%s]'), constants.nsg.priorityMin, constants.nsg.priorityMax))
    .option('-r, --direction <direction>', util.format($('the direction [%s]'), constants.nsg.direction))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the security rule: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.setRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRule.command('list [resource-group] [nsg-name]')
    .description($('Get all rules in a network security group'))
    .usage('[options] <resource-group> <nsg-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.listRules(resourceGroup, nsgName, options, _);
    });

  nsgRule.command('show [resource-group] [nsg-name] [name]')
    .description($('Get a rule in a network security group'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.showRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRule.command('delete [resource-group] [nsg-name] [name]')
    .description($('Delete a rule in a network security group'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var nsg = new Nsg(cli, networkManagementClient);
      nsg.deleteRule(resourceGroup, nsgName, name, options, _);
    });

  var dns = network.category('dns')
    .description($('Commands to manage DNS'));

  var dnsZone = dns.category('zone')
    .description($('Commands to manage DNS zone'));

  dnsZone.command('create [resource-group] [name]')
    .description($('Create a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.create(resourceGroup, name, options, _);
    });

  dnsZone.command('set [resource-group] [name]')
    .description($('Set a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.set(resourceGroup, name, options, _);
    });

  dnsZone.command('list [resource-group]')
    .description($('Get all DNS zones'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.list(resourceGroup, options, _);
    });

  dnsZone.command('show [resource-group] [name]')
    .description($('Get a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone' +
    '\n   You can specify "*" (in quotes) for this parameter'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.show(resourceGroup, name, options, _);
    });

  dnsZone.command('delete [resource-group] [name]')
    .description($('Delete a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.delete(resourceGroup, name, options, _);
    });

  dnsZone.command('import [resource-group] [name] [file-name]')
    .description($('Import a DNS zone'))
    .usage('[options] <resource-group> <name> <file-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-f, --file-name <file-name>', $('the name of the zone file'))
    .option('--force', $('force overwrite of existing record sets. Otherwise, records are merged with existing record sets'))
    .option('--debug', $('output debug info'))
    .option('--parse-only', $('parse zone file only, without import'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, fileName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);
      options.fileName = cli.interaction.promptIfNotGiven($('Zone file name: '), fileName, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.import(resourceGroup, name, options, _);
    });

  dnsZone.command('export [resource-group] [name] [file-name]')
    .description($('Export a DNS zone as a zone file'))
    .usage('[options] <resource-group> <name> <file-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-f, --file-name <file-name>', $('the name of the zone file'))
    .option('-q, --quiet', $('quiet mode, do not ask for overwrite confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, fileName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);
      options.fileName = cli.interaction.promptIfNotGiven($('Zone file name: '), fileName, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.export(resourceGroup, name, options, _);
    });

  var dnsRecordSet = dns.category('record-set')
    .description($('Commands to manage record sets in DNS zone'));

  dnsRecordSet.command('create [resource-group] [dns-zone-name] [name] [type]')
    .description($('Create a DNS zone record set'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live specified in seconds'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.createRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('set [resource-group] [dns-zone-name] [name] [type]')
    .description($('Set a DNS zone record set'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live specified in seconds'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.setRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('list [resource-group] [dns-zone-name] [type]')
    .description($('Get all record sets in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> [type]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     If specified only record sets of this type will be listed.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      options.type = type || options.type;

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.listRecordSets(resourceGroup, dnsZoneName, options, _);
    });

  dnsRecordSet.command('show [resource-group] [dns-zone-name] [name] [type]')
    .description($('Get a record set in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.showRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('delete [resource-group] [dns-zone-name] [name] [type]')
    .description($('Delete a record set from a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     If specified only record sets of this type will be listed.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.deleteRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('add-record [resource-group] [dns-zone-name] [record-set-name] [type]')
    .description($('Add a record in a record set under a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <record-set-name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --record-set-name <record-set-name>', $('the name of the record set'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     If specified only record sets of this type will be listed.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]' +
    '\n\nThe record type A \n\n'))
    .option('-a  --ipv4-address <ipv4-address>', $('the IPv4 address attribute\n\n' +
    'Record type AAAA \n\n'))
    .option('-b  --ipv6-address <ipv6-address>', $('the IPv6 address attribute\n\n' +
    'Record type CNAME\n\n'))
    .option('-c  --cname <cname>', $('the canonical name (target)\n\n' +
    'Record type NS\n\n'))
    .option('-d  --nsdname <nsdname>', $('the domain name attribute\n\n' +
    'Record type MX\n\n'))
    .option('-f, --preference <preference>', $('preference attribute'))
    .option('-e, --exchange <exchange>', $('exchange attribute\n\n' +
    'Record type SRV\n\n'))
    .option('-p, --priority <priority>', $('the priority attribute'))
    .option('-w, --weight <weight>', $('the weight attribute'))
    .option('-o, --port <port>', $('the port'))
    .option('-u, --target <target>', $('the target attribute\n\n' +
    'Record type TXT\n\n'))
    .option('-x, --text <text>', $('the text attribute\n\n' +
    'Record type SOA\n\n'))
    .option('-l, --email <email>', $('the email attribute'))
    .option('-i, --expire-time <expire-time>', $('the expire time specified in seconds'))
    .option('-S, --serial-number <serial-number>', $('the serial number'))
    .option('-k, --host <host>', $('the host name attribute'))
    .option('-m, --minimum-ttl <minimum-ttl>', $('the minimum time to live specified in seconds'))
    .option('-r, --refresh-time <refresh-time>', $('the refresh time specified in seconds'))
    .option('-j, --retry-time <retry-time>', $('the retry time specified in seconds' +
    '\n\nRecord type PTR \n\n'))
    .option('-P, --ptrd-name <ptrd-name>', $('ptr domain name\n\n'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, recordSetName, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      recordSetName = cli.interaction.promptIfNotGiven($('Record set name: '), recordSetName, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.promptRecordParameters(options.type, options, _);
      dnsZone.addRecord(resourceGroup, dnsZoneName, recordSetName, options, _);
    });

  dnsRecordSet.command('delete-record [resource-group] [dns-zone-name] [record-set-name] [type]')
    .description($('Delete a record from a record set under a DNS zone'))
    .usage('[options] <resource-group> <dns-zone> <record-set-name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone-name <dns-zone-name>', $('the name of the DNS zone'))
    .option('-n, --record-set-name <record-set-name>', $('the name of the record set'))
    .option('-y, --type <type>', $('the type of the record set.' +
    '\n     If specified only record sets of this type will be listed.' +
    '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]' +
    '\n\nThe record type A \n\n'))
    .option('-a  --ipv4-address <ipv4-address>', $('the IPv4 address attribute\n\n' +
    'Record type AAAA \n\n'))
    .option('-b  --ipv6-address <ipv6-address>', $('the IPv6 address attribute\n\n' +
    'Record type CNAME\n\n'))
    .option('-c  --cname <cname>', $('the canonical name (target)\n\n' +
    'Record type NS\n\n'))
    .option('-d  --nsdname <nsdname>', $('the domain name attribute\n\n' +
    'Record type MX\n\n'))
    .option('-f, --preference <preference>', $('preference attribute'))
    .option('-e, --exchange <exchange>', $('exchange attribute\n\n' +
    'Record type SRV\n\n'))
    .option('-p, --priority <priority>', $('the priority attribute'))
    .option('-w, --weight <weight>', $('the weight attribute'))
    .option('-o, --port <port>', $('the port'))
    .option('-u, --target <target>', $('the target attribute\n\n' +
    'Record type TXT\n\n'))
    .option('-x, --text <text>', $('the text attribute' +
    '\n\nRecord type PTR \n\n'))
    .option('-P, --ptrd-name <ptrd-name>', $('ptr domain name\n\n'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, recordSetName, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      recordSetName = cli.interaction.promptIfNotGiven($('Record set name: '), recordSetName, _);
      options.type = cli.interaction.promptIfNotGiven($('Type: '), type, _);

      var dnsManagementClient = getDnsManagementClient(options);
      var dnsZone = new DnsZone(cli, dnsManagementClient);
      dnsZone.promptRecordParameters(options.type, options, _);
      dnsZone.deleteRecord(resourceGroup, dnsZoneName, recordSetName, options, _);
    });

  var trafficManager = network.category('traffic-manager')
    .description($('Commands to manage Traffic Manager'));

  var trafficManagerProfile = trafficManager.category('profile')
    .description($('Commands to manage Traffic Manager profile'));

  trafficManagerProfile.command('create [resource-group] [name]')
    .description($('Create a Traffic Manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', util.format($('the profile status, valid values are' +
    '\n     [%s], default is %s'), constants.trafficManager.status, constants.trafficManager.status[0]))
    .option('-m, --traffic-routing-method <traffic-routing-method>', util.format($('the traffic routing method for the profile,' +
    '\n     valid values are [%s], default is %s'), constants.trafficManager.routingMethod, constants.trafficManager.routingMethod[0]))
    .option('-r, --relative-dns-name <relative-dns-name>', $('relative DNS name of the profile e.g. .trafficmanager.net'))
    .option('-l, --ttl <ttl>', $('time to live in specified in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', util.format($('the monitor protocol, valid values are' +
    '\n     [%s], default is %s'), constants.trafficManager.protocols, constants.trafficManager.protocols[0]))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);
      options.relativeDnsName = cli.interaction.promptIfNotGiven($('Relative DNS name of the profile, e.g. .trafficmanager.net: '), options.relativeDnsName, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.createProfile(resourceGroup, name, options, _);
    });

  trafficManagerProfile.command('set [resource-group] [name]')
    .description($('Set a Traffic Manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', util.format($('the profile status, valid values are' +
    '\n     [%s], default is %s'), constants.trafficManager.status, constants.trafficManager.status[0]))
    .option('-m, --traffic-routing-method <traffic-routing-method>', util.format($('the traffic routing method for the profile,' +
    '\n     valid values are [%s], default is %s'), constants.trafficManager.routingMethod, constants.trafficManager.routingMethod[0]))
    .option('-l, --ttl <ttl>', $('time to live specified in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', util.format($('the monitor protocol, valid values are' +
    '\n     [%s], default is %s'), constants.trafficManager.protocols, constants.trafficManager.protocols[0]))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.setProfile(resourceGroup, name, options, _);
    });

  trafficManagerProfile.command('list [resource-group]')
    .description($('Get all Traffic Manager profiles'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.listProfiles(options, _);
    });

  trafficManagerProfile.command('show [resource-group] [name]')
    .description($('Get a Traffic Manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.showProfile(resourceGroup, name, options, _);
    });

  trafficManagerProfile.command('delete [resource-group] [name]')
    .description($('Delete a Traffic Manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.deleteProfile(resourceGroup, name, options, _);
    });

  trafficManagerProfile.command('is-dns-available [relative-dns-name]')
    .description($('Checks whether the specified DNS prefix is available for creating a Traffic Manager profile'))
    .usage('[options] <relative-dns-name>')
    .option('-r, --relative-dns-name <relative-dns-name>', $('the relative DNS name to check for availability'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (relativeDnsName, options, _) {
      relativeDnsName = cli.interaction.promptIfNotGiven($('Relative DNS name: '), relativeDnsName, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.checkDnsAvailability(relativeDnsName, options, _);
    });

  var trafficManagerEndpoint = trafficManager.category('endpoint')
    .description($('Commands to manage Traffic Manager endpoints'));

  trafficManagerEndpoint.command('create [resource-group] [profile-name] [name] [type]')
    .description($('Create an endpoint in Traffic Manager profile'))
    .usage('[options] <resource-group> <profile-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-y, --type <type>', util.format($('the endpoint type, valid values are:' +
    '\n       [%s], where ExternalEndpoints represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'), constants.trafficManager.endpointType))
    .option('-l, --location <location>', $('the endpoint location. This is only used if the Traffic Manager profile is configured to use the "Performance" traffic-routing method.' +
    '\n       This should only be specified on endpoints of type "ExternalEndpoints" and "NestedEndpoints".' +
    '\n       It is not applicable for endpoints of type "AzureEndpoints", since the location is taken from the resource specified in "--target-resource-id".'))
    .option('-u, --status <status>', util.format($('the endpoint status, valid values are:' +
    '\n       [%s] Default is %s'), constants.trafficManager.status, constants.trafficManager.status[0]))
    .option('-t, --target <target>', $('the domain name target of the endpoint,' +
    '\n       e.g. foobar.contoso.com. Only applicable to endpoints of type "ExternalEndpoints"'))
    .option('-i, --target-resource-id <target-resource-id>', $('the Azure Resource URI of the endpoint. Not applicable to endpoints of type "ExternalEndpoints"'))
    .option('-w, --weight <weight>', util.format($('the endpoint weight used in the traffic-routing method,' +
    '\n       valid range is [%s, %s] This is only used if the Traffic Manager profile is configured to use the "Weighted" traffic-routing method'), constants.trafficManager.weightMin, constants.trafficManager.weightMax))
    .option('-p, --priority <priority>', util.format($('the endpoint priority used in the traffic-routing method,' +
    '\n       valid range is [%s, %s] This is only used if the Traffic Manager profile is configured to use the "Priority" traffic-routing method.' +
    '\n       Lower values represent higher priority'), constants.trafficManager.priorityMin, constants.trafficManager.priorityMax))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Endpoint type: '), type, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.createEndpoint(resourceGroup, profileName, name, options, _);
    });

  trafficManagerEndpoint.command('set [resource-group] [profile-name] [name] [type]')
    .description($('Set an endpoint in a Traffic Manager profile'))
    .usage('[options] <resource-group> <profile-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-y, --type <type>', util.format($('the endpoint type, valid values are:' +
    '\n       [%s], where ExternalEndpoints represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'), constants.trafficManager.endpointType))
    .option('-l, --location <location>', $('the endpoint location. This is only used if the Traffic Manager profile is configured to use the "Performance" traffic-routing method.' +
    '\n       This should only be specified on endpoints of type "ExternalEndpoints" and "NestedEndpoints".' +
    '\n       It is not applicable for endpoints of type "AzureEndpoints", since the location is taken from the resource specified in "--target-resource-id".'))
    .option('-u, --status <status>', util.format($('the endpoint status, valid values are:' +
    '\n       [%s] Default is %s'), constants.trafficManager.status, constants.trafficManager.status[0]))
    .option('-t, --target <target>', $('the domain name target of the endpoint,' +
    '\n       e.g. foobar.contoso.com. Only applicable to endpoints of type "ExternalEndpoints"'))
    .option('-i, --target-resource-id <target-resource-id>', $('the Azure Resource URI of the endpoint. Not applicable to endpoints of type "ExternalEndpoints"'))
    .option('-w, --weight <weight>', util.format($('the endpoint weight used in the traffic-routing method,' +
    '\n       valid range is [%s, %s] This is only used if the Traffic Manager profile is configured to use the "Weighted" traffic-routing method'), constants.trafficManager.weightMin, constants.trafficManager.weightMax))
    .option('-p, --priority <priority>', util.format($('the endpoint priority used in the traffic-routing method,' +
    '\n       valid range is [%s, %s] This is only used if the Traffic Manager profile is configured to use the "Priority" traffic-routing method.' +
    '\n       Lower values represent higher priority'), constants.trafficManager.priorityMin, constants.trafficManager.priorityMax))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Endpoint type: '), type, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.setEndpoint(resourceGroup, profileName, name, options, _);
    });

  trafficManagerEndpoint.command('show [resource-group] [profile-name] [name] [type]')
    .description($('Get an endpoint in Traffic Manager profile'))
    .usage('[options] <resource-group> <profile-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-y, --type <type>', util.format($('the endpoint type, valid values are:' +
    '\n       [%s], where ExternalEndpoints represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'), constants.trafficManager.endpointType))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Endpoint type: '), type, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.showEndpoint(resourceGroup, profileName, name, options, _);
    });

  trafficManagerEndpoint.command('delete [resource-group] [profile-name] [name] [type]')
    .description($('Delete an endpoint from a Traffic Manager profile'))
    .usage('[options] <resource-group> <profile-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-y, --type <type>', util.format($('the endpoint type, valid values are:' +
    '\n       [%s], where ExternalEndpoints represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'), constants.trafficManager.endpointType))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);
      options.type = cli.interaction.promptIfNotGiven($('Endpoint type: '), type, _);

      var trafficManagerProviderClient = getTrafficManagementClient(options);
      var trafficManager = new TrafficManager(cli, trafficManagerProviderClient);
      trafficManager.deleteEndpoint(resourceGroup, profileName, name, options, _);
    });

  var routeTable = network.category('route-table')
    .description($('Commands to manage Route Table'));

  routeTable.command('create [resource-group] [name] [location]')
    .description($('Create a Route Table'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the Route Table'))
    .option('-l, --location <location>', $('the location, this must be same as the location of the virtual network containing the subnet on which this Route Table needs to be applied'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Route Table name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.create(resourceGroup, name, options, _);
    });

  routeTable.command('set [resource-group] [name]')
    .description($('Set a Route Table'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the Route Table'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Route Table name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.set(resourceGroup, name, options, _);
    });

  routeTable.command('list [resource-group]')
    .description($('Get all Route Tables'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.list(options, _);
    });

  routeTable.command('show [resource-group] [name]')
    .description($('Get a Route Table'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the Route Table'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Route Table name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.show(resourceGroup, name, options, _);
    });

  routeTable.command('delete [resource-group] [name]')
    .description($('Delete a Route Table'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the Route Table'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Route Table name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.delete(resourceGroup, name, options, _);
    });

  var routeTableRoute = routeTable.category('route')
    .description($('Commands to manage Route Table routes'));

  routeTableRoute.command('create [resource-group] [route-table-name] [name]')
    .description($('Create route in a Route Table'))
    .usage('[options] <resource-group> <route-table-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the Route Table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-a, --address-prefix <address-prefix>', $('the route address prefix e.g. 0.0.0.0/0'))
    .option('-y, --next-hop-type <next-hop-type>', util.format($('the route next hop type, valid values are:' +
    '\n       [%s]'), constants.route.nextHopType))
    .option('-p, --next-hop-ip-address <next-hop-ip-address>', $('the route next hop ip addresses, this parameter is valid' +
    '\n       only for next hop type VirtualAppliance'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, routeTableName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route Table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);
      options.addressPrefix = cli.interaction.promptIfNotGiven($('Address prefix: '), options.addressPrefix, _);
      options.nextHopType = cli.interaction.promptIfNotGiven($('Next hop type: '), options.nextHopType, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.createRoute(resourceGroup, routeTableName, name, options, _);
    });

  routeTableRoute.command('set [resource-group] [route-table-name] [name]')
    .description($('Set route in a Route Table'))
    .usage('[options] <resource-group> <route-table-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the Route Table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-a, --address-prefix <address-prefix>', $('the route address prefix e.g. 0.0.0.0/0'))
    .option('-y, --next-hop-type <next-hop-type>', util.format($('the route next hop type, valid values are:' +
    '\n       [%s]'), constants.route.nextHopType))
    .option('-p, --next-hop-ip-address <next-hop-ip-address>', $('the route next hop ip addresses, this parameter is valid' +
    '\n       only for next hop type VirualAppliance'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, routeTableName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route Table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.setRoute(resourceGroup, routeTableName, name, options, _);
    });

  routeTableRoute.command('list [resource-group] [route-table-name]')
    .description($('List all routes in a Route Table'))
    .usage('[options] <resource-group> <route-table-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the Route Table'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, routeTableName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route Table name: '), routeTableName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.listRoutes(resourceGroup, routeTableName, options, _);
    });

  routeTableRoute.command('show [resource-group] [route-table-name] [name]')
    .description($('Show details about route in a Route Table'))
    .usage('[options] <resource-group> <route-table-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the Route Table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, routeTableName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route Table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.showRoute(resourceGroup, routeTableName, name, options, _);
    });

  routeTableRoute.command('delete [resource-group] [route-table-name] [name]')
    .description($('Delete route from a Route Table'))
    .usage('[options] <resource-group> <route-table-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the Route Table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, routeTableName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route Table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var routeTable = new RouteTable(cli, networkManagementClient);
      routeTable.deleteRoute(resourceGroup, routeTableName, name, options, _);
    });

  var localGateway = network.category('local-gateway')
    .description($('Commands to manage Local Network Gateways'));

  localGateway.command('create [resource-group] [name] [location]')
    .description($('Create a local network gateway'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the local network gateway'))
    .option('-l, --location <location>', $('the location'))
    .option('-a, --address-space <address-space>', $('the comma separated list of address prefixes in CIDR format'))
    .option('-i, --ip-address <ip-address>', $('the IP address of the local network site'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Local network gateway name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);
      options.ipAddress = cli.interaction.promptIfNotGiven($('IP address: '), options.ipAddress, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var localNetwork = new LocalNetworkGateway(cli, networkManagementClient);
      localNetwork.create(resourceGroup, name, options, _);
    });

  localGateway.command('set [resource-group] [name]')
    .description($('Set a local network gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the local network gateway'))
    .option('-a, --address-space [address-space]', $('the comma separated list of address prefixes in CIDR format'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Local network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var localNetwork = new LocalNetworkGateway(cli, networkManagementClient);
      localNetwork.set(resourceGroup, name, options, _);
    });

  localGateway.command('list [resource-group]')
    .usage('[options] <resource-group>')
    .description($('Get all local networks gateways'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var localNetwork = new LocalNetworkGateway(cli, networkManagementClient);
      localNetwork.list(resourceGroup, options, _);
    });

  localGateway.command('show [resource-group] [name]')
    .usage('[options] <resource-group> <name>')
    .description($('Get a local network gateway'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the local network gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Local network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var localNetwork = new LocalNetworkGateway(cli, networkManagementClient);
      localNetwork.show(resourceGroup, name, options, _);
    });

  localGateway.command('delete [resource-group] [name]')
    .usage('[options] <resource-group> <name>')
    .description($('Delete a local network gateway'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the local network gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Local network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var localNetwork = new LocalNetworkGateway(cli, networkManagementClient);
      localNetwork.delete(resourceGroup, name, options, _);
    });

  var vpnGateway = network.category('vpn-gateway')
    .description($('Commands to manage Virtual Network Gateways'));

  vpnGateway.command('create [resource-group] [name] [location]')
    .description($('Create a virtual network gateway'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-l, --location <location>', $('the location'))
    .option('-w, --gateway-type <gateway-type>', util.format($('the gateway type' +
      '\n     Valid values are [%s]' +
      '\n     Default is Vpn'), constants.vpnGateway.gatewayType))
    .option('-y, --vpn-type <vpn-type>', util.format($('the vpn type' +
      '\n     Valid values are [%s]' +
      '\n     Default is RouteBased'), constants.vpnGateway.vpnType))
    .option('-k, --sku-name <sku-name>', util.format($('the SKU name' +
      '\n     Valid values are [%s]' +
      '\n     Default is Basic'), constants.vpnGateway.sku))
    .option('-u, --public-ip-id <public-ip-id>', util.format($('the public ip identifier.' +
    '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-p, --public-ip-name <public-ip-name>', $('the public ip name. This public ip must exists in the same resource group as the vnet gateway. ' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-f, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
    '\n     e.g. %s'), constants.help.id.subnet))
    .option('-m, --vnet-name <vnet-name>', $('the virtual network name. This virtual network must exists in the same resource group as the vnet gateway. ' +
    '\n     Please use subnet-id if that is not the case.'))
    .option('-e, --subnet-name <subnet-name>', util.format($('the subnet name which exists in vnet. Default value is "%s"'), constants.vpnGateway.subnetName))
    .option('-d, --default-site-name <default-site-name>', $('the Local Network Gateway name. This Local Network Gateway must exists in the same resource group as the vnet gateway. ' +
      '\n     Please use default-site-id if that is not the case.'))
    .option('-i, --default-site-id <default-site-id>', util.format($('Local Network Gateway identifier.' +
      '\n     e.g. %s'), constants.help.id.localGateway))
    .option('-f, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes.' +
      '\n     For example, -f "10.0.0.0/24,10.0.1.0/24"'))
    .option('-a, --private-ip-address <private-ip-address>', $('the local ip address for the gateway in the vnet. If not provided then using Dynamic ip address'))
    .option('-b, --enable-bgp <enable-bgp>', util.format($('enable bgp [%s]'), constants.bool))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.create(resourceGroup, name, options, _);
    });

  vpnGateway.command('set [resource-group] [name]')
    .description($('Set a virtual network gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-k, --sku-name <sku-name>', util.format($('the SKU name' +
      '\n     Valid values are [%s]'), constants.vpnGateway.sku))
    .option('-a, --private-ip-address <private-ip-address>', $('the local ip address for the gateway in the vnet'))
    .option('-d, --default-site-name [default-site-name]', $('the Local Network Gateway name. This Local Network Gateway must exists in the same resource group as the vnet gateway. ' +
      '\n     Please use default-site-id if that is not the case.'))
    .option('-i, --default-site-id [default-site-id]', util.format($('Local Network Gateway identifier.' +
      '\n     e.g. %s'), constants.help.id.localGateway))
    .option('-f, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes.' +
      '\n     For example, -f "10.0.0.0/24,10.0.1.0/24"'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.set(resourceGroup, name, options, _);
    });

  vpnGateway.command('list [resource-group]')
    .description($('List virtual network gateways'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.list(resourceGroup, options, _);
    });

  vpnGateway.command('show [resource-group] [name]')
    .description($('Get a virtual network gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.show(resourceGroup, name, options, _);
    });

  vpnGateway.command('delete [resource-group] [name]')
    .description($('Delete a virtual network gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.delete(resourceGroup, name, options, _);
    });

  var vpnGatewayRootCert = vpnGateway.category('root-cert')
    .description($('Commands to manage Virtual Network Gateways Root Certificates'));

  vpnGatewayRootCert.command('create [resource-group] [name] [cert-name]')
    .description($('Add a root certificate to a virtual network gateway'))
    .usage('[options] <resource-group> <name> <cert-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the root certificate'))
    .option('-f, --cert-file <cert-file>', $('the path to the root certificate'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, certName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Root certificate name: '), certName, _);
      options.certFile = cli.interaction.promptIfNotGiven($('Path to root certificate: '), options.certFile, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.createRootCert(resourceGroup, name, certName, options, _);
    });

  vpnGatewayRootCert.command('delete [resource-group] [name] [cert-name]')
    .description($('Delete a root certificate from a virtual network gateway'))
    .usage('[options] <resource-group> <name> <cert-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the root certificate'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, certName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Root certificate name: '), certName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.deleteRootCert(resourceGroup, name, certName, options, _);
    });

  var vpnGatewayRevokedCert = vpnGateway.category('revoked-cert')
    .description($('Commands to manage Virtual Network Gateways Revoked Certificates'));

  vpnGatewayRevokedCert.command('create [resource-group] [name] [cert-name]')
    .description($('Add a revoked certificate to a virtual network gateway'))
    .usage('[options] <resource-group> <name> <cert-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the revoked certificate'))
    .option('-f, --thumbprint <thumbprint>', $('the certificate thumbprint'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, certName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Revoked certificate name: '), certName, _);
      options.thumbprint = cli.interaction.promptIfNotGiven($('Thumbprint: '), options.thumbprint, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.createRevokedCert(resourceGroup, name, certName, options, _);
    });

  vpnGatewayRevokedCert.command('delete [resource-group] [name] [cert-name]')
    .description($('Delete a revoked certificate from a virtual network gateway'))
    .usage('[options] <resource-group> <name> <cert-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the revoked certificate'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, certName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Revoked certificate name: '), certName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vnetGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vnetGateway.deleteRevokedCert(resourceGroup, name, certName, options, _);
    });

  var gatewayConnection = network.category('vpn-connection')
    .description($('Commands to manage gateway connections'));

  gatewayConnection.command('create [resource-group] [name] [location]')
    .description($('Create a gateway connection'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-l, --location <location>', $('the location'))
    .option('-i, --vnet-gateway1 <vnet-gateway1>', $('the name of the virtual network gateway'))
    .option('-r, --vnet-gateway1-group <vnet-gateway1-group>', $('the resource group name of the virtual network gateway'))
    .option('-e, --vnet-gateway2 <vnet-gateway2>', $('the name of the connected virtual network gateway'))
    .option('-m, --vnet-gateway2-group <vnet-gateway2-group>', $('the resource group name of the connected virtual network gateway'))
    .option('-d, --lnet-gateway2 <lnet-gateway2>', $('the name of the connected local network gateway'))
    .option('-z, --lnet-gateway2-group <lnet-gateway2-group>', $('the resource group name of the connected local network gateway'))
    .option('-y, --type <type>', util.format($('the connection type' +
    '\n     Valid values are [%s]'), constants.vpnGateway.connectionType))
    .option('-w, --routing-weight <routing-weight>', $('the routing weight'))
    .option('-k, --shared-key <shared-key>', $('the IPsec shared key'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);
      options.vnetGateway1 = cli.interaction.promptIfNotGiven($('Virtual network gateway: '), options.vnetGateway1, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.createConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('set [resource-group] [name]')
    .description($('Set a gateway connection'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-w, --routing-weight <routing-weight>', $('the routing weight'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.setConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('list [resource-group]')
    .description($('Get all gateway connections'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.listConnections(resourceGroup, options, _);
    });

  gatewayConnection.command('show [resource-group] [name]')
    .description($('Get details about gateway connection'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.showConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('delete [resource-group] [name]')
    .usage('[options] <resource-group> <name>')
    .description($('Delete a gateway connection'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.deleteConnection(resourceGroup, name, options, _);
    });

  var connectionSharedKey = gatewayConnection.category('shared-key')
    .description($('Commands to manage gateway connection shared key'));

  connectionSharedKey.command('set [resource-group] [name] [value]')
    .description($('Set gateway connection shared key'))
    .usage('[options] <resource-group> <name> <value>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-k, --value <value>', $('the shared key value'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, value, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);
      options.value = cli.interaction.promptIfNotGiven($('Shared key value: '), value, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.setConnectionSharedKey(resourceGroup, name, options, _);
    });

  connectionSharedKey.command('reset [resource-group] [name] [key-length]')
    .description($('Reset gateway connection shared key'))
    .usage('[options] <resource-group> <name> <key-length>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-l, --key-length <key-length>', $('the shared key length'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, keyLength, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);
      options.keyLength = cli.interaction.promptIfNotGiven($('Shared key length: '), keyLength, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.resetConnectionSharedKey(resourceGroup, name, options, _);
    });

  connectionSharedKey.command('show [resource-group] [name]')
    .description($('Get details about gateway connection shared key'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the gateway connection'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Connection name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var vpnGateway = new VirtualNetworkGateway(cli, networkManagementClient);
      vpnGateway.showConnectionSharedKey(resourceGroup, name, options, _);
    });

  var appGateway = network.category('application-gateway')
    .description($('Commands to manage application gateways'));

  appGateway.command('create [resource-group] [name] [location]')
    .description($('Create an application gateway'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-l, --location <location>', $('the location'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network application gateway should be deployed in'))
    .option('-m, --subnet-name <subnet-name>', $('the name of subnet in the virtual network identified by --vnet-name'))
    .option('-d, --subnet-id <subnet-id>', util.format($('the subnet identifier.' +
      '\n     e.g. %s'), constants.help.id.subnet))
    .option('-y, --cert-file <cert-file>', $('the path to the certificate'))
    .option('-x, --cert-password <cert-password>', $('the certificate password'))
    .option('-r, --servers <servers>', $('comma separated list of IP addresses or DNS names corresponding to backend servers'))
    .option('-i, --http-settings-protocol <http-settings-protocol>',
      util.format($('the HTTP settings protocol, valid values are \[%s\]'), constants.appGateway.settings.protocol))
    .option('-o, --http-settings-port <http-settings-port>', util.format($('the HTTP settings port, valid range is'),
      utils.toRange(constants.appGateway.settings.port)))
    .option('-f, --http-settings-cookie-based-affinity <http-settings-cookie-based-affinity>',
      util.format($('Enable or disable HTTP settings cookie based affinity, valid values are' +
          '\n     [%s],' +
          '\n     default value is "%s"'),
        constants.appGateway.settings.affinity, constants.appGateway.settings.affinity[0]))
    .option('-j, --frontend-port <frontend-port>', util.format($('the frontend port value, valid range is'),
      utils.toRange(constants.appGateway.settings.port)))
    .option('-k, --public-ip-name <public-ip-name>', $('the name of the public ip'))
    .option('-p, --public-ip-id <public-ip-id>', util.format($('the public ip identifier.' +
      '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-b, --http-listener-protocol <http-listener-protocol>',
      util.format($('the HTTP listener protocol, valid values are \[%s\]'), constants.appGateway.httpListener.protocol))
    .option('-w, --routing-rule-type <routing-rule-type>',
      util.format($('the request routing rule type, default is "%s"'), constants.appGateway.routingRule.type[0]))
    .option('-a, --sku-name <sku-name>',
      util.format($('the name of the sku, valid values are \[%s\]. Default values is "%s"'),
        constants.appGateway.sku.name, constants.appGateway.sku.name[0]))
    .option('-u, --sku-tier <sku-tier>', util.format($('the sku tier, valid values are \[%s\]. Default values is "%s"'),
      constants.appGateway.sku.name.tier, constants.appGateway.sku.tier[0]))
    .option('-z, --capacity <capacity>',
      util.format($('application gateway instance count in range \[%s\]. Default value is %s.'),
        constants.appGateway.sku.capacity, constants.appGateway.sku.capacity[0]))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-t, --tags <tags>', $(constants.help.tags.crate))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);
      if ((options.httpListenerProtocol &&
        options.httpListenerProtocol.toLowerCase() === constants.appGateway.settings.protocol[1].toLowerCase()) || options.certFile) {
        options.certFile = cli.interaction.promptIfNotGiven($('SSL certificate full path: '), options.certFile, _);
        options.certPassword = cli.interaction.promptIfNotGiven($('SSL certificate password: '), options.certPassword, _);
      }
      if (!options.subnetId) {
        options.vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), options.vnetName, _);
        options.subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), options.subnetName, _);
      }
      options.servers = cli.interaction.promptIfNotGiven($('Comma separated backend server IPs: '), options.servers, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.create(resourceGroup, name, location, options, _);
    });

  appGateway.command('set [resource-group] [name]')
    .description($('Set an application gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-a, --sku-name <sku-name>', util.format($('the name of the sku, valid values are \[%s\]'),
      constants.appGateway.sku.name))
    .option('-u, --sku-tier <sku-tier>', util.format($('the sku tier, valid values are \[%s\]'),
      constants.appGateway.sku.tier))
    .option('-z, --capacity <capacity>', util.format($('application gateway instance count in range \[%s\]'),
      constants.appGateway.sku.capacity))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.set(resourceGroup, name, options, _);
    });

  appGateway.command('list')
    .description($('List resource group application gateways'))
    .usage('[options]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.list(options, _);
    });

  appGateway.command('show [resource-group] [name]')
    .description($('Show application gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.show(resourceGroup, name, options, _);
    });

  appGateway.command('delete [resource-group] [name]')
    .description($('Delete application gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.delete(resourceGroup, name, options, _);
    });

  appGateway.command('start [resource-group] [name]')
    .description($('Start application gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.start(resourceGroup, name, options, _);
    });

  appGateway.command('stop [resource-group] [name]')
    .description($('Stop application gateway'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.stop(resourceGroup, name, options, _);
    });

  var appGatewaySslCert = appGateway.category('ssl-cert')
    .description($('Commands to manage application gateway SSL certificates'));

  appGatewaySslCert.command('create [resource-group] [gateway-name] [name]')
    .description($('Add application gateway SSL certificate'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-c, --name <name>', $('the name of the certificate'))
    .option('-f, --cert-file <cert-file>', $('the full path to the certificate in pfx format'))
    .option('-p, --password <password>', $('the certificate password'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Certificate name: '), name, _);

      options.certFile = cli.interaction.promptIfNotGiven($('Certificate full file path: '), options.certFile, _);
      options.password = cli.interaction.promptIfNotGiven($('Certificate password: '), options.password, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addSsl(resourceGroup, gatewayName, name, options, _);
    });

  appGatewaySslCert.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete application gateway SSL certificate'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-c, --name <name>', $('the name of the certificate'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Certificate name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeSsl(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayFrontendIp = appGateway.category('frontend-ip')
    .description($('Commands to manage application gateway frontend ips'));

  appGatewayFrontendIp.command('create [resource-group] [gateway-name] [name]')
    .description($('Add a frontend ip configuration to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the frontend IP address name'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-u, --subnet-name <subnet-name>', $('the name of the subnet'))
    .option('-i, --subnet-id <subnet-id>', $('the id of the subnet'))
    .option('-a, --static-ip-address <static-ip-address>', $('the static IP address name'))
    .option('-p, --public-ip-name <public-ip-name>', $('the name of the public ip name'))
    .option('-r, --public-ip-id <public-ip-id>', util.format($('the public ip identifier.' +
      '\n     e.g. %s'), constants.help.id.publicIp))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend IP name: '), name, _);

      if (options.vnetName || options.subnetName) {
        options.vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), options.vnetName, _);
        options.subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), options.subnetName, _);
      } else {
        if (!options.subnetId && !options.publicIpId) {
          options.publicIpName = cli.interaction.promptIfNotGiven($('Public IP name: '), options.publicIpName, _);
        }
      }

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addFrontendIp(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayFrontendIp.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete a frontend ip configuration from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the frontend IP configuration'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend IP name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeFrontendIp(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayFrontendPort = appGateway.category('frontend-port')
    .description('Commands to manage application gateway frontend ports');

  appGatewayFrontendPort.command('create [resource-group] [gateway-name] [name]')
    .description($('Add a frontend port to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the frontend port'))
    .option('-p, --port <port>', util.format($('the port, valid range is \[%s\]'), constants.appGateway.settings.port))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend port name: '), name, _);
      options.port = cli.interaction.promptIfNotGiven($('Frontend port: '), options.port, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addFrontendPort(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayFrontendPort.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete a frontend port from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the frontend port'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend port name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeFrontendPort(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayAddressPool = appGateway.category('address-pool')
    .description($('Commands to manage application gateway backend address pools'));

  appGatewayAddressPool.command('create [resource-group] [gateway-name] [name]')
    .description($('Add a backend address pool to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-r, --servers <servers>', $('comma separated list of IP addresses or DNS names' +
      '\n     corresponding to backend servers'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);
      options.servers = cli.interaction.promptIfNotGiven($('List of IP addresses or DNS names: '), options.servers, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addBackendAddressPool(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayAddressPool.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete a backend address pool from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeBackendAddressPool(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayHttpSettings = appGateway.category('http-settings')
    .description($('Commands to manage application gateway http settings'));

  appGatewayHttpSettings.command('create [resource-group] [gateway-name] [name]')
    .description($('Add http settings to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-b, --name <name>', $('the name of the HTTP settings'))
    .option('-p, --protocol <protocol>', util.format($('the protocol, valid value is [%s]'),
      constants.appGateway.settings.protocol))
    .option('-o, --port <port>', util.format($('the port, valid range is [%s]'), constants.appGateway.settings.port))
    .option('-c, --cookie-based-affinity <cookie-based-affinity>',
      util.format($('enable or disable cookie based affinity, valid values are' +
          '\n     [%s],' +
          '\n     default value is [%s]'),
        constants.appGateway.settings.affinity, constants.appGateway.settings.affinity[0]))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Http settings name: '), name, _);
      options.port = cli.interaction.promptIfNotGiven($('Port: '), options.port, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addHttpSettings(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayHttpSettings.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete http settings to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-b, --name <name>', $('the name of the HTTP settings'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Http settings name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeHttpSettings(resourceGroup, gatewayName, name, options, _);
    });


  var appGatewayHttpListener = appGateway.category('http-listener')
    .description('Commands to manage application gateway http listeners');

  appGatewayHttpListener.command('create [resource-group] [gateway-name] [name]')
    .description($('Add an http listener to an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the HTTP listener'))
    .option('-i, --frontend-ip-name <frontend-ip-name>', $('the name of an existing frontend ip configuration'))
    .option('-p, --frontend-port-name <frontend-port-name>', $('the name of an existing frontend port'))
    .option('-r, --protocol <protocol>', util.format($('the protocol, supported values are \[%s\]'),
      constants.appGateway.httpListener.protocol))
    .option('-c, --ssl-cert <ssl-cert>', util.format($('the name of an existing SSL certificate.' +
      '\n   This parameter is required when --protocol is Https')))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, frontendPortName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('The HTTP listener name: '), name, _);
      options.frontendIpName = cli.interaction.promptIfNotGiven($('Fronetend IP Configuration name: '),
        options.frontendIpName, _);
      options.frontendPortName = cli.interaction.promptIfNotGiven($('Fronetend port name: '),
        options.frontendPortName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addHttpListener(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayHttpListener.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete an http listener from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the HTTP listener'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend port name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeHttpListener(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayRoutingRule = appGateway.category('rule')
    .description('Commands to manage application gateway request routing rule');

  appGatewayRoutingRule.command('create [resource-group] [gateway-name] [name]')
    .description($('Add request routing rule to application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the request routing rule'))
    .option('-i, --http-settings-name <http-settings-name>', $('the name of an existing backend HTTP settings'))
    .option('-l, --http-listener-name <http-listener-name>', $('the name of an existing HTTP listener'))
    .option('-p, --address-pool-name <address-pool-name>', $('the name of an existing backend address pool'))
    .option('-t, --type <type>', $('the type, currently supported only default value "%s"'), constants.appGateway.routingRule.type[0])
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Request routing rule name: '), name, _);
      options.httpSettingsName = cli.interaction.promptIfNotGiven($('HTTP settings name: '), options.httpSettingsName, _);
      options.httpListenerName = cli.interaction.promptIfNotGiven($('HTTP listener name: '), options.httpListenerName, _);
      options.addressPoolName = cli.interaction.promptIfNotGiven($('The address pool name: '), options.addressPoolName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addRequestRoutingRule(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayRoutingRule.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete a request routing rule from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the request routing rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Request routing rule name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeRequestRoutingRule(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayProbe = appGateway.category('probe')
    .description('Commands to manage application gateway probes');

  appGatewayProbe.command('create [resource-group] [gateway-name] [name]')
    .description($('Add probe to application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the probe'))
    .option('-o, --port <port>', util.format($('the port, valid range is [%s]'), constants.appGateway.settings.port))
    .option('-p, --protocol <protocol>', util.format($('the protocol, only valid value is "%s"'),
      constants.appGateway.settings.protocol))
    .option('-d, --host-name <host-name>', util.format($('the name of host to send probe.' +
      '\n   Default value is "%s"'), constants.appGateway.probe.host))
    .option('-f, --path <path>', util.format($('the relative path of probe. Valid path starts from "/".' +
      '\n   Probe is sent to :\/\/:. Default value is "%s"'), constants.appGateway.probe.path))
    .option('-i, --interval <interval>', util.format($('the probe interval in seconds.' +
      '\n   This is the time interval between two consecutive probes.' +
      '\n   Default value is %s'), constants.appGateway.probe.interval))
    .option('-u, --timeout <timeout>', util.format($('the probe timeout in seconds.' +
      '\n   Probe marked as failed if valid response is not received with this timeout period.' +
      '\n   Default value is %s'), constants.appGateway.probe.timeout))
    .option('-e, --unhealthy-threshold <unhealthy-threshold>', util.format($('probe retry count.' +
      '\n   Back end server is marked down after consecutive probe failure count reaches an unhealthy threshold' +
      '\n   Default value is %s'), constants.appGateway.probe.unhealthyThreshold))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addProbe(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayProbe.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete a probe from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the probe'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeProbe(resourceGroup, gatewayName, name, options, _);
    });

  var appGatewayUrlPathMap = appGateway.category('url-path-map')
    .description('Commands to manage application gateway url path maps');

  appGatewayUrlPathMap.command('create [resource-group] [gateway-name] [name]')
    .description($('Add url path map to application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the url path map'))
    .option('-r, --rule-name <rule-name>', $('the name of the url path map rule'))
    .option('-p, --path <path>', $('path, which specifies application gateway path rule'))
    .option('-i, --http-settings-name <http-settings-name>', $('the name of an existing backend HTTP settings'))
    .option('-a, --address-pool-name <address-pool-name>', $('the name of an existing backend address pool'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, ruleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Url path map name: '), name, _);
      options.ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), options.ruleName, _);
      options.path = cli.interaction.promptIfNotGiven($('Path: '), options.path, _);
      options.httpSettingsName = cli.interaction.promptIfNotGiven($('HTTP settings name: '), options.httpSettingsName, _);
      options.addressPoolName = cli.interaction.promptIfNotGiven($('The address pool name: '), options.addressPoolName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addUrlPathMap(resourceGroup, gatewayName, name, options, _);
    });

  appGatewayUrlPathMap.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete an url path map from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the url path map'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Url path map name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeUrlPathMap(resourceGroup, gatewayName, name, options, _);
    });

  var mapRule = appGatewayUrlPathMap.category('rule')
    .description('Commands to manage application gateway url path map rules');

  mapRule.command('create [resource-group] [gateway-name] [name]')
    .description($('Add url path map to application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-u, --url-path-map-name <url-path-map-name>', $('the name of the url path map'))
    .option('-n, --name <name>', $('the name of the url path map rule'))
    .option('-p, --path <path>', $('path, which specifies application gateway path rule'))
    .option('-i, --http-settings-name <http-settings-name>', $('the name of an existing backend HTTP settings'))
    .option('-a, --address-pool-name <address-pool-name>', $('the name of an existing backend address pool'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, ruleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      options.urlPathMapName = cli.interaction.promptIfNotGiven($('Url path map name: '), options.urlPathMapName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);
      options.path = cli.interaction.promptIfNotGiven($('Path: '), options.path, _);
      options.httpSettingsName = cli.interaction.promptIfNotGiven($('HTTP settings name: '), options.httpSettingsName, _);
      options.addressPoolName = cli.interaction.promptIfNotGiven($('The address pool name: '), options.addressPoolName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.addMapRule(resourceGroup, gatewayName, name, options, _);
    });

  mapRule.command('delete [resource-group] [gateway-name] [name]')
    .description($('Delete an url path map from an application gateway'))
    .usage('[options] <resource-group> <gateway-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-u, --url-path-map-name <url-path-map-name>', $('the name of the url path map'))
    .option('-n, --name <name>', $('the name of the map'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Url path map name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var appGateway = new AppGateway(cli, networkManagementClient);
      appGateway.removeMapRule(resourceGroup, gatewayName, name, options, _);
    });

  var expressRoute = network.category('express-route')
    .description($('Commands to manage express routes'));

  var expressRouteProvider = expressRoute.category('provider')
    .description($('Commands to manage express route service providers'));

  expressRouteProvider.command('list')
    .description($('List express route service providers'))
    .usage('[options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.listProviders(options, _);
    });

  var expressRouteCircuit = expressRoute.category('circuit')
    .description($('Commands to manage express routes circuits'));

  expressRouteCircuit.command('create [resource-group] [name] [location]')
    .description($('Create express route circuit'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the express route circuit'))
    .option('-l, --location <location>', $('the location'))
    .option('-p, --service-provider-name <service-provider-name>', $('the service provider name'))
    .option('-i, --peering-location <peering-location>', $('the service provider peering location'))
    .option('-b, --bandwidth-in-mbps <bandwidth-in-mbps>', $('the bandwidth in Mbps'))
    .option('-e, --sku-tier <sku-tier>', $('the sku tier'))
    .option('-f, --sku-family <sku-family>', $('the sku family'))
    .option('-t, --tags <tags>', $(constants.help.tags.create))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Express route name: '), name, _);
      options.location = cli.interaction.promptIfNotGiven($('Location: '), location, _);
      options.serviceProviderName = cli.interaction.promptIfNotGiven($('Service provider name: '), options.serviceProviderName, _);
      options.peeringLocation = cli.interaction.promptIfNotGiven($('Peering location: '), options.peeringLocation, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.createCircuit(resourceGroup, name, options, _);
    });

  expressRouteCircuit.command('set [resource-group] [name]')
    .description($('Set an express route circuit'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the express route circuit'))
    .option('-b, --bandwidth-in-mbps <bandwidth-in-mbps>', $('the bandwidth in Mbps'))
    .option('-e, --sku-tier <sku-tier>', $('the sku tier'))
    .option('-f, --sku-family <sku-family>', $('the sku family'))
    .option('-t, --tags [tags]', $(constants.help.tags.set))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Express route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.setCircuit(resourceGroup, name, options, _);
    });

  expressRouteCircuit.command('list [resource-group]')
    .description($('Get all express route circuits'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      options.resourceGroup = resourceGroup;
      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.listCircuits(options, _);
    });

  expressRouteCircuit.command('show [resource-group] [name]')
    .description($('Create express route circuit'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the express route circuit'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Express route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.showCircuit(resourceGroup, name, options, _);
    });

  expressRouteCircuit.command('delete [resource-group] [name]')
    .description($('Delete an express route circuit'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the express route circuit'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Express route name: '), name, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.deleteCircuit(resourceGroup, name, options, _);
    });

  var expressRouteAuthorization =  expressRoute.category('authorization')
    .description($('Commands to manage express routes authorization'));

  expressRouteAuthorization.command('create [resource-group] [circuit-name] [auth-name]')
    .description($('Create express route circuit authorization'))
    .usage('[options] <resource-group> <circuit-name> <auth-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-c, --circuit-name <circuit-name>', $('the name of the express route circuit'))
    .option('-n, --auth-name <auth-name>', $('the name of the express route circuit authorization'))
    .option('-k, --key <key>', $('the express route circuit authorization key'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, circuitName, authName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      circuitName = cli.interaction.promptIfNotGiven($('Express route circuit name: '), circuitName, _);
      authName = cli.interaction.promptIfNotGiven($('Express route express route authorization name: '), authName, _);
      options.key = cli.interaction.promptIfNotGiven($('Express route authorization key: '), options.key, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.createAuthorization(resourceGroup, circuitName, authName, options, _);
    });

  expressRouteAuthorization.command('set [resource-group] [circuit-name] [auth-name]')
    .description($('Set express route circuit authorization'))
    .usage('[options] <resource-group> <circuit-name> <auth-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-c, --circuit-name <circuit-name>', $('the name of the express route circuit'))
    .option('-n, --auth-name <auth-name>', $('the name of the express route circuit authorization'))
    .option('-k, --key <key>', $('the express route circuit authorization key'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, circuitName, authName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      circuitName = cli.interaction.promptIfNotGiven($('Express route circuit name: '), circuitName, _);
      authName = cli.interaction.promptIfNotGiven($('Express route authorization name: '), authName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.setAuthorization(resourceGroup, circuitName, authName, options, _);
    });

  expressRouteAuthorization.command('show [resource-group] [circuit-name] [auth-name]')
    .description($('Show express route circuit authorization'))
    .usage('[options] <resource-group> <circuit-name> <auth-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-c, --circuit-name <circuit-name>', $('the name of the express route circuit'))
    .option('-n, --auth-name <auth-name>', $('the name of the express route circuit express route authorization'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, circuitName, authName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      circuitName = cli.interaction.promptIfNotGiven($('Express route circuit name: '), circuitName, _);
      authName = cli.interaction.promptIfNotGiven($('Express route authorization name: '), authName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.showAuthorization(resourceGroup, circuitName, authName, options, _);
    });

  expressRouteAuthorization.command('delete [resource-group] [circuit-name] [auth-name]')
    .description($('Delete express route circuit authorization'))
    .usage('[options] <resource-group> <circuit-name> <auth-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-c, --circuit-name <circuit-name>', $('the name of the express route circuit'))
    .option('-n, --auth-name <auth-name>', $('the name of the express route circuit express route authorization'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, circuitName, authName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      circuitName = cli.interaction.promptIfNotGiven($('Express route circuit name: '), circuitName, _);
      authName = cli.interaction.promptIfNotGiven($('Express route express route authorization name: '), authName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.deleteAuthorization(resourceGroup, circuitName, authName, options, _);
    });

  expressRouteAuthorization.command('list [resource-group] [circuit-name]')
    .description($('Get all express route circuit authorizations'))
    .usage('[options] <resource-group> <circuit-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-c, --circuit-name <circuit-name>', $('the name of the express route circuit'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, circuitName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      circuitName = cli.interaction.promptIfNotGiven($('Express route circuit name: '), circuitName, _);

      var networkManagementClient = getNetworkManagementClient(options);
      var expressRoute = new ExpressRoute(cli, networkManagementClient);
      expressRoute.listAuthorization(resourceGroup, circuitName, options, _);
    });

  function getNetworkManagementClient(options) {
    var subscription = profile.current.getSubscription(options.subscription);
    return utils.createNetworkManagementClient(subscription);
  }

  function getTrafficManagementClient(options) {
    var subscription = profile.current.getSubscription(options.subscription);
    return utils.createTrafficManagerResourceProviderClient(subscription);
  }

  function getDnsManagementClient(options) {
    var subscription = profile.current.getSubscription(options.subscription);
    return utils.createDnsResourceProviderClient(subscription);
  }
};
