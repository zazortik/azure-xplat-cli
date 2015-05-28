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
var constants = require('./constants');
var NetworkClient = require('./networkClient');

var $ = utils.getLocaleString;

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
    '\n     For example -a 10.0.0.0/24,10.0.1.0/24.' +
    '\n     Default value is 10.0.0.0/8'))
    .option('-d, --dns-servers <dns-servers>', $('the comma separated list of DNS servers IP addresses'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, name, location, options, _);
    });

  vnet.command('set [resource-group] [name]')
    .description('Set virtual network')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes for this virtual network.' +
    '\n     For example -a 10.0.0.0/24,10.0.1.0/24.' +
    '\n     This list will be appended to the current list of address prefixes.' +
    '\n     The address prefixes in this list should not overlap between them.' +
    '\n     The address prefixes in this list should not overlap with existing address prefixes in the vnet.'))
    .option('-d, --dns-servers [dns-servers]', $('the comma separated list of DNS servers IP addresses.' +
    '\n     This list will be appended to the current list of DNS server IP addresses.'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional. For example, -t "tag1=value1;tag2".' +
    '\n     Existing tag values will be replaced by the values specified.'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setVNet(resourceGroup, name, options, _);
    });

  vnet.command('list [resource-group]')
    .description('Get all virtual networks')
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVNet(resourceGroup, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVNet(resourceGroup, name, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage virtual network subnets'));

  subnet.command('create [resource-group] [vnet-name] [name]')
    .description($('Create virtual network subnet'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-w, --network-security-group-id <network-security-group-id>', $('the network security group identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>'))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createSubnet(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('set [resource-group] [vnet-name] [name]')
    .description($('Set a virtual network subnet'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-a, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-w, --network-security-group-id [network-security-group-id]', $('the network security group identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>'))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setSubnet(resourceGroup, vnetName, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listSubnets(resourceGroup, vnetName, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSubnet(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('delete [resource-group] [vnet-name] [name]')
    .description($('Delete a subnet of a virtual network'))
    .usage('[options] <resource-group> <vnet-name> <subnet-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-e, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the subnet name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('Subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteSubnet(resourceGroup, vnetName, name, options, _);
    });

  var lb = network.category('lb')
    .description($('Commands to manage load balancers'));

  lb.command('create [resource-group] [name] [location]')
    .description($('Create a load balancer'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional. For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createLoadBalancer(resourceGroup, name, location, options, _);
    });

  lb.command('list [resource-group]')
    .description($('Get all load balancers'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLoadBalancers(resourceGroup, options, _);
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
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showLoadBalancer(resourceGroup, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancer(resourceGroup, name, options, _);
    });

  var probe = lb.category('probe')
    .description($('Commands to manage probes of a load balancer'));

  probe.command('create [resource-group] [lb-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createProbe(resourceGroup, lbName, name, options, _);
    });

  probe.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set a probe of a load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the probe'))
    .option('-e, --new-probe-name <new-probe-name>', $('the new name of the probe'))
    .option('-p, --protocol <protocol>', $('the new value for probe protocol'))
    .option('-o, --port <port>', $('the new value for probe port'))
    .option('-f, --path <path>', $('the new value for probe path'))
    .option('-i, --interval <interval>', $('the new value for probe interval in seconds'))
    .option('-c, --count <count>', $('the new value for number of probes'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setProbe(resourceGroup, lbName, name, options, _);
    });

  probe.command('list [resource-group] [lb-name]')
    .description($('Get all probes in a load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listProbes(resourceGroup, lbName, options, _);
    });

  probe.command('delete [resource-group] [lb-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteProbe(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerFrontendIp = lb.category('frontend-ip')
    .description('Commands to manage frontend ip configurations of a load balancer');

  loadBalancerFrontendIp.command('create [resource-group] [lb-name] [name]')
    .description($('Add a frontend ip configuration to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-u, --public-ip-id <public-ip-id>', $('the public ip identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip name.' +
    '\n     This public ip must exist in the same resource group as the lb.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-b, --subnet-id <subnet-id>', $('the subnet id.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/VirtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-e, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --vnet-name <vnet-name>', $('the virtual network name.' +
    '\n     This virtual network must exist in the same resource group as the lb.' +
    '\n     Please use subnet-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend ip configuration name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  loadBalancerFrontendIp.command('set [resource-group] [lb-name] [name]')
    .description($('Set a frontend ip configuration of a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-u, --public-ip-id [public-ip-id]', $('the public ip identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip name.' +
    '\n     This public ip must exist in the same resource group as the lb.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-b, --subnet-id [subnet-id]', $('the subnet id.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/VirtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-e, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --vnet-name <vnet-name>', $('the virtual network name.' +
    '\n     This virtual network must exist in the same resource group as the lb.' +
    '\n     Please use subnet-id if that is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Frontend ip configuration name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  loadBalancerFrontendIp.command('list [resource-group] [lb-name]')
    .description($('Get all frontend ip configurations in the load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listFrontEndIPConfigs(resourceGroup, lbName, options, _);
    });

  loadBalancerFrontendIp.command('delete [resource-group] [lb-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerAddressPool = lb.category('address-pool')
    .description('Commands to manage backend address pools of a load balancer');

  loadBalancerAddressPool.command('create [resource-group] [lb-name] [name]')
    .description($('Add an address pool to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  loadBalancerAddressPool.command('list [resource-group] [lb-name]')
    .description($('Get all address pools in the load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listBackendAddressPools(resourceGroup, lbName, options, _);
    });

  loadBalancerAddressPool.command('delete [resource-group] [lb-name] [name]')
    .description($('Delete an address pool from a load balancer'))
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerRule = lb.category('rule')
    .description($('Commands to manage load balancer rules'));

  loadBalancerRule.command('create [resource-group] [lb-name] [name]')
    .description($('Add a load balancing rule to a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-a, --probe-name <probe-name>', $('the name of the probe defined in the same load balancer'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration in the same load balancer'))
    .option('-o, --backend-address-pool <backend-address-pool>', $('name of the backend address pool defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  loadBalancerRule.command('set [resource-group] [lb-name] [name]')
    .description($('Set a load balancing rule of a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-r, --new-rule-name <new-rule-name>', $('new rule name'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout specified in minutes'))
    .option('-a, --probe-name [probe-name]', $('the name of the probe defined in the same load balancer'))
    .option('-t, --frontend-ip-name <frontend-ip-name>', $('the name of the frontend ip configuration in the same load balancer'))
    .option('-o, --backend-address-pool <backend-address-pool>', $('name of the backend address pool defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  loadBalancerRule.command('list [resource-group] [lb-name]')
    .description($('Get all load balancing rules of a load balancer'))
    .usage('[options] <resource-group> <lb-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLoadBalancerRules(resourceGroup, lbName, options, _);
    });

  loadBalancerRule.command('delete [resource-group] [lb-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  var inboundNatRule = lb.category('inbound-nat-rule')
    .description($('Commands to manage load balancer inbound NAT rules'));

  inboundNatRule.command('create [resource-group] [lb-name] [name]')
    .description($('Add a load balancing inbound NAT rule to the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.inboundNatRuleProtocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), constants.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), constants.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip [true,false]'))
    .option('-i, --frontend-ip <frontend-ip>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  inboundNatRule.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set a load balancing inbound NAT rule of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.inboundNatRuleProtocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), constants.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), constants.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip [true,false]'))
    .option('-i, --frontend-ip <frontend-ip>', $('the name of the frontend ip configuration'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  inboundNatRule.command('list [resource-group] [lb-name]')
    .usage('[options] <resource-group> <lb-name>')
    .description($('Get all load balancing inbound NAT rules of load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listInboundNatRules(resourceGroup, lbName, options, _);
    });

  inboundNatRule.command('delete [resource-group] [lb-name] [name]')
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
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteInboundNatRule(resourceGroup, lbName, name, options, _);
    });

  var publicip = network.category('public-ip')
    .description($('Commands to manage public ip addresses'));

  publicip.command('create [resource-group] [name] [location]')
    .description($('Create a public ip'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-l, --location <location>', $('the location'))
    .option('-d, --domain-name-label <domain-name-label>', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the allocation method [Static][Dynamic]'))
    .option('-i, --idletimeout <idletimeout>', $('the idle timeout specified in minutes'))
    .option('-f, --reverse-fqdn <reverse-fqdn>', $('the reverse fqdn'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, location, options, _);
    });

  publicip.command('set [resource-group] [name]')
    .description($('Set a public ip'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-d, --domain-name-label [domain-name-label]', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the allocation method [Static][Dynamic]'))
    .option('-i, --idletimeout <idletimeout>', $('the idle timeout specified in minutes'))
    .option('-f, --reverse-fqdn [reverse-fqdn]', $('the reverse fqdn'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     Existing tag values will be replaced by the values specified.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('list [resource-group]')
    .description($('Get all public ips'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listPublicIPs(resourceGroup, options, _);
    });

  publicip.command('show [resource-group] [name]')
    .description($('Get a public ip'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public IP'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('delete [resource-group] [name]')
    .description($('Delete a public ip'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public IP'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deletePublicIP(resourceGroup, name, options, _);
    });

  var nic = network.category('nic')
    .description($('Commands to manage network interfaces'));

  nic.command('create [resource-group] [name] [location]')
    .description($('Create a network interface'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-l, --location <location>', $('the location'))
    .option('-w, --network-security-group-id <network-security-group-id>', $('the network security group identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>'))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name.' +
    '\n     This network security group must exist in the same resource group as the nic.' +
    '\n     Please use network-security-group-id if that is not the case.'))
    .option('-i, --public-ip-id <public-ip-id>', $('the public IP identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-p, --public-ip-name <public-ip-name>', $('the public IP name.' +
    '\n     This public ip must exist in the same resource group as the nic.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private IP address'))
    .option('-u, --subnet-id <subnet-id>', $('the subnet identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/virtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-k, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-d, --lb-address-pool-ids <lb-address-pool-ids>', $('the comma separated list of load balancer address pool identifiers' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/backendAddressPools/<address-pool-name>'))
    .option('-e, --lb-inbound-nat-rule-ids <lb-inbound-nat-rule-ids>', $('the comma separated list of load balancer inbound NAT rule identifiers' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/inboundNatRules/<nat-rule-name>'))
    .option('-t, --tags <tags>', $('the comma seperated list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNIC(resourceGroup, name, location, options, _);
    });

  nic.command('set [resource-group] [name]')
    .description($('Set a network interface'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-w, --network-security-group-id [network-security-group-id]>', $('the network security group identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkSecurityGroups/<nsg-name>'))
    .option('-o, --network-security-group-name <network-security-group-name>', $('the network security group name.' +
    '\n     This network security group must exist in the same resource group as the nic.' +
    '\n     Please use network-security-group-id if that is not the case.'))
    .option('-i, --public-ip-id [public-ip-id]', $('the public IP identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-p, --public-ip-name <public-ip-name>', $('the public IP name.' +
    '\n     This public ip must exist in the same resource group as the nic.' +
    '\n     Please use public-ip-id if that is not the case.'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private IP address'))
    .option('-u, --subnet-id <subnet-id>', $('the subnet identifier.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/virtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-k, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-m, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-d, --lb-address-pool-ids [lb-address-pool-ids]', $('the comma separated list of load balancer address pool identifiers' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/backendAddressPools/<address-pool-name>'))
    .option('-e, --lb-inbound-nat-rule-ids [lb-inbound-nat-rule-ids]', $('the comma separated list of load balancer inbound NAT rule identifiers' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/inboundNatRules/<nat-rule-name>'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     Existing tag values will be replaced by the values specified.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setNIC(resourceGroup, name, options, _);
    });

  nic.command('list [resource-group]')
    .description($('Get all network interfaces'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNICs(resourceGroup, options, _);
    });

  nic.command('show [resource-group] [name]')
    .description($('Get a network interface'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNIC(resourceGroup, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNIC(resourceGroup, name, options, _);
    });

  var nicAddressPool = nic.category('address-pool')
    .description($('Commands to manage backend address pools of the NIC'));

  nicAddressPool.command('add [resource-group] [name]')
    .description($('Add a backend address pool to a NIC'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-address-pool-id  <lb-address-pool-id>', $('the load balancer address pool identifier' +
    '\n   e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/backendAddressPools/<address-pool-name>'))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.' +
    '\n   Please use --lb-address-pool-id if that is not the case.' +
    '\n   This parameter will be ignored if --lb-address-pool-id is specified'))
    .option('-a, --address-pool-name <address-pool-name>', $('the name of the address pool that exists in the load balancer identified by --lb-name' +
    '\n   This parameter will be ignored if --lb-address-pool-id is specified'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addAddressPoolToNic(resourceGroup, name, options, _);
    });

  nicAddressPool.command('remove [resource-group] [name]')
    .description($('Remove a backend address pool from a NIC'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --lb-address-pool-id  <lb-address-pool-id>', $('the load balancer address pool identifier' +
    '\n   e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/backendAddressPools/<address-pool-name>'))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exist in the same resource group as the NIC.' +
    '\n   Please use --lb-address-pool-id if that is not the case.' +
    '\n   This parameter will be ignored if --lb-address-pool-id is specified'))
    .option('-a, --address-pool-name <address-pool-name>', $('the name of the address pool that exists in the load balancer identified by --lb-name' +
    '\n   This parameter will be ignored if --lb-address-pool-id is specified'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeAddressPoolFromNic(resourceGroup, name, options, _);
    });

  var nicInboundRule = nic.category('inbound-nat-rule')
    .description($('Commands to manage inbound rules of the network interface'));

  nicInboundRule.command('add [resource-group] [name]')
    .description($('Add an inbound NAT rule to a NIC'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --inbound-nat-rule-id <inbound-nat-rule-id>', $('the inbound NAT rule identifier.' +
    '\n   e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/inboundNatRules/<nat-rule-name>'))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.' +
    '\n   Please use --inbound-nat-rule-id if that is not the case.' +
    '\n   This parameter will be ignored if --inbound-nat-rule-id is specified'))
    .option('-r, --inbound-nat-rule-name <inbound-nat-rule-name>', $('the name of the NAT rule that exists in the load balancer identified by --lb-name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addInboundRuleToNic(resourceGroup, name, options, _);
    });

  nicInboundRule.command('remove [resource-group] [name]')
    .description($('Remove an inbound NAT rule from a NIC'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network interface'))
    .option('-i, --inbound-nat-rule-id <inbound-nat-rule-id>', $('the inbound NAT rule identifier.' +
    '\n   e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/loadbalancers/<lb-name>/inboundNatRules/<nat-rule-name>'))
    .option('-l, --lb-name <lb-name>', $('the load balancer name.' +
    '\n   This load balancer must exists in the same resource group as the NIC.' +
    '\n   Please use --inbound-nat-rule-id if that is not the case.' +
    '\n   This parameter will be ignored if --inbound-nat-rule-id is specified'))
    .option('-r, --inbound-nat-rule-name <inbound-nat-rule-name>', $('the name of the NAT rule that exists in the load balancer identified by --lb-name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeInboundRuleFromNic(resourceGroup, name, options, _);
    });

  var nsg = network.category('nsg')
    .description($('Commands to manage network security groups'));

  nsg.command('create [resource-group] [name] [location]')
    .description($('Create a network security group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNSG(resourceGroup, name, location, options, _);
    });

  nsg.command('set [resource-group] [name]')
    .description($('Set a network security group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     Existing tag values will be replaced by the values specified.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setNSG(resourceGroup, name, options, _);
    });

  nsg.command('list [resource-group]')
    .description($('Get all network security groups'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNSGs(resourceGroup, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNSG(resourceGroup, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNSG(resourceGroup, name, options, _);
    });

  var nsgRules = nsg.category('rule')
    .description($('Commands to manage network security group rules'));

  nsgRules.command('create [resource-group] [nsg-name] [name]')
    .description($('Create a network security group rule'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-d, --description <description>', $('the description'))
    .option('-p, --protocol <protocol>', util.format($('the protocol [%s]'), constants.protocols))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', util.format($('the source port range %s'), constants.toRange(constants.portBounds)))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', util.format($('the destination port range %s'), constants.toRange(constants.portBounds)))
    .option('-c, --access <access>', util.format($('the access mode [%s]'), constants.accessModes))
    .option('-y, --priority <priority>', util.format($('the priority'), constants.toRange(constants.priorityBounds)))
    .option('-r, --direction <direction>', util.format($('the direction [%s]'), constants.directionModes))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the security rule: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNsgRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRules.command('set [resource-group] [nsg-name] [name]')
    .description($('Set a network security group rule'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-d, --description [description]', $('the description'))
    .option('-p, --protocol <protocol>', util.format($('the protocol [%s]'), constants.protocols))
    .option('-f, --source-address-prefix <source-address-prefix>', $('the source address prefix'))
    .option('-o, --source-port-range <source-port-range>', util.format($('the source port range %s'), constants.toRange(constants.portBounds)))
    .option('-e, --destination-address-prefix <destination-address-prefix>', $('the destination address prefix'))
    .option('-u, --destination-port-range <destination-port-range>', util.format($('the destination port range %s'), constants.toRange(constants.portBounds)))
    .option('-c, --access <access>', util.format($('the access mode [%s]'), constants.accessModes))
    .option('-y, --priority <priority>', util.format($('the priority'), constants.toRange(constants.priorityBounds)))
    .option('-r, --direction <direction>', util.format($('the direction [%s]'), constants.directionModes))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the security rule: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setNsgRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRules.command('list [resource-group] [nsg-name]')
    .description($('Get all rules in a network security group'))
    .usage('[options] <resource-group> <nsg-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --nsg-name <nsg-name>', $('the name of the network security group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNsgRules(resourceGroup, nsgName, options, _);
    });

  nsgRules.command('show [resource-group] [nsg-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNsgRule(resourceGroup, nsgName, name, options, _);
    });

  nsgRules.command('delete [resource-group] [nsg-name] [name]')
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNsgRule(resourceGroup, nsgName, name, options, _);
    });

  var dnsZone = network.category('dns-zone')
      .description($('Commands to manage DNS zone'));

  dnsZone.command('create [resource-group] [name]')
    .description($('Create a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
      .option('-t, --tags <tags>', $('the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createDnsZone(resourceGroup, name, options, _);
    });

  dnsZone.command('set [resource-group] [name]')
    .description($('Set a DNS zone'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the DNS zone'))
    .option('-t, --tags <tags>', $('the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     Existing tag values will be replaced by the values specified.' +
      '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setDnsZone(resourceGroup, name, options, _);
    });

  dnsZone.command('list [resource-group]')
    .description($('Get all DNS zones'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listDnsZones(resourceGroup, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showDnsZone(resourceGroup, name, options, _);
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

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteDnsZone(resourceGroup, name, options, _);
    });

  var dnsRecordSet = network.category('dns-record-set')
    .description($('Commands to manage record sets in DNS zone'));

  dnsRecordSet.command('create [resource-group] [dns-zone-name] [name] [type]')
    .description($('Create a DNS zone record set'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live specified in seconds'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createDnsRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('set [resource-group] [dns-zone-name] [name] [type]')
    .description($('Set a DNS zone record set'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live specified in seconds'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     Existing tag values will be replaced by the values specified.' +
      '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setDnsRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('list [resource-group] [dns-zone-name] [type]')
    .description($('Get all record sets in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> [type]')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     If specified only record sets of this type will be listed.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      options.type = type || options.type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listDnsRecordSets(resourceGroup, dnsZoneName, options, _);
    });

  dnsRecordSet.command('show [resource-group] [dns-zone-name] [name] [type]')
    .description($('Get a record set in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, type, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showDnsRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('delete [resource-group] [dns-zone-name] [name] [type]')
    .description($('Delete a record set from a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
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
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteDnsRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('add-record [resource-group] [dns-zone-name] [record-set-name] [type]')
    .description($('Add a record in a record set under a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <record-set-name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
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
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addDnsRecord(resourceGroup, dnsZoneName, recordSetName, options, _);
    });

  dnsRecordSet.command('delete-record [resource-group] [dns-zone-name] [record-set-name] [type]')
    .description($('Delete a record from a record set under a DNS zone'))
    .usage('[options] <resource-group> <dns-zone> <record-set-name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
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
      type = cli.interaction.promptIfNotGiven($('Type: '), type, _);
      options.type = type;

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteDnsRecord(resourceGroup, dnsZoneName, recordSetName, options, _);
    });

  var traffic = network.category('traffic-manager')
    .description($('Commands to manage traffic manager'));

  var profile = traffic.category('profile')
    .description($('Commands to manage traffic manager profile'));

  profile.command('create [resource-group] [name]')
    .description($('Create a traffic manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', $('the profile status, valid values are' +
    '\n     [Enabled, Disabled], default is Enabled'))
    .option('-m, --traffic-routing-method <traffic-routing-method>', $('the traffic routing method for the profile,' +
    '\n     valid values are [Performance, Weighted, Priority]'))
    .option('-r, --relative-dns-name <relative-dns-name>', $('relative DNS name of the profile e.g. .trafficmanager.net'))
    .option('-l  --ttl <ttl>', $('time to live in specified in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', $('the source address prefix, valid values are [http, https]'))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags <tags>', $('the tags set on this profile. Can be ' +
    '\n     multiple, in the format of \'name=value\'.' +
    '\n     Name is required and value is optional. ' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, name, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);
      options.relativeDnsName = cli.interaction.promptIfNotGiven($('Relative DNS name of the profile, e.g. .trafficmanager.net: '), options.relativeDnsName, _);
      options.monitorPath = cli.interaction.promptIfNotGiven($('Monitor path: '), options.monitorPath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createTrafficManager(resourceGroupName, name, options, _);
    });

  profile.command('set [resource-group] [name]')
    .description($('Set a traffic manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', $('the profile status, valid values are' +
    '\n     [Enabled, Disabled], default is Enabled'))
    .option('-m, --traffic-routing-method <traffic-routing-method>', $('the traffic routing method for the profile,' +
    '\n     valid values are [Performance, Weighted, Priority]'))
    .option('-l  --ttl <ttl>', $('time to live specified in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', $('the source address prefix, valid values are [http, https]'))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags <tags>', $('the tags set on this profile. Can be ' +
    '\n     multiple, in the format of \'name=value\'.' +
    '\n     Name is required and value is optional. ' +
    '\n     Existing tag values will be replaced by the values specified.' +
    '\n     For example, -t "tag1=value1;tag2"'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, name, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setTrafficManager(resourceGroupName, name, options, _);
    });

  profile.command('list [resource-group]')
    .description($('Get all traffic manager profiles'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listTrafficManagers(resourceGroupName, options, _);
    });

  profile.command('show [resource-group] [name]')
    .description($('Get a traffic manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, name, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showTrafficManager(resourceGroupName, name, options, _);
    });

  profile.command('delete [resource-group] [name]')
    .description($('Delete a traffic manager profile'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, name, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteTrafficManager(resourceGroupName, name, options, _);
    });

  profile.command('is-dns-available [resource-group] [relative-dns-name]')
    .description($('Checks whether the specified DNS prefix is available for creating a traffic manager profile'))
    .usage('[options] <resource-group> <relative-dns-name> ')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --relative-dns-name <relative-dns-name>', $('the relative DNS name to check for availability'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, relativeDnsName, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      relativeDnsName = cli.interaction.promptIfNotGiven($('Relative DNS name: '), relativeDnsName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.checkDNSNameAvailability(resourceGroupName, relativeDnsName, options, _);
    });

  var endpoint = profile.category('endpoint')
    .description($('Commands to manage traffic manager endpoints'));

  endpoint.command('create [resource-group] [profile-name] [name]')
    .description($('Create an endpoint in traffic manager profile'))
    .usage('[options] <resource-group> <profile-name> <name> <endpoint-location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-l, --endpoint-location <endpoint-location>', $('the location of the endpoint'))
    .option('-y, --type <type>', $('the endpoint type, valid values are:' +
    '\n       [externalEndpoint] externalEndpoint represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'))
    .option('-e, --target <target>', $('the domain name target of the endpoint,' +
    '\n       e.g. foobar.contoso.com'))
    .option('-u, --endpoint-status <endpoint-status>', util.format($('the endpoint status, valid values are:' +
    '\n       [%s] Default is %s'), constants.TM_VALID_ENDPOINT_STATUSES, constants.TM_VALID_ENDPOINT_STATUSES[0]))
    .option('-w, --weight <weight>', $('the endpoint weight used in the load balancing algorithm'))
    .option('-p, --priority <priority>', $('the endpoint priority used in the load balancing algorithm,' +
    '\n       valid range is [1, 1000]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, endpointLocation, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);
      options.target = cli.interaction.promptIfNotGiven($('Endpoint target: '), options.target, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createTrafficManagerEndpoint(resourceGroup, profileName, name, endpointLocation, options, _);
    });

  endpoint.command('set [resource-group] [profile-name] [name]')
    .description($('Set an endpoint in a traffic manager profile'))
    .usage('[options] <resource-group> <profile-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-y, --type <type>', $('the endpoint type, valid values are:' +
    '\n       [externalEndpoint] externalEndpoint represents endpoint' +
    '\n       for a service with FQDN external to Azure' +
    '\n       e.g. foobar.contoso.com'))
    .option('-e, --target <target>', $('the domain name target of the endpoint,' +
    '\n       e.g. foobar.contoso.com'))
    .option('-u, --endpoint-status <endpoint-status>', util.format($('the endpoint status, valid values are:' +
    '\n       [%s] Default is %s'), constants.TM_VALID_ENDPOINT_STATUSES, constants.TM_VALID_ENDPOINT_STATUSES[0]))
    .option('-w, --weight <weight>', $('the endpoint weight used in the load balancing algorithm'))
    .option('-p, --priority <priority>', $('the endpoint priority used in the load balancing algorithm,' +
    '\n       valid range is [1, 1000]'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setTrafficManagerEndpoint(resourceGroup, profileName, name, options, _);
    });

  endpoint.command('delete [resource-group] [profile-name] [name]')
    .description($('Delete an endpoint from a traffic manager profile'))
    .usage('[options] <resource-group> <profile-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-f, --profile-name <profile-name>', $('the profile name'))
    .option('-n, --name <name>', $('the name of the endpoint'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, profileName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      profileName = cli.interaction.promptIfNotGiven($('Profile name: '), profileName, _);
      name = cli.interaction.promptIfNotGiven($('Endpoint name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteTrafficManagerEndpoint(resourceGroup, profileName, name, options, _);
    });
};