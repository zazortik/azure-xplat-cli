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

var publicip = network.category('publicip')
  .description($('Commands to manage your public IP addresses'));

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