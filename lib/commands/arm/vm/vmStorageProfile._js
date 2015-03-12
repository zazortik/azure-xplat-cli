var __ = require('underscore');
var util = require('util');

var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

function VMStorageProfile(cli, resourceGroupName, params, serviceClients) {
  this.cli = cli;
  this.storageManagementClient = serviceClients.storageManagementClient;
  this.resourceGroupName = resourceGroupName;

  this.params = params;
  this.prefix = params.prefix;
}

__.extend(VMStorageProfile.prototype, {
        generateStorageProfile: function(_) {
          var storageProfile = {
            profile: {},
            osDiskDataDiskImgInfo: null,
            storageAccountInfo: null
          };

          storageProfile.osDiskDataDiskImgInfo = this._parseOSDataDiskImageParams(this.params, _);
          var containerUri = null;
          if (storageProfile.osDiskDataDiskImgInfo.requireStorage) {
            this.cli.output.info(util.format($('The [OS, Data] Disk or image configuration requires storage account')));
            // TODO: Validation for container-name?
            this.params.storageAccountContainerName = this.params.storageAccountContainerName || 'vhds';
            storageProfile.storageAccountInfo = this._createStorageAccountIfRequired(_);
            containerUri = storageProfile.storageAccountInfo.profile.properties.primaryEndpoints.blob + this.params.storageAccountContainerName + '/';
          }

          if (storageProfile.osDiskDataDiskImgInfo.osDiskInfo && !storageProfile.osDiskDataDiskImgInfo.osDiskInfo.isVhdParamAUrl) {
            storageProfile.osDiskDataDiskImgInfo.osDiskInfo.profile.virtualHardDisk.uri = containerUri + storageProfile.osDiskDataDiskImgInfo.osDiskInfo.profile.virtualHardDisk.uri;
          }

          if (storageProfile.osDiskDataDiskImgInfo.osDiskInfo) {
            storageProfile.profile.osDisk = storageProfile.osDiskDataDiskImgInfo.osDiskInfo.profile;
          }

          if (storageProfile.osDiskDataDiskImgInfo.dataDiskInfo && !storageProfile.osDiskDataDiskImgInfo.dataDiskInfo.isVhdParamAUrl) {
            storageProfile.osDiskDataDiskImgInfo.dataDiskInfo.profile.virtualHardDisk.uri = containerUri + storageProfile.osDiskDataDiskImgInfo.dataDiskInfo.profile.virtualHardDisk.uri;
          }

          if (storageProfile.osDiskDataDiskImgInfo.dataDiskInfo) {
            storageProfile.profile.dataDisks = [storageProfile.osDiskDataDiskImgInfo.dataDiskInfo.profile];
          }

          if (storageProfile.osDiskDataDiskImgInfo.imageInfo) {
            storageProfile.profile.sourceImage = storageProfile.osDiskDataDiskImgInfo.imageInfo.profile;
            storageProfile.profile.destinationVhdsContainer = containerUri;
          }

          return storageProfile;
        },

        _parseOSDataDiskImageParams: function (params, _) {
            var osDiskDataDiskImageInfo = {
              osDiskInfo: null,
              dataDiskInfo: null,
              imageInfo: null,
              requireStorage: false
            };

            if (params.imageName) {
              this.cli.output.warn(util.format($('The image "%s" will be used for VM, any os-disk-* parameters will be ignored'), params.imageName));
              if (!params.subscriptionId) {
                throw new Error($('params.subscriptionId is required to build image resource identifier'));
              }

              osDiskDataDiskImageInfo.imageInfo = {
                profile: {
                  referenceUri: '/' + params.subscriptionId + '/services/images/' + params.imageName
                }
              };
              osDiskDataDiskImageInfo.requireStorage = true;
            } else {
              osDiskDataDiskImageInfo.osDiskInfo = this._parseOSDiskParams(params, _);
              if (osDiskDataDiskImageInfo.osDiskInfo && !osDiskDataDiskImageInfo.osDiskInfo.isVhdParamAUrl) {
                osDiskDataDiskImageInfo.requireStorage = true;
              }
            }

            if (osDiskDataDiskImageInfo.imageInfo === null && osDiskDataDiskImageInfo.osDiskInfo === null) {
              throw new Error($('Either imageName parameter or os-disk-* parameters are required to create VM'));
            }

            osDiskDataDiskImageInfo.dataDiskInfo = this._parseDataDiskParams(params);
            if (osDiskDataDiskImageInfo.dataDiskInfo && !osDiskDataDiskImageInfo.dataDiskInfo.isVhdParamAUrl) {
              osDiskDataDiskImageInfo.requireStorage = true;
            }

            // Logic to validate ImageReference, if present then osDiskInfo args not allowed
            return osDiskDataDiskImageInfo;
        },

        _parseOSDiskParams: function(params, _) {
           var useOsDisk = utils.hasAnyParams([params.osDiskType, params.osDiskCaching, params.osDiskVhd]);
           if (!useOsDisk) {
             return null;
           }

           var osDiskInfo = {
             profile: {
               osType: null,
               name: null,
               caching: null,
               virtualHardDisk: {
                 uri: null
               }
             },
             isVhdParamAUrl: false
           };

           if (utils.stringIsNullOrEmpty(params.osDiskType)) {
             throw new Error($('osDiskType is required when any one of the osDisk configuration parameter is specified'));
           }

           osDiskInfo.profile.osType  = utils.verifyParamExistsInCollection(['Windows', 'Linux'], this.params.osDiskType, 'osDiskType');
           osDiskInfo.profile.name = this._generateOSDiskName(_);
           var supportedDiskCaching = ['None', 'ReadOnly', 'ReadWrite'];
           if (!utils.stringIsNullOrEmpty(params.osDiskCaching)) {
             osDiskInfo.profile.caching  = utils.verifyParamExistsInCollection(supportedDiskCaching, params.osDiskCaching, 'osDiskCaching');
           } else {
            osDiskInfo.profile.caching = supportedDiskCaching[2];
           }

           if (utils.stringIsNullOrEmpty(params.osDiskVhd)) {
             throw new Error($('osDiskVhd is required when any one of the osDisk configuration parameter is specified'));
           }

           // The osDiskVhd can be a full url to a vhd or just vhd name
           if (params.osDiskVhd.match(/^((http|https):\/\/)/)) {
             osDiskInfo.parsedOsDiskVhd = this._parseBlobUrl(params.osDiskVhd, 'osDiskVhd');
             osDiskInfo.isVhdParamAUrl = true;
           }

           // Uri can be name or a URL, if name then this will be replaced with full URL later.
           osDiskInfo.profile.virtualHardDisk.uri = params.osDiskVhd;
           return osDiskInfo;
       },

        _parseDataDiskParams: function(params) {
          var useDataDisk = utils.hasAnyParams([params.dataDiskSize, params.dataDiskCaching, params.dataDiskVhd]);
          if(!useDataDisk) {
            return null;
          }

          var dataDiskInfo = {
            profile: {
              lun: 0, // This is the first Disk so lun 0
              name: 'DataDisk1', // This is the first disk so going with this name
              diskSizeGB: null,
              caching: null,
              virtualHardDisk: {
                uri: null
              }
            },
            isVhdParamAUrl: false
          };

          var sizeAsInt = utils.parseInt(params.dataDiskSize);
          if (isNaN(sizeAsInt) || sizeAsInt === 0) {
            throw new Error($('dataDiskSize is required when any one of the dataDisk configuration parameter is specified and must be an integer'));
          }
          dataDiskInfo.profile.diskSizeGB = sizeAsInt;

          var supportedDiskCaching = ['None', 'ReadOnly', 'ReadWrite'];
          if (!utils.stringIsNullOrEmpty(params.dataDiskCaching)) {
            dataDiskInfo.profile.caching = utils.verifyParamExistsInCollection(supportedDiskCaching, params.dataDiskCaching, 'dataDiskCaching');
          } else {
            dataDiskInfo.profile.caching = supportedDiskCaching[2];
          }

          if (utils.stringIsNullOrEmpty(params.dataDiskVhd)) {
            throw new Error($('dataDiskVhd is required when any one of the dataDisk configuration parameter is specified'));
          }

          // The dataDiskVhd can be a full url to a vhd or just vhd name
          if (params.dataDiskVhd.match(/^((http|https):\/\/)/)) {
            dataDiskInfo.parsedDataDiskVhd = this._parseBlobUrl(params.dataDiskVhd, 'dataDiskVhd');
            dataDiskInfo.isVhdParamAUrl = true;
          }

          // Uri can be name or a URL, if name then this will be replaced with full URL later.
          dataDiskInfo.profile.virtualHardDisk.uri = params.dataDiskVhd;
          return dataDiskInfo;
        },

        _parseStorageCreateParams: function (params) {
          if (!utils.hasAllParams([params.storageAccountName, params.location])) {
            throw new Error($('To create new storage account the parameters storageAccountName and location are required'));
          }

          var createRequestProfile = {
            properties: {
              accountType: 'Standard_LRS'
            },
            name: params.storageAccountName,
            location: params.location
          };

          return createRequestProfile;
        },

        _createStorageAccountIfRequired: function (_) {
          var storageInfo = {
            storageAccountName: null,
            createdNew: false,
            profile: null,
            createRequestProfile: null
          };

          if (utils.stringIsNullOrEmpty(this.params.location)) {
            throw new Error($('parameters location is required to verify the storage account'));
          }

          if (!utils.stringIsNullOrEmpty(this.params.storageAccountName)) {
            storageInfo.storageAccountName = this.params.storageAccountName;
            var existingStorageAccount = this._findStorageAccount(storageInfo.storageAccountName, _);
            if (existingStorageAccount) {
              storageInfo.profile = existingStorageAccount.storageAccount;
              if (!utils.ignoreCaseAndSpaceEquals(storageInfo.profile.location, this.params.location)) {
                throw new Error(util.format($('A storage account with name "%s" already exists in another region "%s"'), this.params.storageAccountName, storageInfo.profile.location));
              }
            } else {
              this.cli.output.info(util.format($('Could not find the storage account "%s", trying to create new one'), this.params.storageAccountName));
              storageInfo.createRequestProfile = this. _createNewStorageAccount(storageInfo.storageAccountName, this.params, _);
              storageInfo.profile = this._findStorageAccount(storageInfo.storageAccountName, _);
              storageInfo.createdNew = true;
            }
          } else {
            var defaultStorageAccount = this._getFirstStorageAccount(this.params.location, _);
            if (defaultStorageAccount) {
              storageInfo.profile = defaultStorageAccount.storageAccount;
              storageInfo.storageAccountName = storageInfo.profile.name;
              this.cli.output.info(util.format($('Using the storage account "%s" in "%s"'), storageInfo.storageAccountName, this.params.location));
            } else {
              this.cli.output.info(util.format($('Could not find any storage accounts in the region "%s", trying to create new one'), this.params.location));
              storageInfo.storageAccountName = this._generateNewStorageAccountName(_);
              this.params.storageAccountName = storageInfo.storageAccountName;
              storageInfo.createRequestProfile = this. _createNewStorageAccount(storageInfo.storageAccountName, this.params, _);
              // Retrieve the profile of just created storage account
              storageInfo.profile = this._findStorageAccount(storageInfo.storageAccountName, _);
              storageInfo.createdNew = true;
            }
          }

          return storageInfo;
        },

        _isStorageAccountNameAvailable: function (resourceGroupName, params, _) {
          var progress = this.cli.interaction.progress(util.format($('Checking storage account name "%s" is available"'), params.storageAccountName));
          try {
            var result = this.storageManagementClient.storageAccountService.checkAccountNameAvailability(this.resourceGroupName, params.storageAccountName, _);
            // TODO: Right now API endpoint for availability check is broken
            return result.nameAvailable;
          } finally {
            progress.end();
          }
        },

        _createNewStorageAccount: function (resourceGroupName, params, _) {
          var createRequestProfile = this._parseStorageCreateParams(params);
          var progress = this.cli.interaction.progress(util.format($('Creating storage account "%s" in "%s"'), params.storageAccountName, params.location));
          try {
            this.storageManagementClient.storageAccountService.putStorageAccount(this.resourceGroupName, params.storageAccountName, createRequestProfile, _);
            return createRequestProfile;
          } finally {
            progress.end();
          }
        },

        _getFirstStorageAccount: function (location, _) {
          var progress = this.cli.interaction.progress($('Retrieving storage accounts'));
          try {
            var storageAccounts = this.storageManagementClient.storageAccountService.listStorageAccounts(this.resourceGroupName, _);
            if (storageAccounts && (storageAccounts.value instanceof Array)) {
              for (var i = 0; i < storageAccounts.value.length; i++) {
                var storageAccount = storageAccounts.value[i];
                if (utils.ignoreCaseEquals(storageAccount.location, location)) {
                  return {
                    storageAccount: storageAccount
                  };
                }
              }
            }

            return null;
          } finally {
              progress.end();
          }
        },

        _findStorageAccount: function (storageAccountName, _) {
          var progress = this.cli.interaction.progress(util.format($('Looking up the storage account %s'), storageAccountName));
          try {
              var storageAccount = this.storageManagementClient.storageAccountService.getStorageAccount(this.resourceGroupName, storageAccountName, _);
              return storageAccount;
          } catch (e) {
            if (e.code === 'ResourceNotFound') {
              return null;
            }
            throw e;
          } finally {
            progress.end();
          }
        },

        _getPrefix: function (_) {
          if (utils.stringIsNullOrEmpty(this.prefix)) {
            this.prefix = require('crypto').randomBytes(10, _).toString('hex');
          }

          return this.prefix;
        },

        _generateNewStorageAccountName: function (_) {
          return this._normalizeString(this._getPrefix(_) + (new Date()).getTime().toString());
        },

        _generateOSDiskName: function (_) {
          return this._normalizeString(this._getPrefix(_)) + '-os-' + (new Date()).getTime().toString();
        },

        _normalizeString: function (str) {
          return str.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 24).toLowerCase();
        },

        _parseBlobUrl: function (blobUrl, paramName) {
          var result = {};

          if (utils.stringIsNullOrEmpty(blobUrl)) {
            throw new Exception (util.format($('%s cannot be null'), paramName));
          }

          var protocolSplit = blobUrl.split('://');
          if (protocolSplit.length != 2 || (protocolSplit[0] !== 'http' && protocolSplit[0] !== 'https')) {
            throw new Error (util.format($('Invalid %s, url must contain protocol part and it must be either http or https'), paramName));
          }

          result.protocol = protocolSplit[0];

          var urlWithoutProtocol = protocolSplit.slice(-1)[0];
          var urlPartsSplit = urlWithoutProtocol.split('/');
            // host, container, path-to-blob
          if (urlPartsSplit.length < 3) {
            throw new Error (util.format($('Invalid %s, the url must contain container name and blob name'), paramName));
          }

          var hostSplit = urlPartsSplit[0].split('.');
          // Validate storage account name
          if (/^([a-z0-9]){3,24}$/.test(hostSplit[0]) === false) {
            throw new Error (util.format($('Invalid %s, the storage account name %s is invalid'), paramName, hostSplit[0]));
          }

          result.storageAccountName = hostSplit[0];

          // Validate container name
          if (/^[a-z0-9](?!.*([-])\1)[a-z0-9\-]+[a-z0-9]$/.test(urlPartsSplit[1]) === false) {
            throw new Error (util.format($('Invalid %s, the container name %s is invalid'), paramName, urlPartsSplit[1]));
          }

          result.containerName = urlPartsSplit[1];

          for (var i = 2; i < urlPartsSplit.length; i++) {
              var p = urlPartsSplit[i].replace(/\s+/g, '');
              if (p === '') {
                throw new Error (util.format($('Invalid %s, the blob name part is invalid'), paramName));
              }
          }

          result.blobName = urlPartsSplit.slice(2).join('/');

          return result;
        }
    }
);

module.exports = VMStorageProfile;