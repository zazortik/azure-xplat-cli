'use strict';

var utils = require('../../../util/utils');
var NetworkClient = require('./networkClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var network = cli.category('network')
    .description($('Commands to manage network resources'));

  var vnet = network.category('vnet')
    .description($('Commands to manage virtual networks'));

  vnet.command('create <resource-group> <vnet> <location>')
    .description('Create virtual network within a resource group')
    .usage('[options] <resource-group> <vnet> <location>')
    .option('-e, --address-space <address-space>', $('the address space for the virtual network'))
    .option('-m, --max-vm-count <max-vm-count>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <cidr>', $('the address space network mask in CIDR format'))
    .option('-d, --dns-server <dns-server>', $('the virtual network DNS server address'))
    .option('-p, --subnet-start-ip <subnet-start-ip>', $('the start IP address of subnet'))
    .option('-n, --subnet-name <subnet-name>', $('the name for the subnet'))
    .option('-c, --subnet-vm-count <subnet-vm-count>', $('the maximum number of VMs in the subnet'))
    .option('-r, --subnet-cidr <subnet-cidr>', $('the subnet network mask in CIDR format'))
    .option('-b, --subnet-dns-server <subnet-dns-server>', $('the subnet DNS server address'))
    .option('-t, --tags <tags>', $('the comma seperated list of tags'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
      location = cli.interaction.promptIfNotGiven($('Location: '), location, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createVNet(resourceGroup, vnet, location, options, _);
    });

  vnet.command('show <resource-group> <vnet>')
    .description('Show details about a virtual network within a resource group')
    .usage('<resource-group> <vnet> [options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, location, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('delete <resource-group> <vnet>')
    .description('Delete a virtual network')
    .usage('[options] <resource-group> <vnet>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteVNet(resourceGroup, vnet, options, _);
    });

  vnet.command('list <resource-group>')
    .description('List virtual networks within a resource group')
    .usage('<resource-group> [options]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listVNet(resourceGroup, options, _);
    });

  var dnsserver = vnet.category('dnsserver')
    .description($('Commands to manage virtual network dns servers'));

  dnsserver.command('list [resourceGroup] [name]')
    .description($('List DNS Servers registered in current virtual network'))
    .usage('[options] <resourceGroup> <name> ')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual network name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listDnsServers(resourceGroup, name, options, _);
    });

  dnsserver.command('register <resource-group> <name> [dnsIp]')
    .description($('Register a DNS Server with current virtual network'))
    .usage('[options] <resource-group> <name> <dnsIp>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, dnsIp, options, _) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS Server IP Address: '), dnsIp, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.registerDnsServer(resourceGroup, name, dnsIp, options, _);
    });

  dnsserver.command('unregister <resource-group> <name> [dnsIp]')
    .description($('Unregister a DNS Server with current virtual network'))
    .usage('[options] <resource-group> <name> <dnsIp>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual network name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, dnsIp, options, _) {
      dnsIp = cli.interaction.promptIfNotGiven($('DNS Server IP Address: '), dnsIp, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.unregisterDnsServer(resourceGroup, name, dnsIp, options, _);
    });

  var vNetAddressPrefix = vnet.category('addressprefix')
    .description($('Commands to manage virtual network address prefixes'));

  vNetAddressPrefix.command('create <resource-group> <name> <startip-ipAddress>')
    .description($('Adds an address range to the list of address prefixes'))
    .usage('[options] <resource-group> <name> <startip-ipAddress>')
    .option('-m, --max-vm-count <number>', $('the maximum number of VMs in the address'))
    .option('-i, --cidr <number>', $('the address space network mask in CIDR format'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, startIpAddress, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addAddressPrefix(resourceGroup, name, startIpAddress, options, _);
    });

  vNetAddressPrefix.command('delete <resource-group> <name> <startip-ipAddress/cidr>')
    .description($('Removes an address range from the list of address prefixes'))
    .usage('[options] <resource-group> <name> <startip-ipAddress/cidr>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, ipv4Cidr, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteAddressPrefix(resourceGroup, vnet, ipv4Cidr, options, _);
    });

  vNetAddressPrefix.command('list <resource-group> <name>')
    .description($('List IP address ranges in cidr format that can be used by subnets in a virtual network'))
    .usage('[options] <resource-group> <name>')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listAddressPrefix(resourceGroup, name, options, _);
    });

  var subnet = vnet.category('subnet')
    .description($('Commands to manage virtual network subnets'));

  subnet.command('create <resource-group> <vnet> <subnet-name>')
    .description($('Create virtual network within a resource group'))
    .usage('[options] <resource-group> <vnet> <subnet-name>')
    .option('-e, --address-space <ip4v>', $('the address space for the subnet'))
    .option('-m, --max-vm-count <max-vm-count>', $('the maximum number of VMs in the address space'))
    .option('-i, --cidr <cidr>', $('the subnet network mask in CIDR format'))
    .option('-d, --dns-server <dns-server>', $('the virtual network DNS server address'))
    .option('-n, --location <location>', $('the name for the subnet'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('Subnet Name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  subnet.command('list [resource-group] [vnet]')
    .description($('Lists virtual network subnets within a resource group'))
    .usage('[options] <resource-group> <vnet> ')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Virtual network name: '), vnet, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listSubnets(resourceGroup, vnet, options, _);
    });

  subnet.command('show [resource-group] [vnet] [subnet-name]')
    .description($('Gets one network interface within a resource group'))
    .usage('[options] <resource-group> <name> <subnet-name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the network interface name'))
    .option('-t, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('virtual network name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  subnet.command('delete [resource-group] [vnet] [subnet-name]')
    .description($('Deletes one subnet within a resource group'))
    .usage('[options] <resource-group> <vnet> <subnet-name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --vnet <vnet>', $('the virtual network name'))
    .option('-s, --subnet-name <subnet-name>', $('the subnet name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(function (resourceGroup, vnet, subnetName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      vnet = cli.interaction.promptIfNotGiven($('Public ip address name: '), vnet, _);
      subnetName = cli.interaction.promptIfNotGiven($('subnet name: '), subnetName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteSubnet(resourceGroup, vnet, subnetName, options, _);
    });

  var lb = network.category('lb')
    .description($('Commands to manage load balancers'));

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
    .description($('Commands to manage probe settings for load balancer'));

  probe.command('create <resource-group> <lb-name> <probe-name>')
    .usage('[options] <resource-group> <lb-name> <probe-name>')
    .description($('Adds a new probe settings to the list of probes in the load balancer'))
    .option('-t, --protocol <protocol>', $('the probe protocol'))
    .option('-r, --port <port>', $('the probe port'))
    .option('-p, --path <path>', $('the probe path'))
    .option('-e, --interval <interval>', $('the probe interval in seconds'))
    .option('-u, --count <count>', $('the probe count'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, probeName, options, _) {
      options.protocol = cli.interaction.promptIfNotGiven($('Probe protocol: '), options.protocol, _);
      options.port = cli.interaction.promptIfNotGiven($('Probe port: '), options.port, _);
      options.path = cli.interaction.promptIfNotGiven($('Probe path: '), options.path, _);
      options.interval = cli.interaction.promptIfNotGiven($('Probe interval in seconds: '), options.interval, _);
      options.count = cli.interaction.promptIfNotGiven($('Probe count: '), options.count, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createProbe(resourceGroup, lbName, probeName, options, _);
    });

  probe.command('list <resource-group> [lb-name]')
    .usage('[options] <resource-group> [lb-name]')
    .description($('Lists probe settings in the load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, options, _) {
      lbName = cli.interaction.promptIfNotGiven($('Load Balancer name: '), lbName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listProbes(resourceGroup, lbName, options, _);
    });

  probe.command('delete <resource-group> <lb-name> <probe-name>')
    .usage('[options] <resource-group> <lb-name> <probe-name>')
    .description($('Deletes a prob settings from the list of prob settings configured for the load balancer'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, probeName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteProbe(resourceGroup, lbName, probeName, options, _);
    });

  probe.command('update <resource-group> <lb-name> <probe-name>')
    .usage('[options] <resource-group> <lb-name> <probe-name>')
    .description($('Update an existing prob settings configured in the load balancer'))
    .option('-n, --new-probe-name <newProbeName>', $('the probe name'))
    .option('-t, --protocol <protocol>', $('the probe protocol'))
    .option('-r, --port <port>', $('the probe port'))
    .option('-p, --path <path>', $('the probe path'))
    .option('-e, --interval <interval>', $('the probe interval in seconds'))
    .option('-u, --count <count>', $('the probe count'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, probeName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateProbe(resourceGroup, lbName, probeName, options, _);
    });

  var loadBalancerLBRule = lb.category('rule')
    .description($('Commands to manage your load balancing rules of your load balancer'));

  loadBalancerLBRule.command('create <resourceGroup> <lb-name> <rule-name>')
    .description($('Adds a new load balancing rule to the list of lb rules configured for a load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <rule-name>')
    .option('--protocol <protocol>', $('protocol'))
    .option('--frontendport <frontendport>', $('frontend port'))
    .option('--backendport <backendport>', $('backend port'))
    .option('--enable-floatingip <enable-floatingip>', $('enablefloating ip'))
    .option('--idletimeout <idletimeout>', $('idle timeout'))
    .option('--prob-name <prob-name>', $('prob name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ruleName, options, _) {
      options.protocol = cli.interaction.promptIfNotGiven($('Protocol: '), options.protocol, _);
      options.frontendport = cli.interaction.promptIfNotGiven($('Frontend port: '), options.frontendport, _);
      options.backendport = cli.interaction.promptIfNotGiven($('Backend port: '), options.backendport, _);
      options.enableFloatingip = cli.interaction.promptIfNotGiven($('Enable floating IP: '), options.enableFloatingip, _);
      options.idletimeout = cli.interaction.promptIfNotGiven($('Idle timeout in minutes: '), options.idletimeout, _);
      options.probName = cli.interaction.promptIfNotGiven($('Probe name: '), options.probName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addLoadBalancerRule(resourceGroup, lbName, ruleName, options, _);
    });

  loadBalancerLBRule.command('update <resourceGroup> <lb-name> <rule-name>')
    .description($('Update an existing load balancing rule configured for a load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <rule-name>')
    .option('--new-rule-name <new-rule-name', $('new rule name'))
    .option('--protocol <protocol>', $('protocol'))
    .option('--frontendport <frontendport>', $('frontend port'))
    .option('--backendport <backendport>', $('backend port'))
    .option('--enable-floatingip <enable-floatingip>', $('enable floating ip'))
    .option('--idletimeout <idletimeout>', $('idle timeout'))
    .option('--prob-name <prob-name>', $('prob name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateLoadBalancerRule(resourceGroup, lbName, ruleName, options, _);
    });

  loadBalancerLBRule.command('delete <resourceGroup> <lb-name> <rule-name>')
    .description($('Deletes a load balancing rule from the list of load balancing rules configured for the load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <rule-name>')
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ruleName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteLoadBalancerRule(resourceGroup, lbName, ruleName, options, _);
    });

  var inboundrule = lb.category('inboundrule')
    .description($('Commands to manage inbound rules for load balancer'));

  inboundrule.command('create <resource-group> <lb-name> <inboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <inboundrule-name>')
    .description($('Creates inbound rule to load balancer'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-f, --frontend-port <frontendPort>', $('the front end port'))
    .option('-b, --backend-port <backendPort>', $('the back end port'))
    .option('-e, --enable-floatingip <enableFloatingip>', $('enabled floating ip: true or false'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, inboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      inboundRuleName = cli.interaction.promptIfNotGiven($('Inbound rule name: '), inboundRuleName, _);
      options.protocol = cli.interaction.promptIfNotGiven($('Inbound rule protocol: '), options.protocol, _);
      options.frontendPort = cli.interaction.promptIfNotGiven($('Inbound rule front end port: '), options.frontendPort, _);
      options.backendPort = cli.interaction.promptIfNotGiven($('Inbound rule back end port: '), options.backendPort, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createInboundRule(resourceGroup, lbName, inboundRuleName, options, _);
    });

  inboundrule.command('update <resource-group> <lb-name> <inboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <inboundrule-name>')
    .description($('Updates inbound rule to load balancer'))
    .option('-n, --new-inboundrule-name <new-inboundrule-name>', $('new inbound rule name'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-f, --frontend-port <frontendPort>', $('the front end port'))
    .option('-b, --backend-port <backendPort>', $('the back end port'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, inboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      inboundRuleName = cli.interaction.promptIfNotGiven($('Inbound rule name: '), inboundRuleName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateInboundRule(resourceGroup, lbName, inboundRuleName, options, _);
    });

  inboundrule.command('delete <resource-group> <lb-name> <inboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <inboundrule-name>')
    .description($('Deletes inbound rule to load balancer'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, inboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      inboundRuleName = cli.interaction.promptIfNotGiven($('Inbound rule name: '), inboundRuleName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteInboundRule(resourceGroup, lbName, inboundRuleName, options, _);
    });

  var loadBalancerFEIPConfig = lb.category('vip')
    .description('Commands to manage your frontend IP configs of your load balancer');

  loadBalancerFEIPConfig.command('create <resourceGroup> <lb-name> <ipconfig-name>')
    .description($('Update an existing load balancing rule configured for a load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <ipconfig-name>')
    .option('--subnet <subnet>', $('Subnet'))
    .option('--virtual-network <virtual-network>', $('Virtual network of subnet'))
    .option('--privateip-address <privateip-address>', $('Private IP address [Static|Dynamic]'))
    .option('--privateip-allocationmethod <privateip-allocationmethod>', $('Private IP allocation method'))
    .option('--publicip-name <publicip-name>', $('Public IP name'))
    .option('--lbrule-name <lbrule-name>', $('Load balancer rule name'))
    .option('--outboundrule-name <outboundrule-name>', $('Outbound rule name'))
    .option('--inboundrule-name <inboundrule-name>', $('Inbound rule name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ipConfigName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.addFrontEndIPConfig(resourceGroup, lbName, ipConfigName, options, _);
    });

  loadBalancerFEIPConfig.command('update <resourceGroup> <lb-name> <ipconfig-name>')
    .description($('Update an existing load balancing rule configured for a load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <ipconfig-name>')
    .option('--new-name <new-name>', $('New config name'))
    .option('--subnet <subnet>', $('Subnet'))
    .option('--virtual-network <virtual-network>', $('Virtual network of subnet'))
    .option('--privateip-address <privateip-address>', $('Private IP address [Static|Dynamic]'))
    .option('--privateip-allocationmethod <privateip-allocationmethod>', $('Private IP allocation method'))
    .option('--publicip-name <publicip-name>', $('Public IP name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ipConfigName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateFrontEndIPConfig(resourceGroup, lbName, ipConfigName, options, _);
    });

  loadBalancerFEIPConfig.command('delete <resourceGroup> <lb-name> <ipconfig-name>')
    .description($('Update an existing load balancing rule configured for a load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <ipconfig-name>')
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, ipConfigName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteFrontEndIPConfig(resourceGroup, lbName, ipConfigName, options, _);
    });

  var loadBalancerBackendAddressPool = lb.category('address-pool')
    .description('Commands to manage your backend address pools of your load balancer');

  loadBalancerBackendAddressPool.command('create <resourceGroup> <lb-name> <pool-name>')
    .description($('Adds a new backend address pool to the list of backend address pool defined for the load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <pool-name>')
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
      networkClient.addBackendAddressPool(resourceGroup, lbName, poolName, options, _);
    });

  loadBalancerBackendAddressPool.command('update <resourceGroup> <lb-name> <pool-name>')
    .description($('Updates an existing backend address pool in the list of backend address pool defined for the load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <pool-name>')
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

  loadBalancerBackendAddressPool.command('delete <resourceGroup> <lb-name> <pool-name>')
    .description($('Deletes an existing backend address pool from the list of backend address pool defined for the load balancer'))
    .usage('[options] <resourceGroup> <lb-name> <pool-name>')
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, poolName, options, _) {
      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteBackendAddressPool(resourceGroup, lbName, poolName, options, _);
    });

  var outboundrule = lb.category('outboundrule')
    .description($('Commands to manage outbound rules for load balancer'));

  outboundrule.command('create <resource-group> <lb-name> <outboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <outboundrule-name>')
    .description($('Creates outbound rule to load balancer'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, outboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      outboundRuleName = cli.interaction.promptIfNotGiven($('Outbound rule name: '), outboundRuleName, _);
      options.protocol = cli.interaction.promptIfNotGiven($('Outbound rule protocol: '), options.protocol, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createOutboundRule(resourceGroup, lbName, outboundRuleName, options, _);
    });

  outboundrule.command('update <resource-group> <lb-name> <outboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <outboundrule-name>')
    .description($('Updates outbound rule to load balancer'))
    .option('-p, --protocol <protocol>', $('the protocol'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, outboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      outboundRuleName = cli.interaction.promptIfNotGiven($('Outbound rule name: '), outboundRuleName, _);
      options.protocol = cli.interaction.promptIfNotGiven($('Outbound rule protocol: '), options.protocol, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.updateOutboundRule(resourceGroup, lbName, outboundRuleName, options, _);
    });

  outboundrule.command('delete <resource-group> <lb-name> <outboundrule-name>')
    .usage('[options] <resource-group> <lb-name> <outboundrule-name>')
    .description($('Updates outbound rule to load balancer'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, lbName, outboundRuleName, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      lbName = cli.interaction.promptIfNotGiven($('load balancer name: '), lbName, _);
      outboundRuleName = cli.interaction.promptIfNotGiven($('Outbound rule name: '), outboundRuleName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteOutboundRule(resourceGroup, lbName, outboundRuleName, options, _);
    });

  var publicip = network.category('publicip')
    .description($('Commands to manage public IP addresses'));

  publicip.command('create <resource-group> <name>')
    .description($('Create a public ip address within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-l, --location <location>', $('the location'))
    .option('-n, --domain-name <domainName>', $('the public ip domain name, this set DNS to <domain-name>.<location>.cloudapp.azure.com'))
    .option('-m, --allocation-method <allocation-method>', $('the public ip allocation method, valid values are "Dynamic"'))
    .option('-t, --idletimeout <idletimeout>', $('the public ip idle timeout'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      options.location = cli.interaction.promptIfNotGiven($('Location: '), options.location, _);
      options.domainName = cli.interaction.promptIfNotGiven($('Domain name: '), options.domainName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.createPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('show [resource-group] [name]')
    .description($('Gets one public address within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Public ip address name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showPublicIP(resourceGroup, name, options, _);
    });

  publicip.command('delete [resource-group] [name]')
    .description($('Deletes one public address within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
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
    .description($('Commands to manage Network Interface Card'));

  nic.command('list [resource-group]')
    .description($('Lists the network interface cards'))
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
    .option('-n, --name <name>', $('the network interface name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNIC(resourceGroup, name, options, _);
    });

  nic.command('delete [resource-group] [name]')
    .description($('Deletes one network interface within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Network interface name: '), name, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNIC(resourceGroup, name, options, _);
    });

  var nsg = network.category('nsg')
    .description($('Commands to manage Network Security Groups'));

  nsg.command('list [resource-group]')
    .description($('Lists the network security groups'))
    .usage('[options] [resource-group]')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNSGs(resourceGroup, options, _);
    });

  nsg.command('show <resource-group> [nsg-name]')
    .description($('Show the details of a network security group'))
    .usage('[options] <resource-group> [nsg-name]')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --nsg-name <nsg-name>', $('the network security group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNSG(resourceGroup, nsgName, options, _);
    });

  nsg.command('delete <resource-group> [nsg-name]')
    .description($('Delete a network security group'))
    .usage('[options] <resource-group> [nsg-name]')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --nsg-name <nsg-name>', $('the network security group name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNSG(resourceGroup, nsgName, options, _);
    });

  var nsgRules = nsg.category('rule')
    .description($('Commands to manage Network Security Group Rules'));

  nsgRules.command('list <resource-group> [nsg-name]')
    .description($('Lists rules in a network security group'))
    .usage('[options] <resource-group> [nsg-name]')
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, options, _) {
      nsgName = cli.interaction.promptIfNotGiven($('Network security group name: '), nsgName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.listNsgRules(resourceGroup, nsgName, options, _);
    });

  nsgRules.command('show <resource-group> <nsg-name> [rule-name]')
    .description($('Show a rule in a network security group'))
    .usage('[options] <resource-group> <nsg-name> [rule-name]')
    .option('-n, --rule-name <rule-name>', $('the rule name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, ruleName, options, _) {
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.showNsgRule(resourceGroup, nsgName, ruleName, options, _);
    });

  nsgRules.command('delete <resource-group> <nsg-name> [rule-name]')
    .description($('Delete a rule in a network security group'))
    .usage('[options] <resource-group> <nsg-name> [rule-name]')
    .option('-n, --rule-name <rule-name>', $('the rule name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, nsgName, ruleName, options, _) {
      ruleName = cli.interaction.promptIfNotGiven($('Rule name: '), ruleName, _);

      var networkClient = new NetworkClient(cli, options.subscription);
      networkClient.deleteNsgRule(resourceGroup, nsgName, ruleName, options, _);
    });
};