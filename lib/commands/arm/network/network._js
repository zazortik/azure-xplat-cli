'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage your network resources'));

  var vnet = network.category('vnet')
    .description($('Commands to manage your virtual networks'));

  vnet.command('create <resourceGroup> <vnet> <location>')
    .description('Create virtual network within a resource group')
    .usage('[options] <resourceGroup> <vnet> <location>')
    .option('-e, --address-space <addressSpace>', $('the address space for the virtual network'))
    .option('-m, --max-vm-count <maxVmCount>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <cidr>', $('the address space network mask in CIDR format'))
    .option('-d, --dns-server <dnsServer>', $('the virtual network DNS server address'))
    .option('-p, --subnet-start-ip <subnetStartIp>', $('the start IP address of subnet'))
    .option('-n, --subnet-name <subnetName>', $('the name for the subnet'))
    .option('-c, --subnet-vm-count <subnetVmCount>', $('the maximum number of VMs in the subnet'))
    .option('-r, --subnet-cidr <subnetCidr>', $('the subnet network mask in CIDR format'))
    .option('-b, --subnet-dns-server <subnetDnsServer>', $('the subnet DNS server address'))
    .option('-t, --tags <tags>', $('the comma seperated list of tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, vnet, location, options, _);
    });

  vnet.command('export <resourceGroup> <vnet-name> <file-path>')
    .description('Exports Virtual Networks configuration to a file')
    .usage('[options] <resourceGroup> <vnet-name> <file-path>')
    .option('-s. --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, filePath, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      filePath = cli.interaction.promptIfNotGiven($('File path: '), filePath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.exportVNet(resourceGroup, vnetName, filePath, _);
    });

  vnet.command('import <resourceGroup> <vnet-name> <file-path>')
    .description('Imports Virtual Networks configuration from a file')
    .usage('[options] <resourceGroup> <vnet-name> <file-path>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, filePath, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);
      filePath = cli.interaction.promptIfNotGiven($('File path: '), filePath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.importVNet(resourceGroup, vnetName, filePath, _);
    });

  vnet.command('show <resourceGroup> <vnet>')
    .description('Show details about a virtual network within a resource group')
    .usage('<resourceGroup> <vnet> [options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('delete <resourceGroup> <vnet>')
    .description('Show details about a virtual network within a resource group')
    .usage('[options] <resourceGroup> <vnet>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, vnet, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('list <resourceGroup>')
    .description('List virtual networks within a resource group')
    .usage('<resourceGroup> [options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
    });

  var vNetAddressPrefix = vnet.category('addressprefix')
    .description($('Commands to manage your virtual network address prefixes'));

  vNetAddressPrefix.command('create <resourceGroup> <name> <startip-ipAddress>')
    .description($('Adds an address range to the list of address prefixes'))
    .usage('[options] <resourceGroup> <name> <startip-ipAddress>')
    .option('-m, --max-vm-count <number>', $('the maximum number of VMs in the address'))
    .option('-i, --cidr <number>', $('the address space network mask in CIDR format'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, startIpAddress, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addAddressPrefix(resourceGroup, name, startIpAddress, options, _);
    });

  vNetAddressPrefix.command('delete <resourceGroup> <name> <startip-ipAddress/cidr>')
    .description($('Removes an address range from the list of address prefixes'))
    .usage('[options] <resourceGroup> <name> <startip-ipAddress/cidr>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, ipv4Cidr, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteAddressPrefix(resourceGroup, vnet, ipv4Cidr, options, _);
    });

  vNetAddressPrefix.command('list <resourceGroup> <name>')
    .description($('List IP address ranges in cidr format that can be used by subnets in a virtual network'))
    .usage('[options] <resourceGroup> <name>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, startIpAddress, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listAddressPrefix(resourceGroup, name, startIpAddress, options, _);
    });

  var dnsserver = vnet.category('dnsserver')
    .description($('Commands to manage virtual network dns servers'));

  dnsserver.command('register <resourceGroup> <name> [dnsIp]')
    .description($('Register a DNS Server with current virtual network'))
    .usage('[options] <resourceGroup> <name> <dnsIp>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, dnsIp, options, _) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS Server IP Address: '), dnsIp, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.registerDnsServer(resourceGroup, name, dnsIp, options, _);
    });

  dnsserver.command('unregister <resourceGroup> <name> [dnsIp]')
    .description($('Unregister a DNS Server with current virtual network'))
    .usage('[options] <resourceGroup> <name> <dnsIp>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, dnsIp, options, _) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS Server IP Address: '), dnsIp, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.unregisterDnsServer(resourceGroup, name, dnsIp, options, _);
    });

  dnsserver.command('list [resourceGroup] [name]')
    .description($('List DNS Servers registered in current virtual network'))
    .usage('[options] <resourceGroup> <name> ')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listDnsServers(resourceGroup, name, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage virtual network subnets'));

  subnet.command('create <resourceGroup> <vnet> <subnetName>')
    .description($('Create virtual network within a resource group'))
    .usage('[options] <resourceGroup> <vnet> <subnetName>')
    .option('-e, --address-space <ip4v>', $('the address space for the subnet'))
    .option('-m, --max-vm-count <maxVmCount>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <cidr>', $('the subnet network mask in CIDR format'))
    .option('-d, --dns-server <dnsServer>', $('the virtual network DNS server address'))
    .option('-n, --location <location>', $('the name for the subnet'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet Name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  subnet.command('list [resourceGroup] [vnet]')
    .description($('Lists virtual network subnets within a resource group'))
    .usage('[options] <resourceGroup> <vnet> ')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listSubnets(resourceGroup, vnet, options, _);
    });

  subnet.command('show [resourceGroup] [vnet] [subnetName]')
    .description($('Gets one network interface within a resource group'))
    .usage('[options] <resourceGroup> <name> <subnetName>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the network interface name'))
    .option('-sn, --subnet-name <subnetName>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('virtual network name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  subnet.command('delete [resourceGroup] [vnet] [subnetName]')
    .description($('Deletes one subnet within a resource group'))
    .usage('[options] <resourceGroup> <vnet> <subnetName>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the virtual network name'))
    .option('-s, --subnet-name <subnetName>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Public ip address name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  var loadbalancer = network.category('loadbalancer')
    .description($('Commands to manage your load balancers'));

  loadbalancer.command('list [resourceGroup]')
    .description($('Lists the load balancers within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLoadBalancers(resourceGroup, options, _);
    });

  loadbalancer.command('show [resourceGroup] [name]')
    .description($('Gets one load balancer within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the load balancer name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showLoadBalancer(resourceGroup, name, options, _);
    });

  loadbalancer.command('delete [resourceGroup] [name]')
    .description($('Deletes one load balancer within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the load balancer name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancer(resourceGroup, name, options, _);
    });

  loadbalancer.command('export <resourceGroup> <name> [file-path]')
    .usage('[options] <resourceGroup> <name> <file-path>')
    .description($('Exports the load balancer configuration to a file'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, filepath, options, _) {
      options.filepath = cli.interaction.promptIfNotGiven($('File path: '), filepath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.exportLoadBalancer(resourceGroup, name, options, _);
    });

  loadbalancer.command('import <resourceGroup> <name> [file-path]')
    .usage('[options] <resourceGroup> <name> <file-path>')
    .description($('Imports the load balancer configuration from a file'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, filepath, options, _) {
      options.filepath = cli.interaction.promptIfNotGiven($('File path: '), filepath, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.importLoadBalancer(resourceGroup, name, options, _);
    });

  var publicip = network.category('publicip')
    .description($('Commands to manage your public IP addresses'));

  publicip.command('create <resourceGroup> <name>')
    .description($('Create a public ip address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-l, --location <location>', $('the location'))
    .option('-n, --domain-name <domainName>', $('the public ip domain name, this set DNS to <domain-name>.<location>.cloudapp.azure.com'))
    .option('-m, --allocation-method <allocationmethod>', $('the public ip allocation method, valid values are "Dynamic"'))
    .option('-t, --idletimeout <idletimeout>', $('the public ip idle timeout'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      options.location = cli.interaction.promptIfNotGiven($('Location: '), options.location, _);
      options.domainName = cli.interaction.promptIfNotGiven($('Domain name: '), options.domainName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('show [resourceGroup] [name]')
    .description($('Gets one public address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('delete [resourceGroup] [name]')
    .description($('Deletes one public ip address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deletePublicIP(resourceGroup, name, options, _);
    });

  publicip.command('list [resourceGroup]')
    .description($('Lists the public ip addresses within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listPublicIPs(resourceGroup, options, _);
    });

  var nic = network.category('nic')
    .description($('Commands to manage your Network Interfaces'));

  nic.command('list [resourceGroup]')
    .description($('Lists the network interfaces within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNICs(resourceGroup, options, _);
    });

  nic.command('show [resourceGroup] [name]')
    .description($('Gets one network interface within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the network interface name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNIC(resourceGroup, name, options, _);
    });

  nic.command('delete [resourceGroup] [name]')
    .description($('Deletes one network interface within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNIC(resourceGroup, name, options, _);
    });
};