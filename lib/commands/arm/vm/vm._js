'use strict';

var utils = require('../../../util/utils');
var VMClient = require('./vmClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {

  var vm = cli.category('vm')
    .description($('Commands to manage your virtual machines'));

  vm.command('create <resourceGroup> <vmName> <nicName> <location> <osType>')
    .description($('Create a VM'))
    .usage('[options] <resourceGroup> <vmName> <nicName> <location> <osType>')
    .option('-q, --image-name <imageName>', $('the image name [image-name and os-disk-* parameters are mutually exclusive]'))
    .option('-u, --admin-username <adminUsername>', $('the user name [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
    .option('-p, --admin-password <adminPassword>', $('the password [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
    .option('-z, --vm-size <size>', $('the virtual machine size [Standard_A1]'))
    .option('-i, --publicip-name <publicipName>', $('the public ip name'))
    .option('-n, --publicip-domain-name <publicipDomainName>', $('the public ip domain name, this sets the DNS to <publicip-domain-name>.<location>.cloudapp.azure.com'))
    .option('-m, --publicip-allocationmethod <publicipAllocationmethod>', $('the public ip allocation method, valid values are "Dynamic"'))
    .option('-t, --publicip-idletimeout <publicipIdletimeout>', $('the public ip idle timeout specified in minutes'))
    .option('-f, --vnet-name <vnetName>', $('the virtual network name'))
    .option('-g, --vnet-addressprefix <vnetAddressprefix>', $('the virtual network address prefix in IPv4/CIDR format'))
    .option('-j, --vnet-subnet-name <vnetSubnetName>', $('the virtual network subnet name'))
    .option('-k, --vnet-subnet-addressprefix <vnetSubnetAddressprefix>', $('the virtual network subnet address prefix in IPv4/CIDR format'))
    .option('-l, --availset-name <availsetName>', $('the availability set name'))
    .option('-o, --storage-account-name <storageAccountName>', $('the storage account name'))
    .option('-r, --storage-account-container-name <storageAccountContainerName>', $('the storage account container name [vhds]'))
    .option('-c, --os-disk-caching <osDiskCaching>', $('os disk caching, valid values are None, ReadOnly, ReadWrite'))
    .option('-d, --os-disk-vhd <osDiskVhd>', $('name or url of the OS disk Vhd'))
    .option('-a, --data-disk-caching <dataDiskCaching>', $('data disk caching, valid values are None, ReadOnly, ReadWrite'))
    .option('-s, --data-disk-vhd <dataDiskVhd>', $('name or url of the data disk Vhd'))
    .option('-e, --data-disk-size <dataDiskSize>', $('data disk size in GB'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, vmName, nicName, location, osType, options, _) {
     var vmClient = new VMClient(cli, options.subscription);
     vmClient.createVM(resourceGroup, vmName, nicName, location, osType, options, _);
    });

  vm.command('list [resourceGroup]')
    .description($('Lists the virtual machines within a resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.listVM(resourceGroup, options, _);
    });

  vm.command('show [resourceGroup] [name]')
    .description($('Gets one virtual machine within a resource group'))
    .usage('[options] <resourceGroup> <name>')
    .option('-g, --resource-group <resourceGroup>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.showVM(resourceGroup, name, options, _);
    });
};