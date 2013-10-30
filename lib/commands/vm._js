/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var fs = require('fs');
var url = require('url');
var util = require('util');
var crypto = require('crypto');
var underscore = require('underscore');

var utils = require('../util/utils');
var CommunityUtil = require('../util/communityUtil');
var blobUtils = require('../util/blobUtils');
var image = require('../iaas/image');
var deleteImage = require('../iaas/deleteImage');
var pageBlob = require('../iaas/upload/pageBlob');

var VMClient = require('./vm/vmclient');
var EndPointUtil = require('./vm/endpointUtil');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var vm = cli.category('vm')
    .description($('Commands to manage your Virtual Machines'));

  var logger = cli.output;

  vm.command('create <dns-name> <image> <user-name> [password]')
    .usage('[options] <dns-name> <image> <userName> [password]')
    .description($('Create a VM'))
    .option('-o, --community', $('the <image> is a community image'))
    .option('-c, --connect', $('connect to existing VMs'))
    .option('-l, --location <name>', $('the location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-u, --blob-url <url>', $('the blob url for OS disk'))
    .option('-z, --vm-size <size>', $('the virtual machine size [small]\n    extrasmall, small, medium, large, extralarge, a5, a6, a7'))
    .option('-n, --vm-name <name>', $('the virtual machine name'))
    .option('-e, --ssh [port]', $('the ssh port to enable [22]'))
    .option('-t, --ssh-cert <pem-file|fingerprint>', $('the SSH certificate'))
    .option('-P, --no-ssh-password', $('indicates that the password should be removed when using --ssh-cert'))
    .option('-r, --rdp [port]', $('indicates that RDP should be enabled [3389]'))
    .option('-w, --virtual-network-name <name>', $('the virtual network name'))
    .option('-b, --subnet-names <list>', $('the comma-delimited subnet names'))
    .option('-A, --availability-set <name>', $('the name of availability set to create or use'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(dnsName, image, userName, password, options, callback) {
      var dnsPrefix = utils.getDnsPrefix(dnsName);
      var vmSize;
      if (options.vmSize) {
        vmSize = options.vmSize.trim().toLowerCase();

        if (vmSize === 'medium') {
          vmSize = 'Medium';
        } else {
          vmSize = vmSize[0].toUpperCase() + vmSize.slice(1, 5) +
                   (vmSize.length > 5 ? (vmSize[5].toUpperCase() + vmSize.slice(6)) : '');
        }

        if (vmSize !== 'ExtraSmall' && vmSize !== 'Small' && vmSize !== 'Medium' &&
            vmSize !== 'Large' && vmSize !== 'ExtraLarge' &&
            vmSize !== 'A5' && vmSize !== 'A6' && vmSize !== 'A7') {
          logger.help('--vm-size <size> must specify one of the following:');
          logger.help('  extrasmall, small, medium, large, extralarge, a5, a6, a7');
          callback(new Error($('Invalid <size> specified with --vm-size')));
        }
      } else {
        // Default to small
        vmSize = 'Small';
      }

      if (options.rdp) {
        if (typeof options.rdp === 'boolean') {
          options.rdp = 3389;
        } else if ((options.rdp != parseInt(options.rdp, 10)) || (options.rdp > 65535)) {
          callback(new Error($('--rdp [port] must be an integer less than or equal to 65535')));
        }
      }

      if (options.ssh) {
        if (typeof options.ssh === 'boolean') {
          options.ssh = 22;
        } else if ((options.ssh != parseInt(options.ssh, 10)) || (options.ssh > 65535)) {
          callback(new Error($('--ssh [port] must be an integer less than or equal to 65535')));
        }
      } else if (!options.sshPassword) {
        callback(new Error($('--no-ssh-password can only be used with the --ssh-cert parameter')));
      }

      createVM({
        dnsPrefix: dnsPrefix,
        imageName: image,
        password: password,
        userName: userName,
        subscription: options.subscription,
        size: vmSize,
        location: options.location,
        affinityGroup: options.affinityGroup,
        imageTarget: options.blobUrl,
        ssh: options.ssh,
        sshCert: options.sshCert,
        noSshPassword: options.sshPassword === false,
        rdp: options.rdp,
        connect: options.connect,
        community: options.community,
        vmName: options.vmName,
        virtualNetworkName: options.virtualNetworkName,
        subnetNames: options.subnetNames,
        availabilitySet: options.availabilitySet
      }, callback);
    });

  vm.command('create-from <dns-name> <role-file>')
    .usage('[options] <dns-name> <role-file>')
    .description($('Create a VM from json role file'))
    .option('-c, --connect', $('connect to existing VMs'))
    .option('-l, --location <name>', $('the location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-t, --ssh-cert <pem-file>', $('Upload SSH certificate'))
    .option('-w, --virtual-network-name <name>', $('the virtual network name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(dnsName, roleFile, options, callback) {

      function stripBOM(content) {
        // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
        // because the buffer-to-string conversion in `fs.readFileSync()`
        // translates it to FEFF, the UTF-16 BOM.
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
        return content;
      }

      var dnsPrefix = utils.getDnsPrefix(dnsName);
      logger.verbose(util.format($('Loading role file: %s'), roleFile));
      var jsonFile = fs.readFileSync(roleFile, 'utf8');
      var role = JSON.parse(stripBOM(jsonFile));

      createVM({
        subscription: options.subscription,
        location: options.location,
        affinityGroup: options.affinityGroup,
        dnsPrefix: dnsPrefix,
        connect: options.connect,
        role: role,
        sshCert: options.sshCert,
        virtualNetworkName: options.virtualNetworkName
      }, callback);
    });

  vm.command('list')
    .description($('List the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(options, callback) {
      listVMs(options, callback);
    });

  vm.command('show <name>')
    .description($('Show details about the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {
      showVM(name, options, callback);
    });

  vm.command('delete <name>')
    .description($('Delete the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-b, --blob-delete', $('Remove image and disk blobs'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {
      deleteVM(name, options, callback);
    });

  vm.command('start <name>')
    .description($('Start the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {
      startVM(name, options, callback);
    });

  vm.command('restart <name>')
    .description($('Restart the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {
      restartVM(name, options, callback);
    });

  vm.command('shutdown <name>')
    .description($('Shutdown the VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-p, --stay-provisioned', $('if specified the compute resource will not be released on shutdown'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {
      shutdownVM(name, options, callback);
    });

  vm.command('capture <vm-name> <target-image-name>')
    .description($('Capture the VM image'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-e, --label <label>', $('Target image friendly name'))
    .option('-t, --delete', $('Delete virtual machine after successful capture'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(vmName, targetImageName, options, callback) {
      if (!options['delete']) {
        // Using this option will warn the user that the machine will be deleted
        logger.help($('Reprovisioning a captured VM is not yet supported'));
        callback('required --delete option is missing');
      }
      captureVM(vmName, targetImageName, options, callback);
    });

  vm.command('export <vm-name> <file-path>')
  .description($('Export a VM to a file'))
  .option('-d, --dns-name <name>', $('Export the virtual machine for this DNS name'))
  .option('-s, --subscription <id>', $('the subscription id'))
  .execute(function(vmName, filePath, options, callback) {
    exportVM(vmName, filePath, options, callback);
  });

  var location = vm.category('location')
        .description($('Commands to manage your Virtual Machine locations'));

  location.command('list')
    .description($('List locations available for your account'))
    .execute(function (options, _) {
      var service = utils._createManagementClient(cli.category('account').getCurrentSubscription(options.subscription), logger);

      var locations;
      var progress = cli.interaction.progress($('Getting locations'));

      try {
        locations = service.locations.list(_).locations;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(locations, function(outputData) {
        if(outputData.length === 0) {
          logger.info($('No locations'));
        } else {
          logger.table(outputData, function (row, item) {
            row.cell($('Name'), item.name);
          });
        }
      });
    });

  var endpoint = vm.category('endpoint')
    .description($('Commands to manage your Virtual Machine endpoints'));

  endpoint.command('create <vm-name> <lb-port> [vm-port]')
    .description($('Create a VM endpoint'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-n, --endpoint-name <name>', $('the endpoint name'))
    .option('-b, --lb-set-name <name>', $('the load-balancer set name'))
    .option('-t, --probe-port <port>', $('the virtual machine port to use to inspect the role availability status'))
    .option('-r, --probe-protocol <protocol>', $('the protocol to use to inspect the role availability status'))
    .option('-p, --probe-path <path>', $('the relative path to inspect the role availability status'))
    .option('-o, --endpoint-protocol <protocol>', $('the transport layer protocol for port (tcp or udp)'))
    .option('-u, --enable-direct-server-return', $('whether to enable direct server return on this endpoint, disabled by default'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(vmName, lbport, vmport, options, callback) {

      var endPointUtil = new EndPointUtil();
      var epInput = {};
      epInput.lbPort = { 'value': lbport, 'argName': 'lb-port' };

      if (vmport) {
        epInput.vmPort = { 'value': vmport, 'argName': 'vm-port' };
      }

      if (options.endpointName) {
        epInput.name = { 'value': options.endpointName, 'argName': '--endpoint-name' };
      }

      if (options.endpointProtocol) {
        epInput.protocol = { 'value': options.endpointProtocol, 'argName': '--endpoint-protocol' };
      }

      if (options.lbSetName) {
        epInput.lbSetName = { 'value': options.lbSetName, 'argName': '--lb-set-name' };
      }

      if (options.probePort) {
        epInput.probePort = { 'value': options.probePort, 'argName': '--probe-port' };
      }

      if (options.probeProtocol) {
        epInput.probeProtocol = { 'value': options.probeProtocol, 'argName': '--probe-protocol' };
      }

      if (options.probePath) {
        epInput.probePath = { 'value': options.probePath, 'argName': '--probe-path' };
      }

      if (options.enableDirectServerReturn) {
        epInput.directServerReturn = { 'value': 'true', 'argName': '--enable-direct-server-return' };
      }

      result = endPointUtil.verifyAndGetEndPointObj(epInput, [], false);
      if (result.error) {
        callback(new Error(result.error));
      }

      endpointsCreate({
        subscription: options.subscription,
        name: vmName,
        dnsPrefix: utils.getDnsPrefix(options.dnsName, true),
        newEndPoints: [result.endPoint],
        create: true
      }, callback);
    });

  endpoint.command('create-multiple <vm-name> <endpoints>')
  .usage('[options] <vm-name> <lb-port>[:<vm-port>[:<protocol>[:<enable-direct-server-return>[:<lb-set-name>[:<probe-protocol>[:<probe-port>[:<probe-path>]]]]]]] {1-*}')
  .description($('Create multiple VM endpoints'))
  .option('-d, --dns-name <name>', $('consider VM hosted in this DNS name'))
  .option('-s, --subscription <id>', $('the subscription id'))

  .execute(function(vmName, endpoints, options, callback) {
    var message = 'each endpoint in the endpoints argument should be of the form \r\n         <lb-port>[:<vm-port>[:<protocol>[:<enable-direct-server-return>[:<lb-set-name>[:<probe-protocol>[:<probe-port>[:<probe-path>]]]]]]] \r\n         and prob-path Should be relative';
    var endpointsAsList = endpoints.split(',');
    var inputEndpoints = [];
    var endPointUtil = new EndPointUtil();

    endpointsAsList.forEach(function(endpointInfoStr, j) {
      if (!endpointInfoStr) {
        return callback(new Error(message));
      }

      var  endpointInfoAsList = endpointInfoStr.split(':');
      if (endpointInfoAsList.length > 8) {
        return callback(new Error(message));
      }

      var i = 0;
      var epInput = {};
      endpointInfoAsList.forEach(function(item) {
        if (!item) {
          return callback(new Error(message));
        }

        switch(i) {
        case 0:
          epInput.lbPort = {
            value: item,
            argName: 'lb-port'
          };
          break;
        case 1:
          epInput.vmPort = {
            value: item,
            argName: 'vm-port'
          };
          break;
        case 2:
          epInput.protocol = {
            value: item,
            argName: 'protocol'
          };
          break;
        case 3:
          epInput.directServerReturn = {
            value: item,
            argName: 'enable-direct-server-return'
          };
          break;
        case 4:
          epInput.lbSetName = {
            value: item,
            argName: 'lb-set-name'
          };
          break;
        case 5:
          epInput.probeProtocol = {
            value: item,
            argName: 'probe-protocol'
          };
          break;
        case 6:
          epInput.probePort = {
            value: item,
            argName: 'probe-port'
          };
          break;
        case 7:
          epInput.probePath = {
            value: item,
            argName: 'probe-path'
          };
          break;
        }

        i++;
      });

      j++;
      var result = endPointUtil.verifyAndGetEndPointObj(epInput, [], false);
      if (result.error) {
        return callback(new Error(util.format('%s (endpoint %s)', result.error, j)));
      }

      inputEndpoints.push(result.endPoint);
    });

    endpointsCreate({
      subscription: options.subscription,
      name: vmName,
      dnsPrefix: utils.getDnsPrefix(options.dnsName, true),
      newEndPoints: inputEndpoints
    }, callback);
  });

  endpoint.command('delete <vm-name> <endpoint-name>')
    .description($('Delete a VM endpoint'))
    .option('-d, --dns-name <name>', $('only consider VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(vmName, endpointName, options, callback) {

      endpointDelete({
        subscription: options.subscription,
        name: vmName,
        dnsPrefix: utils.getDnsPrefix(options.dnsName, true),
        endPointName: endpointName,
      }, callback);
    });

  endpoint.command('update <vm-name> <endpoint-name>')
    .description($('Update a VM endpoint'))
    .option('-d, --dns-name <name>', $('only consider VM for this DNS name'))
    .option('-n, --endpoint-name <name>', $('the new endpoint name'))
    .option('-t, --lb-port <port>', $('the new load balancer port'))
    .option('-t, --vm-port <port>', $('the new local port port'))
    .option('-o, --endpoint-protocol <protocol>', $('the new transport layer protocol for port (tcp or udp)'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(vmName, endpointName, options, callback) {
      var endPointUtil = new EndPointUtil();
      var endPoint = {};

      if (options.endpointName) {
        var epNameRes = endPointUtil.validateEndPointName(options.endpointName, '--endpoint-name');
        if (epNameRes.error) {
          return callback(epNameRes.error);
        }

        endPoint.Name = epNameRes.endpointName;
      }

      if (options.lbPort) {
        var lbpRes = endPointUtil.validatePort(options.lbPort, '--lb-port');
        if (lbpRes.error) {
          return callback(lbpRes.error);
        }

        endPoint.Port = lbpRes.port;
      }

      if (options.vmPort) {
        var vmpRes = endPointUtil.validatePort(options.vmPort, '--vm-port');
        if (vmpRes.error) {
          return callback(vmpRes.error);
        }

        endPoint.LocalPort = vmpRes.port;
      }

      if (options.endpointProtocol) {
        var eppRes = endPointUtil.validateProtocol(options.endpointProtocol, '--endpoint-protocol');
        if (eppRes.error) {
          return callback(eppRes.error);
        }

        endPoint.Protocol = eppRes.protocol;
      }

      if (underscore.isEmpty(endPoint)) {
        return callback($('one of the optional parameter --endpoint-name, --lb-port, --vm-port or --endpoint-protocol is required'));
      }

      endpointUpdate({
        subscription: options.subscription,
        name: vmName,
        dnsPrefix: utils.getDnsPrefix(options.dnsName, true),
        endPointName: endpointName,
        endPoint: endPoint,
      }, callback);
    });

  endpoint.command('list <vm-name>')
    .description($('List a VM endpoints'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {

      showListEndpoints({
        subscription: options.subscription,
        name: name,
        dnsPrefix: utils.getDnsPrefix(options.dnsName, true)
      }, true, callback);
    });

  endpoint.command('show <vm-name>')
    .description($('Show details of VM endpoint'))
    .option('-e, --endpoint-name <name>', $('only show details of this endpoint'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, options, callback) {

      showListEndpoints({
        subscription: options.subscription,
        name: name,
        endpointName: options.endpointName,
        dnsPrefix: utils.getDnsPrefix(options.dnsName, true)
      }, false, callback);
    });

  var osImage = vm.category('image')
    .description($('Commands to manage your Virtual Machine images'));

  osImage.command('show <name>')
    .description($('Show details about a VM image'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.show(image.OSIMAGE, cli));

  osImage.command('list')
    .description($('List VM images'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.list(image.OSIMAGE, cli));

  osImage.command('delete <name>')
    .description($('Delete a VM image from a personal repository'))
    .option('-b, --blob-delete', $('the delete underlying blob from storage'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.imageDelete(image.OSIMAGE, cli));

  osImage.command('create <name> [source-path]')
    .description($('Upload and register a VM image'))
    .option('-u, --blob-url <url>', $('the target image blob url'))
    .option('-l, --location <name>', $('the location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-o, --os <type>', $('the operating system [linux|windows]'))
    .option('-p, --parallel <number>', $('the maximum number of parallel uploads [96]'), 96)
    .option('-m, --md5-skip', $('skip MD5 hash computation'))
    .option('-f, --force-overwrite', $('Force overwrite of prior uploads'))
    .option('-e, --label <about>', $('the image label'))
    .option('-d, --description <about>', $('the image description'))
    .option('-b, --base-vhd <blob>', $('the base vhd blob url'))
    .option('-k, --source-key <key>', $('the source storage key if source-path\n                         is a Windows Azure private blob url'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.create(image.OSIMAGE, cli));

  var disk = vm.category('disk')
    .description($('Commands to manage your Virtual Machine data disks'));

  disk.command('show <name>')
    .description($('Show details about a disk'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.show(image.DISK, cli));

  disk.command('list [vm-name]')
    .description($('List disk images, or disks attached to a specified VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.list(image.DISK, cli));

  disk.command('delete <name>')
    .description($('Delete a disk image from personal repository'))
    .option('-b, --blob-delete', $('Delete underlying blob from storage'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.imageDelete(image.DISK, cli));

  disk.command('create <name> [source-path]')
    .description($('Upload and register a disk image'))
    .option('-u, --blob-url <url>', $('the target image blob url'))
    .option('-l, --location <name>', $('the location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-o, --os [type]', $('the operating system if any [linux|windows|none]'))
    .option('-p, --parallel <number>', $('the maximum number of parallel uploads [96]', 96))
    .option('-m, --md5-skip', $('skip MD5 hash computation'))
    .option('-f, --force-overwrite', $('Force overwrite of prior uploads'))
    .option('-e, --label <about>', $('the image label'))
    .option('-d, --description <about>', $('the image description'))
    .option('-b, --base-vhd <blob>', $('the base vhd blob url'))
    .option('-k, --source-key <key>', $('the source storage key if source-path\n                         is a Windows Azure private blob url'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(image.create(image.DISK, cli));

  disk.command('upload <source-path> <blob-url> <storage-account-key>')
    .description($('Upload a VHD to a storage account'))
    .option('-p, --parallel <number>', $('the maximum number of parallel uploads [96]'), 96)
    .option('-m, --md5-skip', $('skip MD5 hash computation'))
    .option('-f, --force-overwrite', $('Force overwrite of prior uploads'))
    .option('-b, --base-vhd <blob>', $('the base vhd blob url'))
    .option('-k, --source-key <key>', $('the source storage key if source-path\n                         is a Windows Azure private blob url'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(sourcePath, blobUrl, storageAccountKey, options, callback) {
      if (/^https?\:\/\//i.test(sourcePath)) {
        logger.verbose('Copying blob from ' + sourcePath);
        if (options.md5Skip || options.parallel !== 96  || options.baseVhd) {
          logger.warn('--md5-skip, --parallel and/or --base-vhd options will be ignored');
        }
        if (!options.forceOverwrite) {
          logger.warn('Any existing blob will be overwritten' + (blobUrl ?  ' at ' + blobUrl : ''));
        }
        var progress = cli.interaction.progress('Copying blob');
        pageBlob.copyBlob(sourcePath, options.sourceKey, blobUrl, storageAccountKey, function(error, blob, response) {
          progress.end();
          logger.silly(util.inspect(response, null, null, true));
          if (!error) {
            logger.silly('Status : ' + response.copyStatus);
          }

          callback(error);
        });
      } else {
        var uploadOptions = {
          verbose : cli.verbose ||
            logger.format().level === 'verbose' ||
            logger.format().level === 'silly',
          skipMd5 : options.md5Skip,
          force : options.forceOverwrite,
          vhd : true,
          threads : options.parallel,
          parentBlob : options.baseVhd,
          exitWithError : callback,
          logger : logger
        };

        pageBlob.uploadPageBlob(blobUrl, storageAccountKey, sourcePath, uploadOptions, callback);
      }
    });

  disk.command('attach <vm-name> <disk-image-name>')
    .description($('Attach a data-disk to a VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, diskImageName, options, callback) {

      diskAttachDetach({
        subscription: options.subscription,
        name: name,
        dnsName: options.dnsName,
        size: null,
        isDiskImage: true,
        url: diskImageName,
        attach: true
      }, callback);
    });

  disk.command('attach-new <vm-name> <size-in-gb> [blob-url]')
    .description($('Attach a new data-disk to a VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, size, blobUrl, options, callback) {

      var sizeAsInt = utils.parseInt(size);
      if (isNaN(sizeAsInt)) {
        callback('size-in-gb must be an integer');
      }

      diskAttachDetach({
        subscription: options.subscription,
        name: name,
        dnsName: options.dnsName,
        size: sizeAsInt,
        isDiskImage: false,
        url: blobUrl,
        attach: true
      }, callback);
    });

  disk.command('detach <vm-name> <lun>')
    .description($('Detaches a data-disk attached to a VM'))
    .option('-d, --dns-name <name>', $('only show VMs for this DNS name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(name, lun, options, callback) {

      var lunAsInt = utils.parseInt(lun);
      if (isNaN(lunAsInt)) {
        callback('lun must be an integer');
      }

      diskAttachDetach({
        subscription: options.subscription,
        name: name,
        dnsName: options.dnsName,
        lun: lunAsInt,
        attach: false
      }, callback);
    });

  // default service options.
  var svcopts = {
    Label: '',
    Description: 'Implicitly created hosted service'
  };

  function createVM(options, cmdCallback) {
    var deployOptions = {
      DeploymentSlot: options.deploySlot,
      VirtualNetworkName: options.virtualNetworkName
    };

    var role;
    var image;
    var pemSshCert;
    var sshFingerprint;
    var provisioningConfig;
    var progress;
    var dnsPrefix;
    var location;
    var affinityGroup;
    var hostedServiceCreated = false;
    var communityImgInfo = {
      created: false,
      name: null,
      blobUrl: null
    };

    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    dnsPrefix = options.dnsPrefix;

    function cmdCallbackHook(error) {
      if (communityImgInfo.created) {
        var imageHelper = require('../iaas/image');
        var imageDelete = imageHelper.imageDelete(imageHelper.OSIMAGE, cli);
        var imageDeleteOptions = {
          blobDelete : true,
          subscription : options.subscription
        };

        imageDelete(communityImgInfo.name, imageDeleteOptions, function(imgDelErr) {
          if (imgDelErr) {
            // Show message to user that image clean up failed but vm creation
            // succeeded
            if (!error) {
              logger.error(util.format($('though VM creation succeeded failed to cleanup the image'), communityImgInfo.name));
            } else {
              logger.error($('failed to cleanup the image'));
            }
          }

          if (error) {
            return cleanupHostedServiceAndExit(error);
          } else {
            return cmdCallback();
          }
        });
      } else {
        if (error) {
          return cleanupHostedServiceAndExit(error);
        } else {
          return cmdCallback();
        }
      }
    }

    function loadSshCert() {
      logger.silly(util.format($('Trying to open SSH cert: %s'), options.sshCert));
      pemSshCert = fs.readFileSync(options.sshCert);
      var pemSshCertStr = pemSshCert.toString();
      if (!utils.isPemCert(pemSshCertStr)) {
        return $('Specified SSH certificate is not in PEM format');
      }

      sshFingerprint = utils.getCertFingerprint(pemSshCertStr);
      return null;
    }

    function lookupImage(imageName, callback) {
      var result = {
        error: null,
        image: null
      };

      progress = cli.interaction.progress(util.format($('Looking up image %s'), imageName));
      utils.doServiceManagementOperation(channel, 'listOSImage', function(error, response) {
        progress.end();
        if (!error) {
          var images = response.body;
          result.image = underscore.find(images, function(img) { return (img.Name === imageName); });

          if (!result.image) {
            result.error = util.format($('Image "%s" not found'), imageName);
          } else {
            logger.silly('image:');
            logger.json('silly', result.image);
          }
        } else {
          result.error = error;
        }

        return callback(result.error, result.image);
      });
    }

    function copyAndRegCommunityImgIfRequired(callback) {
      if (options.community) {
        var imageHelper = require('../iaas/image');
        var imageCreate = imageHelper.create(imageHelper.OSIMAGE, cli);
        var imageCreateOptions = {
          os : 'Linux',
          blobUrl : options.imageTarget,
          location: options.location,
          affinityGroup : options.affinityGroup,
          subscription : options.subscription
        };

        imageCreate(communityImgInfo.name, communityImgInfo.blobUrl, imageCreateOptions, function (error) {
          if (error) {
            return cmdCallbackHook(error);
          }

          communityImgInfo.created = true;
          lookupImage(communityImgInfo.name, function(error, comImage) {
            if (error) {
              return cmdCallbackHook(error);
            }

            // set the global image reference
            image = comImage;
            options.imageName = communityImgInfo.name;
            return callback();
          });
        });
      } else {
        return callback();
      }
    }

    function verifyUserNameAndPwd(osName, callback) {
      var passwordErr = $('password must be atleast 8 character in length, it must contain a lower case, an upper case, a number and a special character');
      var passwordRegEx = new RegExp(/^.*(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\*!@#$%^&+=]).*$/);
      var promptMsg = util.format($('Enter VM \'%s\' password:'), options.userName);

      if (utils.ignoreCaseEquals(osName, 'windows')) {
        if (utils.ignoreCaseEquals(options.userName, 'administrator')) {
          return callback($('user name administrator cannot be used'));
        }

        if (typeof options.password === 'undefined') {
          cli.interaction.password(cli, promptMsg, '*', function(password) {
            process.stdin.pause();
            options.password = password;
            if (!options.password.match(passwordRegEx)) {
              return callback(passwordErr);
            }

            return callback();
          });
        } else if (!options.password.match(passwordRegEx)) {
          return callback(passwordErr);
        } else {
          return callback();
        }
      } else if (utils.ignoreCaseEquals(osName, 'linux')) {
        if (options.noSshPassword !== true) {
          if (typeof options.password === 'undefined') {
            cli.interaction.password(promptMsg, '*', function(password) {
              process.stdin.pause();
              options.password = password;
              if (!options.password.match(passwordRegEx)) {
                return callback(passwordErr);
              }

              return callback();
            });
          } else if (!options.password.match(passwordRegEx)) {
            return callback(passwordErr);
          } else {
            return callback();
          }
        } else {
          return callback();
        }
      } else {
        return callback();
      }
    }

    function verifyCertFingerPrint(osName) {
      if (utils.ignoreCaseEquals(osName, 'linux')) {
        if (options.sshCert) {
          if (utils.isSha1Hash(options.sshCert)) {
            sshFingerprint = options.sshCert;
          } else {
            var loadSshErr = loadSshCert();
            if (loadSshErr) {
              return loadSshErr;
            }
          }

          sshFingerprint = sshFingerprint.toUpperCase();
          logger.verbose(util.format($('using SSH fingerprint: %s'), sshFingerprint));
        }
      }

      return null;
    }

    // Load the roleFile if provided
    if (options.role) {
      role = options.role;
      logger.silly('role', role);
      if (options.sshCert) {
        // verify that the pem file exists and is valid before creating anything
        var loadSshErr = loadSshCert();
        if (loadSshErr) {
          return cmdCallback(loadSshErr);
        }
      }

      doSvcMgmtRoleCreate();
    } else {
      if (options.community) {
        progress = cli.interaction.progress($('Looking up community image'));
        var managementEndPoint = cli.category('account').getCurrentSubscription(options.subscription).managementEndpointUrl;
        var communityUtil = new CommunityUtil(managementEndPoint);
        communityUtil.resolveUid(options.imageName, function(error, response) {
          progress.end();

          if (!error) {
            var comResult = response.body.d[0];
            communityImgInfo.name = options.imageName + '-' + crypto.randomBytes(4).toString('hex');
            communityImgInfo.blobUrl = comResult.BlobUrl;

            verifyUserNameAndPwd('linux', function(error) {
              if (error) {
                return cmdCallback(error);
              }

              var certErr1 = verifyCertFingerPrint('linux');
              if (certErr1) {
                return cmdCallback(new Error(certErr1));
              }

              // Note: at this point we have verified that the community image exists in the remote
              // image repository, copying this image to user's subscription will happen before
              // creating the deployment.

              doSvcMgmtRoleCreate();
            });
          } else {
            return cmdCallback(new Error($('Failed to validate Community image')));
          }
        });
      } else {
        lookupImage(options.imageName, function (imgErr, foundImage) {
          if (imgErr) {
            return cmdCallback(imgErr);
          }

          image = foundImage;
          verifyUserNameAndPwd(image.OS, function(error) {
            if (error) {
              return cmdCallback(error);
            }

            var certErr2 = verifyCertFingerPrint(image.OS);
            if (certErr2) {
              return cmdCallback(certErr2);
            }

            doSvcMgmtRoleCreate();
          });
        });
      }
    }

    function createDefaultRole(name, callback) {
      var inputEndPoints = [];
      logger.verbose($('Creating default role'));
      var vmName = options.vmName || name || dnsPrefix;
      role = {
        RoleName: vmName,
        RoleSize: options.size,
        OSVirtualHardDisk: {
          SourceImageName: image.Name
        }
      };

      if (options.availabilitySet) {
        role.AvailabilitySetName = options.availabilitySet;
        logger.verbose(util.format($('VM will be part of the %s availability set.'), options.availabilitySet));
      }

      /*jshint camelcase:false*/
      function createDefaultRole_() {
        var configureSshCert = false;
        if (image.OS.toLowerCase() === 'linux') {
          logger.verbose($('Using Linux ProvisioningConfiguration'));

          provisioningConfig = {
            ConfigurationSetType: 'LinuxProvisioningConfiguration',
            HostName: vmName,
            UserName: options.userName,
            UserPassword: options.password
          };

          if (options.ssh) {
            logger.verbose(util.format($('SSH is enabled on port %s'), options.ssh));

            inputEndPoints.push({
              Name: 'ssh',
              Protocol: 'tcp',
              Port: options.ssh,
              LocalPort: '22'
            });

            if (options.sshCert) {
              sshFingerprint = sshFingerprint.toUpperCase();
              logger.verbose(util.format($('using SSH fingerprint: %s'), sshFingerprint));

              // Configure the cert for cloud service
              configureSshCert = true;

              if (options.noSshPassword) {
                logger.verbose($('Password-based authentication will not be enabled'));
                provisioningConfig.DisableSshPasswordAuthentication = true;
                provisioningConfig.UserPassword = ''; // must be defined, empty string.
              }
            } else {
              provisioningConfig.DisableSshPasswordAuthentication = false;
            }
          }
        } else {
          logger.verbose($('Using Windows ProvisioningConfiguration'));
          provisioningConfig = {
            ConfigurationSetType: 'WindowsProvisioningConfiguration',
            ComputerName: vmName,
            AdminPassword: options.password,
            AdminUsername: options.userName,
            ResetPasswordOnFirstLogon: false
          };

          if (options.rdp) {
            logger.verbose(util.format($('RDP is enabled on port %s'), options.rdp));
            inputEndPoints.push({
              Name: 'rdp',
              Protocol: 'tcp',
              Port: options.rdp,
              LocalPort: '3389'
            });
          }
        }

        role.ConfigurationSets = [provisioningConfig];

        if (inputEndPoints.length || options.subnetNames) {
          role.ConfigurationSets.push({
            ConfigurationSetType: 'NetworkConfiguration',
            InputEndpoints: inputEndPoints,
            SubnetNames: options.subnetNames ? options.subnetNames.split(',') : []
          });
        }

        if(configureSshCert) {
          progress = cli.interaction.progress($('Configuring certificate'));
          configureCert(dnsPrefix, function(error) {
            if (error) {
              return cmdCallbackHook(error);
            }

            progress.end();
            logger.verbose('role:');
            logger.json('verbose', role);
            return callback();
          });
        } else {
          logger.verbose('role:');
          logger.json('verbose', role);
          return callback();
        }
      }

      if (!options.imageTarget && image && image.MediaLink && image.MediaLink.indexOf('$root') >= 0) {
        // Make sure OS disk is not stored in $root container by default. Use a different container in the same storage account.
        options.imageTarget = image.MediaLink.split('$root')[0] +
          'vhd-store-root/' + vmName + '-' + crypto.randomBytes(8).toString('hex') + '.vhd';
      }

      if (options.imageTarget || image.Category !== 'User') {
        blobUtils.getBlobName(cli, channel, location, affinityGroup, dnsPrefix, options.imageTarget,
          '/vhd-store/', vmName + '-' + crypto.randomBytes(8).toString('hex') + '.vhd',
          function(error, imageTargetUrl) {
            if (error) {
              logger.error($('Unable to retrieve storage account'));
              return cmdCallbackHook(error);
            } else {
              imageTargetUrl = blobUtils.normalizeBlobUri(imageTargetUrl, false);
              logger.verbose('image MediaLink: ' + imageTargetUrl);
              role.OSVirtualHardDisk.MediaLink = imageTargetUrl;
              if (imageTargetUrl.indexOf('$root') >= 0) {
                return cmdCallbackHook(util.format($('Creating OS disks in $root storage container is not supported. Storage URL: %s'), imageTargetUrl));
              }
              createDefaultRole_();
            }
          }
        );
      } else {
        createDefaultRole_();
      }
    }

    function configureCert(service, callback) {
      if (provisioningConfig) {
        provisioningConfig.SSH = {
          PublicKeys: [ {
              Fingerprint: sshFingerprint,
              Path: '/home/' + options.userName + '/.ssh/authorized_keys'
            } ]
          };

        logger.silly($('provisioningConfig with SSH:'));
        logger.silly(JSON.stringify(provisioningConfig));
      }

      if (pemSshCert) {
        logger.verbose($('uploading cert'));
        utils.doServiceManagementOperation(channel, 'addCertificate', service, pemSshCert, 'pfx', null, function(error) {
          if (!error) {
            logger.verbose($('uploading cert succeeded'));
            return callback();
          } else {
            return callback(error);
          }
        });
      } else {
        return callback();
      }
    }

    function createDeploymentInExistingHostedService() {
      if (options.location) {
        logger.warn($('--location option will be ignored'));
      }
      if (options.affinityGroup) {
        logger.warn($('--affinity-group option will be ignored'));
      }

      // Get cloud service properties
      progress = cli.interaction.progress($('Getting cloud service properties'));
      utils.doServiceManagementOperation(channel, 'getHostedServiceProperties', dnsPrefix, function(error, response) {
        progress.end();
        if (error) {
          return cmdCallback(error);
        } else {
          logger.verbose($('Cloud service properties:'));
          logger.json('verbose', response.body);
          location = response.body.HostedServiceProperties.Location;
          affinityGroup = response.body.HostedServiceProperties.AffinityGroup;

          // Check for existing production deployment
          progress = cli.interaction.progress($('Looking up deployment'));
          utils.doServiceManagementOperation(channel, 'getDeploymentBySlot', dnsPrefix, 'Production', function(error, response) {
            progress.end();

            if (error) {
              if (response && response.statusCode === 404) {
                // There's no production deployment.  Create a new deployment.
                /*jshint camelcase:false*/
                var createDeployment_ = function () {
                  progress = cli.interaction.progress($('Creating VM'));
                  utils.doServiceManagementOperation(channel, 'createDeployment', dnsPrefix, dnsPrefix,
                      role, deployOptions, function(error) {
                    progress.end();
                    if (!error) {
                      logger.info('OK');
                    } else {
                      return cmdCallbackHook(error);
                    }
                  });
                };

                copyAndRegCommunityImgIfRequired(function() {
                  if (!role) {
                    createDefaultRole(null, createDeployment_);
                  } else {
                    createDeployment_();
                  }
                });
              } else {
                return cmdCallback(error);
              }
            } else {
              // There's existing production deployment.  Add a new role if --connect was specified.
              var hookEx = false;
              if (!options.connect) {
                logger.help($('Specify --connect option to connect the new VM to an existing VM'));
                hookEx = true;
                return cmdCallback(util.format($('A VM with dns prefix "%s" already exists'), dnsPrefix));
              }

              var addRole_ = function () {
                logger.verbose($('Adding a VM to existing deployment'));
                progress = cli.interaction.progress('Creating VM');
                utils.doServiceManagementOperation(channel, 'addRole', dnsPrefix, response.body.Name, role, function(error) {
                  progress.end();
                  return cmdCallbackHook(error);
                });
              };

              var roleList = response.body.RoleList;
              var maxNum = 0;
              if (roleList) {
                maxNum = 1;
                for (var i = 0; i < roleList.length; i++) {
                  var numSplit = roleList[i].RoleName.split('-');
                  if (numSplit.length > 1) {
                    // did it start with dnsPrefix? If not, ignore.
                    var leftSplit = numSplit.slice(0, -1).join('-');
                    if (leftSplit === dnsPrefix.slice(0, leftSplit.length)) {
                      var num = parseInt(numSplit[numSplit.length - 1], 10);
                      if (!isNaN(num) && num !== num + 1 && num > maxNum) { // number that is not too big
                        maxNum = num;
                      }
                    }
                  }
                }
              }

              copyAndRegCommunityImgIfRequired(function() {
                if (!hookEx) {
                  if (!role) {
                    var tag = '-' + (maxNum + 1);
                    var vmName = image.OS.toLowerCase() === 'linux' ? dnsPrefix : dnsPrefix.slice(0, 15 - tag.length);
                    vmName += tag;
                    createDefaultRole(vmName, addRole_);
                  } else {
                    addRole_();
                  }
                }
              });
            }
          });
        }
      });
    }

    function createDeployment() {
      /*jshint camelcase:false*/
      function createDeployment_() {
        progress = cli.interaction.progress($('Creating VM'));
        utils.doServiceManagementOperation(channel, 'createDeployment', dnsPrefix, dnsPrefix,
            role, deployOptions, function(error) {
          progress.end();
          return cmdCallbackHook(error);
        });
      }

      // At this point we have a valid cloud service (existing or new one)
      // copy the community image if required.
      copyAndRegCommunityImgIfRequired(function() {
        if (!role) {
          createDefaultRole(null, createDeployment_);
        } else {
          if (options.sshCert && pemSshCert) {
            progress = cli.interaction.progress($('Configuring certificate'));
            configureCert(dnsPrefix, function(error) {
              progress.end();
              if (error) {
                return cmdCallback(error);
              }

              createDeployment_();
            });
          } else {
            createDeployment_();
          }
        }
      });
    }

    function cleanupHostedServiceAndExit(error) {
      if (hostedServiceCreated) {
        logger.verbose(util.format($('Error occured. Deleting %s cloud service'), options.dnsPrefix));
        progress = cli.interaction.progress($('Deleting cloud service'));
        utils.doServiceManagementOperation(channel, 'deleteHostedService', options.dnsPrefix, function(err) {
          progress.end();
          if (err) {
            logger.warn(util.format($('Error deleting %s cloud service'), options.dnsPrefix));
            logger.json('verbose', err);
          } else {
            logger.verbose(util.format($('Cloud service %s deleted'), options.dnsPrefix));
          }
          return cmdCallback(error);
        });
      } else {
        return cmdCallback(error);
      }
    }

    function doSvcMgmtRoleCreate() {
      var _svcMgmtRoleCreateInternal = function () {
        svcopts.Location = location;
        svcopts.AffinityGroup = options.affinityGroup;
        svcopts.Label = dnsPrefix;
        progress = cli.interaction.progress($('Creating cloud service'));
        utils.doServiceManagementOperation(channel, 'createHostedService', dnsPrefix, svcopts, function(error) {
          progress.end();
          if (error) {
            return cmdCallback(error);
          } else {
            hostedServiceCreated = true;
            createDeployment();
          }
        });
      };
      // test if the cloud service exists for specified dns name
      logger.verbose(util.format($('Checking for existence of %s cloud service'), options.dnsPrefix));
      progress = cli.interaction.progress($('Looking up cloud service'));
      utils.doServiceManagementOperation(channel, 'listHostedServices', function(error, response) {
        progress.end();
        if (error) {
          return cmdCallback(error);
        } else {
          var service = null;
          var services = response.body;
          for (var i = 0; i < services.length; i++) {
            if (services[i].ServiceName.toLowerCase() === dnsPrefix.toLowerCase()) {
              service = services[i];
              break;
            }
          }

          if (service) {
            logger.verbose(util.format($('Found existing cloud service %s'), service.ServiceName));
            return createDeploymentInExistingHostedService();
          } else {
            if (!options.location && !options.affinityGroup) {
              logger.info(util.format($('cloud service %s not found.'), dnsPrefix));
              logger.error($('location or affinity group is required for a new cloud service\nplease specify --location or --affinity-group'));
              logger.help($('following commands show available locations and affinity groups:'));
              logger.help('    azure vm location list');
              logger.help('    azure account affinity-group list');
              return cmdCallback(' ');
            }

            if (options.location && options.affinityGroup) {
              return cmdCallback($('both --location and --affinitygroup options are specified'));
            }

            location = options.location;
            affinityGroup = options.affinityGroup;
            if (location) {
              logger.verbose(util.format($('Resolving the location %s'), location));
              utils.resolveLocationName(channel, location, function(error, resolvedLocation) {
                if(!error) {
                  if (!resolvedLocation.AvailableServices || !resolvedLocation.AvailableServices.AvailableService ||
                    !underscore.find(resolvedLocation.AvailableServices.AvailableService, function (s) { return s === 'PersistentVMRole'; })) {
                    logger.help($('following command show available locations along with supported services:'));
                    logger.help('    azure vm location list --json');
                    return cmdCallback(util.format($('the given location \'%s\' does not support PersistentVMRole service'), location));
                  }

                  location = resolvedLocation.Name;
                  logger.verbose(util.format($('Location resolved to %s'), location));
                  _svcMgmtRoleCreateInternal();
                } else {
                  return cmdCallback(error);
                }
              });
            } else if (affinityGroup) {
              logger.verbose(util.format($('Looking up the affinity group %s'), affinityGroup));
              utils.doServiceManagementOperation(channel, 'listAffinityGroups', function(error, affinityGrpRes) {
                var helpmsg1 = $('following command show available affinity groups along with supported services:');
                var helpmsg2 = '    azure account affinity-group list --json';

                if (!error) {
                  var affinityGroups = affinityGrpRes.body;
                  var foundAffinityGroup = null;
                  if (affinityGroups instanceof Array) {
                    foundAffinityGroup = underscore.find(affinityGroups, function(af) { return utils.ignoreCaseEquals(af.Name, affinityGroup); });
                  }

                  if (!foundAffinityGroup) {
                    logger.help(helpmsg1);
                    logger.help(helpmsg2);
                    return cmdCallback(util.format($('No affinity group found with name %s'), affinityGroup));
                  }

                  if (!foundAffinityGroup.Capabilities || !foundAffinityGroup.Capabilities.Capability ||
                    !underscore.find(foundAffinityGroup.Capabilities.Capability, function (ca) { return ca === 'PersistentVMRole'; })) {
                    logger.help(helpmsg1);
                    logger.help(helpmsg2);
                    return cmdCallback(util.format($('the given affinity group \'%s\' does not support PersistentVMRole service'), affinityGroup));
                  }

                  affinityGroup = foundAffinityGroup.Name;
                  _svcMgmtRoleCreateInternal();
                } else {
                  return cmdCallback(error);
                }
              });
            } else {
              _svcMgmtRoleCreateInternal();
            }
          }
        }
      });
    }
  }

  function listVMs(options, cmdCallback) {
    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }

      var vms = [];
      if (deployments.length > 0) {
        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole') {
                vms.push(createPrettyVMView(roles[j], deployments[i]));
              }
            }
          }
        }
      }

      self.cli.interaction.formatOutput(vms, function(outputData) {
        if(outputData.length === 0) {
          logger.info($('No VMs found'));
        } else {
          logger.table(outputData, function(row, item) {
            row.cell($('Name'), item.VMName);
            row.cell($('Status'), item.InstanceStatus);
            row.cell($('Location'), item.Location ? item.Location : item.AffinityGroup);
            row.cell($('DNS Name'), item.DNSName);
          });
        }
      });

      cmdCallback();
    });
  }

  function deleteVM(name, options, _) {
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    options.dnsPrefix = options.dnsName;

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    var deployments = vmClient.getDeployments(options, _);

    var found = null;
    var role = null;

    for (var i = 0; i < deployments.length; i++) {
      var roles = deployments[i].deploy.RoleList;
      if (roles) {
        for (var j = 0; j < roles.length; j++) {
          if (roles[j].RoleType === 'PersistentVMRole' &&
              roles[j].RoleName === name) {
            if (found) {
              // found duplicates
              throw new Error($('VM name is not unique'));
            }

            found = deployments[i];
            role = roles[j];
          }
        }
      }
    }

    // got unique role, delete it
    if (found) {
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the VM %s ? [y/n] '), name), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Deleting VM'));
      try {
        deleteRoleOrDeployment(channel, found.svc, found.deploy, name, _);
      } finally {
        progress.end();
      }

      if (!options.blobDelete) {
        return;
      }

      var dataDiskCount = role.DataVirtualHardDisks.length;
      logger.verbose('Deleting blob' + (dataDiskCount ? 's' : ''));
      var doneCount = 0;
      var errorCount = 0;
      var allCount = dataDiskCount + 1;

      var toNext = function () {
        k++;
        if (k === dataDiskCount) {
          done();
          return;
        }

        var diskInfo = k < 0 ? role.OSVirtualHardDisk : role.DataVirtualHardDisks[k];
        var diskName = diskInfo.DiskName;
        var mediaLink = diskInfo.MediaLink;
        logger.verbose(util.format($('Deleting disk %s @ %s'), diskName, mediaLink));
        deleteImage.deleteImage('Disk', 'Disk', logger, channel, diskName, mediaLink,
            cli.interaction.progress, true, function(error) {
          doneCount++;
          logger.silly((error ? 'Error' : 'Finished') + ' deleting disk ' + doneCount + ' of ' + allCount);
          if (error) {
            logger.error(util.inspect(error));
            errorCount++;
          }

          toNext();
        });
      };

      var k = -2;
      toNext();

      var done = function () {
        progress.end();
        if (errorCount) {
          throw new Error(util.format($('While VM was deleted successfully, deletion of %s of its %s disk(s) failed'), errorCount, allCount));
        }

        logger.verbose(util.format($('All %s disk(s) were successfuly deleted from disk registry and blob storage'), allCount));
      };
    } else {
      logger.warn($('No VMs found'));
    }
  }

  function showVM(name, options, cmdCallback) {
    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var vms = [];
        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                vms.push(createPrettyVMView(roles[j], deployments[i]));
              }
            }
          }
        }

        // got unique role, delete it
        if (vms.length > 0) {
          var vmOut = vms.length === 1 ? vms[0] : vms;
          if (logger.format().json) {
            logger.json(vmOut);
          } else {
            utils.logLineFormat(vmOut, logger.data);
          }
        } else {
          return cmdCallback(new Error($('No VMs found')));
        }

        cmdCallback();
      }
    });
  }

  function startVM(name, options, cmdCallback) {
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                if (found) {
                  // found duplicates
                  cmdCallback($('VM name is not unique'));
                }

                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].RoleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique role, delete it
        if (found) {
          var progress = cli.interaction.progress($('Starting VM'));
          utils.doServiceManagementOperation(channel, 'startRole', found.svc,
              found.deploy.Name, found.roleInstance.InstanceName, function(error) {
            progress.end();
            cmdCallback(error);
          });
        } else {
          logger.warn($('No VMs found'));
          cmdCallback();
        }
      }
    });
  }

  function restartVM(name, options, cmdCallback) {
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                if (found) {
                  // found duplicates
                  cmdCallback($('VM name is not unique'));
                }
                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].RoleName,deployments[i].deploy);
              }
            }
          }
        }

        // got unique role, delete it
        if (found) {
          var progress = cli.interaction.progress($('Restarting VM'));
          utils.doServiceManagementOperation(channel, 'restartRole', found.svc,
              found.deploy.Name, found.roleInstance.InstanceName, function(error) {
            progress.end();
            cmdCallback(error);
          });
        } else {
          logger.warn($('No VMs found'));
          cmdCallback();
        }
      }
    });
  }

  function shutdownVM(name, options, cmdCallback) {
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                if (found) {
                  // found duplicates
                  cmdCallback(new Error($('VM name is not unique')));
                }
                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].RoleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique role, delete it
        if (found) {
          var progress = cli.interaction.progress($('Shutting down VM'));
          utils.doServiceManagementOperation(channel, 'shutdownRole', found.svc,
              found.deploy.Name, found.roleInstance.InstanceName, !options.stayProvisioned, function(error) {
            progress.end();
            cmdCallback(error);
          });
        } else {
          logger.warn($('No VMs found'));
          cmdCallback();
        }
      }
    });
  }

  function captureVM(name, targetImageName, options, cmdCallback) {
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                if (found) {
                  // found duplicates
                  return cmdCallback($('VM name is not unique'));
                }

                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].RoleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique role, delete it
        if (found) {
          var progress = cli.interaction.progress($('Capturing VM'));
          var captureOptions = {
            PostCaptureAction : 'Delete',
            TargetImageName : targetImageName,
            TargetImageLabel : options.label || targetImageName // does not work without label
          };
          utils.doServiceManagementOperation(channel, 'captureRole', found.svc,
              found.deploy.Name, found.roleInstance.InstanceName,
              captureOptions, function(error) {
            progress.end();
            return cmdCallback(error);
          });
        } else {
          logger.warn($('No VMs found'));
          return cmdCallback();
        }
      }
    });
  }

  function exportVM(name, filePath, options, cmdCallback) {
    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === name) {
                if (found) {
                  // found duplicates
                  cmdCallback(new Error($('VM name is not unique')));
                }
                found = roles[j];
              }
            }
          }
        }

        // got unique role, export it to file
        if (found) {
          var progress = cli.interaction.progress('Exporting the VM');
          var _prepareForExport = function (role) {
              for(var key in role) {
                // Remove namespace @ node
                if (key === '@' || key === 'OsVersion') {
                  delete role[key];
                } else if (key === 'DataVirtualHardDisks') {
                  // Remove Links of all DataVirtualHardDisks since
                  // while importing we need to pass only DiskName
                  // which will be already linked with a vhd
                  for(var i = 0; i < role[key].length; i++) {
                    delete role[key][i].MediaLink;
                    delete role[key][i].SourceMediaLink;
                  }
                } else if (key === 'OSVirtualHardDisk') {
                  delete role[key].MediaLink;
                  delete role[key].SourceImageName;
                }

                // Remove namespace in inner objects
                if (typeof role[key] === 'object') {
                  _prepareForExport(role[key]);
                }
              }
            };

          _prepareForExport(found);
          if (found.DataVirtualHardDisks.length && !found.DataVirtualHardDisks[0].Lun) {
            found.DataVirtualHardDisks[0].Lun = '0';
          }

          progress.end();
          var roleAsString = JSON.stringify(found);
          fs.writeFile(filePath, roleAsString, function (err) {
            if (err) {
              cmdCallback(err);
            } else {
              logger.info(util.format($('VM %s exported to %s'), name, filePath));
              cmdCallback();
            }
          });
        } else {
          logger.warn($('No VMs found'));
          cmdCallback();
        }
      }
    });
  }

  function showListEndpoints(options, list, cmdCallback) {
    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var role = null;
        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
                  roles[j].RoleName === options.name) {
                if (role) {
                  // found duplicates
                  return cmdCallback('VM name is not unique');
                }

                role = roles[j];
              }
            }
          }
        }

        if (role) {
          var networkConfigSet = getNetworkConfigSet(role);
          if (!networkConfigSet.InputEndpoints) {
            if (logger.format().json) {
              logger.json([]);
            } else {
              logger.info('No VMs found');
            }
            return cmdCallback();
          } else {
            if (list) {
              logger.table(networkConfigSet.InputEndpoints, function(row, item) {
                row.cell('Name', item.Name);
                row.cell('Protocol', item.Protocol);
                row.cell('Public Port', item.Port);
                row.cell('Private Port', item.LocalPort);
                row.cell('Protocol', item.Protocol);
                row.cell('Load Balanced', item.LoadBalancedEndpointSetName ? 'Yes' : 'No');
              });
            } else {
              var endpointConfig = { Network: {
                Endpoints: networkConfigSet.InputEndpoints
              }};
              if (logger.format().json) {
                logger.json(endpointConfig);
              } else {
                utils.logLineFormat(endpointConfig, logger.data);
              }
            }
            return cmdCallback();
          }
        } else {
          return cmdCallback('No VMs found');
        }
      }
    });
  }

  function diskAttachDetach(options, cmdCallback) {
    var progress;
    var lookupOsDiskUrl = false;

    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var diskInfo = {};
    if (!options.isDiskImage) {
      if (!options.url || !url.parse(options.url).protocol) {
        // If the blob url is not provide or partially provided, we need see
        // what storage account is used by VM's OS disk.
        lookupOsDiskUrl = true;
      } else {
        diskInfo.MediaLink = options.url;
      }
    } else {
      diskInfo.DiskName = options.url;
    }

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) { return cmdCallback(error); }
      else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.RoleList;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].RoleType === 'PersistentVMRole' &&
              roles[j].RoleName === options.name) {
                if (found) {
                  // found duplicates
                  cmdCallback('VM name is not unique');
                }
                found = deployments[i];
                found.dataVirtualHardDisks = roles[j].DataVirtualHardDisks;
                found.osDisk = roles[j].OSVirtualHardDisk;
              }
            }
          }
        }

        // got unique role under a deployment and service, add-disk
        if (found) {
          if (options.attach) {
            // Check if we need to set the disk url based on the VM OS disk
            if (lookupOsDiskUrl) {
              if (options.url) {
                var parsed = url.parse(found.osDisk.MediaLink);
                diskInfo.MediaLink = parsed.protocol + '//' + parsed.host + '/' +options.url;
              } else {
                diskInfo.MediaLink = found.osDisk.MediaLink.slice(0, found.osDisk.MediaLink.lastIndexOf('/')) +
                  '/' + options.name + '-' + crypto.randomBytes(8).toString('hex') + '.vhd';
              }

              logger.verbose('Disk MediaLink: ' + diskInfo.MediaLink);
            }

            var maxLun = -1;
            for (var k = 0; k < found.dataVirtualHardDisks.length; k++) {
              var lun = found.dataVirtualHardDisks[k].Lun ? parseInt(found.dataVirtualHardDisks[k].Lun, 10) : 0;
              maxLun = Math.max(maxLun, lun);
            }

            var nextLun = maxLun + 1;
            diskInfo.Lun = nextLun;
            if (options.size) {
              diskInfo.LogicalDiskSizeInGB = options.size;
            }
            diskInfo.DiskLabel = found.svc + '-' + found.deploy.Name + '-' + options.name + '-' + nextLun;
            logger.verbose('Disk Lun: ' + nextLun);
            logger.verbose('Disk Label: ' + diskInfo.DiskLabel);
            progress = cli.interaction.progress('Adding Data-Disk');
            utils.doServiceManagementOperation(channel, 'addDataDisk', found.svc, found.deploy.Name, options.name, diskInfo, function(error) {
              progress.end();
              cmdCallback(error);
            });
          } else {
            progress = cli.interaction.progress('Removing Data-Disk');
            utils.doServiceManagementOperation(channel, 'removeDataDisk', found.svc, found.deploy.Name, options.name, options.lun, function(error) {
              progress.end();
              cmdCallback(error);
            });
          }
        } else {
          progress.end();
          logger.warn('No VMs found');
          cmdCallback();
        }
      }
    });
  }

  function deleteRoleOrDeployment(channel, svcname, deployment, vmname, callback) {
    // if more than 1 role in deployment, then delete role, else delete deployment
    if (deployment.RoleList.length > 1) {
      utils.doServiceManagementOperation(channel, 'deleteRole', svcname, deployment.Name, vmname, callback);
    } else {
      utils.doServiceManagementOperation(channel, 'deleteDeployment', svcname, deployment.Name, function(error) {
        if (!error) {
          deleteAppIfEmptyAndImplicit(channel, svcname, callback);
        } else {
          callback(error);
        }
      });
    }
  }

  // check if cloud service is implicit and has no deployments
  function deleteAppIfEmptyAndImplicit(channel, dnsPrefix, callback) {
    utils.doServiceManagementOperation(channel, 'getHostedService', dnsPrefix, function(error, response) {
      if (error) { return callback(error); }

      if (response.body.HostedServiceProperties.Description === 'Implicitly created hosted service') {
        var options = {
          dnsPrefix: dnsPrefix,
          useprod: true,
          usestage: true
        };

        var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
        vmClient.getDeployments(options, function(error, deployments) {
          if (deployments.length === 0) {
            utils.doServiceManagementOperation(channel, 'deleteHostedService', options.dnsPrefix, callback);
          } else {
            callback();
          }
        });
      } else {
        callback();
      }
    });
  }

  function createPrettyVMView(role, deployment) {
    var roleInstance = getRoleInstance(role.RoleName, deployment.deploy);
    var networkConfigSet = getNetworkConfigSet(role);

    return {
      DNSName: url.parse(deployment.deploy.Url).host,
      Location: deployment.Location,
      AffinityGroup: deployment.AffinityGroup,
      VMName: role.RoleName,
      IPAddress: roleInstance.IpAddress || '',
      InstanceStatus: roleInstance.InstanceStatus,
      InstanceSize: roleInstance.InstanceSize,
      InstanceStateDetails: roleInstance.InstanceStateDetails,
      OSVersion: role.OsVersion,
      Image: role.OSVirtualHardDisk.SourceImageName,
      OSDisk: role.OSVirtualHardDisk,
      DataDisks: role.DataVirtualHardDisks,
      Network: {
        Endpoints: (networkConfigSet ? networkConfigSet.InputEndpoints : {})
      }
    };
  }

  function getRoleInstance(roleName, deployment) {
    for (var i = 0; i < deployment.RoleInstanceList.length; i++) {
      if (deployment.RoleInstanceList[i].RoleName === roleName) {
        return deployment.RoleInstanceList[i];
      }
    }
  }

  function getNetworkConfigSet(role) {
    for (var i = 0; i < role.ConfigurationSets.length; i++) {
      var configSet = role.ConfigurationSets[i];
      if (configSet.ConfigurationSetType === 'NetworkConfiguration') {
        return configSet;
      }
    }
  }

  function endpointDelete(options, cmdCallback) {
    var vmName = options.name.toLowerCase();
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) {
        return cmdCallback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return cmdCallback(result.error);
        } else {
          progress = cli.interaction.progress('Reading network configuration');
          utils.doServiceManagementOperation(channel, 'getRole', result.deployment.svc,
            result.deployment.deploy.Name, options.name, function(error, response) {
            progress.end();
            if (error) {
              return cmdCallback(error);
            } else {
              var persistentVMRole = response.body;
              var configurationSets = persistentVMRole.ConfigurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].ConfigurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              var endpoints = configurationSets[m].InputEndpoints;
              var i = -1;
              if (underscore.isArray(endpoints)) {
                i = 0;
                for (; i < endpoints.length; i++) {
                  if (utils.ignoreCaseEquals(endpoints[i].Name, options.endPointName)) {
                    break;
                  }
                }
              }

              if ((i == -1) || (i == endpoints.length)) {
                return cmdCallback(util.format($('Endpoint %s not found in the network configuration'), options.endPointName));
              }

              configurationSets[m].InputEndpoints.splice(i, 1);
              progress = cli.interaction.progress($('Updating network configuration'));
              utils.doServiceManagementOperation(channel, 'modifyRole', result.deployment.svc, result.deployment.deploy.Name,
                  options.name, persistentVMRole, function(error) {
                progress.end();
                return cmdCallback(error);
              });
            }
          });
        }
      }
    });
  }

  function endpointsCreate(options, cmdCallback) {
    var endPointUtil = new EndPointUtil();
    var newEndPoints = options.newEndPoints;

    var newEndPointsResult = endPointUtil.verifyEndPoints(newEndPoints);
    if (newEndPointsResult.error) {
      return cmdCallback(new Error(newEndPointsResult.error));
    }

    var vmName = options.name.toLowerCase();
    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);

    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) {
        return cmdCallback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return cmdCallback(result.error);
        } else {
          // Get all LB settings defined in this hosted service
          var lbsetConfigs = endPointUtil.getAllLBSettings(result.deployment.deploy.RoleList);
          // If any of the new endpoint has lb set name, if same lb settings is
          // defined for this hosted service then overwrite user provided lb
          // settings with this.
          for (var l = 0; l < newEndPoints.length; l++) {
            var lbSetName = newEndPoints[l].LoadBalancedEndpointSetName;
            if (lbSetName) {
              lbSetName = lbSetName.toLowerCase();
              if (lbSetName in lbsetConfigs) {
                if (underscore.contains(lbsetConfigs[lbSetName].VmNames, vmName)) {
                  return cmdCallback(new Error(
                    util.format($('this VM already has an endpoint with lb set name %s. lb set name should be unique'),
                      lbSetName)));
                }

                logger.info(util.format($('cloud service already has an lb set defined with name %s, using this existing lb settings configuration'),
                  lbSetName));

                newEndPoints[l].LoadBalancerProbe =
                  lbsetConfigs[lbSetName].ProbSettings;
                newEndPoints[l].EnableDirectServerReturn =
                 lbsetConfigs[lbSetName].EnableDirectServerReturn;
              }
            }
          }

          progress = cli.interaction.progress('Reading network configuration');
          utils.doServiceManagementOperation(channel, 'getRole', result.deployment.svc,
            result.deployment.deploy.Name, options.name, function(error, response) {
            progress.end();
            if (error) {
              return cmdCallback(error);
            } else {
              var persistentVMRole = response.body;
              var configurationSets = persistentVMRole.ConfigurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].ConfigurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              if (!configurationSets[m].InputEndpoints) {
                configurationSets[m].InputEndpoints = [];
              }

              var endpoints = configurationSets[m].InputEndpoints;
              var endpointCount = endpoints.length;

              for (var n = 0; n < endpointCount; n++) {
                var key = endpoints[n].Port + ':' + endpoints[n].Protocol;
                if (key in newEndPointsResult.protocolPorts) {
                  return cmdCallback(new Error(
                    util.format($('this VM already has a %s load balancer port %s. lb port and protocol together should be unique'),
                      endpoints[n].Protocol, endpoints[n].Port)));
                }

                key = endpoints[n].Name.toLowerCase();
                if (key in newEndPointsResult.endPointNames) {
                  return cmdCallback(new Error(
                    util.format($('this VM already has an endpoint with name %s, endpoint name should unique'),
                      key)));
                }
              }

              configurationSets[m].InputEndpoints = configurationSets[m].InputEndpoints.concat(newEndPoints);
              progress = cli.interaction.progress($('Updating network configuration'));
              utils.doServiceManagementOperation(channel, 'modifyRole', result.deployment.svc, result.deployment.deploy.Name,
                  options.name, persistentVMRole, function(error) {
                progress.end();
                return cmdCallback(error);
              });
            }
          });
        }
      }
    });
  }

  function endpointUpdate(options, cmdCallback) {
    var vmName = options.name.toLowerCase();
    var endPointName = options.endPointName.toLowerCase();
    var epInput = options.endPoint;

    var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), logger);
    var vmClient = new VMClient(cli, cli.category('account').getCurrentSubscription(options.subscription).Id);
    vmClient.getDeployments(options, function(error, deployments) {
      if (error) {
        return cmdCallback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return cmdCallback(result.error);
        } else {
          progress = cli.interaction.progress('Reading network configuration');
          utils.doServiceManagementOperation(channel, 'getRole', result.deployment.svc,
            result.deployment.deploy.Name, options.name, function(error, response) {
            progress.end();
            if (error) {
              return cmdCallback(error);
            } else {
              var persistentVMRole = response.body;
              var configurationSets = persistentVMRole.ConfigurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].ConfigurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              var endpoints = configurationSets[m].InputEndpoints;
              var i = -1;
              if (underscore.isArray(endpoints)) {
                i = 0;
                for (; i < endpoints.length; i++) {
                  if (utils.ignoreCaseEquals(endpoints[i].Name, endPointName)) {
                    break;
                  }
                }
              }

              if ((i == -1) || (i == endpoints.length)) {
                return cmdCallback(util.format($('Endpoint %s not found in the network configuration'), endPointName));
              }

              var endPoint = configurationSets[m].InputEndpoints[i];
              if (epInput.Name) {
                endPoint.Name = epInput.Name;
              }

              if (epInput.Port) {
                endPoint.Port = epInput.Port;
              }

              if (epInput.LocalPort) {
                endPoint.LocalPort = epInput.LocalPort;
              }

              if (epInput.Protocol) {
                endPoint.Protocol = epInput.Protocol;
              }

              var message = null;

              for (var j = 0; j < endpoints.length; j++) {
                if (i != j) {
                  if (utils.ignoreCaseEquals(endpoints[j].Name, endPoint.Name)) {
                    message = util.format($('An endpoint with name %s already exists'), endPoint.Name);
                    break;
                  }

                  var portAsInt = parseInt(endpoints[j].Port, 10);
                  if ((portAsInt == endPoint.Port) && (utils.ignoreCaseEquals(endpoints[j].Protocol, endPoint.Protocol))) {
                    message = util.format($('this VM already has an %s load balancer port %s, lb port and protocol together should be unique'),
                      endPoint.Protocol, endPoint.Port);
                    break;
                  }
                }
              }

              if (message) {
                return cmdCallback(message);
              }

              configurationSets[m].InputEndpoints[i] = endPoint;
              progress = cli.interaction.progress($('Updating network configuration'));
              utils.doServiceManagementOperation(channel, 'modifyRole', result.deployment.svc, result.deployment.deploy.Name,
                  options.name, persistentVMRole, function(error) {
                progress.end();
                return cmdCallback(error);
              });
            }
          });
        }
      }
    });
  }

  function getVMDeployment(deployments, vmName) {

    var found  = null;
    var result = function(error) {
      return (error ? { error: error } : { error: null, 'deployment': found.deployment, 'roleInstance': found.roleInstance });
    };

    for (var i = 0; i < deployments.length; i++) {
      var roles = deployments[i].deploy.RoleList;
      if (roles) {
        for (var j = 0; j < roles.length; j++) {
          if (roles[j].RoleType === 'PersistentVMRole' &&
            utils.ignoreCaseEquals(roles[j].RoleName, vmName)) {
            if (found) {
              // found duplicates
              return result($('VM name is not unique'));
            }

            found = {
              'deployment': deployments[i],
              'roleInstance': getRoleInstance(roles[j].RoleName, deployments[i].deploy)
            };
          }
        }
      }
    }

    if (!found) {
      return result($('No VMs found'));
    }

    return result(null);
  }
};
