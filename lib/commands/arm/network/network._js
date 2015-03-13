'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
      .description($('Commands to manage your network resources'));

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