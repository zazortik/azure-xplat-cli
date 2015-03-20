'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage your network resources'));

  var vnet = network.category('vnet')
    .description($('Commands to manage your virtual networks'));

  var addressprefix = vnet.category('addressprefix')
    .description($('Commands to manage your virtual network address prefixes'));

  var publicip = network.category('publicip')
    .description($('Commands to manage your public IP addresses'));

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
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, vnet, location, options, _);
    });

  vnet.command('show <resourceGroup> <vnet>')
    .description('Show details about a virtual network within a resource group')
    .usage('<resourceGroup> <vnet> [options]')
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('delete <resourceGroup> <vnet>')
    .description('Show details about a virtual network within a resource group')
    .usage('[options] <resourceGroup> <vnet>')
    .option('--subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function(resourceGroup, vnet, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('list <resourceGroup>')
    .description('List virtual networks within a resource group')
    .usage('<resourceGroup> [options]')
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function(resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
    });

  addressprefix.command('create <resourceGroup> <name> <startip-ipAddress>')
    .description($('Adds an address range to the list of address prefixes'))
    .usage('[options] <resourceGroup> <name> <startip-ipAddress>')
    .option('-m, --max-vm-count <number>', $('the maximum number of VMs in the address'))
    .option('-i, --cidr <number>', $('the address space network mask in CIDR format'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, startIpAddress, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addAddressPrefix(resourceGroup, name, startIpAddress, options, _);
    });

  addressprefix.command('delete <resourceGroup> <name> <startip-ipAddress/cidr>')
    .description($('Removes an address range from the list of address prefixes'))
    .usage('[options] <resourceGroup> <name> <startip-ipAddress/cidr>')
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, ipv4Cidr, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteAddressPrefix(resourceGroup, vnet, ipv4Cidr, options, _);
    });

  addressprefix.command('list <resourceGroup> <name>')
    .description($('List IP address ranges in cidr format that can be used by subnets in a virtual network'))
    .usage('[options] <resourceGroup> <name>')
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, startIpAddress, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listAddressPrefix(resourceGroup, name, startIpAddress, options, _);
    });

  publicip.command('create <resourceGroup> <name>')
    .description($('Create a public ip address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-l, --location <location>', $('the location'))
    .option('-n, --domain-name <domainName>', $('the public ip domain name, this set DNS to <domain-name>.<location>.cloudapp.azure.com'))
    .option('-m, --allocation-method <allocationmethod>', $('the public ip allocation method, valid values are "Dynamic"'))
    .option('-t, --idletimeout <idletimeout>', $('the public ip idle timeout'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      options.location = cli.interaction.promptIfNotGiven($('Location: '), options.location, _);
      options.domainName = cli.interaction.promptIfNotGiven($('Domain name: '), options.domainName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('show [resourceGroup] [name]')
    .description($('Gets one public address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resourc-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('delete [resourceGroup] [name]')
    .description($('Deletes one public address within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
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
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listPublicIPs(resourceGroup, options, _);
    });
};