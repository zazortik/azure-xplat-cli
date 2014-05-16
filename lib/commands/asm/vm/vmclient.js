// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var _ = require('underscore');
var fs = require('fs');
var url = require('url');
var async = require('async');
var util = require('util');
var utils = require('../../../util/utils');
var blobUtils = require('../../../util/blobUtils');
var pageBlob = require('../iaas/upload/pageBlob');
var CommunityUtil = require('../../../util/communityUtil');
var crypto = require('crypto');
var EndPointUtil = require('../vm/endpointUtil');
var underscore = require('underscore');
var $ = utils.getLocaleString;
var profile = require('../../../util/profile');

function VMClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
}

_.extend(VMClient.prototype, {

  createVM: function (dnsName, imageName, userName, password, options, callback, logger) {
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
      // default size is small
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

    var computeManagementClient = this.createComputeManagementClient();
    var managementClient = this.createManagementClient();

    createVM({
      dnsPrefix: dnsPrefix,
      imageName: imageName,
      password: password,
      userName: userName,
      subscription: options.subscription,
      size: vmSize,
      location: options.location,
      affinityGroup: options.affinityGroup,
      imageTarget: options.blobUrl,
      ssh: options.ssh,
      sshCert: options.sshCert,
      logger: logger,
      noSshPassword: options.sshPassword === false,
      rdp: options.rdp,
      connect: options.connect,
      community: options.community,
      vmName: options.vmName,
      virtualNetworkName: options.virtualNetworkName,
      subnetNames: options.subnetNames,
      availabilitySet: options.availabilitySet,
      customData: options.customData,
      computeManagementClient: computeManagementClient,
      managementClient: managementClient
    }, callback, logger);
  },

  createVMfromJson: function (dnsName, roleFile, options, callback, logger) {

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

    // remove resourceExtensionReferences if empty
    if(role.resourceExtensionReferences.length === 0) {
      delete role.resourceExtensionReferences;
    }

    var computeManagementClient = this.createComputeManagementClient();
    var managementClient = this.createManagementClient();

    createVM({
      subscription: options.subscription,
      location: options.location,
      affinityGroup: options.affinityGroup,
      dnsPrefix: dnsPrefix,
      connect: options.connect,
      role: role,
      sshCert: options.sshCert,
      virtualNetworkName: options.virtualNetworkName,
      computeManagementClient: computeManagementClient,
      managementClient: managementClient
    }, callback, logger);

  },

  listVMs: function (options, callback, logger) {
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var vms = [];
        if (deployments.length > 0) {
          for (var i = 0; i < deployments.length; i++) {
            var roles = deployments[i].deploy.roles;
            if (roles) {
              for (var j = 0; j < roles.length; j++) {
                if (roles[j].roleType === 'PersistentVMRole') {
                  vms.push(createVMView(roles[j], deployments[i]));
                }
              }
            }
          }
        }

        self.cli.interaction.formatOutput(vms, function (outputData) {
          if (outputData.length === 0) {
            logger.info($('No VMs found'));
          } else {
            logger.table(outputData, function (row, item) {
              row.cell($('Name'), item.VMName);
              row.cell($('Status'), item.InstanceStatus);
              row.cell($('Location'), item.Location ? item.Location : item.AffinityGroup);
              row.cell($('DNS Name'), item.DNSName);
              row.cell($('IP Address'), item.IPAddress);
            });
          }
        });

        return callback();
      }
    });
  },

  showVM: function (name, options, callback, logger) {
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var vms = [];
        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                vms.push(createVMView(roles[j], deployments[i]));
              }
            }
          }
        }

        // got vms, show detailed info about it
        if (vms.length > 0) {
          var vmOut = vms.length === 1 ? vms[0] : vms;
          if (logger.format().json) {
            logger.json(vmOut);
          } else {
            utils.logLineFormat(vmOut, logger.data);
          }
        } else {
          logger.warn($('No VMs found'));
        }

        return callback();
      }
    });
  },

  deleteVM: function (vmName, options, callback, logger) {
    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        options.dnsPrefix = options.dnsName;
        var found = null;
        var role = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === vmName) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }

                found = deployments[i];
                role = roles[j];
              }
            }
          }
        }

        // got unique vm, delete it
        if (found) {
          // confirm deleting if required
          /*if (!options.quiet && !self.cli.interaction.confirm(util.format($('Delete the VM %s ? [y/n] '), vmName), _)) {
            return;
          }*/

          var progress = self.cli.interaction.progress($('Deleting VM'));

          deleteRoleOrDeployment(computeManagementClient, found.svc, found.deploy, vmName, options, callback, progress);
        }
        else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  startVM: function (name, options, callback, logger) {
    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].roleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique vm, start it
        if (found) {
          var progress = self.cli.interaction.progress($('Starting VM'));
          computeManagementClient.virtualMachines.start(found.svc, found.deploy.name,
              found.roleInstance.instanceName, function (error) {
                progress.end();
                return callback(error);
              });
        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  restartVM: function (name, options, callback, logger) {
    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].roleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique vm, restart it
        if (found) {
          var progress = self.cli.interaction.progress($('Restarting VM'));
          computeManagementClient.virtualMachines.restart(found.svc, found.deploy.name,
              found.roleInstance.instanceName, function (error) {
                progress.end();
                return callback(error);
              });
        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  shutdownVM: function (name, options, callback, logger) {
    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].roleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique vm, shutting down it
        if (found) {
          var progress = self.cli.interaction.progress($('Shutting down VM'));
          computeManagementClient.virtualMachines.shutdown(found.svc, found.deploy.name,
              found.roleInstance.instanceName, !options.stayProvisioned, function (error) {
                progress.end();
                return callback(error);
              });
        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  captureVM: function (vmName, targetImageName, options, callback, logger) {

    if (!options['delete']) {
      // Using this option will warn the user that the machine will be deleted
      logger.help($('Reprovisioning a captured VM is not yet supported'));
      return callback('required --delete option is missing');
    }

    var computeManagementClient = this.createComputeManagementClient();

    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === vmName) {
                if (found) {
                  // found duplicates, emit error
                  return callback($('VM name is not unique'));
                }

                found = deployments[i];
                found.roleInstance = getRoleInstance(roles[j].roleName, deployments[i].deploy);
              }
            }
          }
        }

        // got unique vm, capture it
        if (found) {

          var captureOptions = {
            postCaptureAction: 'Delete',
            targetImageName: targetImageName,
            targetImageLabel: options.label || targetImageName // does not work without label
          };

          var progress = self.cli.interaction.progress($('Capturing VM'));

          computeManagementClient.virtualMachines.captureOSImage(found.svc, found.deploy.name, found.roleInstance.instanceName, captureOptions, function (error) {
            progress.end();
            return callback(error);
          });

        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  exportVM: function (vmName, filePath, options, callback, logger) {
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === vmName) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                found = roles[j];
              }
            }
          }
        }

        // got unique role, export to file
        if (found) {
          var progress = self.cli.interaction.progress('Exporting the VM');

          var prepareForExport = function (role) {
            for (var key in role) {
              // Remove namespace @ node
              if (key === '@' || key === 'OsVersion') {
                delete role[key];
              } else if (key === 'dataVirtualHardDisks') {
                // Remove Links of all DataVirtualHardDisks since
                // while importing we need to pass only DiskName
                // which will be already linked with a vhd
                for (var i = 0; i < role[key].length; i++) {
                  delete role[key][i].mediaLink;
                  // delete role[key][i].sourceMediaLink; property is deprecated
                }
              } else if (key === 'oSVirtualHardDisk') {
                delete role[key].mediaLink;
                delete role[key].sourceImageName;
              }

              // Remove namespace in inner objects
              if (typeof role[key] === 'object') {
                prepareForExport(role[key]);
              }
            }
          };

          prepareForExport(found);

          if (found.dataVirtualHardDisks.length && !found.dataVirtualHardDisks[0].logicalUnitNumber) {
            found.dataVirtualHardDisks[0].logicalUnitNumber = '0';
          }

          progress.end();
          var roleAsString = JSON.stringify(found);
          fs.writeFile(filePath, roleAsString, function (err) {
            if (err) {
              return callback(err);
            } else {
              logger.info(util.format($('VM %s exported to %s'), vmName, filePath));
              return callback();
            }
          });

        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  listLocations: function (options, callback, logger) {
    var managementClient = this.createManagementClient();
    var progress = self.cli.interaction.progress($('Getting locations'));

    managementClient.locations.list(function (error, response) {
      progress.end();
      if (error) {
        return callback(error);
      } else {
        var locations = response.locations;

        if (locations.length === 0) {
          logger.info($('No locations found'));
        } else {
          self.cli.interaction.formatOutput(locations, function (outputData) {
            if (outputData.length === 0) {
              logger.info($('No locations'));
            } else {
              logger.table(outputData, function (row, item) {
                row.cell($('Name'), item.name);
              });
            }
          });
        }

        return callback();
      }
    });

  },

  createEP: function (vmName, lbport, vmport, options, callback, logger) {
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

    var result = endPointUtil.verifyAndGetEndPointObj(epInput, [], false); // endpoint parameters validation
    if (result.error) {
      return callback(new Error(result.error));
    }

    var newEndPoints = result.endPoint;

    var newEndPointsResult = endPointUtil.verifyEndPoints(newEndPoints);
    if (newEndPointsResult.error) {
      return callback(new Error(newEndPointsResult.error));
    }

    var computeManagementClient = this.createComputeManagementClient();

    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      }
      else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return callback(result.error);
        }
        else {
          // Get all LB settings defined in this hosted service
          var lbsetConfigs = endPointUtil.getAllLBSettings(result.deployment.deploy.roles);
          // If any of the new endpoint has lb set name, if same lb settings is
          // defined for this hosted service then overwrite user provided lb
          // settings with this.
          for (var l = 0; l < newEndPoints.length; l++) {
            var lbSetName = newEndPoints[l].loadBalancedEndpointSetName;
            if (lbSetName) {
              lbSetName = lbSetName.toLowerCase();
              if (lbSetName in lbsetConfigs) {
                if (underscore.contains(lbsetConfigs[lbSetName].VmNames, name)) {
                  return callback(new Error(
                      util.format($('this VM already has an endpoint with lb set name %s. lb set name should be unique'),
                          lbSetName)));
                }

                logger.info(util.format($('cloud service already has an lb set defined with name %s, using this existing lb settings configuration'),
                    lbSetName));

                newEndPoints[l].loadBalancerProbe =
                    lbsetConfigs[lbSetName].ProbSettings;
                newEndPoints[l].enableDirectServerReturn =
                    lbsetConfigs[lbSetName].enableDirectServerReturn;
              }
            }
          }

          var progress = self.cli.interaction.progress('Reading network configuration');

          computeManagementClient.virtualMachines.get(result.deployment.svc, result.deployment.deploy.name, vmName, function (error, response) {
            progress.end();
            if (error) {
              return callback(error);
            } else {
              var persistentVMRole = response;
              var configurationSets = persistentVMRole.configurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].configurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              if (!configurationSets[m].inputEndpoints) {
                configurationSets[m].inputEndpoints = [];
              }

              var endpoints = configurationSets[m].inputEndpoints;
              var endpointCount = endpoints.length;

              for (var n = 0; n < endpointCount; n++) {
                var key = endpoints[n].port + ':' + endpoints[n].protocol;
                if (key in newEndPointsResult.protocolPorts) {
                  return callback(new Error(
                      util.format($('this VM already has a %s load balancer port %s. lb port and protocol together should be unique'),
                          endpoints[n].protocol, endpoints[n].port)));
                }

                key = endpoints[n].name.toLowerCase();
                if (key in newEndPointsResult.endPointNames) {
                  return callback(new Error(
                      util.format($('this VM already has an endpoint with name %s, endpoint name should unique'),
                          key)));
                }
              }

              configurationSets[m].inputEndpoints = configurationSets[m].inputEndpoints.concat(newEndPoints);

              progress = self.cli.interaction.progress($('Updating network configuration'));

              computeManagementClient.virtualMachines.update(result.deployment.svc, result.deployment.deploy.name, vmName, persistentVMRole, function (error) {
                progress.end();
                return callback(error);
              });
            }
          });
        }
      }
    });
  },

  createMultipleEP: function (vmName, endpoints, options, callback, logger) {
    var message = 'each endpoint in the endpoints argument should be of the form \r\n         <lb-port>[:<vm-port>[:<protocol>[:<enable-direct-server-return>[:<lb-set-name>[:<probe-protocol>[:<probe-port>[:<probe-path>]]]]]]] \r\n         and prob-path Should be relative';
    var endpointsAsList = endpoints.split(',');
    var inputEndpoints = [];
    var endPointUtil = new EndPointUtil();

    endpointsAsList.forEach(function (endpointInfoStr, j) {
      if (!endpointInfoStr) {
        return callback(new Error(message));
      }

      var endpointInfoAsList = endpointInfoStr.split(':');
      if (endpointInfoAsList.length > 8) {
        return callback(new Error(message));
      }

      var i = 0;
      var epInput = {};
      endpointInfoAsList.forEach(function (item) {
        if (!item) {
          return callback(new Error(message));
        }

        switch (i) {
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

    var newEndPoints = inputEndpoints;

    var newEndPointsResult = endPointUtil.verifyEndPoints(newEndPoints);
    if (newEndPointsResult.error) {
      return callback(new Error(newEndPointsResult.error));
    }

    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return callback(result.error);
        } else {
          // Get all LB settings defined in this hosted service
          var lbsetConfigs = endPointUtil.getAllLBSettings(result.deployment.deploy.roles);
          // If any of the new endpoint has lb set name, if same lb settings is
          // defined for this hosted service then overwrite user provided lb
          // settings with this.
          for (var l = 0; l < newEndPoints.length; l++) {
            var lbSetName = newEndPoints[l].loadBalancedEndpointSetName;
            if (lbSetName) {
              lbSetName = lbSetName.toLowerCase();
              if (lbSetName in lbsetConfigs) {
                if (underscore.contains(lbsetConfigs[lbSetName].VmNames, vmName)) {
                  return callback(new Error(
                      util.format($('this VM already has an endpoint with lb set name %s. lb set name should be unique'),
                          lbSetName)));
                }

                logger.info(util.format($('cloud service already has an lb set defined with name %s, using this existing lb settings configuration'),
                    lbSetName));

                newEndPoints[l].loadBalancerProbe =
                    lbsetConfigs[lbSetName].ProbSettings;
                newEndPoints[l].enableDirectServerReturn =
                    lbsetConfigs[lbSetName].EnableDirectServerReturn;
              }
            }
          }

          var progress = self.cli.interaction.progress('Reading network configuration');

          computeManagementClient.virtualMachines.get(result.deployment.svc, result.deployment.deploy.name, vmName, function (error, response) {
            progress.end();
            if (error) {
              return callback(error);
            } else {
              var persistentVMRole = response;
              var configurationSets = persistentVMRole.configurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].configurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              if (!configurationSets[m].inputEndpoints) {
                configurationSets[m].inputEndpoints = [];
              }

              var endpoints = configurationSets[m].inputEndpoints;
              var endpointCount = endpoints.length;

              for (var n = 0; n < endpointCount; n++) {
                var key = endpoints[n].port + ':' + endpoints[n].protocol;
                if (key in newEndPointsResult.protocolPorts) {
                  return callback(new Error(
                      util.format($('this VM already has a %s load balancer port %s. lb port and protocol together should be unique'),
                          endpoints[n].protocol, endpoints[n].port)));
                }

                key = endpoints[n].name.toLowerCase();
                if (key in newEndPointsResult.endPointNames) {
                  return callback(new Error(
                      util.format($('this VM already has an endpoint with name %s, endpoint name should unique'),
                          key)));
                }
              }

              configurationSets[m].inputEndpoints = configurationSets[m].inputEndpoints.concat(newEndPoints);
              progress = self.cli.interaction.progress($('Updating network configuration'));

              computeManagementClient.virtualMachines.update(result.deployment.svc, result.deployment.deploy.name, vmName, persistentVMRole, function (error) {
                progress.end();
                return callback(error);
              });
            }
          });
        }
      }
    });
  },

  listEPs: function (name, options, callback, logger) {
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var role = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                if (role) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                role = roles[j];
              }
            }
          }
        }

        var endpointName = options.endpointName;

        if (role) {
          var networkConfigSet = getNetworkConfigSet(role, endpointName);
          if (!networkConfigSet.inputEndpoints) {
            if (logger.format().json) {
              logger.json([]);
            } else {
              logger.warn($('No VMs found'));
            }
            return callback();
          } else {
            logger.table(networkConfigSet.inputEndpoints, function (row, item) {
              row.cell('Name', item.name);
              row.cell('Protocol', item.protocol);
              row.cell('Public Port', item.port);
              row.cell('Private Port', item.localPort);
              row.cell('Virtual IP', item.virtualIPAddress || '');
              row.cell('EnableDirectServerReturn', item.enableDirectServerReturn);
              row.cell('Load Balanced', item.loadBalancedEndpointSetName ? 'Yes' : 'No');
            });
            return callback();
          }
        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  showEP: function (name, options, callback, logger) {
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var role = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === name) {
                if (role) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                role = roles[j];
              }
            }
          }
        }

        var endpointName = options.endpointName;

        if (role) {
          var networkConfigSet = getNetworkConfigSet(role, endpointName);
          if (!networkConfigSet.inputEndpoints) {
            if (logger.format().json) {
              logger.json([]);
            } else {
              logger.warn($('No VMs found'));
            }
            return callback();
          } else {
            var endpointConfig = { Network: {
              Endpoints: networkConfigSet.inputEndpoints
            }};
            if (logger.format().json) {
              logger.json(endpointConfig);
            } else {
              utils.logLineFormat(endpointConfig, logger.data);
            }
            return callback();
          }
        } else {
          logger.warn($('No VMs found'));
          return callback();
        }
      }
    });
  },

  deleteEP: function (vmName, endpointName, options, callback) {
    var computeManagementClient = this.createComputeManagementClient();
    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return callback(result.error);
        } else {
          var progress = self.cli.interaction.progress('Reading network configuration');

          computeManagementClient.virtualMachines.get(result.deployment.svc, result.deployment.deploy.name, vmName, function (error, response) {
            progress.end();
            if (error) {
              return callback(error);
            } else {
              var persistentVMRole = response;
              var configurationSets = persistentVMRole.configurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].configurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              var endpoints = configurationSets[m].inputEndpoints;
              var i = -1;
              if (underscore.isArray(endpoints)) {
                i = 0;
                for (; i < endpoints.length; i++) {
                  if (utils.ignoreCaseEquals(endpoints[i].name, endpointName)) {
                    break;
                  }
                }
              }

              if ((i == -1) || (i == endpoints.length)) {
                return callback(util.format($('Endpoint %s not found in the network configuration'), endpointName));
              }

              configurationSets[m].inputEndpoints.splice(i, 1); // remove endpoint
              progress = self.cli.interaction.progress($('Updating network configuration'));

              // persistentVMRole contains vm role without specified endpoint, let's update role
              computeManagementClient.virtualMachines.update(result.deployment.svc, result.deployment.deploy.name, vmName, persistentVMRole, function (error) {
                progress.end();
                return callback(error);
              });
            }
          });
        }
      }
    });
  },

  updateEP: function (vmName, endpointName, options, callback) {
    var endPointUtil = new EndPointUtil();
    var epNew = {};

    if (options.newEndpointName) {
      var epNameRes = endPointUtil.validateEndPointName(options.newEndpointName, '--new-endpoint-name');
      if (epNameRes.error) {
        return callback(epNameRes.error);
      }

      epNew.name = epNameRes.endpointName;
    }

    if (options.lbPort) {
      var lbpRes = endPointUtil.validatePort(options.lbPort, '--lb-port');
      if (lbpRes.error) {
        return callback(lbpRes.error);
      }

      epNew.port = lbpRes.port;
    }

    if (options.vmPort) {
      var vmpRes = endPointUtil.validatePort(options.vmPort, '--vm-port');
      if (vmpRes.error) {
        return callback(vmpRes.error);
      }

      epNew.localPort = vmpRes.port;
    }

    if (options.endpointProtocol) {
      var eppRes = endPointUtil.validateProtocol(options.endpointProtocol, '--endpoint-protocol');
      if (eppRes.error) {
        return callback(eppRes.error);
      }

      epNew.protocol = eppRes.protocol;
    }

    if (underscore.isEmpty(epNew)) {
      return callback($('one of the optional parameter --new-endpoint-name, --lb-port, --vm-port or --endpoint-protocol is required'));
    }

    var computeManagementClient = this.createComputeManagementClient();

    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var result = getVMDeployment(deployments, vmName);
        if (result.error) {
          return callback(result.error);
        } else {
          var progress = self.cli.interaction.progress('Reading network configuration');

          computeManagementClient.virtualMachines.get(result.deployment.svc, result.deployment.deploy.name, vmName, function (error, response) {
            progress.end();
            if (error) {
              return callback(error);
            } else {
              var persistentVMRole = response;
              var configurationSets = persistentVMRole.configurationSets;
              var m = 0;
              for (; m < configurationSets.length; m++) {
                if (configurationSets[m].configurationSetType === 'NetworkConfiguration') {
                  break;
                }
              }

              var endpoints = configurationSets[m].inputEndpoints;
              var i = -1;
              if (underscore.isArray(endpoints)) {
                i = 0;
                for (; i < endpoints.length; i++) {
                  if (utils.ignoreCaseEquals(endpoints[i].name, endpointName)) {
                    break;
                  }
                }
              }

              if ((i == -1) || (i == endpoints.length)) {
                return callback(util.format($('Endpoint %s not found in the network configuration'), endpointName));
              }

              var epToUpdate = configurationSets[m].inputEndpoints[i];
              if (epNew.name) {
                epToUpdate.name = epNew.name;
              }

              if (epNew.port) {
                epToUpdate.port = epNew.port;
              }

              if (epNew.localPort) {
                epToUpdate.localPort = epNew.localPort;
              }

              if (epNew.protocol) {
                epToUpdate.protocol = epNew.protocol;
              }

              var message = null;

              for (var j = 0; j < endpoints.length; j++) {
                if (i != j) {
                  if (utils.ignoreCaseEquals(endpoints[j].name, epToUpdate.name)) {
                    message = util.format($('An endpoint with name %s already exists'), epToUpdate.name);
                    break;
                  }

                  var portAsInt = parseInt(endpoints[j].port, 10);
                  if ((portAsInt == epToUpdate.port) && (utils.ignoreCaseEquals(endpoints[j].protocol, epToUpdate.protocol))) {
                    message = util.format($('this VM already has an %s load balancer port %s, lb port and protocol together should be unique'),
                        epToUpdate.protocol, epToUpdate.port);
                    break;
                  }
                }
              }

              if (message) {
                return callback(message);
              }

              configurationSets[m].inputEndpoints[i] = epToUpdate;
              progress = self.cli.interaction.progress($('Updating network configuration'));

              computeManagementClient.virtualMachines.update(result.deployment.svc, result.deployment.deploy.name, vmName, persistentVMRole, function (error) {
                progress.end();
                return callback(error);
              });
            }
          });
        }
      }
    });

  },

  uploadDataDisk: function (sourcePath, blobUrl, storageAccountKey, options, callback, logger) {
    if (/^https?\:\/\//i.test(sourcePath)) {
      logger.verbose('Copying blob from ' + sourcePath);
      if (options.md5Skip || options.parallel !== 96 || options.baseVhd) {
        logger.warn('--md5-skip, --parallel and/or --base-vhd options will be ignored');
      }
      if (!options.forceOverwrite) {
        logger.warn('Any existing blob will be overwritten' + (blobUrl ? ' at ' + blobUrl : ''));
      }
      var progress = self.cli.interaction.progress('Copying blob');
      pageBlob.copyBlob(sourcePath, options.sourceKey, blobUrl, storageAccountKey, function (error, blob, response) {
        progress.end();
        logger.silly(util.inspect(response, null, null, true));
        if (!error) {
          logger.silly('Status : ' + response.copyStatus);
        }

        return callback(error);
      });
    } else {
      var uploadOptions = {
        verbose: self.cli.verbose ||
            logger.format().level === 'verbose' ||
            logger.format().level === 'silly',
        skipMd5: options.md5Skip,
        force: options.forceOverwrite,
        vhd: true,
        threads: options.parallel,
        parentBlob: options.baseVhd,
        exitWithError: callback,
        logger: logger
      };

      pageBlob.uploadPageBlob(blobUrl, storageAccountKey, sourcePath, uploadOptions, callback);
    }

  },

  attachDataDisk: function (vmName, diskImageName, options, callback, logger) {

    this.diskAttachDetach({
      subscription: options.subscription,
      name: vmName,
      dnsName: options.dnsName,
      size: null,
      isDiskImage: true,
      url: diskImageName,
      attach: true,
      logger: logger
    }, callback);

  },

  attachNewDataDisk: function (vmName, size, blobUrl, options, callback, logger) {

    var sizeAsInt = utils.parseInt(size);
    if (isNaN(sizeAsInt)) {
      return callback('size-in-gb must be an integer');
    }

    this.diskAttachDetach({
      subscription: options.subscription,
      name: vmName,
      dnsName: options.dnsName,
      size: sizeAsInt,
      isDiskImage: false,
      url: blobUrl,
      attach: true,
      logger: logger
    }, callback);

  },

  detachDataDisk: function (vmName, lun, options, callback, logger) {

    var lunAsInt = utils.parseInt(lun);
    if (isNaN(lunAsInt)) {
      return callback('lun must be an integer');
    }

    this.diskAttachDetach({
      subscription: options.subscription,
      name: vmName,
      dnsName: options.dnsName,
      lun: lunAsInt,
      attach: false,
      logger: logger
    }, callback);

  },

  getDeployments: function (options, callback) {
    var computeManagementClient = this.createComputeManagementClient();
    var self = this;
    var deployments = [];

    var progress = self.cli.interaction.progress($('Getting virtual machines'));

    var getDeploymentSlot = function (hostedServices) {
      async.each(hostedServices, function (hostedService, cb) {
        computeManagementClient.deployments.getBySlot(hostedService.serviceName, 'Production', function (error, response) {
          if (error) {
            if (error.code === 'ResourceNotFound') {
              return cb(null);
            } else {
              return cb(error);
            }
          }

          var deployment = { svc: hostedService.serviceName, deploy: response };

          if (hostedService && hostedService.properties) {
            deployment.Location = hostedService.properties.location;
            deployment.AffinityGroup = hostedService.properties.affinityGroup;
          }

          deployments.push(deployment);

          cb(null);
        });
      }, function (err) {
        progress.end();
        return callback(err, deployments);
      });
    };

    // get deployment by slot. Checks which slots to query.
    options.dnsPrefix = options.dnsPrefix || utils.getDnsPrefix(options.dnsName, true);
    if (options.dnsPrefix) {
      getDeploymentSlot([
        { ServiceName: options.dnsPrefix }
      ]);
    } else {
      computeManagementClient.hostedServices.list(function (error, response) {
        if (error) {
          return callback(error);
        }

        return getDeploymentSlot(response.hostedServices);
      });
    }
  },

  diskAttachDetach: function (options, callback) {
    var lookupOsDiskUrl = false;
    var diskInfo = {};
    var computeManagementClient = this.createComputeManagementClient();

    if (!options.isDiskImage) {
      if (!options.url || !url.parse(options.url).protocol) {
        // If the blob url is not provide or partially provided, we need see
        // what storage account is used by VM's OS disk.
        lookupOsDiskUrl = true;
      } else {
        diskInfo.mediaLinkUri = options.url;
      }
    } else {
      diskInfo.name = options.url;
    }

    this.getDeployments(options, function (error, deployments) {
      if (error) {
        return callback(error);
      } else {
        var found = null;

        for (var i = 0; i < deployments.length; i++) {
          var roles = deployments[i].deploy.roles;
          if (roles) {
            for (var j = 0; j < roles.length; j++) {
              if (roles[j].roleType === 'PersistentVMRole' &&
                  roles[j].roleName === options.name) {
                if (found) {
                  // found duplicates, emit error
                  return callback(new Error($('VM name is not unique')));
                }
                found = deployments[i];
                found.dataVirtualHardDisks = roles[j].dataVirtualHardDisks;
                found.osDisk = roles[j].oSVirtualHardDisk;
              }
            }
          }
        }

        // got unique role under a deployment and service, add disk
        if (found) {
          var progress;
          if (options.attach) {
            // Check if we need to set the disk url based on the VM OS disk
            if (lookupOsDiskUrl) {
              if (options.url) {
                var parsed = url.parse(found.osDisk.mediaLink);
                diskInfo.mediaLinkUri = parsed.protocol + '//' + parsed.host + '/' + options.url;
              } else {
                diskInfo.mediaLinkUri = found.osDisk.mediaLink.slice(0, found.osDisk.mediaLink.lastIndexOf('/')) +
                    '/' + options.name + '-' + crypto.randomBytes(8).toString('hex') + '.vhd';
              }

              options.logger.verbose('Disk MediaLink: ' + diskInfo.mediaLinkUri);
            }

            var maxLun = -1;
            for (var k = 0; k < found.dataVirtualHardDisks.length; k++) {
              var lun = found.dataVirtualHardDisks[k].logicalUnitNumber ? parseInt(found.dataVirtualHardDisks[k].logicalUnitNumber, 10) : 0;
              maxLun = Math.max(maxLun, lun);
            }

            var nextLun = maxLun + 1;
            diskInfo.logicalUnitNumber = nextLun;

            if (options.size) {
              diskInfo.logicalDiskSizeInGB = options.size;
            } else {
              // computeManagementClient.virtualMachineDisks.createDataDisk
              // requires logicalDiskSizeInGB and mediaLinkUri parameters,
              // let's init it with dummy values (will be ignored by azure sdk)
              diskInfo.logicalDiskSizeInGB = 5;
              diskInfo.mediaLinkUri = 'http://dummy';
            }

            diskInfo.label = found.svc + '-' + found.deploy.name + '-' + options.name + '-' + nextLun;
            options.logger.verbose('Disk Lun: ' + nextLun);
            options.logger.verbose('Disk Label: ' + diskInfo.label);

            progress = self.cli.interaction.progress('Adding Data-Disk');

            computeManagementClient.virtualMachineDisks.createDataDisk(found.svc, found.deploy.name, options.name, diskInfo, function (error) {
              progress.end();
              // TODO: azure sdk returns empty 'Error' object if operation completed successfully
              if(error && error.message === '') {
                return callback(null);
              }
              return callback(error);
            });
          }
          else {
            progress = self.cli.interaction.progress('Removing Data-Disk');

            computeManagementClient.virtualMachineDisks.deleteDataDisk(found.svc, found.deploy.name, options.name, options.lun, {}, function (error) {
              progress.end();
              return callback(error);
            });
          }
        }
        else {
          options.logger.warn('No VMs found');
          return callback();
        }
      }
    });
  },

  createServiceManagementService: function () {
    return utils.createServiceManagementService(profile.current.getSubscription(this.subscription), this.cli.output);
  },

  createComputeManagementClient: function () {
    return utils._createComputeClient(profile.current.getSubscription(this.subscription), this.cli.output);
    // return utils._createComputeClient(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  },

  createManagementClient: function () {
    return utils._createManagementClient(profile.current.getSubscription(this.subscription), this.cli.output);
    // return utils._createManagementClient(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  }

});

