//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var crypto = require('crypto');
var profile = require('../../util/profile');
var fs = require('fs');
var util = require('util');
var utils = require('../../util/utils');
var VNetUtil = require('./../../util/vnet.util');
var NetworkClient = require('./network/networkClient');
var constants = require('./network/constants');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage your Networks'));

  var log = cli.output;

  network.command('export <file-path>')
    .usage('[options] <file-path>')
    .description($('Export the current Network configuration to a file'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(exportNetworkConfig);

  network.command('import <file-path>')
    .usage('[options] <file-path>')
    .description($('Set the Network configuration from a json file'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(importNetworkConfig);

  var dnsserver = network.category('dnsserver')
    .description($('Commands to manage your DNS Servers'));

  dnsserver.command('list')
    .usage('[options]')
    .description($('List DNS Servers registered in current Network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(listDNSServers);

  dnsserver.command('register [dnsIp]')
    .usage('[options] <dnsIp>')
    .description($('Register a DNS Server with current Network'))
    .option('-p, --dns-ip <name>', $('the IP address of the DNS server entry'))
    .option('-i, --dns-id <name>', $('the name identifier of the DNS server entry'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(registerDNSServer);

  dnsserver.command('unregister [dnsIp]')
    .usage('[options] <dnsIp>')
    .description($('Unregister a DNS Server registered in the current Azure Network by dns-id or dns-ip'))
    .option('-p, --dns-ip <name>', $('the IP address of the DNS server entry'))
    .option('-i, --dns-id <name>', $('the name identifier of the DNS server entry'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(unregisterDNSServer);

  var vnet = network.category('vnet')
    .description($('Commands to manage your Virtual Networks'));

  vnet.command('list')
    .usage('[options]')
    .description($('List your Azure Virtual Networks'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(listVNet);

  vnet.command('show [vnet]')
    .usage('<vnet> [options]')
    .description($('Show details about a Virtual Network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(showVNet);

  vnet.command('delete [vnet]')
    .usage('[options] <vnet>')
    .description($('Delete a virtual network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(deleteVNet);

  vnet.command('create [vnet]')
    .usage('[options] <vnet>')
    .description($('Create a Virtual Network'))
    .option('--vnet <vnet>', $('the name of the virtual network'))
    .option('-e, --address-space <ipv4>', $('the address space for the virtual network'))
    .option('-m, --max-vm-count <number>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <number>', $('the address space network mask in CIDR format'))
    .option('-p, --subnet-start-ip <ipv4>', $('the start IP address of subnet'))
    .option('-n, --subnet-name <name>', $('the name for the subnet'))
    .option('-c, --subnet-vm-count <number>', $('the maximum number of VMs in the subnet'))
    .option('-r, --subnet-cidr <number>', $('the subnet network mask in CIDR format'))
    .option('-l, --location <name>', $('the location'))
    .option('-f, --create-new-affinity-group', $('creates a new affinity group at the location specified in --location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-d, --dns-server-id <dns-id>', $('the name identifier of the DNS server'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(createVNet);

  var vnetLocalNetwork = vnet.category('local-network')
    .description($('Commands to manage association between virtual network and local network'));

  vnetLocalNetwork.command('add [name] [local-network-name]')
    .usage('[options] <name> <local-network-name>')
    .description($('Associate a local network with a virtual network'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-l, --local-network-name <local-network-name>', $('the name of the local network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (virtualNetworkName, localNetworkName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      virtualNetworkName = cli.interaction.promptIfNotGiven($('Virtual network name: '), virtualNetworkName, _);
      localNetworkName = cli.interaction.promptIfNotGiven($('Local network name: '), localNetworkName, _);

      networkClient.associateLocalNetworkWithVirtualNetwork(virtualNetworkName, localNetworkName, options, _);
    });

  vnetLocalNetwork.command('remove [name] [local-network-name]')
    .usage('[options] <name> <local-network-name>')
    .description($('Remove association between a local network and a virtual network'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-l, --local-network-name <local-network-name>', $('the name of the local network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (virtualNetworkName, localNetworkName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      virtualNetworkName = cli.interaction.promptIfNotGiven($('Virtual network name: '), virtualNetworkName, _);
      localNetworkName = cli.interaction.promptIfNotGiven($('Local network name: '), localNetworkName, _);

      networkClient.removeAssociationBetweenLocalNetworkAndVirtualNetwork(virtualNetworkName, localNetworkName, options, _);
    });

  var staticIP = vnet.category('static-ip')
    .description($('Commands to manage your Virtual Network static IP addresses'));

  staticIP.command('check [vnet] [ipAddress]')
    .usage('[options] <vnet> <ip-address>')
    .description($('Check the availability of a static IP address'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(checkStaticIP);

  var reservedIP = network.category('reserved-ip')
    .description($('Commands to manage your reserved public Virtual IP addresses'));

  reservedIP.command('list')
    .usage('[options]')
    .description($('List your Azure reserved IP addresses'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(listReservedIP);

  reservedIP.command('show <name>')
    .usage('[options] <name>')
    .description($('Show details about a reserved IP address'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(showReservedIP);

  reservedIP.command('delete <name>')
    .usage('[options] <name>')
    .description($('Delete a reserved IP address'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(deleteReservedIP);

  reservedIP.command('create <name> <location>')
    .usage('[options] <name> <location>')
    .description($('Create a reserved IP address'))
    .option('-e, --label <label>', $('the reserved IP address label'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(createReservedIP);

  var nsg = network.category('nsg')
    .description($('Commands to manage Network Security Groups'));

  nsg.command('create [name] [location]')
    .description($('Create a network security group'))
    .usage('[options] <name> <location>')
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-l, --location <location>', $('the location'))
    .option('-b, --label <label>', $('the label of the network security group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, location, options, _) {
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNSG(name, location, options, _);
    });

  nsg.command('list')
    .usage('[options]')
    .description($('List network security groups'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNSGs(options, _);
    });

  nsg.command('show [name]')
    .description($('Show the details about a network security group'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNSG(name, options, _);
    });

  nsg.command('delete [name]')
    .description($('Delete a network security group'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNSG(name, options, _);
    });

  var nsgRule = nsg.category('rule')
    .description($('Commands to manage Network Security Group Rules'));

  nsgRule.command('create [nsg-name] [name]')
    .usage('[options] <nsg-name> <name>')
    .description($('Create a network security group rule'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', $('the source port range'))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', $('the destination port range'))
    .option('-c, --action <action>', $('the action mode [Allow, Deny]'))
    .option('-y, --priority <priority>', $('the priority'))
    .option('-r, --type <type>', $('the type'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      networkClient.createNsgRule(nsgName, ruleName, options, _);
    });

  nsgRule.command('set [nsg-name] [name]')
    .usage('[options] <nsg-name> <name>')
    .description($('Set a network security group rule'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', $('the source port range'))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', $('the destination port range'))
    .option('-c, --action <action>', $('the action mode [Allow, Deny]'))
    .option('-y, --priority <priority>', $('the priority'))
    .option('-r, --type <type>', $('the type'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      networkClient.setNsgRule(nsgName, ruleName, options, _);
    });

  nsgRule.command('list [nsg-name]')
    .usage('[options] <nsg-name>')
    .description($('List rules in a network security group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      networkClient.listNsgRules(nsgName, options, _);
    });

  nsgRule.command('show [nsg-name] [name]')
    .usage('[options] <nsg-name> <name>')
    .description($('Show rule in a network security group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      networkClient.showNsgRule(nsgName, ruleName, options, _);
    });

  nsgRule.command('delete [nsg-name] [name]')
    .usage('[options] <nsg-name> <name>')
    .description($('Delete a network security group rule'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      networkClient.deleteNsgRule(nsgName, ruleName, options, _);
    });

  var nsgSubnet = nsg.category('subnet')
    .description('Commands to manage Network Security Group of subnet');

  nsgSubnet.command('add [nsg-name] [vnet-name] [subnet-name]')
    .usage('[options] <nsg-name> <vnet-name> <subnet-name>')
    .description('Associate a network security group with a subnet')
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --subnet-name <subnet-name>', $('the name of the virtual network subnet'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, vnetName, subnetName, options, _) {
      nsgName = cli.interaction.promptIfNotGiven($('Network Security group name: '), nsgName, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Virtual network subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addNsgToSubnet(nsgName, vnetName, subnetName, options, _);
    });

  nsgSubnet.command('remove [nsg-name] [vnet-name] [subnet-name]')
    .usage('[options] <nsg-name> <vnet-name> <subnet-name>')
    .description('Remove association between a network security group and subnet')
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --subnet-name <subnet-name>', $('the name of the virtual network subnet'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (nsgName, vnetName, subnetName, options, _) {
      nsgName = cli.interaction.promptIfNotGiven($('Network Security group name: '), nsgName, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Virtual network subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeNsgFromSubnet(nsgName, vnetName, subnetName, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage your Virtual Network Subnets'));

  subnet.command('create [vnet-name] [name]')
    .usage('[options] <vnet-name> <name>')
    .description($('Create a Virtual Network Subnet'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, name, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);
      options.addressPrefix = cli.interaction.promptIfNotGiven($('Address prefix: '), options.addressPrefix, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createSubnet(vnetName, name, options, _);
    });

  subnet.command('set [vnet-name] [name]')
    .usage('[options] <vnet-name> <name>')
    .description($('Create a Virtual Network Subnet'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, name, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setSubnet(vnetName, name, options, _);
    });

  subnet.command('list [vnet-name]')
    .usage('[options] <vnet-name>')
    .description($('Get all subnets in a virtual network'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listSubnets(vnetName, options, _);
    });

  subnet.command('show [vnet-name] [name]')
    .usage('[options] <vnet-name>')
    .description($('Get specified subnet in a virtual network'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, name, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSubnet(vnetName, name, options, _);
    });

  subnet.command('delete [vnet-name] [name]')
    .usage('[options] <vnet-name> <name>')
    .description($('Create a Virtual Network Subnet'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vNetName, subnetName, options, _) {
      vNetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vNetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteSubnet(vNetName, subnetName, options, _);
    });

  var subnetRouteTable = subnet.category('route-table')
    .description($('Commands to manage subnet route tables'));

  subnetRouteTable.command('add [vnet-name] [subnet-name] [route-table-name]')
    .usage('[options] <vnet-name> <subnet-name> <route-table-name>')
    .description($('Add route table to a subnet'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --subnet-name <subnet-name>', $('the name of the subnet'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the route table that needs to be applied to the subnet'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, subnetName, routeTableName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), subnetName, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route table name: '), routeTableName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addRouteTableToSubnet(vnetName, subnetName, routeTableName, options, _);
    });

  subnetRouteTable.command('delete [vnet-name] [subnet-name] [route-table-name]')
    .usage('[options] <vnet-name> <subnet-name> <route-table-name>')
    .description($('Remove route table to a subnet'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --subnet-name <subnet-name>', $('the name of the subnet'))
    .option('-r, --route-table-name <route-table-name>', $('the name of the route table that needs to be applied to the subnet'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, subnetName, routeTableName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), subnetName, _);
      routeTableName = cli.interaction.promptIfNotGiven($('Route table name: '), routeTableName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteRouteTableFromSubnet(vnetName, subnetName, routeTableName, options, _);
    });

  subnetRouteTable.command('show [vnet-name] [subnet-name]')
    .usage('[options] <vnet-name> <subnet-name>')
    .description($('Get route table for a subnet'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --subnet-name <subnet-name>', $('the name of the subnet'))
    .option('-d, --detailed', util.format($('get full details of the route table, without this flag only' +
    '\n     route table name will be shown')))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, subnetName, routeTableName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showRouteTableForSubnet(vnetName, subnetName, options, _);
    });

  var localNetwork = network.category('local-network')
    .description($('Commands to manage local network'));

  localNetwork.command('create [name]')
    .description($('Create a local network'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the local network'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes'))
    .option('-w, --vpn-gateway-address <vpn-gateway-address>', $('the  VPN gateway address'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Local network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createLocalNetwork(name, options, _);
    });

  localNetwork.command('set [name]')
    .description($('Set a local network'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the local network'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes'))
    .option('-w, --vpn-gateway-address <vpn-gateway-address>', $('the  VPN gateway address'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Local network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setLocalNetwork(name, options, _);
    });

  localNetwork.command('list')
    .usage('[options]')
    .description($('Get all local networks'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLocalNetworks(options, _);
    });

  localNetwork.command('show [name]')
    .usage('[options]')
    .description($('Get a local network'))
    .option('-n, --name <name>', $('the name of the local network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Local network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showLocalNetwork(name, options, _);
    });

  localNetwork.command('delete [name]')
    .usage('[options] <name>')
    .description($('Delete a local network'))
    .option('-n, --name <name>', $('the name of the local network'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Local network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLocalNetwork(name, options, _);
    });

  var gateway = network.category('gateway')
    .description($('Commands to manage gateways'));

  var gatewayVNet = gateway.category('vnet')
    .description($('Commands to manage vpn gateways'));

  gatewayVNet.command('create [vnet-name]')
    .description($('Create a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-t, --type <type>', util.format($('the gateway type, valid values are:' +
    '\n       [%s],' +
    '\n       default is StaticRouting'), constants.vpnGateway.type))
    .option('-k, --sku <sku>', util.format($('the gateway SKU, valid values are:' +
    '\n       [%s],' +
    '\n       default is Default'), constants.vpnGateway.sku))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVirtualNetworkGateway(vnetName, options, _);
    });

  gatewayVNet.command('show [vnet-name]')
    .description($('Get a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVirtualNetworkGateway(vnetName, options, _);
    });

  gatewayVNet.command('delete [vnet-name]')
    .description($('Delete a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVirtualNetworkGateway(vnetName, options, _);
    });

  gatewayVNet.command('resize [vnet-name] [sku]')
    .description($('Resize a virtual network gateway'))
    .usage('[options] <vnet-name> <sku>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-k, --sku <sku>', $('the SKU that the existing gateway will be resized to,' +
    '\n       valid values are [Default or HighPerformance]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, sku, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      sku = cli.interaction.promptIfNotGiven($('SKU: '), sku, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.resizeVirtualNetworkGateway(vnetName, sku, options, _);
    });

  gatewayVNet.command('reset [vnet-name]')
    .description($('Reset a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.resetVirtualNetworkGateway(vnetName, options, _);
    });

  gatewayVNet.command('set-default-site [vnet-name] [site-name]')
    .description($('Set local network default site for a virtual network gateway'))
    .usage('[options] <vnet-name> <site-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-k, --site-name <site-name>', $('the local network default site for this virtual network gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, siteName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      siteName = cli.interaction.promptIfNotGiven($('Site name: '), siteName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setDefaultSiteForVirtualNetworkGateway(vnetName, siteName, options, _);
    });

  gatewayVNet.command('remove-default-site [vnet-name]')
    .description($('Remove local network default site configured in a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeDefaultSiteForVirtualNetworkGateway(vnetName, options, _);
    });

  var sharedKey = gatewayVNet.category('shared-key')
    .description($('Commands to manage VPN gateway shared key'));

  sharedKey.command('set [vnet-name] [key-value]')
    .usage('[options] <vnet-name> <key-value>')
    .description($('Set shared key used by virtual network gateway to connect to local network site'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-t, --site-name <site-name>', $('the name of the local network site, if not specified then default local network site will be used.'))
    .option('-k, --key-value <key-value>', $('the shared key value'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, keyValue, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      keyValue = cli.interaction.promptIfNotGiven($('Shared key value: '), keyValue, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setSharedKey(vnetName, keyValue, options, _);
    });

  sharedKey.command('reset [vnet-name] [key-length]')
    .usage('[options] <vnet-name> <key-length>')
    .description($('Reset shared key used by virtual network gateway to connect to local network site'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-t, --site-name <site-name>', $('the name of the local network site, if not specified then default local network site will be used.'))
    .option('-l, --key-length <key-length>', $('the number of characters in the shared key, the key length must be between 1 and 128 characters.'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, keyLength, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      keyLength = cli.interaction.promptIfNotGiven($('Key length: '), keyLength, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.resetSharedKey(vnetName, keyLength, options, _);
    });

  var vpnConnection = gatewayVNet.category('connection')
    .description($('Commands to manage vpn gateway connection'));

  vpnConnection.command('list [vnet-name]')
    .description($('Get all local network connections that can be accessed through a virtual network gateway'))
    .usage('[options] <vnet-name>')
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVpnGatewayConnections(vnetName, options, _);
    });

  var vpnDevice = gatewayVNet.category('vpn-device')
    .description($('Commands to manage VPN gateway VPN devices'));

  vpnDevice.command('list')
    .usage('[options]')
    .description($('Get all supported `on premise network devices` that can connect to the gateway'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVpnDevices(options, _);
    });

  vpnDevice.command('get-script [vnet-name]')
    .usage('[options] <vnet-name>')
    .description($('Get script to configure local VPN device to connect to the virtual network gateway'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-o, --vendor <vendor>', $('the vendor of the VPN device'))
    .option('-p, --platform <platform>', $('the platform of the VPN device'))
    .option('-f, --os-family <os-family>', $('the OS family of the VPN device'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      options.vendor = cli.interaction.promptIfNotGiven($('Vendor: '), options.vendor, _);
      options.platform = cli.interaction.promptIfNotGiven($('Platform: '), options.platform, _);
      options.osFaimily = cli.interaction.promptIfNotGiven($('OS family: '), options.osFamily, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.getScriptForVpnDevice(vnetName, options, _);
    });

  var vpnDiagnostics = gatewayVNet.category('diagnostics')
    .description($('Commands to manage VPN gateway diagnostics session'));

  vpnDiagnostics.command('start [vnet-name]')
    .usage('[options] <vnet-name>')
    .description($('Start a new diagnostics session in a virtual network gateway'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-d, --duration <duration>', $('duration in seconds to perform the diagnostics capture, possible values are between 1 and 300'))
    .option('-a, --storage-account-name <storage-account-name>', $('the name of the storage account where the captured diagnostics data is to be stored.'))
    .option('-k, --storage-account-key <storage-account-key>', $('the key of the storage account that is specified through --storage-account-name parameter'))
    .option('-c, --container-name <container-name>', $('the name of the container in the storage account where the captured diagnostics data is stored, default is gatewaypublicdiagnostics'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      options.duration = cli.interaction.promptIfNotGiven($('Capture duration in seconds: '), options.duration, _);
      options.storageAccountName = cli.interaction.promptIfNotGiven($('Storage account name: '), options.storageAccountName, _);
      options.storageAccountKey = cli.interaction.promptIfNotGiven($('Storage account key: '), options.storageAccountKey, _);
      options.containerName = cli.interaction.promptIfNotGiven($('Storage container name: '), options.containerName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.startVpnDiagnosticsSession(vnetName, options, _);
    });

  vpnDiagnostics.command('stop [vnet-name]')
    .usage('[options] <vnet-name>')
    .description($('Stop current diagnostics session in a virtual network gateway'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.stopVpnDiagnosticsSession(vnetName, options, _);
    });

  vpnDiagnostics.command('get [vnet-name]')
    .usage('[options] <vnet-name>')
    .description($('Get current diagnostics session in a virtual network gateway'))
    .option('-n, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (vnetName, options, _) {
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.getVpnDiagnosticsSession(vnetName, options, _);
    });

  var routeTable = network.category('route-table')
    .description($('Commands to manage route table'));

  routeTable.command('create [name] [location]')
    .description($('Create a route table'))
    .usage('[options] <name> <location>')
    .option('-n, --name <name>', $('the name of the route table'))
    .option('-l, --location <location>', $('the location, this must be same as the location of the virtual network containing the subnet(s) on which this route table needs to be applied'))
    .option('-b, --label <label>', $('the label for the route table'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, location, options, _) {
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createRouteTable(name, location, options, _);
    });

  routeTable.command('show [name]')
    .description($('Get a route table'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the route table'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showRouteTable(name, options, _);
    });

  routeTable.command('list')
    .description($('Get all route tables'))
    .usage('[options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listRouteTables(options, _);
    });

  routeTable.command('delete [name]')
    .description($('Delete a route table'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the route table'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteRouteTable(name, options, _);
    });

  var route = routeTable.category('route')
    .description($('Commands to manage route table routes'));

  route.command('set [route-table-name] [name] [address-prefix] [next-hop-type]')
    .description($('Set route in a route table'))
    .usage('[options] <route-table-name> <name> <address-prefix> <next-hop-type>')
    .option('-r, --route-table-name <route-table-name>', $('the name of the route table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-a, --address-prefix <address-prefix>', $('the route address prefix e.g. 0.0.0.0/0'))
    .option('-t, --next-hop-type <next-hop-type>', util.format($('the route next hop type, valid values are:' +
    '\n       [%s]'), constants.route.nextHopType))
    .option('-p, --next-hop-ip-address <next-hop-ip-address>', $('the route next hop ip addresses, this parameter is valid' +
    '\n       only for next hop type VirualAppliance'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (routeTableName, name, addressPrefix, nextHopType, options, _) {
      routeTableName = cli.interaction.promptIfNotGiven($('Route table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);
      addressPrefix = cli.interaction.promptIfNotGiven($('Address prefix: '), addressPrefix, _);
      nextHopType = cli.interaction.promptIfNotGiven($('Next hop type: '), nextHopType, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setRoute(routeTableName, name, addressPrefix, nextHopType, options, _);
    });

  route.command('delete [route-table-name] [name]')
    .description($('Delete route from a route table'))
    .usage('[options] <route-table-name> <name>')
    .option('-r, --route-table-name <route-table-name>', $('the name of the route table'))
    .option('-n, --name <name>', $('the name of the route'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (routeTableName, name, options, _) {
      routeTableName = cli.interaction.promptIfNotGiven($('Route table name: '), routeTableName, _);
      name = cli.interaction.promptIfNotGiven($('Route name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteRoute(routeTableName, name, options, _);
    });

  var appGateway = network.category('application-gateway')
    .description('Commands to manage application gateway');

  appGateway.command('create [name] [vnet-name]')
    .description($('Create an application gateway'))
    .usage('[options] <name> <vnet-name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network application gateway should be deployed in'))
    .option('-t, --subnet-names <subnet-names>', $('comma separated list of subnet names exists in the virtual network identified by --vnet-name'))
    .option('-c, --instance-count <instance-count>', $('the number of instances'))
    .option('-z, --gateway-size <gateway-size>', $('size of the application gateway, valid values are [Small, Medium, Large, ExtraLarge, A8]'))
    .option('-d, --description <description>', $('the description for the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, vnetName, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      options.subnetNames = cli.interaction.promptIfNotGiven($('Comma separated subnet names: '), options.subnetNames, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createApplicationGateway(name, vnetName, options, _);
    });

  appGateway.command('set [name] [vnet-name]')
    .description($('Update an application gateway'))
    .usage('[options] <name> <vnet-name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network application gateway should be deployed in'))
    .option('-t, --subnet-names <subnet-names>', $('comma separated list of subnet names exists in the virtual network identified by --vnet-name'))
    .option('-c, --instance-count <instance-count>', $('the number of instances'))
    .option('-z, --gateway-size <gateway-size>', $('size of the application gateway, valid values are [Small, Medium, Large, ExtraLarge, A8]'))
    .option('-d, --description <description>', $('the description for the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, vnetName, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setApplicationGateway(name, vnetName, options, _);
    });

  appGateway.command('list')
    .description($('Get all application gateways'))
    .usage('[options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listApplicationGateways(options, _);
    });

  appGateway.command('show [name]')
    .description($('Get an application gateway'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showApplicationGateway(name, options, _);
    });

  appGateway.command('delete [name]')
    .description($('Delete an application gateway'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteApplicationGateway(name, options, _);
    });

  appGateway.command('start [name]')
    .description($('Start an application gateway'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.startApplicationGateway(name, options, _);
    });

  appGateway.command('stop [name]')
    .description($('Stop an application gateway'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.stopApplicationGateway(name, options, _);
    });

  appGateway.command('export-config [name] [file-path]')
    .description($('Export application gateway configuration'))
    .usage('[options] <name> <file-path>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-t, --export-to-file <export-to-file>', $('the path to the file where configuration needs to be exported'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, filePath, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      filePath = cli.interaction.promptIfNotGiven($('File path: '), filePath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.exportApplicationGatewayConfig(name, filePath, options, _);
    });

  appGateway.command('import-config [name] [import-from-file]')
    .description($('Import application gateway configuration'))
    .usage('[options] <name> <import-from-file>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-t, --import-from-file <import-from-file>', $('the path to the configuration file'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, importFromFile, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      importFromFile = cli.interaction.promptIfNotGiven($('Import from file: '), importFromFile, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.importApplicationGatewayConfig(name, importFromFile, options, _);
    });

  var appGatewayAddressPool = appGateway.category('address-pool');

  appGatewayAddressPool.command('add [gateway-name] [name]')
    .description($('Add a backend address pool to an application gateway'))
    .usage('[options] <gateway-name> <name>')
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-r, --servers <servers>', $('comma separated list of IP addresses or DNS names' +
    '\n     corresponding to backend servers'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (gatewayName, name, options, _) {
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);
      options.servers = cli.interaction.promptIfNotGiven($('List of IP addresses or DNS names: '), options.servers, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addAddressPoolForApplicationGateway(gatewayName, name, options, _);
    });

  appGatewayAddressPool.command('remove [gateway-name] [name]')
    .description($('Remove a backend address pool from an application gateway'))
    .usage('[options] <gateway-name> <name>')
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (gatewayName, name, options, _) {
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeAddressPoolForApplicationGateway(gatewayName, name, options, _);
    });

  var appGatewayHttpSettings = appGateway.category('http-settings');

  appGatewayHttpSettings.command('add [gateway-name] [name]')
    .description($('Add a backend address pool to an application gateway'))
    .usage('[options] <gateway-name> <name>')
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the HTTP settings'))
    .option('-p, --protocol <protocol>', util.format($('the protocol, valid values are [%s], default value is http'),
      constants.appGateway.settings.protocol))
    .option('-o, --port <port>', util.format($('the port, valid range is'),
      constants.toRange(constants.appGateway.settings.port)))
    .option('-c, --cookie-based-affinity <cookie-based-affinity>', util.format($('Enable or disable cookie based affinity, valid values are' +
    '\n     [%s],' +
    '\n     default value is Disabled'), constants.appGateway.settings.affinity))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (gatewayName, name, options, _) {
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Http settings name: '), name, _);
      options.port = cli.interaction.promptIfNotGiven($('Port: '), options.port, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addHttpSettingsForApplicationGateway(gatewayName, name, options, _);
    });

  appGatewayHttpSettings.command('remove [gateway-name] [name]')
    .description($('Remove a backend address pool to an application gateway'))
    .usage('[options] <gateway-name> <name>')
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the HTTP settings'))
    .option('-q, --quiet', $('quiet mode, do not ask for unregister confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (gatewayName, name, options, _) {
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Http settings name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeHttpSettingsForApplicationGateway(gatewayName, name, options, _);
    });

  var appGatewayFrontendIp = appGateway.category('frontend-ip');

  appGatewayFrontendIp.command('add [gateway-name] [name]')
    .description($('Add a frontend ip configuration to an application gateway'))
    .usage('[options] <gateway-name> <name>')
    .option('-w, --gateway-name <gateway-name>', $('the name of the application gateway'))
    .option('-n, --name <name>', $('the name of the frontend IP configuration'))
    .option('-t, --type <type>', util.format($('the type, supported values are [%s], default value is Private'),
      constants.appGateway.ip.type))
    .option('-i, --static-ip-address <static-ip-address>', $('the static IP address'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (gatewayName, name, options, _) {
      gatewayName = cli.interaction.promptIfNotGiven($('Application gateway name: '), gatewayName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend IP name: '), name, _);
      options.staticIpAddress = cli.interaction.promptIfNotGiven($('Static IP address: '), options.staticIpAddress, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addFrontendIpForApplicationGateway(gatewayName, name, options, _);
    });

  var appGatewaySslCert = appGateway.category('ssl-cert')
    .description($('Commands to manage application gateway SSL certificates'));

  appGatewaySslCert.command('add [name] [cert-name]')
    .description($('Add application gateway SSL certificate'))
    .usage('[options] <name> <cert-name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the certificate'))
    .option('-t, --cert-file <cert-file>', $('the path to the certificate'))
    .option('-p, --password <password>', $('the certificate password'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, certName, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Certificate name: '), certName, _);
      options.certFile = cli.interaction.promptIfNotGiven($('Certificate file path: '), options.certFile, _);
      options.password = cli.interaction.promptIfNotGiven($('Certificate password: '), options.password, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addSslToApplicationGateway(name, certName, options, _);
    });

  appGatewaySslCert.command('remove [name] [cert-name]')
    .description($('Remove application gateway SSL certificate'))
    .usage('[options] <name> <cert-name>')
    .option('-n, --name <name>', $('the name of the application gateway'))
    .option('-c, --cert-name <cert-name>', $('the name of the certificate'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, certName, options, _) {
      name = cli.interaction.promptIfNotGiven($('Application gateway name: '), name, _);
      certName = cli.interaction.promptIfNotGiven($('Certificate name: '), certName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeSslFromApplicationGateway(name, certName, options, _);
    });

  var trafficManager = network.category('traffic-manager')
    .description($('Commands to manage traffic manager'));

  var tmProfile = trafficManager.category('profile')
    .description($('Commands to manage traffic manager profile'));

  tmProfile.command('list')
    .usage('[options]')
    .description($('Get all traffic manager profiles'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listTrafficManagers(options, _);
    });

  tmProfile.command('delete [name]')
    .description($('Delete a traffic manager profile'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the traffic manager'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Traffic manager profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteTrafficManager(name, options, _);
    });

  tmProfile.command('enable [name]')
    .description($('Enable a traffic manager profile'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the traffic manager'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Traffic manager profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.enableTrafficManager(name, options, _);
    });

  tmProfile.command('disable [name]')
    .description($('Disable a traffic manager profile'))
    .usage('[options] <name>')
    .option('-n, --name <name>', $('the name of the traffic manager'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, options, _) {
      name = cli.interaction.promptIfNotGiven($('Traffic manager profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.disableTrafficManager(name, options, _);
    });

  function exportNetworkConfig(filePath, options, cmdCallback) {
    getNetworkConfig(options, function (error, networkConfiguration) {
      if (!error) {
        delete networkConfiguration['$'];
        var networkConfigAsString = JSON.stringify(networkConfiguration);
        fs.writeFile(filePath, networkConfigAsString, function (err) {
          if (err) {
            return cmdCallback(err);
          } else {
            log.info(util.format($('Network Configuration exported to %s'), filePath));
            return cmdCallback();
          }
        });
      } else {
        return cmdCallback(error);
      }
    });
  }

  function importNetworkConfig(filePath, options, cmdCallback) {
    log.verbose(util.format($('Loading configuration file: %s'), filePath));
    var xmlString = fs.readFileSync(filePath, 'utf8');
    var networkConfiguration = JSON.parse(xmlString);

    var progress = cli.interaction.progress($('Setting Network Configuration'));

    setNetworkConfig(options, networkConfiguration, function (error) {
      progress.end();
      return cmdCallback(error);
    });
  }

  function listDNSServers(options, cmdCallback) {
    getNetworkConfig(options, function (error, networkConfiguration) {
      if (error) {
        return cmdCallback(error);
      } else {
        var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
        if (vnetConfiguration.Dns.DnsServers.length > 0) {
          log.table(vnetConfiguration.Dns.DnsServers, function (row, item) {
            row.cell($('DNS Server ID'), item.Name);
            row.cell($('DNS Server IP'), item.IPAddress);
          });
        } else {
          if (log.format().json) {
            log.json([]);
          } else {
            log.warn($('No DNS servers found'));
          }
        }
        return cmdCallback();
      }
    });
  }

  function registerDNSServer(dnsIp, options, _) {
    dnsIp = cli.interaction.promptIfNotGiven($('DNS IP: '), dnsIp, _);

    var dnsId = null;
    if (options.dnsId) {
      var dnsIdPattern = /^[a-z][a-z0-9\-]{0,19}$/i;
      if (dnsIdPattern.test(options.dnsId) === false) {
        throw new Error($('--dns-id can contain only letters, numbers and hyphens with no more than 20 characters. It must start with a letter'));
      }
      dnsId = options.dnsId;
    } else {
      dnsId = util.format($('DNS-%s'), crypto.randomBytes(8).toString('hex'));
    }

    var vnetUtil = new VNetUtil();
    var parsedDnsIp = vnetUtil.parseIPv4(dnsIp);
    if (parsedDnsIp.error) {
      throw new Error(parsedDnsIp.error);
    }

    dnsIp = vnetUtil.octectsToString(parsedDnsIp.octects);

    var networkConfiguration = getNetworkConfig(options, _);

    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (!vnetConfiguration.Dns) {
      vnetConfiguration.Dns = {};
    }

    if (!vnetConfiguration.Dns.DnsServers) {
      vnetConfiguration.Dns.DnsServers = [];
    }

    for (var i = 0; i < vnetConfiguration.Dns.DnsServers.length; i++) {
      if (utils.ignoreCaseEquals(vnetConfiguration.Dns.DnsServers[i].Name, dnsId)) {
        throw new Error(util.format($('A DNS Server with name identifier %s already exists'), dnsId));
      }

      if (vnetConfiguration.Dns.DnsServers[i].IPAddress === dnsIp) {
        throw new Error(util.format($('A DNS Server with ip address %s already exists'), dnsIp));
      }
    }

    vnetConfiguration.Dns.DnsServers.push({
      Name: dnsId,
      IPAddress: dnsIp
    });
    if (!options.dnsId) {
      log.info(util.format($('Name Identifier for the DNS Server is %s'), dnsId));
    }

    var progress = cli.interaction.progress($('Registering DNS Server'));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function unregisterDNSServer(dnsIp, options, _) {
    if (options.dnsId && dnsIp) {
      throw new Error($('Either --dns-id or --dns-ip must be present not both'));
    }

    if (!options.dnsId && !dnsIp) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS IP: '), dnsIp, _);
    }

    if (options.dnsId && dnsIp) {
      throw new Error($('Either --dns-id or --dns-ip must be present not both'));
    }

    var filterProperty = null;
    var filterValue = null;

    if (options.dnsId) {
      filterProperty = 'Name';
      filterValue = options.dnsId;
    } else {
      filterProperty = 'IPAddress';
      var vnetUtil = new VNetUtil();

      var parsedDnsIP = vnetUtil.parseIPv4(dnsIp, '--dns-ip');
      if (parsedDnsIP.error) {
        throw new Error(parsedDnsIP.error);
      }
      filterValue = vnetUtil.octectsToString(parsedDnsIP.octects);
    }

    var networkConfiguration = getNetworkConfig(options, _);

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.Dns.DnsServers.length === 0) {
      throw new Error($('No DNS Servers registered with the Network'));
    }

    var dnsEntryIndex = -1;
    for (var i = 0; i < vnetConfiguration.Dns.DnsServers.length; i++) {
      if (vnetConfiguration.Dns.DnsServers[i][filterProperty].toLowerCase() == filterValue.toLowerCase()) {
        dnsEntryIndex = i;
        break;
      }
    }

    if (dnsEntryIndex == -1) {
      throw new Error(util.format($('A DNS Server with %s %s not found'), options.dnsId ? $('Name Identifier') : $('IP Address'), filterValue));
    }

    var dnsNameIdentifier = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].Name.toLowerCase();
    var dnsIPAddress = vnetConfiguration.Dns.DnsServers[dnsEntryIndex].IPAddress;
    var dnsIdAndIp = dnsNameIdentifier + '(' + dnsIPAddress + ')';

    for (var j = 0; j < vnetConfiguration.VirtualNetworkSites.length; j++) {
      var site = vnetConfiguration.VirtualNetworkSites[j];
      if (site.DnsServersRef) {
        for (var k = 0; k < site.DnsServersRef.length; k++) {
          if (site.DnsServersRef[k].Name.toLowerCase() === dnsNameIdentifier) {
            throw new Error(util.format($('You cannot unregister this DNS Server, it is being referenced by the virtual network %s'), site.Name));
          }
        }
      }
    }

    if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the DNS Server %s ? [y/n] '), dnsIdAndIp), _)) {
      return;
    }

    vnetConfiguration.Dns.DnsServers.splice(dnsEntryIndex, 1);

    var progress = cli.interaction.progress(util.format($('Deleting the DNS Server %s'), dnsIdAndIp));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function listVNet(options, _) {
    var virtualNetworkSites;
    var progress = cli.interaction.progress($('Getting virtual networks'));
    try {
      virtualNetworkSites = getVirtualNetworkSites(options, _);
    } finally {
      progress.end();
    }

    cli.interaction.formatOutput(virtualNetworkSites, function (outputData) {
      if (outputData.length === 0) {
        log.info($('No virtual networks defined'));
      } else {
        log.table(outputData, function (row, vnet) {
          row.cell($('Name'), vnet.name);
          row.cell($('Location'), vnet.location);
          row.cell($('AffinityGroup'), vnet.affinityGroup || '');
          row.cell($('State'), vnet.state);
        });
      }
    });
  }

  function showVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

    var virtualNetworkSites;
    var progress = cli.interaction.progress($('Getting virtual networks'));
    try {
      virtualNetworkSites = getVirtualNetworkSites(options, _);
    } finally {
      progress.end();
    }

    if (virtualNetworkSites) {
      var virtualNetworkSite = null;
      for (var i = 0; i < virtualNetworkSites.length; i++) {
        if (utils.ignoreCaseEquals(virtualNetworkSites[i].name, vnet)) {
          virtualNetworkSite = virtualNetworkSites[i];
          break;
        }
      }

      if (virtualNetworkSite) {
        if (log.format().json) {
          log.json(virtualNetworkSite);
        } else {
          utils.logLineFormat(virtualNetworkSite, log.data);
        }
      } else {
        log.warn(util.format($('Virtual network with name %s not found'), vnet));
      }
    } else {
      log.warn(util.format($('Virtual network with name %s not found'), vnet));
    }
  }

  function deleteVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual Network name: '), vnet, _);
    var networkConfiguration = getNetworkConfig(options, _);

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.VirtualNetworkSites.length > 0) {
      var index = -1;
      for (var i = 0; i < vnetConfiguration.VirtualNetworkSites.length; i++) {
        if (utils.ignoreCaseEquals(vnetConfiguration.VirtualNetworkSites[i].Name, vnet)) {
          index = i;
          break;
        }
      }

      if (index !== -1) {
        if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the virtual network %s ? [y/n] '), vnet), _)) {
          return;
        }

        vnetConfiguration.VirtualNetworkSites.splice(index, 1);
        var progress = cli.interaction.progress(util.format($('Deleting the virtual network %s'), vnet));
        try {
          setNetworkConfig(options, networkConfiguration, _);
        } finally {
          progress.end();
        }
      } else {
        log.warn(util.format($('Virtual network with name %s not found'), vnet));
      }
    } else {
      log.warn(util.format($('Virtual network with name %s not found'), vnet));
    }
  }

  function createVNet(vnet, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

    if (!options.location && !options.affinityGroup) {
      throw new Error($('Either --location or --affinity-group must be present'));
    } else if (options.location && options.affinityGroup) {
      throw new Error($('Either --location or --affinity-group must be present not both'));
    }

    if (options.createNewAffinityGroup && options.affinityGroup) {
      throw new Error($('--create-new-affinity-group can be used only with --location'));
    }

    if (options.cidr && options.maxVmCount) {
      throw new Error($('Both optional parameters --cidr and --max-vm-count cannot be specified together'));
    }

    if (options.subnetCidr && options.subnetVmCount) {
      throw new Error($('Both optional parameters --subnet-cidr and --subnet-vm-count cannot be specified together'));
    }

    var vnetUtil = new VNetUtil();

    // Ensure --address-space is present if user provided --cidr
    var requiredOptCheckResult = vnetUtil.ensureRequiredParams(
      options.cidr,
      'cidr', {
        'address-space': options.addressSpace
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space is present if user provided --max-vm-count
    requiredOptCheckResult = vnetUtil.ensureRequiredParams(
      options.maxVmCount,
      'max-vm-count', {
        'address-space': options.addressSpace
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space and --cidr or --max-vm-count is present if user
    // provided --subnet-start-ip
    requiredOptCheckResult = vnetUtil.ensureRequiredParams(
      options.subnetStartIp,
      'subnet-start-ip', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        }
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space, subnet-start-ip and --cidr or --max-vm-count
    // is present if user provided --subnet-cidr
    requiredOptCheckResult = vnetUtil.ensureRequiredParams(
      options.subnetCidr,
      'subnet-cidr', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        },
        'subnet-start-ip': options.subnetStartIp
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    // Ensure --address-space, subnet-start-ip and --cidr or --max-vm-count
    // is present if user provided --subnet-vm-count
    requiredOptCheckResult = vnetUtil.ensureRequiredParams(
      options.subnetVmCount,
      'subnet-vm-count', {
        'address-space': options.addressSpace,
        'mvccidr': {
          'max-vm-count': options.maxVmCount,
          'cidr': options.cidr
        },
        'subnet-start-ip': options.subnetStartIp
      });

    if (requiredOptCheckResult.error) {
      throw new Error(requiredOptCheckResult.error);
    }

    var vnetInput = {
      // The name of the VNet
      name: null,
      // The affinity group for VNet
      affinityGroup: null,
      // The VNet's address space start IP
      addressSpaceStartIP: null,
      addressSpaceStartIPOctects: null,
      // Info about the private address space that address space belongs to
      addressSpaceInfo: null,
      // CIDR for the address space
      cidr: null,
      // The network mask for the address space calculated from CIDR
      addressSpaceNetworkMask: null,
      // The address space range calculated from address space start ip and CIDR
      addressSpaceRange: null,
      // The name for the first subnet in the address space
      subnetName: null,
      // The start ip address of the subnet
      subnetStartIPOctects: null,
      subnetStartIP: null,
      // The subnet cidr
      subnetCidr: null,
      // dns server id identifying DNS server for this VNet
      dnsServerId: null
    };

    var namePattern = /^[a-z0-9][a-z0-9\-]{0,62}$/i;
    if (options.subnetName) {
      if (namePattern.test(options.subnetName) === false) {
        throw new Error($('The --subnet-name can contain only letters, numbers and hyphens with no more than 63 characters. It must start with a letter or number'));
      }

      vnetInput.subnetName = options.subnetName;
    } else {
      vnetInput.subnetName = 'Subnet-1';
    }

    if (namePattern.test(options.subnetName) === false) {
      throw new Error($('The name can contain only letters, numbers and hyphens with no more than 63 characters. It must start with a letter or number'));
    }

    vnetInput.name = vnet;

    // Set the start IP address of the address space.
    var addressSpaceStartIP = null;
    if (!options.addressSpace) {
      // If user not provided --address-space default to '10.0.0.0'.
      addressSpaceStartIP = vnetUtil.defaultAddressSpaceInfo().ipv4Start;
      log.info(util.format($('Using default address space start IP: %s'), addressSpaceStartIP));
    } else {
      addressSpaceStartIP = options.addressSpace;
    }

    // Parse address space start ip and get the octect representation.
    var parsedAddressSpaceStartIP =
      vnetUtil.parseIPv4(addressSpaceStartIP, '--address-space');
    if (parsedAddressSpaceStartIP.error) {
      throw new Error(parsedAddressSpaceStartIP.error);
    }

    // Ensure to remove any leading zeros in the IP for e.g. '01.002.0.1'.
    addressSpaceStartIP =
      vnetUtil.octectsToString(parsedAddressSpaceStartIP.octects);

    // Get the private address space info for the given address space.
    // Hint user if the address space does not fall in the allowed
    // private address space ranges.
    var addressSpaceInfoForAddressSpace =
      vnetUtil.getPrivateAddressSpaceInfo(parsedAddressSpaceStartIP.octects);
    if (!addressSpaceInfoForAddressSpace) {
      log.error(util.format($('The given --address-space %s is not a valid private address'), addressSpaceStartIP));
      log.help($('The valid address space ranges are:'));
      for (var key in vnetUtil.privateAddressSpacesInfo) {
        var addressSpaceInfo = vnetUtil.privateAddressSpacesInfo[key];
        log.help(addressSpaceInfo.ipv4Cidr +
        '  [' + addressSpaceInfo.ipv4Start + ', ' + addressSpaceInfo.ipv4End + ']');
      }

      throw new Error($('Invalid --address-space value'));
    }

    vnetInput.addressSpaceStartIP = addressSpaceStartIP;
    vnetInput.addressSpaceStartIPOctects = parsedAddressSpaceStartIP.octects;
    vnetInput.addressSpaceInfo = addressSpaceInfoForAddressSpace;

    // Set the address space cidr
    var cidr = null;
    if (options.maxVmCount) {
      var maxVmCount = parseInt(options.maxVmCount, 10);
      if (isNaN(maxVmCount)) {
        throw new Error($('--vm-count should be an integer value'));
      }

      cidr = vnetUtil.getCIDRFromHostsCount(maxVmCount);
      log.info(util.format($('The cidr calculated for the given --max-vm-count %s is %s'), maxVmCount, cidr));
    } else if (options.cidr) {
      cidr = parseInt(options.cidr, 10);
    } else {
      cidr = vnetInput.addressSpaceInfo.startCidr;
      log.info(util.format($('Using default address space cidr: %s'), cidr));
    }

    // Check the given address space cidr fall in the cidr range for the private
    // address space the given address space belongs to.
    var verifyCidrResult = vnetUtil.verfiyCIDR(cidr, {
        start: vnetInput.addressSpaceInfo.startCidr,
        end: vnetInput.addressSpaceInfo.endCidr
      },
      options.cidr ? '--cidr' : null
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.cidr = cidr;
    vnetInput.addressSpaceNetworkMask =
      vnetUtil.getNetworkMaskFromCIDR(vnetInput.cidr).octects;
    // From the address space and cidr calculate the ip range, we use this to
    // set the default subnet start ip and to validate that the subnet start
    // ip fall within the range defined for the address space.
    vnetInput.addressSpaceRange =
      vnetUtil.getIPRange(
        vnetInput.addressSpaceStartIPOctects,
        vnetInput.addressSpaceNetworkMask);

    // Set the subnet start ip
    if (!options.subnetStartIp) {
      vnetInput.subnetStartIPOctects = vnetInput.addressSpaceRange.start;
      vnetInput.subnetStartIP =
        vnetUtil.octectsToString(vnetInput.subnetStartIPOctects);
      log.info(util.format($('Using default subnet start IP: %s'), vnetInput.subnetStartIP));
    } else {
      var parsedSubnetStartIP = vnetUtil.parseIPv4(options.subnetStartIp, '--subnet-start-ip');
      if (parsedSubnetStartIP.error) {
        throw new Error(parsedSubnetStartIP.error);
      }

      vnetInput.subnetStartIPOctects = parsedSubnetStartIP.octects;
      vnetInput.subnetStartIP = vnetUtil.octectsToString(vnetInput.subnetStartIPOctects);
    }

    // Checks the given subnet start ip falls in the address space range.
    var isSubNetInRange = vnetUtil.isIPInRange(
      vnetInput.addressSpaceRange.start,
      vnetInput.addressSpaceRange.end,
      vnetInput.subnetStartIPOctects
    );

    if (!isSubNetInRange) {
      var addressSpaceRange = vnetInput.addressSpaceStartIP + '/' + vnetInput.cidr + ' [' +
        vnetUtil.octectsToString(vnetInput.addressSpaceRange.start) +
        ', ' +
        vnetUtil.octectsToString(vnetInput.addressSpaceRange.end) + ']';
      log.help(util.format($('The given subnet (--subnet-start-ip) should belongs to the address space %s'),
        addressSpaceRange));
      throw new Error($('The subnet is not in the address space'));
    }

    // Set the subnet cidr
    var subnetCidr = null;
    if (options.subnetVmCount) {
      var subnetVmCount = parseInt(options.subnetVmCount, 10);
      if (isNaN(subnetVmCount)) {
        throw new Error($('--subnet-vm-count should be an integer value'));
      }

      subnetCidr = vnetUtil.getCIDRFromHostsCount(subnetVmCount);
      log.info(util.format($('The cidr calculated for the given --subnet-vm-count %s is %s'),
        subnetVmCount,
        subnetCidr));

    } else if (options.subnetCidr) {
      subnetCidr = parseInt(options.subnetCidr, 10);
    } else {
      subnetCidr = vnetUtil.getDefaultSubnetCIDRFromAddressSpaceCIDR(vnetInput.cidr);
      log.info(util.format($('Using default subnet cidr: %s'), subnetCidr));
    }

    verifyCidrResult = vnetUtil.verfiyCIDR(subnetCidr, {
        start: vnetInput.cidr,
        end: vnetInput.addressSpaceInfo.endCidr
      },
      options.subnetCidr ? '--subnet-cidr' : 'calculated from --subnet-vm-count'
    );

    if (verifyCidrResult.error) {
      throw new Error(verifyCidrResult.error);
    }

    vnetInput.subnetCidr = subnetCidr;

    log.verbose(util.format($('Address Space [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.addressSpaceStartIP,
      vnetInput.cidr,
      vnetUtil.getHostsCountForCIDR(vnetInput.cidr).hostsCount));

    log.verbose(util.format($('Subnet [Starting IP/CIDR (Max VM Count)]: %s/%s (%s)'),
      vnetInput.subnetStartIP,
      vnetInput.subnetCidr,
      vnetUtil.getHostsCountForCIDR(vnetInput.subnetCidr).hostsCount));

    var networkConfiguration = getNetworkConfig(options, _);
    if (!networkConfiguration.VirtualNetworkConfiguration) {
      networkConfiguration.VirtualNetworkConfiguration = {};
    }

    var vnetConfiguration = networkConfiguration.VirtualNetworkConfiguration;
    if (vnetConfiguration.VirtualNetworkSites) {
      vnetConfiguration.VirtualNetworkSites.forEach(function (site) {
        if (utils.ignoreCaseEquals(site.Name, vnetInput.name)) {
          throw new Error(util.format($('A virtual network with name %s already exists'), vnetInput.name));
        }
      });
    }

    if (options.dnsServerId) {
      var dnsServerNameIps = [];
      for (var j = 0; j < vnetConfiguration.Dns.DnsServers.length; j++) {
        var dnsServer = vnetConfiguration.Dns.DnsServers[j];
        if (dnsServer.Name.toLowerCase() == options.dnsServerId.toLowerCase()) {
          vnetInput.dnsServerId = dnsServer.Name;
          log.info(util.format($('Using DNS Server %s (%s)'), dnsServer.Name, dnsServer.IPAddress));
          break;
        }
        dnsServerNameIps.push(util.format($('%s (%s)'), dnsServer.Name, dnsServer.IPAddress));
      }

      if (!vnetInput.dnsServerId) {
        log.error(util.format($('A DNS Server with name Identifier %s not found'), options.dnsServerId));
        if (dnsServerNameIps.length > 0) {
          log.help($('You have following DNS Servers registered:'));
          for (var k = 0; k < dnsServerNameIps.length; k++) {
            log.help(dnsServerNameIps[k]);
          }
        }

        log.help($('To register a new DNS Server see the command "azure network dnsserver register"'));
        throw new Error($('DNS Server with the Name Identifier not found'));
      }
    }

    var result;
    var progress = cli.interaction.progress($('Getting or creating affinity group'));
    try {
      result = getOrCreateAffinityGroupIfRequired(options, _);
    } finally {
      progress.end();
    }

    if (result.agName) {
      log.info(util.format($('Using affinity group %s'), result.agName));
      vnetInput.affinityGroup = result.agName;
    } else {
      vnetInput.location = result.location;
    }

    var virtualNetworkSite = getVirtualNetworkSiteObject(vnetInput);
    if (!vnetConfiguration.VirtualNetworkSites) {
      vnetConfiguration.VirtualNetworkSites = [];
    }
    vnetConfiguration.VirtualNetworkSites.push(virtualNetworkSite);

    progress = cli.interaction.progress($('Updating Network Configuration'));
    try {
      setNetworkConfig(options, networkConfiguration, _);
    } finally {
      progress.end();
    }
  }

  function checkStaticIP(vnet, ipAddress, options, _) {
    vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
    ipAddress = cli.interaction.promptIfNotGiven($('Static IP address: '), ipAddress, _);

    var networkManagementClient = createNetworkManagementClient(options);

    var progress = cli.interaction.progress($('Checking static IP address'));
    var response;
    try {
      response = networkManagementClient.staticIPs.check(vnet, ipAddress, _);
    } finally {
      progress.end();
    }

    var output = {
      isAvailable: response.isAvailable,
      availableAddresses: response.availableAddresses
    };

    cli.interaction.formatOutput(output, function (outputData) {
      if (outputData.length === 0) {
        log.info($('No static IP addresses found'));
      } else {
        utils.logLineFormat(outputData, log.data);
      }
    });
  }

  function listReservedIP(options, _) {
    var reservedIPs;
    var progress = cli.interaction.progress($('Getting reserved IP addresses'));
    try {
      reservedIPs = getReservedIPs(options, _);
    } finally {
      progress.end();
    }

    cli.interaction.formatOutput(reservedIPs, function (outputData) {
      if (outputData.length === 0) {
        log.info($('No reserved IP addresses found'));
      } else {
        log.table(outputData, function (row, reservedIP) {
          row.cell($('Name'), reservedIP.name);
          row.cell($('Address'), reservedIP.address);
          row.cell($('Location'), reservedIP.location);
          row.cell($('Label'), reservedIP.label ? reservedIP.label : '');
        });
      }
    });
  }

  function showReservedIP(name, options, _) {
    var reservedIPs;
    var progress = cli.interaction.progress($('Getting reserved IP addresses'));
    try {
      reservedIPs = getReservedIPs(options, _);
    } finally {
      progress.end();
    }

    if (reservedIPs) {
      var reservedIP = null;
      for (var i = 0; i < reservedIPs.length; i++) {
        if (utils.ignoreCaseEquals(reservedIPs[i].name, name)) {
          reservedIP = reservedIPs[i];
          break;
        }
      }

      cli.interaction.formatOutput(reservedIP, function (outputData) {
        if (outputData) {
          utils.logLineFormat(outputData, log.data);
        } else {
          log.warn(util.format($('Reserved IP address with name %s not found'), name));
        }
      });
    } else {
      cli.interaction.formatOutput(null, function () {
        log.warn(util.format($('Reserved IP address with name %s not found'), name));
      });
    }
  }

  function deleteReservedIP(name, options, _) {
    var networkManagementClient = createNetworkManagementClient(options);
    var progress;

    try {
      if (!options.quiet) {
        // Ensure the reserved IP address exists before prompting for confirmation
        progress = cli.interaction.progress($('Looking up reserved IP address'));
        networkManagementClient.reservedIPs.get(name, _);
        if (!cli.interaction.confirm(util.format($('Delete reserved IP address %s? [y/n] '), name), _))
          return;
      }

      progress = cli.interaction.progress($('Deleting reserved IP address'));
      networkManagementClient.reservedIPs.deleteMethod(name, _);
    } finally {
      progress.end();
    }
  }

  function createReservedIP(name, location, options, _) {
    var networkManagementClient = createNetworkManagementClient(options);

    var progress = cli.interaction.progress($('Creating reserved IP address'));
    var params = {
      name: name,
      location: location
    };

    if (options.label)
      params.label = options.label;

    try {
      networkManagementClient.reservedIPs.create(params, _);
    } finally {
      progress.end();
    }
  }

  function getVirtualNetworkSiteObject(vnetInput) {
    var virtualNetWorkSite = {
      Name: vnetInput.name,
      AddressSpace: [],
      Subnets: [],
      DnsServersRef: []
    };

    if (vnetInput.affinityGroup) {
      virtualNetWorkSite.AffinityGroup = vnetInput.affinityGroup;
    } else {
      virtualNetWorkSite.Location = vnetInput.location;
    }

    virtualNetWorkSite.AddressSpace.push(vnetInput.addressSpaceStartIP + '/' + vnetInput.cidr);
    virtualNetWorkSite.Subnets.push({
      AddressPrefix: vnetInput.subnetStartIP + '/' + vnetInput.subnetCidr,
      Name: vnetInput.subnetName
    });

    if (vnetInput.dnsServerId) {
      virtualNetWorkSite.DnsServersRef.push({
        Name: vnetInput.dnsServerId
      });
    }

    return virtualNetWorkSite;
  }

  function getOrCreateAffinityGroupIfRequired(options, callback) {
    var managementClient = createManagementClient(options);
    var progress = null;

    var _getLocations = function (locationsCallBack) {
      progress = cli.interaction.progress($('Getting locations'));
      managementClient.locations.list(function (error, response) {
        progress.end();
        locationsCallBack(error, response.locations);
      });
    };

    var _getAffinityGroups = function (locationsCallBack) {
      progress = cli.interaction.progress($('Getting affinity groups'));
      managementClient.affinityGroups.list(function (error, response) {
        progress.end();
        locationsCallBack(error, response.affinityGroups);
      });
    };

    var _affinityGroupSupportsPersistentVMRole = function (affinityGroup) {
      if (affinityGroup.capabilities.length === 0) {
        return false;
      }
      for (var i = 0; i < affinityGroup.capabilities.length; i++) {
        if (affinityGroup.capabilities[i] === 'PersistentVMRole') {
          return true;
        }
      }
      return false;
    };

    var _locationSupportsPersistentVMRole = function (location) {
      if (location.availableServices.length === 0) {
        return false;
      }
      for (var i = 0; i < location.availableServices.length; i++) {
        if (location.availableServices[i] === 'PersistentVMRole') {
          return true;
        }
      }
      return false;
    };

    var _showVNetHostHelp = function () {
      log.help($('You can either create a "regional VNet" using --location (recommended) or "affinity group specific VNet" using --location and --create-new-affinity-group (deprecated)'));
    };

    if (options.affinityGroup) {
      _getAffinityGroups(function (error, groups) {
        if (error) {
          return callback(error, null);
        }
        var affinityGroupName = options.affinityGroup.toLowerCase();
        var affinityGroup = null;
        for (var i = 0; i < groups.length; i++) {
          if (groups[i].name.toLowerCase() === affinityGroupName) {
            affinityGroup = groups[i];
            break;
          }
        }

        if (affinityGroup === null) {
          _showVNetHostHelp();
          return callback(
            util.format($('Affinity group with name "%s" not found'), options.affinityGroup),
            null
          );
        }

        if (!_affinityGroupSupportsPersistentVMRole(affinityGroup)) {
          log.error(util.format($('The given affinity group "%s" does not support PersistentVMRole service'), options.affinityGroup));
          log.help($('You should create virtual network in an affinity group that support PersistentVMRole service'));
          _showVNetHostHelp();
          var vmroleSupportedAffinityGroupNames = [];
          for (var j = 0; j < groups.length; j++) {
            if (_affinityGroupSupportsPersistentVMRole(groups[j])) {
              vmroleSupportedAffinityGroupNames.push(groups[j].name + ' (' + groups[j].location + ')');
            }
          }

          if (vmroleSupportedAffinityGroupNames.length > 0) {
            log.help($('Following affinity groups in your subscription supports PersistentVMRole service:'));
            for (var k = 0; k < vmroleSupportedAffinityGroupNames.length; k++) {
              log.help(vmroleSupportedAffinityGroupNames[k]);
            }
          } else {
            log.help($('There is no affinity groups in your subscription that supports PersistentVMRole service'));
          }

          _showVNetHostHelp();
          return callback(new Error($('affinity group does not support PersistentVMRole service')));
        }

        return callback(null, {
          agName: affinityGroup.name,
          location: affinityGroup.location,
          newAg: false
        });
      });
    } else {
      _getLocations(function (error, locations) {
        if (error) {
          return callback(error, null);
        }

        var locationName = options.location;
        var location = null;
        for (var i = 0; i < locations.length; i++) {
          if (utils.ignoreCaseEquals(locations[i].name, locationName)) {
            location = locations[i];
            break;
          }
        }

        if (location === null) {
          return callback(new Error(util.format($('Location with name "%s" not found'), options.location)));
        }

        if (!_locationSupportsPersistentVMRole(location)) {
          log.error(util.format($('The given location "%s" does not support PersistentVMRole service'), options.location));
          log.help($('You should create virtual network in a location that supports PersistentVMRole service'));

          var vmroleSupportedLocationNames = [];
          for (var j = 0; j < locations.length; j++) {
            if (_locationSupportsPersistentVMRole(locations[j])) {
              vmroleSupportedLocationNames.push(locations[j].name);
            }
          }

          if (vmroleSupportedLocationNames.length > 0) {
            log.help($('Following locations supports PersistentVMRole service:'));
            for (var k = 0; k < vmroleSupportedLocationNames.length; k++) {
              log.help(vmroleSupportedLocationNames[k]);
            }
          }

          return callback(new Error($('location does not support PersistentVMRole service')));
        }

        if (options.createNewAffinityGroup) {
          var agName = 'AG-CLI-' + crypto.randomBytes(8).toString('hex');
          var affinityGroupOptions = {
            name: agName,
            location: location.name,
            label: agName + '_' + location.name
          };

          progress = cli.interaction.progress(util.format($('Creating new affinity group %s'), agName));
          managementClient.affinityGroups.create(affinityGroupOptions, function (error) {
            progress.end();
            if (error) {
              return callback(error, null);
            }
            return callback(null, {
              agName: agName,
              location: location.name,
              newAg: true
            });
          });
        } else {
          return callback(null, {
            agName: null,
            location: location.name,
            newAg: false
          });
        }
      });
    }
  }

  function getNetworkConfig(options, callback) {
    var networkManagementClient = createNetworkManagementClient(options);
    var vnetUtil = new VNetUtil();

    var progress = cli.interaction.progress($('Getting network configuration'));
    networkManagementClient.networks.getConfiguration(function (error, response) {
      progress.end();
      if (error) {
        if (error.statusCode === 404) {
          return callback(null, vnetUtil.getNewNetworkConfigObj());
        }

        return callback(error, response);
      } else {
        var networkConfiguration = vnetUtil.getNetworkConfigObj(response.configuration);
        return callback(null, networkConfiguration);
      }
    });
  }

  function setNetworkConfig(options, networkConfiguration, callback) {
    var networkManagementClient = createNetworkManagementClient(options);
    var vnetUtil = new VNetUtil();

    var xmlString = vnetUtil.getNetworkConfigXml(networkConfiguration);

    var networkParams = {
      configuration: xmlString
    };

    networkManagementClient.networks.setConfiguration(networkParams, function (error) {
      return callback(error);
    });
  }

  function getVirtualNetworkSites(options, callback) {
    var networkManagementClient = createNetworkManagementClient(options);

    networkManagementClient.networks.list(function (error, response) {
      if (error) {
        return callback(error, response);
      } else {
        return callback(null, response.virtualNetworkSites);
      }
    });
  }

  function getReservedIPs(options, callback) {
    var networkManagementClient = createNetworkManagementClient(options);

    networkManagementClient.reservedIPs.list(function (error, response) {
      if (error) {
        return callback(error, response);
      } else {
        return callback(null, response.reservedIPs);
      }
    });
  }

  function createNetworkManagementClient(options) {
    return utils.createNetworkClient(profile.current.getSubscription(options.subscription));
  }

  function createManagementClient(options) {
    return utils.createManagementClient(profile.current.getSubscription(options.subscription));
  }

  exports.getNetworkConfig = getNetworkConfig;
  exports.setNetworkConfig = setNetworkConfig;
  exports.getVirtualNetworkSiteObject = getVirtualNetworkSiteObject;
};
