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

var util = require('util');

var _ = require('underscore');

var utils = require('../../util/utils');

function WebsitesClient(cli, subscription) {
  this.cli = cli;
  this.subscription = subscription;
}

_.extend(WebsitesClient.prototype, {
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
              throw new Error('Invalid trace output');
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
          self.cli.output.error('Repository is not setup');
          callback(new Error('Repository is not setup'));
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

  getDiagnosticsSettings: function (context, callback) {
    var self = this;

    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, self.cli.output);

    var progress = self.cli.interaction.progress('Getting diagnostic settings');
    service.getDiagnosticsSettings(function (err, result) {
      progress.end();

      callback(err, result);
    });
  },

  updateDiagnosticsSettings: function (context, settings, callback) {
    var self = this;

    var service = utils.createScmManagementService(context.repositoryUri, context.repositoryAuth, self.cli.output);

    var progress = self.cli.interaction.progress('Updating diagnostic settings');
    service.updateDiagnosticsSettings(settings, function (err) {
      progress.end();

      callback(err);
    });
  },

  createStorageClient: function() {
    return utils._createStorageClient(this.cli.category('account').getCurrentSubscription(this.subscription), this.cli.output);
  }
});

module.exports = WebsitesClient;