// default service options
var svcParams = {
  label: '',
  description: 'Implicitly created hosted service'
};

// helpers methods
function createVMView(role, deployment) {
  var roleInstance = getRoleInstance(role.roleName, deployment.deploy);
  var networkConfigSet = getNetworkConfigSet(role);

  return {
    DNSName: url.parse(deployment.deploy.uri).host,
    Location: deployment.Location,
    AffinityGroup: deployment.AffinityGroup,
    VMName: role.roleName,
    IPAddress: roleInstance.iPAddress || '',
    InstanceStatus: roleInstance.instanceStatus,
    InstanceSize: roleInstance.instanceSize,
    /* InstanceStateDetails: roleInstance.InstanceStateDetails,  this property is deprecated */
    /* AvailabilitySetName: role.AvailabilitySetName, this property is deprecated */
    /* OSVersion: role.OsVersion, this property is deprecated */
    Image: role.oSVirtualHardDisk.sourceImageName,
    OSDisk: role.oSVirtualHardDisk,
    DataDisks: role.dataVirtualHardDisks,
    Network: {
      Endpoints: (networkConfigSet ? networkConfigSet.inputEndpoints : {})
    }
  };
}

function getRoleInstance(roleName, deployment) {
  for (var i = 0; i < deployment.roleInstances.length; i++) {
    if (deployment.roleInstances[i].roleName === roleName) {
      return deployment.roleInstances[i];
    }
  }
}

