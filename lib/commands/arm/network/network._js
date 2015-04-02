'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage network resources'));

  var vnet = network.category('vnet')
    .description($('Commands to manage virtual networks'));

  vnet.command('create [resource-group] [name] [location]')
    .description('Create virtual network within a resource group')
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-l, --location <location>', $('the location'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes for this virtual network. For example, -a 10.0.0.0/24,10.0.1.0/24. If no address prefix is specified, 10.0.0.0/8 is used as the address prefix.'))
    .option('-d, --dns-servers <dns-servers>', $('the comma separated list of DNS server IP addresses.'))
    .option('-t, --tags <tags>', $('tags to set on the resource. Can be mutliple. In the format of "name=value". Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, name, location, options, _);
    });

  vnet.command('set [resource-group] [name]')
    .description('Set virtual network configuration within a resource group')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the name of the virtual network'))
    .option('-a, --address-prefixes <address-prefixes>', $('the comma separated list of address prefixes for this virtual network. For example, -a 10.0.0.0/24,10.0.1.0/24. If no address prefix is specified, 10.0.0.0/8 is used as the address prefix.'))
    .option('-d, --dns-servers <dns-servers>', $('the comma separated list of DNS server IP addresses.'))
    .option('-t, --tags <tags>', $('tags to set on the resource. Can be mutliple. In the format of "name=value". Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setVNet(resourceGroup, name, options, _);
    });

  vnet.command('show [resource-group] [name]')
    .description('Show details about a virtual network within a resource group')
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

  vnet.command('list [resource-group]')
    .description('List virtual networks within a resource group')
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage virtual network subnets'));

  subnet.command('create [resource-group] [vnet-name] [name]')
    .description($('Create virtual network within a resource group'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-t, --vnet-name <vnet-name>', $('the virtual network name'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-e, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-w, --nsg-id <network-security-group-id>', $('the network security group identifier'))
    .option('-o, --nsg-name <network-security-group-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('The name of the virtual network: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the virtual network: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createSubnet(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('set [resource-group] [vnet-name] [name]')
    .description($('Set virtual network subnet within a resource group'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-t, --vnet-name <vnet-name>', $('the virtual network name'))
    .option('-n, --name <name>', $('the name of the subnet'))
    .option('-e, --address-prefix <address-prefix>', $('the address prefix'))
    .option('-w, --nsg-id <network-security-group-id>', $('the network security group identifier'))
    .option('-o, --nsg-name <network-security-group-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('The name of the virtual network: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('The name of the virtual network: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setSubnet(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('list [resource-group] [vnet-name]')
    .description($('List virtual network subnets within a resource group'))
    .usage('[options] <resource-group> <vnet-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listSubnets(resourceGroup, vnetName, options, _);
    });

  subnet.command('show [resource-group] [vnet-name] [name]')
    .description($('Get one network interface within a resource group'))
    .usage('[options] <resource-group> <vnet-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSubnet(resourceGroup, vnetName, name, options, _);
    });

  subnet.command('delete [resource-group] [vnet-name] [name]')
    .description($('Delete one subnet within a resource group'))
    .usage('[options] <resource-group> <vnet-name> <subnet-name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-t, --vnet-name <vnet-name>', $('the name of the virtual network'))
    .option('-n, --name <name>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, vnetName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnetName = cli.interaction.promptIfNotGiven($('virtual network name: '), vnetName, _);
      name = cli.interaction.promptIfNotGiven($('subnet name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteSubnet(resourceGroup, vnetName, name, options, _);
    });

  var lb = network.category('lb')
    .description($('Commands to manage load balancers'));

  lb.command('create [resource-group] [name] [location]')
    .description($('Create the load balancer within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    // TODO: the <public-ip-id> parameter is temporary workaround and will be removed soon
    .option('-p, --public-ip-id <public-ip-id>', $('the public ip address identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      // TODO: the <public-ip-id> parameter is temporary workaround and will be removed soon
      options.publicIpId = cli.interaction.promptIfNotGiven($('Public ip address identifier: '), options.publicIpId, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createLoadBalancer(resourceGroup, name, location, options, _);
    });

  lb.command('list [resource-group]')
    .description($('Lists the load balancers within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listLoadBalancers(resourceGroup, options, _);
    });

  lb.command('show [resource-group] [name]')
    .description($('Gets one load balancer within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the load balancer name'))
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
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the load balancer name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Load balancer name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancer(resourceGroup, name, options, _);
    });

  var probe = lb.category('probe')
    .description($('Commands to manage probe settings for the load balancer'));

  probe.command('create [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Add a new probe settings to the list of probes in the load balancer'))
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-b, --lb-name <lb-name>', $('the load balancer name'))
    .option('-n, --name <name>', $('the probe name'))
    .option('-t, --protocol <protocol>', $('the probe protocol'))
    .option('-r, --port <port>', $('the probe port'))
    .option('-p, --path <path>', $('the probe path'))
    .option('-e, --interval <interval>', $('the probe interval in seconds'))
    .option('-u, --count <count>', $('the number of probes'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);
      options.protocol = cli.interaction.promptIfNotGiven($('Probe protocol: '), options.protocol, _);
      options.port = cli.interaction.promptIfNotGiven($('Probe port: '), options.port, _);
      options.path = cli.interaction.promptIfNotGiven($('Probe path: '), options.path, _);
      options.interval = cli.interaction.promptIfNotGiven($('Probe interval in seconds: '), options.interval, _);
      options.count = cli.interaction.promptIfNotGiven($('Number of probes: '), options.count, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createProbe(resourceGroup, lbName, name, options, _);
    });

  probe.command('list [resource-group] [lb-name]')
    .usage('[options] <resource-group> <lb-name>')
    .description($('List a probe settings in the load balancer'))
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-b, --lb-name <lb-name>', $('the load balancer name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listProbes(resourceGroup, lbName, options, _);
    });

  probe.command('delete [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Delete a probe settings from list of probes in the load balancer'))
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-b, --lb-name <lb-name>', $('the load balancer name'))
    .option('-n, --name <name>', $('the probe name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteProbe(resourceGroup, lbName, name, options, _);
    });

  probe.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Set an existing probe settings in the load balancer'))
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-b, --lb-name <lb-name>', $('the load balancer name'))
    .option('-n, --name <name>', $('the probe name'))
    .option('-a, --new-probe-name <new-probe-name>', $('the probe name'))
    .option('-t, --protocol <protocol>', $('the probe protocol'))
    .option('-r, --port <port>', $('the probe port'))
    .option('-p, --path <path>', $('the probe path'))
    .option('-e, --interval <interval>', $('the probe interval in seconds'))
    .option('-u, --count <count>', $('the number of probes'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Probe name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateProbe(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerLBRule = lb.category('rule')
    .description($('Commands to manage load balancing rules of a load balancer'));

  loadBalancerLBRule.command('create [resource-group] [lb-name] [name]')
    .description($('Adds a new load balancing rule to the list of lb rules configured for a load balancer'))
    .usage('[options] [resource-group] [lb-name] [name]')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-r, --new-rule-name <new-rule-name', $('new rule name'))
    .option('-p, --protocol <protocol>', $('protocol'))
    .option('-f, --frontend-port <frontend-port>', $('frontend port'))
    .option('-b, --backend-port <backend-port>', $('backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('idle timeout'))
    .option('-a, --probe-name <probe-name>', $('probe name'))
    .option('-c, --vip <vip>', $('comma separated list of the frontend ip configuration names defined in the same load balancer'))
    .option('-o, --backend-address-pool <backend-address-pool>', $('name of the backend address pool defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  loadBalancerLBRule.command('set [resource-group] [lb-name] [name]')
    .description($('Update an existing load balancing rule configured for a load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-r, --new-rule-name <new-rule-name', $('new rule name'))
    .option('-p, --protocol <protocol>', $('protocol'))
    .option('-f, --frontend-port <frontend-port>', $('frontend port'))
    .option('-b, --backend-port <backend-port>', $('backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating ip'))
    .option('-i, --idle-timeout <idle-timeout>', $('idle timeout'))
    .option('-a, --probe-name <probe-name>', $('probe name'))
    .option('-c, --vip <vip>', $('comma separated list of the frontend ip configuration names defined in the same load balancer'))
    .option('-o, --backend-address-pool <backend-address-pool>', $('name of the backend address pool defined in the same load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Name of the load balancer: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Name of the rule: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  loadBalancerLBRule.command('delete [resource-group] [lb-name] [name]')
    .description($('Deletes a load balancing rule from the list of load balancing rules configured for the load balancer'))
    .usage('[options] [resource-group] [lb-name] [name]')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the rule'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('Name of the load balancer: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Name of the rule: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancerRule(resourceGroup, lbName, name, options, _);
    });

  var inboundrule = lb.category('inboundrule')
    .description($('Commands to manage inbound rules for load balancer'));

  inboundrule.command('create [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Create inbound rule to load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --vip <vip>', $('comma separated list of frontend ip configuration names defined in the same load balancer'))
    .option('-d, --vm-id <vm-id>', $('the backend ip configuration identifier'))
    .option('-h, --vm-name <vm-name>', $('the backend ip configuration name'))
    .option('-c, --vm-nic-name <vm-nic-name>', $('the name of the network interface card where backend ip configuration is defined'))
    .option('-r, --vm-nic-resource-group <vm-nic-resource-group>', $('the resource group under which nic with backend ip config is defined'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);
      options.protocol = cli.interaction.promptIfNotGiven($('Inbound rule protocol: '), options.protocol, _);
      options.frontendPort = cli.interaction.promptIfNotGiven($('Inbound rule front end port: '), options.frontendPort, _);
      options.backendPort = cli.interaction.promptIfNotGiven($('Inbound rule back end port: '), options.backendPort, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createInboundRule(resourceGroup, lbName, name, options, _);
    });

  inboundrule.command('set [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Updates inbound rule to load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-n, --new-name <new-name>', $('new inbound rule name'))
    .option('-p, --protocol <protocol>', $('the rule protocol'))
    .option('-f, --frontend-port <frontend-port>', $('the frontend port'))
    .option('-b, --backend-port <backend-port>', $('the backend port'))
    .option('-e, --enable-floating-ip <enable-floating-ip>', $('enable floating point ip'))
    .option('-i, --vip <vip>', $('comma separated list of frontend ip configuration names defined in the same load balancer'))
    .option('-d, --vm-id <vm-id>', $('the backend ip configuration identifier'))
    .option('-h, --vm-name <vm-name>', $('the backend ip configuration name'))
    .option('-c, --vm-nic-name <vm-nic-name>', $('the name of the network interface card where backend ip configuration is defined'))
    .option('-r, --vm-nic-resource-group <vm-nic-resource-group>', $('the resource group under which nic with backend ip config is defined'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateInboundRule(resourceGroup, lbName, name, options, _);
    });

  inboundrule.command('delete [resource-group] [lb-name] [name]')
    .usage('[options] <resource-group> <lb-name> <name>')
    .description($('Delete inbound rule to load balancer'))
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the inbound NAT rule'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('Inbound rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteInboundRule(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerFEIPConfig = lb.category('vip')
    .description('Commands to manage vips of a load balancer');

  loadBalancerFEIPConfig.command('create [resource-group] [lb-name] [name]')
    .description($('Adds a new frontend ip configuration to the list of frontend ipconfigurations defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-t, --subnet-id <subnet-id>', $('the subnet identifier'))
    .option('-b, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-e, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-m, --private-ip-allocation-method <private-ip-allocation-method>', $('the private ip allocation method [Static, Dynamic]'))
    .option('-u, --public-ip-id <public-ip-id>', $('the public ip identifier'))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('VIP name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  loadBalancerFEIPConfig.command('set [resource-group] [lb-name] [name]')
    .description($('Sets an existing frontend ip configuration in the list of frontend ip configuration defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-t, --subnet-id <subnet-id>', $('the subnet identifier'))
    .option('-b, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-e, --subnet-vnet-name <subnet-vnet-name>', $('the vnet name under which subnet-name exists'))
    .option('-a, --private-ip-address <private-ip-address>', $('the private ip address'))
    .option('-m, --private-ip-allocation-method <private-ip-allocation-method>', $('the private ip allocation method [Static, Dynamic]'))
    .option('-u, --public-ip-id <public-ip-id>', $('the public ip identifier'))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('VIP name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  loadBalancerFEIPConfig.command('delete [resource-group] [lb-name] [name]')
    .description($('Deletes an existing new frontend ip configuration from the list of frontend ip configurations defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-l, --lb-name <lb-name>', $('the name of the load balancer'))
    .option('-n, --name <name>', $('the name of the frontend ip configuration'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      name = cli.interaction.promptIfNotGiven($('VIP name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteFrontEndIPConfig(resourceGroup, lbName, name, options, _);
    });

  var loadBalancerBackendAddressPool = lb.category('address-pool')
    .description('Commands to manage backend address pools of a load balancer');

  loadBalancerBackendAddressPool.command('create [resource-group] [lb-name] [pool-name]')
    .description($('Adds a new backend address pool to the list of backend address pool defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <pool-name>')
    .option('-n, --nic-name <nic-name>', $('NIC name'))
    .option('-i, --nic-ipconfig-name <nic-ipconfig-nam>', $('NIC IP config name'))
    .option('-l, --lbrule-name <lbrule-name>', $('Load balancing rule name'))
    .option('-o, --outboundrule-name  <outboundrule-name>', $('Outbound rule name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, poolName, options, _) {
      if (options.nicName && !options.nicIpconfigName) {
        options.nicIpconfigName = cli.interaction.promptIfNotGiven($('NIC IP config name: '), options.nicIpconfigName, _);
      }

      if (options.nicIpconfigName && !options.nicName) {
        options.nicName = cli.interaction.promptIfNotGiven($('NIC name: '), options.nicName, _);
      }

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addBackendAddressPool(resourceGroup, lbName, poolName, options, _);
    });

  loadBalancerBackendAddressPool.command('set [resource-group] [lb-name] [pool-name]')
    .description($('Updates an existing backend address pool in the list of backend address pool defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <pool-name>')
    .option('--new-pool-name <new-pool-name>', $('New address pool name'))
    .option('--nic-name <nic-name>', $('NIC name'))
    .option('--nic-ipconfig-name <nic-ipconfig-nam>', $('NIC IP config name'))
    .option('--lbrule-name <lbrule-name>', $('Load balancing rule name'))
    .option('--outboundrule-name  <outboundrule-name>', $('Outbound rule name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, poolName, options, _) {
      if (options.nicName && !options.nicIpconfigName) {
        options.nicIpconfigName = cli.interaction.promptIfNotGiven($('NIC IP config name: '), options.nicIpconfigName, _);
      }

      if (options.nicIpconfigName && !options.nicName) {
        options.nicName = cli.interaction.promptIfNotGiven($('NIC name: '), options.nicName, _);
      }

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateBackendAddressPool(resourceGroup, lbName, poolName, options, _);
    });

  loadBalancerBackendAddressPool.command('delete [resource-group] [lb-name] [pool-name]')
    .description($('Deletes an existing backend address pool from the list of backend address pool defined for the load balancer'))
    .usage('[options] <resource-group> <lb-name> <pool-name>')
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, poolName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteBackendAddressPool(resourceGroup, lbName, poolName, options, _);
    });

  var publicip = network.category('public-ip')
    .description($('Commands to manage public IP addresses'));

  publicip.command('create [resource-group] [name] [location]')
    .description($('Create a public ip address'))
    .usage('[options] <resource-group> <name> <location>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-l, --location <location>', $('the location'))
    .option('-d, --domain-name-label <domain-name-label>', $('the public ip domain name label, this set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the public ip allocation method, valid values are "Dynamic" or "Static"'))
    .option('-o, --idletimeout <idletimeout>', $('the public ip idle timeout'))
    .option('-f, --fqdn <fqdn>', $('the public ip fully qualified domain name'))
    .option('-r, --reverse-fqdn <reverse-fqdn>', $('the public ip reverse fully qualified domain name'))
    .option('-t, --tags <tags>', $('the comma seperated list of tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, location, options, _);
    });

  publicip.command('set [resource-group] [name]')
    .description($('Set a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-d, --domain-name-label <domain-name-label>', $('the public ip domain name label, this set DNS to <domain-name-label>.<location>.cloudapp.azure.com'))
    .option('-a, --allocation-method <allocation-method>', $('the public ip allocation method, valid values are "Dynamic" or "Static"'))
    .option('-o, --idletimeout <idletimeout>', $('the public ip idle timeout'))
    .option('-f, --fqdn <fqdn>', $('the public ip fully qualified domain name'))
    .option('-t, --tags <tags>', $('the comma seperated list of tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.setPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('show [resource-group] [name]')
    .description($('Show details about a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('delete [resource-group] [name]')
    .description($('Delete a public ip address'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the public ip address name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deletePublicIP(resourceGroup, name, options, _);
    });

  publicip.command('list [resource-group]')
    .description($('Lists the public ip addresses within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listPublicIPs(resourceGroup, options, _);
    });

  var nic = network.category('nic')
    .description($('Commands to manage Network Interface Cards'));

  nic.command('list [resource-group]')
    .description($('List the network interface cards'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNICs(resourceGroup, options, _);
    });

  nic.command('show [resource-group] [name]')
    .description($('Show the details of a network interface card'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the network interface card name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface card name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNIC(resourceGroup, name, options, _);
    });

  nic.command('delete [resource-group] [name]')
    .description($('Delete the network interface card'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the network interface card name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface card name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNIC(resourceGroup, name, options, _);
    });

  var nsg = network.category('nsg')
    .description($('Commands to manage Network Security Groups'));

  nsg.command('list [resource-group]')
    .description($('Lists the network security groups'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNSGs(resourceGroup, options, _);
    });

  nsg.command('show [resource-group] [name]')
    .description($('Show the details of a network security group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the network security group name'))
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
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network security group name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNSG(resourceGroup, name, options, _);
    });

  var nsgRules = nsg.category('rule')
    .description($('Commands to manage Network Security Group Rules'));

  nsgRules.command('list [resource-group] [nsg-name]')
    .description($('List rules in a network security group'))
    .usage('[options] <resource-group> <nsg-name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --nsg-name <nsg-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNsgRules(resourceGroup, nsgName, options, _);
    });

  nsgRules.command('show [resource-group] [nsg-name] [name]')
    .description($('Show a rule in a network security group'))
    .usage('[options] <resource-group> <nsg-name> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --nsg-name <nsg-name>', $('the network security group name'))
    .option('-r, --name <name>', $('the rule name'))
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
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --nsg-name <nsg-name>', $('the network security group name'))
    .option('-r, --name <name>', $('the rule name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, nsgName, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);
      name = cli.interaction.promptIfNotGiven($('Rule name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNsgRule(resourceGroup, nsgName, name, options, _);
    });
};