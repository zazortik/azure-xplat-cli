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

var util = require('util');

var __ = require('underscore');

var utils = require('../../util/utils');
var cacheUtils = require('../../util/cacheUtils');

var $ = utils.getLocaleString;

function WebsitesClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
}

__.extend(WebsitesClient, {
  getSiteName: function (name, slot) {
    if (slot && !WebsitesClient.isProductionSlot(slot)) {
      return util.format('%s(%s)', name, slot);
    } else {
      return name;
    }
  },

  getSiteHostName: function (name, slot) {
    if (slot && !WebsitesClient.isProductionSlot(slot)) {
      return util.format('%s-%s', name, slot);
    } else {
      return name;
    }
  },

  isProductionSlot: function (slot) {
    return utils.ignoreCaseEquals(slot, this.getProductionSlotName());
  },

  getProductionSlotName: function () {
    return 'production';
  },

  getStagingSlotName: function () {
    return 'staging';
  }
});

__.extend(WebsitesClient.prototype, {
  enableApplicationDiagnostic: function (name, output, properties, callback) {
    this.setApplicationDiagnosticsSettings(name, output, true, properties, callback);
  },

  disableApplicationDiagnostic: function (name, output, properties, callback) {
    this.setApplicationDiagnosticsSettings(name, output, false, properties, callback);
  },

  setApplicationDiagnosticsSettings: function (name, output, setFlag, properties, callback) {
    var self = this;
    var context = {
      subscription: self.subscription,
      site: {
        name: name
      }
    };

    self.cli.category('site').lookupSiteNameAndWebSpace(context, function (err) {
      if (err) { return callback(err); }

      self.cli.category('site').ensureRepositoryUri(context, function (err, repositoryUri) {
        if (err) { return callback(err); }

        if (repositoryUri) {
          self.getDiagnosticsSettings(context, function (err, settings) {
            if (err) { return callback(err); }

            if (!output && setFlag) {
              throw new Error($('Invalid trace output'));
            }

            if (!output || output.toLowerCase() === 'file') {
              settings.AzureDriveEnabled = setFlag;
              if (setFlag) {
                settings.AzureDriveTraceLevel = properties.level;
              }
            }

            if (!output || output.toLowerCase() === 'storage') {
              settings.AzureTableEnabled = setFlag;

              if (setFlag) {
                settings.AzureTableTraceLevel = properties.level;

                var storageTableName = 'CLOUD_STORAGE_ACCOUNT';
                var storageAccountName = properties.storageAccount;

                // Missing set connection string.
                self.getStorageServiceConnectionString(storageAccountName, function (err, connectionString) {
                  if (err) { return callback(err); }

                  self.setConnectionString(name, storageTableName, connectionString, 'Custom', function (err) {
                    if (err) { return callback(err); }

                    self.updateDiagnosticsSettings(context, settings, callback);
                  });
                });
              } else {
                self.updateDiagnosticsSettings(context, settings, callback);
              }
            } else {
              self.updateDiagnosticsSettings(context, settings, callback);
            }
          });
        } else {
          self.cli.output.error($('Repository is not setup'));
          callback(new Error($('Repository is not setup')));
        }
      });
    });
  },

  getStorageServiceConnectionString: function (name, callback) {
    var self = this;

    var storageService = self.createStorageClient();

    storageService.storageAccounts.get(name, function (err, properties) {
      if (err) { return callback(err); }

      storageService.storageAccounts.getKeys(name, function (err, keys) {
        if (err) { return callback(err); }

        var connectionString = util.format('AccountName=%s;AccountKey=%s;BlobEndpoint=%s;QueueEndpoint=%s;TableEndpoint=%',
          name,
          keys.primaryKey,
          properties.properties.endpoints[0],
          properties.properties.endpoints[1],
          properties.properties.endpoints[2]);

        callback(null, connectionString);
      });
    });
  },

  setConnectionString: function (name, key, value, connectionStringType, callback) {
    var self = this;
    var context = {
      subscription: self.subscription,
      site: {
        name: name
      }
    };

    var siteCategory = self.cli.category('site');
    siteCategory.lookupSiteNameAndWebSpace(context, function (err) {
      if (err) { return callback(err); }

      siteCategory.doSiteConfigGet(context, function (err, config) {
        if (err) { return callback(err); }

        var connectionString;
        if (config.connectionStrings) {
          connectionString = config.connectionStrings.filter(function (c) {
            return utils.ignoreCaseEquals(c.name, key);
          })[0];
        } else {
          config.connectionStrings = [];
        }

        if (connectionString) {
          connectionString.connectionString = value;
          connectionString.name = key;
          connectionString.type = connectionStringType;
        } else {
          config.connectionStrings.push({
            connectionString: value,
            name: key,
            type: connectionStringType
          });
        }

        siteCategory.doSiteConfigPUT(config, context, callback);
      });
    });
  },

  getDiagnosticsSettings: function (context, _) {
    var self = this;

    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, self.cli.output);

    var progress = self.cli.interaction.progress($('Getting diagnostic settings'));
    try {
      return service.getDiagnosticsSettings(_);
    } finally {
      progress.end();
    }
  },

  updateDiagnosticsSettings: function (context, settings, _) {
    var self = this;

    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, self.cli.output);

    var progress = self.cli.interaction.progress($('Updating diagnostic settings'));
    try {
      return service.updateDiagnosticsSettings(settings, _);
    } finally {
      progress.end();
    }
  },

  createStorageClient: function() {
    return utils._createStorageClient(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  },

  createWebsiteManagementService: function() {
    return utils._createWebsiteClient(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  },

  createSite: function (subscription, webspace, site, _) {
    var self = this;

    if (site.hostNames) {
      self.cli.output.info(util.format($('Creating a new web site at %s'), site.hostNames));
    }

    self.cli.output.verbose('Subscription', subscription);
    self.cli.output.verbose('Webspace', webspace);
    self.cli.output.verbose('Site', site.name);

    if (site.slot) {
      self.cli.output.verbose('Slot', site.slot);
    }

    var service = self.createWebsiteManagementService(subscription);
    var progress = self.cli.interaction.progress($('Sending site information'));

    try {
      var result = service.webSites.create(webspace, site, _).webSite;
      self.cli.output.info(util.format($('Created website at %s'), result.hostNames));
      self.cli.output.verbose('Site', result);

      cacheUtils.saveSite(site, result, _);
      return result;
    } catch (err) {
      utils.logError(self.cli.output, $('Failed to create site'), err);

      if (err.messagetemplate) {
        var errormessageargs = [];
        if (err.parameters && err.parameters['a:string']) {
          if (__.isArray(err.parameters['a:string'])) {
            errormessageargs = err.parameters['a:string'];
          } else {
            errormessageargs = [ err.parameters['a:string'] ];
          }
          errormessageargs.unshift($(err.messagetemplate.replace(/\{.*?\}/g, '%s')));
          throw new Error(new Error(util.format.apply(util, errormessageargs)));
        }
      } else if (typeof err.message !== 'string') {
        throw new Error($('Invalid service request'));
      } else {
        throw err;
      }
    } finally {
      progress.end();
    }
  }
});

module.exports = WebsitesClient;