function getNetworkConfigSet(role, endpointName) {
  for (var i = 0; i < role.configurationSets.length; i++) {
    var configSet = role.configurationSets[i];
    if (configSet.configurationSetType === 'NetworkConfiguration') {
      if (endpointName) {
        var endpointSet;
        for (var j = 0; j < configSet.inputEndpoints.length; j++) {
          if (configSet.inputEndpoints[j].name === endpointName) {
            endpointSet = {
              LocalPort: configSet.inputEndpoints[j].localPort,
              Name: configSet.inputEndpoints[j].name,
              Port: configSet.inputEndpoints[j].port,
              Protocol: configSet.inputEndpoints[j].protocol,
              Vip: configSet.inputEndpoints[j].virtualIPAddress,
              EnableDirectServerReturn: configSet.inputEndpoints[j].enableDirectServerReturn
            };
            break;
          }
        }
        configSet.InputEndpoints = [endpointSet];
      }
      return configSet;
    }
  }
}

function loadCustomData(udfile, logger) {
  if (udfile) {
    logger.verbose('loading customdata from:' + udfile);
    return fs.readFileSync(udfile).toString('base64');
  } else {
    logger.verbose('no customData option');
    return null;
  }
}

function createVM(options, callback, logger) {
  var deploymentParams = {
    name: options.dnsPrefix,
    label: options.dnsPrefix,
    deploymentSlot: 'Production',
    virtualNetworkName: options.virtualNetworkName
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

  dnsPrefix = options.dnsPrefix;

  function cmdCallbackHook(error) {
    if (error) {
      if (communityImgInfo.created) {
        // cleanup community image
        var imageHelper = require('../iaas/image');
        var imageDelete = imageHelper.delete(imageHelper.OSIMAGE, self.cli);
        var deleteOptions = {
          blobDelete: true,
          subscription: options.subscription,
          blobUrl: communityImgInfo.blobUrl
        };

        imageDelete(communityImgInfo.name, deleteOptions, function (imgDelErr) {
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
            return callback();
          }
        });
      } else {
        return cleanupHostedServiceAndExit(error);
      }
    } else {
      return callback();
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

  function lookupImage(computeManagementClient, imageName, logger, callback) {
    var result = {
      error: null,
      image: null
    };

    progress = self.cli.interaction.progress(util.format($('Looking up image %s'), imageName));

    computeManagementClient.virtualMachineOSImages.list(function (error, response) {
      progress.end();
      if (!error) {
        var images = response.images;
        result.image = underscore.find(images, function (img) {
          return (img.name === imageName);
        });

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
      var imageCreate = imageHelper.create(imageHelper.OSIMAGE, self.cli);
      var imageCreateOptions = {
        os: 'Linux',
        blobUrl: options.imageTarget,
        location: options.location,
        affinityGroup: options.affinityGroup,
        subscription: options.subscription
      };

      imageCreate(communityImgInfo.name, communityImgInfo.blobUrl, imageCreateOptions, function (error) {
        if (error) {
          return cmdCallbackHook(error);
        }

        communityImgInfo.created = true;

        lookupImage(options.computeManagementClient, communityImgInfo.name, options.logger, function (error, comImage) {
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
    var passwordErr = $('password must be at least 8 character in length, it must contain a lower case, an upper case, a number and a special character such as !@#$%^&+=');
    var passwordRegEx = new RegExp(/^.*(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\*!@#$%^&+=]).*$/);
    var promptMsg = util.format($('Enter VM \'%s\' password:'), options.userName);

    if (utils.ignoreCaseEquals(osName, 'windows')) {
      if (utils.ignoreCaseEquals(options.userName, 'administrator')) {
        return callback($('user name administrator cannot be used'));
      }

      if (typeof options.password === 'undefined') {
        self.cli.interaction.password(promptMsg, '*', function (password) {
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
          self.cli.interaction.password(promptMsg, '*', function (password) {
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
        return callback(loadSshErr);
      }
    }

    createHostedService();
  } else {
    if (options.community) {
      progress = self.cli.interaction.progress($('Looking up community image'));
      var managementEndPoint = profile.current.getSubscription(options.subscription).managementEndpointUrl;
      var communityUtil = new CommunityUtil(managementEndPoint);
      communityUtil.resolveUid(options.imageName, function (error, response) {
        progress.end();

        if (!error) {
          var comResult = response.body.d[0];
          communityImgInfo.name = options.imageName + '-' + crypto.randomBytes(4).toString('hex');
          communityImgInfo.blobUrl = comResult.BlobUrl;

          verifyUserNameAndPwd('linux', function (error) {
            if (error) {
              return callback(error);
            }

            var certErr1 = verifyCertFingerPrint('linux');
            if (certErr1) {
              return callback(new Error(certErr1));
            }

            // Note: at this point we have verified that the community image exists in the remote
            // image repository, copying this image to user's subscription will happen before
            // creating the deployment.

            createHostedService();
          });
        } else {
          return callback(new Error($('Failed to validate Community image')));
        }
      });
    } else {
      lookupImage(options.computeManagementClient, options.imageName, logger, function (imgErr, foundImage) {
        if (imgErr) {
          return callback(imgErr);
        }

        image = foundImage;
        verifyUserNameAndPwd(image.operatingSystemType, function (error) {
          if (error) {
            return callback(error);
          }

          var certErr2 = verifyCertFingerPrint(image.operatingSystemType);
          if (certErr2) {
            return callback(certErr2);
          }

          createHostedService();
        });
      });
    }
  }

  function createDefaultRole(name, callback) {
    var inputEndPoints = [];
    logger.verbose($('Creating default role'));
    var vmName = options.vmName || name || dnsPrefix;
    role = {
      roleName: vmName,
      roleSize: options.size,
      roleType: 'PersistentVMRole',
      oSVirtualHardDisk: {
        sourceImageName: image.name
      }
    };

    if (options.availabilitySet) {
      role.availabilitySetName = options.availabilitySet;
      logger.verbose(util.format($('VM will be part of the %s availability set.'), options.availabilitySet));
    }

    /*jshint camelcase:false*/
    function createDefaultRoleInternal() {
      var configureSshCert = false;
      var customDataBase64 = null;
      if (image.operatingSystemType.toLowerCase() === 'linux') {
        logger.verbose($('Using Linux ProvisioningConfiguration'));

        provisioningConfig = {
          configurationSetType: 'LinuxProvisioningConfiguration',
          hostName: vmName,
          userName: options.userName,
          userPassword: options.password
        };

        if (options.ssh) {
          logger.verbose(util.format($('SSH is enabled on port %s'), options.ssh));

          inputEndPoints.push({
            name: 'ssh',
            protocol: 'tcp',
            port: options.ssh,
            localPort: '22'
          });

          if (options.sshCert) {
            sshFingerprint = sshFingerprint.toUpperCase();
            logger.verbose(util.format($('using SSH fingerprint: %s'), sshFingerprint));

            // Configure the cert for cloud service
            configureSshCert = true;

            if (options.noSshPassword) {
              logger.verbose($('Password-based authentication will not be enabled'));
              provisioningConfig.disableSshPasswordAuthentication = true;
              provisioningConfig.userPassword = 'BarFoo99!'; // must be defined, dummy string.
            }
          } else {
            provisioningConfig.disableSshPasswordAuthentication = false;
          }
        }
      } else {
        logger.verbose($('Using Windows ProvisioningConfiguration'));
        provisioningConfig = {
          configurationSetType: 'WindowsProvisioningConfiguration',
          computerName: vmName,
          adminPassword: options.password,
          adminUserName: options.userName,
          resetPasswordOnFirstLogon: false
        };

        if (options.rdp) {
          logger.verbose(util.format($('RDP is enabled on port %s'), options.rdp));
          inputEndPoints.push({
            name: 'rdp',
            protocol: 'tcp',
            port: options.rdp,
            localPort: '3389'
          });
        }
      }

      role.configurationSets = [provisioningConfig];

      if (inputEndPoints.length || options.subnetNames) {
        role.configurationSets.push({
          configurationSetType: 'NetworkConfiguration',
          inputEndpoints: inputEndPoints,
          subnetNames: options.subnetNames ? options.subnetNames.split(',') : []
        });
      }

      customDataBase64 = loadCustomData(options.customData, logger);
      if (customDataBase64) {
        provisioningConfig.customData = customDataBase64;
      }

      if (configureSshCert) {
        progress = self.cli.interaction.progress($('Configuring certificate'));
        configureCert(dnsPrefix, function (error) {
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

    if (!options.imageTarget && image && image.mediaLink && image.mediaLink.indexOf('$root') >= 0) {
      // Make sure OS disk is not stored in $root container by default. Use a different container in the same storage account.
      options.imageTarget = image.mediaLink.split('$root')[0] +
          'vhd-store-root/' + vmName + '-' + crypto.randomBytes(8).toString('hex') + '.vhd';
    }

    if (options.imageTarget || image.category !== 'User') {
      // blobUtils is not updated to use Hydra based Azure SDK,
      // that's why we need provide channel
      var channel = utils.createServiceManagementService(profile.current.getSubscription(options.subscription), logger);
      blobUtils.getBlobName(self.cli, channel, location, affinityGroup, dnsPrefix, options.imageTarget,
          '/vhd-store/', vmName + '-' + crypto.randomBytes(8).toString('hex') + '.vhd',
          function (error, imageTargetUrl) {
            if (error) {
              logger.error($('Unable to retrieve storage account'));
              return cmdCallbackHook(error);
            } else {
              imageTargetUrl = blobUtils.normalizeBlobUri(imageTargetUrl, false);
              logger.verbose('image MediaLink: ' + imageTargetUrl);
              role.oSVirtualHardDisk.mediaLink = imageTargetUrl;
              if (imageTargetUrl.indexOf('$root') >= 0) {
                return cmdCallbackHook(util.format($('Creating OS disks in $root storage container is not supported. Storage URL: %s'), imageTargetUrl));
              }
              createDefaultRoleInternal();
            }
          }
      );
    } else {
      createDefaultRoleInternal();
    }

  }

  function configureCert(serviceName, callback) {
    if (provisioningConfig) {
      provisioningConfig.sshSettings = {
        publicKeys: [
          {
            fingerprint: sshFingerprint,
            path: '/home/' + options.userName + '/.ssh/authorized_keys'
          }
        ]
      };

      logger.silly($('provisioningConfig with SSH:'));
      logger.silly(JSON.stringify(provisioningConfig));
    }

    if (pemSshCert) {
      logger.verbose($('uploading cert'));

      var certParams = {
        data: pemSshCert,
        certificateFormat: 'pfx'
      };

      var computeManagementClient = options.computeManagementClient;
      // utils.doServiceManagementOperation(channel, 'addCertificate', service, pemSshCert, 'pfx', null, function (error) {
      computeManagementClient.serviceCertificates.create(serviceName, certParams, function (error) {
        if (error) {
          return callback(error);
        }
        else {
          logger.verbose($('uploading cert succeeded'));
          return callback();
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

    var computeManagementClient = options.computeManagementClient;
    // get cloud service properties
    progress = self.cli.interaction.progress($('Getting cloud service properties'));

    // utils.doServiceManagementOperation(channel, 'getHostedServiceProperties', dnsPrefix, function (error, response) {
    computeManagementClient.hostedServices.get(dnsPrefix, function (error, response) {
      progress.end();
      if (error) {
        return callback(error);
      }
      else {
        logger.verbose($('Cloud service properties:'));
        logger.json('verbose', response);
        location = response.properties.location;
        affinityGroup = response.properties.affinityGroup;

        // check for existing production deployment
        progress = self.cli.interaction.progress($('Looking up deployment'));
        // utils.doServiceManagementOperation(channel, 'getDeploymentBySlot', dnsPrefix, 'Production', function (error, response) {
        computeManagementClient.deployments.getBySlot(dnsPrefix, 'Production', function (error, response) {
          progress.end();
          if (error) {
            if (error.statusCode === 404) {
              // There's no production deployment.  Create a new deployment.
              /*jshint camelcase:false*/
              var createDeployment_ = function () {
                progress = self.cli.interaction.progress($('Creating VM'));

                deploymentParams.roles = [role];
                deploymentParams.deploymentSlot = 'Production';

                computeManagementClient.virtualMachines.createDeployment(dnsPrefix, deploymentParams, function (error) {
                  progress.end();
                  if (!error) {
                    logger.info('OK');
                    return cmdCallbackHook(null);
                  } else {
                    return cmdCallbackHook(error);
                  }
                });
              };

              copyAndRegCommunityImgIfRequired(function () {
                if (!role) {
                  createDefaultRole(null, createDeployment_);
                } else {
                  createDeployment_();
                }
              });
            } else {
              return callback(error);
            }
          } else {
            // There's existing production deployment.  Add a new role if --connect was specified.
            var hookEx = false;
            if (!options.connect) {
              logger.help($('Specify --connect option to connect the new VM to an existing VM'));
              hookEx = true;
              return callback(util.format($('A VM with dns prefix "%s" already exists'), dnsPrefix));
            }

            var addRoleInternal = function () {
              logger.verbose($('Adding a VM to existing deployment'));
              progress = self.cli.interaction.progress('Creating VM');

              // utils.doServiceManagementOperation(channel, 'addRole', dnsPrefix, response.body.Name, role, function (error) {
              computeManagementClient.virtualMachines.create(dnsPrefix, response.name, role, function (error) {
                progress.end();
                return cmdCallbackHook(error);
              });
            };

            var roleList = response.roles;
            var maxNum = 0;
            if (roleList) {
              maxNum = 1;
              for (var i = 0; i < roleList.length; i++) {
                var numSplit = roleList[i].roleName.split('-');
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

            copyAndRegCommunityImgIfRequired(function () {
              if (!hookEx) {
                if (!role) {
                  var tag = '-' + (maxNum + 1);
                  var vmName = image.operatingSystemType.toLowerCase() === 'linux' ? dnsPrefix : dnsPrefix.slice(0, 15 - tag.length);
                  vmName += tag;
                  createDefaultRole(vmName, addRoleInternal);
                } else {
                  addRoleInternal();
                }
              }
            });

          }
        });
      }
    });
  }

  function createDeployment(computeManagementClient) {
    /*jshint camelcase:false*/

    function createDeploymentInternal() {
      progress = self.cli.interaction.progress($('Creating VM'));

      deploymentParams.roles = [role];
      deploymentParams.deploymentSlot = 'Production';

      computeManagementClient.virtualMachines.createDeployment(dnsPrefix, deploymentParams, function (error) {
        progress.end();
        if (error) {
          return cmdCallbackHook(error);
        } else {
          return cmdCallbackHook(error);
        }
      });

    }

    // At this point we have a valid cloud service (existing or new one)
    // copy the community image if required.
    copyAndRegCommunityImgIfRequired(function () {
      if (!role) {
        createDefaultRole(null, createDeploymentInternal);
      } else {
        if (options.sshCert && pemSshCert) {
          progress = self.cli.interaction.progress($('Configuring certificate'));
          configureCert(dnsPrefix, function (error) {
            progress.end();
            if (error) {
              return callback(error);
            }
            createDeploymentInternal();
          });
        } else {
          createDeploymentInternal();
        }
      }
    });
  }

  function cleanupHostedServiceAndExit(error) {
    var computeManagementClient = options.computeManagementClient;
    if (hostedServiceCreated) {
      logger.verbose(util.format($('Error occurred. Deleting %s cloud service'), options.dnsPrefix));

      progress = self.cli.interaction.progress($('Deleting cloud service'));

      computeManagementClient.hostedServices.delete(options.dnsPrefix, function (err) {
        progress.end();
        if (err) {
          logger.warn(util.format($('Error deleting %s cloud service'), options.dnsPrefix));
          logger.json('verbose', err);
        } else {
          logger.verbose(util.format($('Cloud service %s deleted'), options.dnsPrefix));
        }
        return callback(error);
      });
    } else {
      return callback(error);
    }
  }

  function createHostedService() {

    var createHostedServiceInternal = function () {
      svcParams.location = location;
      svcParams.affinityGroup = options.affinityGroup;
      svcParams.label = dnsPrefix;
      svcParams.serviceName = dnsPrefix;

      progress = self.cli.interaction.progress($('Creating cloud service'));

      computeManagementClient.hostedServices.create(svcParams, function (error) {
        progress.end();
        if (error) {
          return callback(error);
        } else {
          hostedServiceCreated = true;
          createDeployment(computeManagementClient);
        }
      });
    };
    // check if cloud service exists for specified dns name
    logger.verbose(util.format($('Checking for existence of %s cloud service'), options.dnsPrefix));

    var computeManagementClient = options.computeManagementClient;
    var managementClient = options.managementClient;

    progress = self.cli.interaction.progress($('Looking up cloud service'));

    computeManagementClient.hostedServices.list(function (error, response) {
      progress.end();
      if (error) {
        return callback(error);
      }
      else {
        var service = null;
        var services = response.hostedServices;
        for (var i = 0; i < services.length; i++) {
          if (services[i].serviceName.toLowerCase() === dnsPrefix.toLowerCase()) {
            service = services[i];
            break;
          }
        }

        if (service) {
          logger.verbose(util.format($('Found existing cloud service %s'), service.serviceName));
          return createDeploymentInExistingHostedService();
        } else {
          if (!options.location && !options.affinityGroup) {
            logger.info(util.format($('cloud service %s not found.'), dnsPrefix));
            logger.error($('location or affinity group is required for a new cloud service\nplease specify --location or --affinity-group'));
            logger.help($('following commands show available locations and affinity groups:'));
            logger.help('    azure vm location list');
            logger.help('    azure account affinity-group list');
            return callback(' ');
          }

          if (options.location && options.affinityGroup) {
            return callback($('both --location and --affinitygroup options are specified'));
          }

          location = options.location;
          affinityGroup = options.affinityGroup;
          if (location) {
            logger.verbose(util.format($('Resolving the location %s'), location));
            utils.resolveLocationName(managementClient, location, function (error, resolvedLocation) {
              if (!error) {
                if (!resolvedLocation.availableServices || !underscore.find(resolvedLocation.availableServices, function (s) {
                  return s === 'PersistentVMRole';
                })) {
                  logger.help($('following command show available locations along with supported services:'));
                  logger.help('    azure vm location list --json');
                  return callback(util.format($('the given location \'%s\' does not support PersistentVMRole service'), location));
                }

                location = resolvedLocation.name;
                logger.verbose(util.format($('Location resolved to %s'), location));
                createHostedServiceInternal();
              } else {
                return callback(error);
              }
            });
          } else if (affinityGroup) {
            logger.verbose(util.format($('Looking up the affinity group %s'), affinityGroup));
            //utils.doServiceManagementOperation(channel, 'listAffinityGroups', function (error, affinityGrpRes) {
            managementClient.affinityGroups.list(function (error, affinityGrpRes) {
              var helpmsg1 = $('following command show available affinity groups along with supported services:');
              var helpmsg2 = '    azure account affinity-group list --json';

              if (!error) {
                var affinityGroups = affinityGrpRes.affinityGroups;
                var foundAffinityGroup = null;
                if (affinityGroups instanceof Array) {
                  foundAffinityGroup = underscore.find(affinityGroups, function (af) {
                    return utils.ignoreCaseEquals(af.name, affinityGroup);
                  });
                }

                if (!foundAffinityGroup) {
                  logger.help(helpmsg1);
                  logger.help(helpmsg2);
                  return callback(util.format($('No affinity group found with name %s'), affinityGroup));
                }

                if (foundAffinityGroup.capabilities && !(foundAffinityGroup.capabilities instanceof Array)) {
                  // normalize Capability to an array.
                  foundAffinityGroup.capabilities = [foundAffinityGroup.capabilities];
                }

                if (!foundAffinityGroup.capabilities || !underscore.find(foundAffinityGroup.capabilities, function (ca) {
                  return ca === 'PersistentVMRole';
                })) {
                  logger.help(helpmsg1);
                  logger.help(helpmsg2);
                  return callback(util.format($('the given affinity group \'%s\' does not support PersistentVMRole service'), affinityGroup));
                }

                affinityGroup = foundAffinityGroup.name;
                createHostedServiceInternal();
              } else {
                return callback(error);
              }
            });
          } else {
            createHostedServiceInternal();
          }
        }
      }
    });
  }
}

function deleteHostedServiceIfEmpty(computeManagementClient, dnsPrefix, callback) {
  // delete cloud service if it has no deployments
  computeManagementClient.hostedServices.getDetailed(dnsPrefix, function (error, response) {
    if (error) {
      return callback(error);
    } else {
      if (response.deployments.length === 0) {
        var progress = self.cli.interaction.progress($('Deleting Cloud Service'));
        computeManagementClient.hostedServices.delete(dnsPrefix, function (error) {
          progress.end();
          if (error) {
            return callback(error);
          } else {
            return callback();
          }
        });
      } else {
        return callback();
      }
    }
  });
}

function deleteRoleOrDeployment(computeManagementClient, svcname, deployment, vmName, options, callback, progress) {
  // if more than 1 role in deployment - then delete role, else delete deployment
  var deleteFromStorage = options.blobDelete || false;

  if (deployment.roles.length > 1) {
    computeManagementClient.virtualMachines.delete(svcname, deployment.name, vmName, deleteFromStorage, function (error) {
      progress.end();
      return callback(error);
    });
  } else {
    computeManagementClient.deployments.deleteByName(svcname, deployment.name, deleteFromStorage, function (error) {
      progress.end();
      if (error) {
        return callback(error);
      } else {
        deleteHostedServiceIfEmpty(computeManagementClient, svcname, callback);
      }
    });
  }
}

function getVMDeployment(deployments, vmName) {
  var found = null;

  var result = function (error) {
    return (error ? { error: error } : { error: null, 'deployment': found.deployment, 'roleInstance': found.roleInstance });
  };

  for (var i = 0; i < deployments.length; i++) {
    var roles = deployments[i].deploy.roles;
    if (roles) {
      for (var j = 0; j < roles.length; j++) {
        if (roles[j].roleType === 'PersistentVMRole' &&
            utils.ignoreCaseEquals(roles[j].roleName, vmName)) {
          if (found) {
            // found duplicates
            return result($('VM name is not unique'));
          }

          found = {
            'deployment': deployments[i],
            'roleInstance': getRoleInstance(roles[j].roleName, deployments[i].deploy)
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

module.exports = VMClient;