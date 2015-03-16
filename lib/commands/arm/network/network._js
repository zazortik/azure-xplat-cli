'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
      .description($('Commands to manage your network resources'));

  var loadbalancer = network.category('loadbalancer')
      .description($('Commands to manage your load balancers'));

  loadbalancer.command('list [resourceGroup]')
    .description($('Lists the load balancers within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
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
    .option('--subscription <subscription>', $('the subscription identifier'))
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
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancer(resourceGroup, name, options, _);
    });

  loadbalancer.command('export <resourceGroup> <name> [file-path]')
    .usage('[options] <resourceGroup> <name> <file-path>')
    .description($('Exports the load balancer configuration to a file'))
    .option('--subscription <subscription>', $('the subscription identifier'))
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
      .description($('Creates a public ip address within a resource group'))
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
      .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
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

  var nic = network.category('nic')
    .description($('Commands to manage your NIC'));

  nic.command('create <resourceGroup> <name>')
    .description($('Creates a network interface within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-l, --location <location>', $('the location'))
    .option('-p, --ip-name <ipname>', $('the name of ip address'))
    .option('-t, --subnet-id <subnetid>', $('the subnet id'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      options.location = cli.interaction.promptIfNotGiven($('Location: '), options.location, _);
      options.ipAddressName = cli.interaction.promptIfNotGiven($('IP Address name: '), options.ipAddressName, _);
      options.subnetId = cli.interaction.promptIfNotGiven($('Subnet ID: '), options.subnetId, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createNIC(resourceGroup, name, options, _);
    });

  nic.command('list [resourceGroup]')
    .description($('Lists the network interfaces within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNICs(resourceGroup, options, _);
    });

  nic.command('show [resourceGroup] [name]')
    .description($('Gets one network interface within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resourc-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the network interface name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
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
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNIC(resourceGroup, name, options, _);
    });

};