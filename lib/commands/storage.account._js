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

var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var storage = cli.category('storage');

  var storageAccount = storage.category('account')
    .description($('Commands to manage your Storage accounts'));

  var keys = storageAccount.category('keys')
    .description($('Commands to manage your Storage account keys'));

  storageAccount.listCommand = function (options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var progress = cli.interaction.progress($('Getting storage accounts'));
      utils.doServiceManagementOperation(channel, 'listStorageAccounts', function (error, response) {
        progress.end();
        if (!error) {
          if (response.body.length > 0) {
            log.table(response.body, function (row, item) {
              row.cell('Name', item.ServiceName);
              var storageServiceProperties = item.StorageServiceProperties;
              if ('Label' in storageServiceProperties) {
                row.cell('Label', new Buffer(storageServiceProperties.Label, 'base64').toString());
              }
              // This will display affinity group GUID and GeoPrimaryLocation (if present) if Location is not present
              // Affinity group or location display name is not present in the data
              row.cell('Location', storageServiceProperties.Location ||
                  (storageServiceProperties.AffinityGroup || '') +
                  (storageServiceProperties.GeoPrimaryRegion ? ' (' + storageServiceProperties.GeoPrimaryRegion + ')' : ''));
            });
          } else {
            if (log.format().json) {
              log.json([]);
            } else {
              log.info($('No storage accounts found'));
            }
          }
        }

        callback(error);
      });
    };

  storageAccount.showCommand = function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var progress = cli.interaction.progress($('Getting storage account'));
      utils.doServiceManagementOperation(channel, 'getStorageAccountProperties', name, function (error, response) {
        progress.end();
        if (!error) {
          if (response.body.StorageServiceProperties) {
            if (log.format().json) {
              log.json(clean(response.body));
            } else {
              log.data($('Name'),  clean(response.body.ServiceName));
              log.data($('Url'),  clean(response.body.Url));
              logEachData($('Account Properties'),  clean(response.body.StorageServiceProperties));
              logEachData($('Extended Properties'),  clean(response.body.ExtendedProperties));
              logEachData($('Capabilities'),  clean(response.body.Capabilities));
            }
          } else {
            log.info($('No storage account found'));
          }
        }

        callback(error);
      });
    };

  storageAccount.createCommand = function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var storageOptions = {
        Location: options.location,
        AffinityGroup: options.affinityGroup,
        Description: (typeof options.description === 'string' ? options.description : undefined),
        Label: options.label
      };

      var progress = cli.interaction.progress($('Creating storage account'));
      utils.doServiceManagementOperation(channel, 'createStorageAccount', name, storageOptions, function (error) {
        progress.end();

        callback(error);
      });
    };

  storageAccount.updateCommand = function (name, options, _) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var storageOptions = {
        Description: (typeof options.description === 'string' ? options.description : undefined),
        Label: options.label,
        GeoReplicationEnabled: options.geoReplicationEnabled
      };

      var progress = cli.interaction.progress($('Updating storage account'));
      try {
        utils.doServiceManagementOperation(channel, 'updateStorageAccount', name, storageOptions, _);
      } finally {
        progress.end();
      }
    };

  storageAccount.deleteCommand = function (name, options, _) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete storage account %s? [y/n] '), name), _)) {
        return;
      }

      var progress = cli.interaction.progress($('Deleting storage account'));
      try {
        utils.doServiceManagementOperation(channel, 'deleteStorageAccount', name, _);
      } finally {
        progress.end();
      }
    };

  keys.listCommand = function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      var progress = cli.interaction.progress($('Getting storage account keys'));
      utils.doServiceManagementOperation(channel, 'getStorageAccountKeys', name, function (error, response) {
        progress.end();

        if (!error) {
          if (response.body.StorageServiceKeys) {
            if (log.format().json) {
              log.json(response.body.StorageServiceKeys);
            } else {
              log.data($('Primary: '), response.body.StorageServiceKeys.Primary);
              log.data($('Secondary: '), response.body.StorageServiceKeys.Secondary);
            }
          } else {
            log.info($('No storage account keys found'));
          }
        }

        callback(error);
      });
    };

  keys.renewCommand = function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').getCurrentSubscription(options.subscription), log);

      if (!options.primary && !options.secondary) {
        throw new Error($('Need to specify either --primary or --secondary'));
      }

      var type = options.primary ? 'primary' : 'secondary';

      var progress = cli.interaction.progress($('Renewing storage account key'));
      utils.doServiceManagementOperation(channel, 'regenerateStorageAccountKeys', name, type, function (error) {
        progress.end();

        callback(error);
      });
    };

  storageAccount.command('list')
    .description($('List storage accounts'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(storageAccount.listCommand);

  storageAccount.command('show <name>')
    .description($('Show a storage account'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(storageAccount.showCommand);

  storageAccount.command('create <name>')
    .description($('Create a storage account'))
    .option('-e, --label <label>', $('the storage account label'))
    .option('-d, --description <description>', $('the storage account description'))
    .option('-l, --location <name>', $('the location of the data center'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(storageAccount.createCommand);

  storageAccount.command('set <name>')
    .description($('Update a storage account'))
    .option('-e, --label <label>', $('the storage account label'))
    .option('-d, --description <description>', $('the storage account description'))
    .option('--geoReplicationEnabled <geoReplicationEnabled>', $('indicates if the geo replication is enabled'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(storageAccount.updateCommand);

  storageAccount.command('delete <name>')
    .description($('Delete a storage account'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(storageAccount.deleteCommand);

  keys.command('list <name>')
    .description($('List the keys for a storage account'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(keys.listCommand);

  keys.command('renew <name>')
    .description($('Renew a key for a storage account from your account'))
    .option('--primary', $('Update the primary key'))
    .option('--secondary', $('Update the secondary key'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(keys.renewCommand);

  function clean(source) {
    if (typeof (source) === 'string') {
      return source;
    }

    var target = {};
    var hasString = false;
    var hasNonString = false;
    var stringValue = '';

    for (var prop in source) {
      if (prop == '@') {
        continue;
      } else {
        if (prop === '#' || prop === 'string' || prop.substring(prop.length - 7) === ':string') {
          hasString = true;
          stringValue = source[prop];
        } else {
          hasNonString = true;
        }
        target[prop] = clean(source[prop]);
      }
    }
    if (hasString && !hasNonString) {
      return stringValue;
    }
    return target;
  }

  function logEachData(title, data) {
    var cleaned = clean(data);
    for (var property in cleaned) {
      log.data(title + ' ' + property, cleaned[property]);
    }
  }
  storage.logEachData = logEachData;
};