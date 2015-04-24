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
    .description('Creates virtual network within a resource group')
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
    '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, name, location, options, _);
    });

  vnet.command('set [resource-group] [name]')
    .description('Sets virtual network configuration within a resource group')
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
    '\n     Name is required and value is optional. For example, -t tag1=value1;tag2.' +
    '\n     This list will be appended to the current list of tags'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setVNet(resourceGroup, name, options, _);
    });

  vnet.command('list [resource-group]')
    .description('Lists virtual networks within a resource group')
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
    });

  vnet.command('show [resource-group] [name]')
    .description('Shows details about a virtual network within a resource group')
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
    .description('Deletes a virtual network within a resource group')
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
    .description($('Creates virtual network subnet within a resource group'))
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
    .description($('Sets virtual network subnet within a resource group'))
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
    .description($('Lists virtual network subnets within a resource group'))
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
    .description($('Shows details about a virtual network subnet within a resource group'))
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
    .description($('Deletes a virtual network subnet within a resource group'))
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
    .description($('Creates the load balancer within a resource group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the load balancer'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createLoadBalancer(resourceGroup, name, location, options, _);
    });

  lb.command('list [resource-group]')
    .description($('Lists the load balancers within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLoadBalancers(resourceGroup, options, _);
    });

  lb.command('show [resource-group] [name]')
    .description($('Shows details about a load balancer within a resource group'))
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
    .description($('Deletes one load balancer within a resource group'))
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
    .description($('Adds a new probe to the list of probes in the load balancer within a resource group'))
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
    .description($('Sets an existing probe in the load balancer within a resource group'))
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
    .description($('Lists probes in the load balancer within a resource group'))
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
    .description($('Deletes a probe from list of probes in the load balancer within a resource group'))
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
    .description($('Adds a frontend ip configuration to the load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-o, --private-ip-allocation-method <private-ip-allocation-method>', $('the private ip allocation method [Static, Dynamic]'))
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
    .description($('Sets a frontend ip configuration in a load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-o, --private-ip-allocation-method <private-ip-allocation-method>', $('the private ip allocation method [Static, Dynamic]'))
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
      networkClient.updateFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  loadBalancerFrontendIp.command('list [resource-group] [lb-name]')
    .description($('Lists frontend ip configurations in the load balancer within a resource group'))
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
    .description($('Deletes a frontend ip configuration from a load balancer within a resource group'))
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
    .description($('Adds a new address pool to the load balancer within a resource group'))
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

  loadBalancerAddressPool.command('add [resource-group] [lb-name] [name]')
    .description($('Attaches an existing NIC to an address pool in the load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-i, --vm-id <vm-id>', $('the virtual machine identifier.' +
    '\n     e.g. "/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>,/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>"'))
    .option('-m, --vm-name <vm-name>', $('the name of the virtual machine'))
    .option('-d, --nic-id <nic-id>', $('the network interface identifier.' +
    '\n     e.g. ""/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkInterfaces/<nic-name>"'))
    .option('-a, --nic-name <nic-name>', $('the name of the network interface'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addNicToBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  loadBalancerAddressPool.command('remove [resource-group] [lb-name] [name]')
    .description($('Detaches an existing NIC from an address pool in the load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the backend address pool'))
    .option('-i, --vm-id <vm-id>', $('the virtual machine identifier.' +
    '\n     e.g. "/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>,/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>"'))
    .option('-m, --vm-name <vm-name>', $('the name of the virtual machine'))
    .option('-d, --nic-id <nic-id>', $('the network interface identifier.' +
    '\n     e.g. ""/subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/networkInterfaces/<nic-name>"'))
    .option('-a, --nic-name <nic-name>', $('the name of the network interface'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Backend address pool name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeNicFromBackendAddressPool(resourceGroup, lbName, name, options, _);
    });

  loadBalancerAddressPool.command('list [resource-group] [lb-name]')
    .description($('Lists address pools in the load balancer within a resource group'))
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
    .description($('Deletes an address pool from load balancer within a resource group'))
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
    .description($('Adds a new load balancing rule to the list of load balancer rules within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout in minutes'))
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
    .description($('Sets an existing load balancing rule configured in a load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-r, --new-rule-name <new-rule-name>', $('new rule name'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('the idle timeout in minutes'))
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
    .description($('Lists load balancing rules in load balancer within a resource group'))
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
    .description($('Deletes a load balancing rule from the list of load balancing rules within a resource group'))
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
    .description($('Adds a new load balancing inbound NAT rule to the load balancer within a resource group'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.inboundNatRuleProtocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), constants.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), constants.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip [true,false]'))
    .option('-i, --frontend-ip <frontend-ip>', $('the name of the frontend ip configuration'))
    .option('-m, --vm-id <vm-id>', $('the VM id.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>'))
    .option('-a, --vm-name <vm-name>', $('the VM name.This VM must exist in the same resource group as the lb.' +
    '\n     Please use vm-id if that is not the case.' +
    '\n     this parameter will be ignored if --vm-id is specified'))
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
    .description($('Sets an existing load balancing inbound NAT rule configured for the load balancer within a resource group'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', util.format($('the rule protocol [%s]'), constants.inboundNatRuleProtocols))
    .option('-f, --frontend-port <frontend-port>', util.format($('the frontend port %s'), constants.toRange(constants.portBounds)))
    .option('-b, --backend-port <backend-port>', util.format($('the backend port %s'), constants.toRange(constants.portBounds)))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip [true,false]'))
    .option('-i, --frontend-ip <frontend-ip>', $('the name of the frontend ip configuration'))
    .option('-m, --vm-id [vm-id]', $('the VM id.' +
    '\n     e.g. /subscriptions/<subscription-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Compute/virtualMachines/<vm-name>'))
    .option('-a, --vm-name <vm-name>', $('the VM name.' +
    '\n     This virtual machine must exist in the same resource group as the lb.' +
    '\n     Please use vm-id if that is not the case'))
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
    .description($('Lists load balancing inbound NAT rules in the load balancer within a resource group'))
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
    .description($('Deletes an existing load balancing inbound NAT rule configured for the load balancer within a resource group'))
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
    .description($('Creates a public ip within a resource group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-l, --location <location>', $('the location'))
    .option('-d, --domain-name-label <domain-name-label>', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the allocation method [Static][Dynamic]'))
    .option('-i, --idletimeout <idletimeout>', $('the idle timeout in minutes'))
    .option('-f, --reverse-fqdn <reverse-fqdn>', $('the reverse fqdn'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public IP name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, location, options, _);
    });

  publicip.command('set [resource-group] [name]')
    .description($('Sets a public ip within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the public ip'))
    .option('-d, --domain-name-label [domain-name-label]', $('the domain name label.' +
    '\n     This set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the allocation method [Static][Dynamic]'))
    .option('-i, --idletimeout <idletimeout>', $('the idle timeout in minutes'))
    .option('-f, --reverse-fqdn [reverse-fqdn]', $('the reverse fqdn'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('list [resource-group]')
    .description($('Lists public ip addresses within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listPublicIPs(resourceGroup, options, _);
    });

  publicip.command('show [resource-group] [name]')
    .description($('Shows details about a public ip address within a resource group'))
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
    .description($('Deletes a public ip address within a resource group'))
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
    .description($('Creates a network interface within a resource group'))
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
    .option('-t, --tags <tags>', $('the comma seperated list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNIC(resourceGroup, name, location, options, _);
    });

  nic.command('set [resource-group] [name]')
    .description($('Sets an existing network interface within a resource group'))
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
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setNIC(resourceGroup, name, options, _);
    });

  nic.command('list [resource-group]')
    .description($('Lists the network interfaces within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNICs(resourceGroup, options, _);
    });

  nic.command('show [resource-group] [name]')
    .description($('Shows the details of a network interface within a resource group'))
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
    .description($('Deletes a network interface within a resource group'))
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

  var nsg = network.category('nsg')
    .description($('Commands to manage network security groups'));

  nsg.command('create [resource-group] [name] [location]')
    .description($('Creates a network security group within a resource group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-l, --location <location>', $('the location'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNSG(resourceGroup, name, location, options, _);
    });

  nsg.command('set [resource-group] [name]')
    .description($('Sets a network security group within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the network security group'))
    .option('-t, --tags <tags>', $('the list of tags.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setNSG(resourceGroup, name, options, _);
    });

  nsg.command('list [resource-group]')
    .description($('Lists the network security groups within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNSGs(resourceGroup, options, _);
    });

  nsg.command('show [resource-group] [name]')
    .description($('Shows the details of a network security group within a resource group'))
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
    .description($('Deletes a network security group within a resource group'))
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
    .description($('Creates a network security group rule within a resource group'))
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
    .description($('Sets a network security group rule within a resource group'))
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
    .description($('Lists rules in a network security group within a resource group'))
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
    .description($('Shows a rule in a network security group within a resource group'))
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
    .description($('Deletes a rule in a network security group within a resource group'))
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
      .description($('Commands to manage dns zone'));

  dnsZone.command('create [resource-group] [name]')
    .description($('Creates a dns zone within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the dns zone.' +
      '\n     Must not end with dot. Terminating \'.\' will be removed'))
      .option('-t, --tags <tags>', $('the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createDnsZone(resourceGroup, name, options, _);
    });

  dnsZone.command('set [resource-group] [name]')
    .description($('Sets a dns zone within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the dns zone.' +
    '\n     Must not end with dot. Terminating \'.\' will be removed'))
    .option('-t, --tags <tags>', $('the list of tags.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setDnsZone(resourceGroup, name, options, _);
    });

  dnsZone.command('list [resource-group]')
    .description($('Lists dns zones within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listDnsZones(resourceGroup, options, _);
    });

  dnsZone.command('show [resource-group] [name]')
    .description($('Shows details about a dns zone within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the dns zone.' +
    '\n     Must not end with dot. Terminating \'.\' will be removed'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showDnsZone(resourceGroup, name, options, _);
    });

  dnsZone.command('delete [resource-group] [name]')
    .description($('Deletes a dns zone within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the dns zone.' +
    '\n     Must not end with dot. Terminating \'.\' will be removed'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('DNS zone name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteDnsZone(resourceGroup, name, options, _);
    });

  var dnsRecordSet = dnsZone.category('record-set')
    .description($('Commands to manage record sets in dns zone'));

  dnsRecordSet.command('create [resource-group] [dns-zone-name] [name]')
    .description($('Creates a record set in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, dnsZoneName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      dnsZoneName = cli.interaction.promptIfNotGiven($('DNS zone name: '), dnsZoneName, _);
      name = cli.interaction.promptIfNotGiven($('Record set name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createDnsRecordSet(resourceGroup, dnsZoneName, name, options, _);
    });

  dnsRecordSet.command('set [resource-group] [dns-zone-name] [name] [type]')
    .description($('Sets a record set in a DNS zone'))
    .usage('[options] <resource-group> <dns-zone-name> <name> <type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-z, --dns-zone <dns-zone>', $('the name of the DNS zone'))
    .option('-n, --name <name>', $('the relative name of the record set within the DNS zone'))
    .option('-y, --type <type>', $('the type of the record set.' +
      '\n     Valid values are [A, AAAA, CNAME, MX, NS, SOA, SRV, TXT, PTR]'))
    .option('-l, --ttl <ttl>', $('time to live'))
    .option('-t, --tags <tags>', $('the tags set on this virtual network.' +
      '\n     Can be multiple. In the format of "name=value".' +
      '\n     Name is required and value is optional.' +
      '\n     For example, -t tag1=value1;tag2'))
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
    .description($('Lists record sets in a DNS zone within a resource group'))
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
    .description($('Shows details about a record set in a DNS zone within a resource group'))
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
    .description($('Deletes a record set in a DNS zone within a resource group'))
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
    .description($('Adds a record in a record set under a DNS zone within a resource group'))
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
    .option('-i, --expire-time <expire-time>', $('the expire time'))
    .option('-S, --serial-number <serial-number>', $('the serial number'))
    .option('-k, --host <host>', $('the host name attribute'))
    .option('-m, --minimum-ttl <minimum-ttl>', $('the minimum time to live attribute'))
    .option('-r, --refresh-time <refresh-time>', $('the refresh time attribute'))
    .option('-j, --retry-time <retry-time>', $('the retry time attribute' +
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
    .description($('Deletes a record in a record set under a DNS zone within a resource group'))
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
    .description($('Creates a traffic manager profile within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', $('the profile status, valid values are' +
    '\n     [Enabled, Disabled], default is Enabled'))
    .option('-m, --traffic-routing-method <traffic-routing-method>', $('the traffic routing method for the profile,' +
    '\n     valid values are [Performance, Weighted, Priority]'))
    .option('-r, --relative-dns-name <relative-dns-name>', $('relative DNS name of the profile e.g. .trafficmanager.net'))
    .option('-l  --ttl <ttl>', $('time to live in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', $('the source address prefix, valid values are [http, https]'))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags <tags>', $('the tags set on this profile. Can be ' +
    '\n     multiple, in the format of \'name=value\'.' +
    '\n     Name is required and value is optional. ' +
    '\n     For example, -t tag1=value1;tag2'))
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
    .description($('Sets a traffic manager profile within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the profile'))
    .option('-u, --profile-status <profile-status> ', $('the profile status, valid values are' +
    '\n     [Enabled, Disabled], default is Enabled'))
    .option('-m, --traffic-routing-method <traffic-routing-method>', $('the traffic routing method for the profile,' +
    '\n     valid values are [Performance, Weighted, Priority]'))
    .option('-l  --ttl <ttl>', $('time to live in seconds'))
    .option('-p, --monitor-protocol <monitor-protocol>', $('the source address prefix, valid values are [http, https]'))
    .option('-o, --monitor-port <monitor-port>', $('the monitoring port'))
    .option('-a, --monitor-path <monitor-path>', $('the monitoring path'))
    .option('-t, --tags <tags>', $('the tags set on this profile. Can be ' +
    '\n     multiple, in the format of \'name=value\'.' +
    '\n     Name is required and value is optional. ' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, name, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);
      name = cli.interaction.promptIfNotGiven($('Profile name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setTrafficManager(resourceGroupName, name, options, _);
    });

  profile.command('list [resource-group]')
    .description($('Lists a traffic manager profiles within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroupName, options, _) {
      resourceGroupName = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroupName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listTrafficManagers(resourceGroupName, options, _);
    });

  profile.command('show [resource-group] [name]')
    .description($('Shows details about a traffic manager profile within a resource group'))
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
    .description($('Deletes a traffic manager profile within a resource group'))
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
    .description($('Creates an endpoint in traffic manager profile within a resource group'))
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
    .description($('Sets an endpoint defined in a traffic manager profile within a resource group'))
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
    .description($('Deletes an endpoint in traffic manager profile within a resource group'))
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

  var gateway = network.category('gateway')
    .description($('Commands to manage gateways'));

  var gatewayVNet = gateway.category('vnet')
  	.description($('Commands to manage virtual network gateways'));

  gatewayVNet.command('create [resource-group] [name] [location]')
    .description($('Creates a virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-l, --location <location>', $('the location'))
    .option('-y, --type <type>', $('the gateway type' +
    	'\n   Valid values are [Route-Based-IPSec-VPN, Policy-Based-IPSec-VPN, Dedicated]' +
    	'\n   Default is Route-Based-IPSec-VPN'))
    .option('-e, --size <size>', $('the size of the gateway' +
			'\n   Valid values are [G1, G2, G3]' +
			'\n   Default is G1'))
    .option('-p, --vpnclient-address-pool <vpnclient-address-pool>', $('The address pool from which the gateway uses' +
    	'\n   to assign IP addresses to remote clients.' +
    	'\n   Only valid if the gateway-type is Route-Based-IPSec-VPN.' +
    	'\n   When this property presents, it will create a VPNClient gateway connection'))
    .option('-d, --default-sites <default-sites>', $('the comma separated list of default sites.'))
    .option('-e, --enable-bgp <enable-bgp>', $('enables BGP flag' +
      '\n   Valid values are [true, false]'))
    .option('-t, --tags <tags>', $('the tags set on this record set.' +
      '\n   Can be multiple, in the format of "name=value".' +
      '\n   Name is required and value is optional.' +
      '\n   For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name:: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVirtualNetworkGateway(resourceGroup, name, location, options, _);
    });

  gatewayVNet.command('set [resource-group] [name] [location]')
    .description($('Sets a virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-e, --size <size>', $('the size of the gateway' +
			'\n   Valid values are [G1, G2, G3]' +
			'\n   Default is G1'))
    .option('-p, --vpnclient-address-pool <vpnclient-address-pool>', $('The address pool from which the gateway uses' +
    	'\n   to assign IP addresses to remote clients.' +
    	'\n   Only valid if the gateway-type is Route-Based-IPSec-VPN.' +
    	'\n   When this property presents, it will create a VPNClient gateway connection'))
    .option('-d, --default-sites <default-sites>', $('the comma separated list of default sites.'))
    .option('-e, --enable-bgp <enable-bgp>', $('enables BGP flag' +
      '\n   Valid values are [“true”, “false”]'))
    .option('-t, --tags <tags>', $('the tags set on this record set.' +
      '\n   Can be multiple, in the format of "name=value".' +
      '\n   Name is required and value is optional.' +
      '\n   For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name:: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setVirtualNetworkGateway(resourceGroup, name, location, options, _);
    });

  gatewayVNet.command('list [resource-group]')
    .description($('Lists your virtual network gateways within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVirtualNetworkGateways(resourceGroup,  options, _);
    });

  gatewayVNet.command('show [resource-group] [name]')
    .description($('Shows details about a virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVirtualNetworkGateway(resourceGroup, name, options, _);
    });

  gatewayVNet.command('delete [resource-group] [name]')
    .description($('Deletes a virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVirtualNetworkGateway(resourceGroup, name, options, _);
    });

  var gatewayIpConfig = gateway.category('ip-config')
    .description($('Commands to manage virtual network gateways VIP configuration'));

  gatewayIpConfig.command('add [resource-group] [vnet-gateway-name]')
    .description($('Adds an IP configuration to virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <vnet-gateway-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --vnet-gateway-name <vnet-gateway-name>', $('the name of the virtual network gateway'))
    .option('-u, --public-ip-id <public-ip-id>', $('the vip configuration public ip id' +
    	'\n   e.g. /subscriptions/<subscriptipn-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-p, --public-ip-name <public-ip-name>', $('the name of the vip configuration public ip' +
    	'\n   This public ip must exists in the same resource group as the vnet gateway' +
    	'\n   Please use public-ip-id if that is not the case'))
    .option('-b, --subnet-id <subnet-id>', $('the vip configuration subnet id' +
    	'\n   e.g. /subscriptions/<subscriptipn-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/VirtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-e, --subnet-name <subnet-name>', $('the name of the vip configuration subnet'))
    .option('-m, --vnet-name <vnet-name>', $('the name of the virtual network gateway' +
    	'\n   This virtual network must exists in the same resource group as the vnet gateway.' +
    	'\n   Please use subnet-id if that  is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetGatewayName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetGatewayName = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), vnetGatewayName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addIpConfigToVirtualNetworkGateway(resourceGroup, vnetGatewayName, options, _);
    });

  gatewayIpConfig.command('remove [resource-group] [vnet-gateway-name]')
    .description($('Removes an IP configuration from virtual network gateway within a resource group'))
    .usage('[options] <resource-group> <vnet-gateway-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --vnet-gateway-name <vnet-gateway-name>', $('the name of the virtual network gateway'))
    .option('-u, --public-ip-id <public-ip-id>', $('the vip configuration public ip id' +
    	'\n   e.g. /subscriptions/<subscriptipn-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/publicIPAddresses/<public-ip-name>'))
    .option('-p, --public-ip-name <public-ip-name>', $('the name of the vip configuration public ip' +
    	'\n   This public ip must exists in the same resource group as the vnet gateway' +
    	'\n   Please use public-ip-id if that is not the case'))
    .option('-b, --subnet-id <subnet-id>', $('the vip configuration subnet id' +
    	'\n   e.g. /subscriptions/<subscriptipn-id>/resourceGroups/<resource-group-name>/providers/Microsoft.Network/VirtualNetworks/<vnet-name>/subnets/<subnet-name>'))
    .option('-e, --subnet-name <subnet-name>', $('the name of the vip configuration subnet'))
    .option('-m, --vnet-name <vnet-name>', $('the name of the virtual network gateway' +
    	'\n   This virtual network must exists in the same resource group as the vnet gateway.' +
    	'\n   Please use subnet-id if that  is not the case.'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetGatewayName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetGatewayName = cli.interaction.promptIfNotGiven($('Virtual network gateway name: '), vnetGatewayName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.removeIpConfigToVirtualNetworkGateway(resourceGroup, vnetGatewayName, options, _);
    });

  var localGateway = gateway.category('local')
    .description($('Commands to manage local network gateways'));

  localGateway.command('create [resource-group] [gateway-name] [location]')
    .description($('Creates a local network gateway within a resource group'))
    .usage('[options] <resource-group> <gateway-name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the local network gateway'))
    .option('-l, --location <location>', $('the location'))
    .option('-a, --address-space <address-space>', $('the local network site address space'))
    .option('-i, --ip-address <ip-address>', $('the IP address of the local network site'))
    .option('-t, --tags <tags>', $('the tags set on this local network gateway.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional.' +
    '\n     For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Local network gateway name: '), gatewayName, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createLocalNetworkGateway(resourceGroup, gatewayName, location, options, _);
    });

  localGateway.command('set [resource-group] [gateway-name]')
    .description($('Sets a local network gateway within a resource group'))
    .usage('[options] <resource-group> <gateway-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the local network gateway'))
    .option('-a, --address-space <address-space>', $('the local network site address space'))
    .option('-i, --ip-address <ip-address>', $('the IP address of the local network site'))
    .option('-t, --tags <tags>', $('the tags set on this local network gateway.' +
    '\n     Can be multiple. In the format of "name=value".' +
    '\n     Name is required and value is optional. For example, -t tag1=value1;tag2' +
    '\n     This list will be appended to the current list of tags'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setLocalNetworkGateway(resourceGroup, gatewayName, options, _);
    });

  localGateway.command('list [resource-group]')
    .description($('Lists local network gateways within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLocalNetworkGateways(resourceGroup, options, _);
    });

  localGateway.command('show [resource-group] [gateway-name]')
    .description($('Shows details about a local network gateway within a resource group'))
    .usage('[options] <resource-group> <gateway-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the local network gateway'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Local network gateway name: '), gatewayName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showLocalNetworkGateway(resourceGroup, gatewayName, options, _);
    });

  localGateway.command('delete [resource-group] [gateway-name]')
    .description($('Deletes a local network gateway within a resource group'))
    .usage('[options] <resource-group> <gateway-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --gateway-name <gateway-name>', $('the name of the local network gateway'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, gatewayName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      gatewayName = cli.interaction.promptIfNotGiven($('Local network gateway name: '), gatewayName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLocalNetworkGateway(resourceGroup, gatewayName, options, _);
    });

  var gatewayConnection = gateway.category('connection')
    .description($('Commands to manage gateway connection'));

  gatewayConnection.command('create [resource-group] [name]')
    .description($('Creates a virtual network gateway connection within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway connection'))
    .option('-y, --type <type>', $('the connection type' +
    	'\n   valid values are [ipspec, dedicated, vnet2vnet and vpnclient]'))
    .option('-i, --gateway-id <gateway-id>', $('the identifier for the vnet gateway'))
    .option('-d, --connected-entity-id <connected-entity-id>', $('the identifier for the connected entity' +
      '\n   It can be unique id identifying vnet gateway, local network gateway or express route'))
    .option('-k, --ipsec-shared-key <ipsec-shared-key>', $('the key to be used for IP sec tunnel'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway connection name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('set [resource-group] [name]')
    .description($('Sets a virtual network gateway connection within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway connection'))
    .option('-y, --type <type>', $('the connection type' +
    	'\n   valid values are [ipspec, dedicated, vnet2vnet and vpnclient]'))
    .option('-i, --gateway-id <gateway-id>', $('the identifier for the vnet gateway'))
    .option('-d, --connected-entity-id <connected-entity-id>', $('the identifier for the connected entity' +
      '\n   It can be unique id identifying vnet gateway, local network gateway or express route'))
    .option('-k, --ipsec-shared-key <ipsec-shared-key>', $('the key to be used for IP sec tunnel'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway connection name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('list [resource-group]')
    .description($('Lists virtual network gateway connections within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVirtualNetworkGatewayConnections(resourceGroup, options, _);
    });

  gatewayConnection.command('show [resource-group] [name]')
    .description($('Shows details about a gateway connection within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway connection'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway connection name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
    });

  gatewayConnection.command('delete [resource-group] [name]')
    .description($('Deletes a gateway connection within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network gateway connection'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network gateway connection name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVirtualNetworkGatewayConnection(resourceGroup, name, options, _);
    });

  var gatewaySharedKey = gateway.category('shared-key')
    .description($('Commands to manage gateway shared key'));

  gatewaySharedKey.command('set [resource-group] [vnet-gateway-id] [connected-entity-id]')
    .description($('Sets a shared key within a resource group'))
    .usage('[options] <resource-group> <vnet-gateway-id> <connected-entity-id>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --vnet-gateway-id <vnet-gateway-id>', $('the vnet gateway identifier'))
    .option('-c, --connected-entity-id <connected-entity-id>', $('the connected entity identifier'))
    .option('-k, --shared-key <shared-key>', $('the shared key to set'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetGatewayId = cli.interaction.promptIfNotGiven($('Virtual network gateway identifier: '), vnetGatewayId, _);
      connectedEntityId = cli.interaction.promptIfNotGiven($('Connected entity identifier: '), connectedEntityId, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
    });

  gatewaySharedKey.command('reset [resource-group] [vnet-gateway-id] [connected-entity-id]')
    .description($('Sets a shared key within a resource group'))
    .usage('[options] <resource-group> <vnet-gateway-id> <connected-entity-id>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --vnet-gateway-id <vnet-gateway-id>', $('the vnet gateway identifier'))
    .option('-c, --connected-entity-id <connected-entity-id>', $('the connected entity identifier'))
    .option('-l, --key-length <key-length>', $('length of the shared key to reset'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetGatewayId = cli.interaction.promptIfNotGiven($('Virtual network gateway identifier: '), vnetGatewayId, _);
      connectedEntityId = cli.interaction.promptIfNotGiven($('Connected entity identifier: '), connectedEntityId, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.resetSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
    });

  gatewaySharedKey.command('show [resource-group] [vnet-gateway-id] [connected-entity-id]')
    .description($('Sets a shared key within a resource group'))
    .usage('[options] <resource-group> <vnet-gateway-id> <connected-entity-id>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-a, --vnet-gateway-id <vnet-gateway-id>', $('the vnet gateway identifier'))
    .option('-c, --connected-entity-id <connected-entity-id>', $('the connected entity identifier'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetGatewayId, connectedEntityId, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetGatewayId = cli.interaction.promptIfNotGiven($('Virtual network gateway identifier: '), vnetGatewayId, _);
      connectedEntityId = cli.interaction.promptIfNotGiven($('Connected entity identifier: '), connectedEntityId, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSharedKey(resourceGroup, vnetGatewayId, connectedEntityId, options, _);
    });
};