'use strict';

var utils = require('../../../util/utils');
var VMClient = require('./vmClient');

var $ = utils.getLocaleString;

exports.init = function (cli) {

  var vm = cli.category('vm')
    .description($('Commands to manage your virtual machines'));

  vm.command('create [resource-group] [name] [nic-name] [location] [os-type]')
    .description($('Create a VM'))
    .usage('[options] <resource-group> <name> <nic-name> <location> <os-type>')
    .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-f, --nic-name <nic-name>', $('the NIC name'))
    .option('-l, --location <location>', $('the location'))
    .option('-y, --os-type <os-type>', $('the operating system Type, valid values are Windows, Linux'))
    .option('-q, --image-name <image-name>', $('the image name [image-name and os-disk-* parameters are mutually exclusive]'))
    .option('-u, --admin-username <admin-username>', $('the user name [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
    .option('-p, --admin-password <admin-password>', $('the password [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
    .option('-M, --ssh-publickey-pem-file <ssh-publickey-pem-file>', $('path to public key PEM file for SSH authentication (valid only when os-type is "Linux")'))
    .option('-z, --vm-size <vm-size>', $('the virtual machine size [Standard_A1]'))
    .option('-i, --public-ip-name <public-ip-name>', $('the public ip name'))
    .option('-w, --public-ip-domain-name <public-ip-domain-name>', $('the public ip domain name, this sets the DNS to <publicip-domain-name>.<location>.cloudapp.azure.com'))
    .option('-m, --public-ip-allocationmethod <public-ip-allocationmethod>', $('the public ip allocation method, valid values are "Dynamic"'))
    .option('-t, --public-ip-idletimeout <public-ip-idletimeout>', $('the public ip idle timeout specified in minutes'))
    .option('-F, --vnet-name <vnet-name>', $('the virtual network name'))
    .option('-P, --vnet-addressprefix <vnet-addressprefix>', $('the virtual network address prefix in IPv4/CIDR format'))
    .option('-j, --vnet-subnet-name <vnet-subnet-name>', $('the virtual network subnet name'))
    .option('-k, --vnet-subnet-addressprefix <vnet-subnet-addressprefix>', $('the virtual network subnet address prefix in IPv4/CIDR format'))
    .option('-r, --availset-name <availset-name>', $('the availability set name'))
    .option('-o, --storage-account-name <storage-account-name>', $('the storage account name'))
    .option('-R, --storage-account-container-name <storage-account-container-name>', $('the storage account container name [vhds]'))
    .option('-c, --os-disk-caching <os-disk-caching>', $('os disk caching, valid values are None, ReadOnly, ReadWrite'))
    .option('-d, --os-disk-vhd <os-disk-vhd>', $('name or url of the OS disk Vhd'))
    .option('-a, --data-disk-caching <data-disk-caching>', $('data disk caching, valid values are None, ReadOnly, ReadWrite'))
    .option('-x, --data-disk-vhd <data-disk-vhd>', $('name or url of the data disk Vhd'))
    .option('-e, --data-disk-size <data-disk-size>', $('data disk size in GB'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, nicName, location, osType, options, _) {
     resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
     name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
     nicName = cli.interaction.promptIfNotGiven($('NIC name: '), nicName, _);
     location = cli.interaction.promptIfNotGiven($('location name: '), location, _);
     osType = cli.interaction.promptIfNotGiven($('Operating system Type: '), osType, _);

     var vmClient = new VMClient(cli, options.subscription);
     vmClient.createVM(resourceGroup, name, nicName, location, osType, options, _);
    });

  vm.command('list [resourceGroup]')
    .description($('Lists the virtual machines within a resource group'))
    .usage('[options] <resource-group>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.listVM(resourceGroup, options, _);
    });

  vm.command('show [resource-group] [name]')
    .description($('Gets one virtual machine within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-d, --depth <depth>', $('the number of times to recurse, to recurse indefinitely pass "full". (valid only with --json option)'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.showVM(resourceGroup, name, options, _);
    });

  vm.command('delete [resource-group] [name]')
    .description($('Deletes one virtual machine within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.deleteVM(resourceGroup, name, options, _);
    });

  vm.command('stop [resource-group] [name]')
    .description($('Shutdown one virtual machine within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.stopVM(resourceGroup, name, options, _);
    });

  vm.command('restart [resource-group] [name]')
    .description($('Restarts one virtual machine within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.restartVM(resourceGroup, name, options, _);
    });

  vm.command('start [resource-group] [name]')
    .description($('Starts one virtual machine within a resource group'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.startVM(resourceGroup, name, options, _);
    });

  vm.command('deallocate [resource-group] [name]')
    .description($('Shutdown one virtual machine within a resource group and releases the compute resources'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.deallocateVM(resourceGroup, name, options, _);
    });

  vm.command('sizes')
    .description($('Lists available virtual machine sizes'))
    .usage('[options]')
    .option('-l, --location <location>', $('the location name, use this to get the list of VM sizes available in a location'))
    .option('-n, --vm-name <vm-name>', $('the virtual machine name, use this to get the list of VM sizes available for a specific VM'))
    .option('-g, --resource-group <resourceGroup>', $('the resource group name, required when --vm-name is specified'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var vmClient = new VMClient(cli, options.subscription);
      vmClient.listVMSizesOrLocationVMSizes(options, _);
  });

  vm.command('capture [resource-group] [name] [vhd-name-prefix]')
    .description($('Capture the VM as OS Image or VM Image'))
    .usage('[options] <resource-group> <name> <vhd-name-prefix>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-n, --vhd-name-prefix <vhd-name-prefix>', $('Captured virtual hard disk\'s name prefix'))
    .option('-R, --storage-account-container-name <storage-account-container-name>', $('the storage account container name [vhds]'))
    .option('-o, --overwrite', $('In case of conflict overwrite the target virtual hard disk if set to true.'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(resourceGroup, name, vhdNamePrefix, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
      vhdNamePrefix = cli.interaction.promptIfNotGiven($('Virtual hard disk\'s name prefix: '), vhdNamePrefix, _);

      var vmClient = new VMClient(cli, options.subscription);
      vmClient.captureVM(resourceGroup, name, vhdNamePrefix, options, _);
    });

  vm.command('generalize [resource-group] [name]')
    .description($('Sets the state of the VM to Generalized.'))
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);

      var vmClient = new VMClient(cli, options.subscription);
      vmClient.generalizeVM(resourceGroup, name, options, _);
    });

  vm.command('get-instance-view [resource-group] [name]')
    .usage('[options] <resource-group> <name>')
    .option('-g, --resource-group <resource-group>', $('the resource group name'))
    .option('-n, --name <name>', $('the virtual machine name'))
    .option('-s, --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
      name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);

      var vmClient = new VMClient(cli, options.subscription);
      vmClient.getInstanceView(resourceGroup, name, options, _);
    });

    var disk = vm.category('disk')
        .description($('Commands to manage your Virtual Machine data disks'));

    disk.command('attach-new [resource-group] [vm-name] [size-in-gb] [vhd-name]')
      .description($('Attach a new data-disk to a VM'))
      .usage('[options] <resource-group> <vm-name> <size-in-gb> [vhd-name]')
      .option('-g, --resource-group <resource-group>', $('the resource group name'))
      .option('-n, --vm-name <vm-name>', $('the virtual machine name'))
      .option('-z, --size-in-gb <size-in-gb>', $('the disk size in GB'))
      .option('-d, --vhd-name <vhd-name>', $('the name for the new VHD'))
      .option('-c, --host-caching <name>', $('the caching behaviour of disk [None, ReadOnly, ReadWrite]'))
      .option('-o, --storage-account-name <storageAccountName>', $('the storage account name'))
      .option('-r, --storage-account-container-name <storageAccountContainerName>', $('the storage account container name [vhds]'))
      .option('-s, --subscription <id>', $('the subscription id'))
      .execute(function(resourceGroup, vmName, size, vhdName, options, _) {
        resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
        vmName = cli.interaction.promptIfNotGiven($('Virtual machine name: '), vmName, _);
        size = cli.interaction.promptIfNotGiven($('Disk size in gb: '), size, _);
        var vmClient = new VMClient(cli, options.subscription);
        vmClient.attachNewDataDisk(resourceGroup, vmName, size, vhdName, options, _);
    });

    disk.command('detach [resource-group] [vm-name] [lun]')
      .description($('Detaches a data-disk attached to a VM'))
      .usage('[options] <resource-group> <vm-name> <lun>')
      .option('-g, --resource-group <resource-group>', $('the resource group name'))
      .option('-n, --vm-name <vm-name>', $('the virtual machine name'))
      .option('-l, --lun <lun>', $('the data disk lun'))
      .option('-s, --subscription <id>', $('the subscription id'))
      .execute(function(resourceGroup, vmName, lun, options, _) {
        resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
        vmName = cli.interaction.promptIfNotGiven($('Virtual machine name: '), vmName, _);
        lun = cli.interaction.promptIfNotGiven($('Data disk lun: '), lun, _);

        var vmClient = new VMClient(cli, options.subscription);
        vmClient.detachDataDisk(resourceGroup, vmName, lun, options, _);
    });

    var extension = vm.category('extension')
      .description($('Commands to manage VM resource extensions'));

    extension.command('set [resource-group] [vm-name] [name] [publisher-name] [version]')
      .description($('Enable/disable resource extensions for VMs'))
      .usage('[options] <resource-group> <vm-name> <name> <publisher-name> <version>')
      .option('-g, --resource-group <resource-group>', $('the resource group name'))
      .option('-m, --vm-name <vm-name>', $('the virtual machine name'))
      .option('-n, --name <name>', $('the extension name'))
      .option('-p, --publisher-name <publisher-name>', $('the publisher name'))
      .option('-o, --version <version>', $('the extension version'))
      .option('-r, --reference-name <reference-name>', $('extension\'s reference name'))
      .option('-i, --public-config <public-config>', $('public configuration text'))
      .option('-c, --public-config-path <public-config-path>', $('public configuration file path'))
      .option('-f, --private-config <private-config>', $('private configuration text'))
      .option('-e, --private-config-path <private-config-path>', $('private configuration file path'))
      .option('-u, --uninstall', $('uninstall extension'))
      .option('-t, --tags <tags>', $('the semicolon separated list of tags'))
      .option('-s, --subscription <id>', $('the subscription id'))
      .execute(function(resourceGroup, vmName, name, publisherName, version, options, _) {
        resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
        vmName = cli.interaction.promptIfNotGiven($('Virtual machine name: '), vmName, _);
        name = cli.interaction.promptIfNotGiven($('VM Extension name: '), name, _);
        publisherName = cli.interaction.promptIfNotGiven($('VM Extension publisher name: '), publisherName, _);
        version = cli.interaction.promptIfNotGiven($('VM Extension version: '), version, _);

        var vmClient = new VMClient(cli, options.subscription);
        vmClient.setExtension(resourceGroup, vmName, name, publisherName, version, options, _);
    });

    extension.command('get [resource-group] [vm-name]')
      .description($('Get VM extensions'))
      .usage('[options] <resource-group> <vm-name>')
      .option('-g, --resource-group <resource-group>', $('the resource group name'))
      .option('-m, --vm-name <vm-name>', $('the virtual machine name'))
      .option('-s, --subscription <id>', $('the subscription id'))
      .execute(function(resourceGroup, vmName, options, _) {
        resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
        vmName = cli.interaction.promptIfNotGiven($('Virtual machine name: '), vmName, _);

        var vmClient = new VMClient(cli, options.subscription);
        vmClient.getExtensions(resourceGroup, vmName, options, _);
    });

    var docker = vm.category('docker')
      .description($('Commands to manage your Docker Virtual Machine'));

    docker.command('create [resource-group] [name] [nic-name] [location] [os-type]')
      .usage('[options] <resource-group> <name> <nic-name> <location> <os-type>')
      .description($('Create a Docker VM'))
      .option('-g, --resource-group <resource-group>', $('the name of the resource group'))
      .option('-n, --name <name>', $('the virtual machine name'))
      .option('-f, --nic-name <nic-name>', $('the NIC name'))
      .option('-l, --location <location>', $('the location'))
      .option('-y, --os-type <os-type>', $('the operating system Type, valid values are Windows, Linux'))
      .option('-p, --docker-port [port]', $('Port to use for docker [4243]'))
      .option('-C, --docker-cert-dir [dir]', $('Directory containing docker certs [~/.docker/]'))
      .option('-dv, --docker-extension-version [version]', $('Version of Docker Azure extension [0.6]'))
      .option('-q, --image-name <image-name>', $('the image name [image-name and os-disk-* parameters are mutually exclusive]'))
      .option('-u, --admin-username <admin-username>', $('the user name [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
      .option('-p, --admin-password <admin-password>', $('the password [valid for VM created from an image (image-name) ignored when VM is based on disk (os-disk-*)]'))
      .option('-z, --vm-size <vm-size>', $('the virtual machine size [Standard_A1]'))
      .option('-i, --public-ip-name <public-ip-name>', $('the public ip name'))
      .option('-w, --public-ip-domain-name <public-ip-domain-name>', $('the public ip domain name, this sets the DNS to <publicip-domain-name>.<location>.cloudapp.azure.com'))
      .option('-m, --public-ip-allocationmethod <public-ip-allocationmethod>', $('the public ip allocation method, valid values are "Dynamic"'))
      .option('-t, --public-ip-idletimeout <public-ip-idletimeout>', $('the public ip idle timeout specified in minutes'))
      .option('-F, --vnet-name <vnet-name>', $('the virtual network name'))
      .option('-P, --vnet-addressprefix <vnet-addressprefix>', $('the virtual network address prefix in IPv4/CIDR format'))
      .option('-j, --vnet-subnet-name <vnet-subnet-name>', $('the virtual network subnet name'))
      .option('-k, --vnet-subnet-addressprefix <vnet-subnet-addressprefix>', $('the virtual network subnet address prefix in IPv4/CIDR format'))
      .option('-r, --availset-name <availset-name>', $('the availability set name'))
      .option('-o, --storage-account-name <storage-account-name>', $('the storage account name'))
      .option('-R, --storage-account-container-name <storage-account-container-name>', $('the storage account container name [vhds]'))
      .option('-c, --os-disk-caching <os-disk-caching>', $('os disk caching, valid values are None, ReadOnly, ReadWrite'))
      .option('-d, --os-disk-vhd <os-disk-vhd>', $('name or url of the OS disk Vhd'))
      .option('-a, --data-disk-caching <data-disk-caching>', $('data disk caching, valid values are None, ReadOnly, ReadWrite'))
      .option('-x, --data-disk-vhd <data-disk-vhd>', $('name or url of the data disk Vhd'))
      .option('-e, --data-disk-size <data-disk-size>', $('data disk size in GB'))
      .option('-s, --subscription <subscription>', $('the subscription identifier'))
      .execute(function(resourceGroup, name, nicName, location, osType, options, _) {
        resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), resourceGroup, _);
        name = cli.interaction.promptIfNotGiven($('Virtual machine name: '), name, _);
        nicName = cli.interaction.promptIfNotGiven($('NIC name: '), nicName, _);
        location = cli.interaction.promptIfNotGiven($('location name: '), location, _);
        osType = cli.interaction.promptIfNotGiven($('Operating system Type: '), osType, _);

        var vmClient = new VMClient(cli, options.subscription);
        vmClient.createDockerVM(resourceGroup, name, nicName, location, osType, options, _);
      });
};