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
var path = require('path');
var url = require('url');
var crypto = require('crypto');
var pfx2pem = require('../util/certificates/pkcs').pfx2pem;
var Channel = require('../channel');
var async = require('async');
var utils = require('../utils');
var cacheUtils = require('../cacheUtils');

var linkedRevisionControl = require('../util/git/linkedrevisioncontrol');

exports.init = function (cli) {

  var log = cli.output;
  var account = cli.category('account');

  var storage = account.category('storage')
    .description('Commands to manage your Azure storage account');

  var keys = storage.category('keys')
    .description('Commands to manage your Azure storage account keys');

  storage.command('list')
    .description('List storage accounts')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var progress = cli.progress('Fetching storage accounts');
      utils.doServiceManagementOperation(channel, 'listStorageAccounts', function (error, response) {
        progress.end();
        if (!error) {
          if (response.body.length > 0) {
            log.table(response.body, function (row, item) {
              row.cell('Name', item.ServiceName);
              var storageServiceProperties = item.StorageServiceProperties;
              if ('Label' in storageServiceProperties) {
                row.cell('Label', Buffer(storageServiceProperties.Label, 'base64').toString());
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
              log.info('No storage accounts found');
            }
          }
        }

        callback(error);
      });
    });


  storage.command('show <name>')
    .description('Shows a storage account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var progress = cli.progress('Fetching storage account');
      utils.doServiceManagementOperation(channel, 'getStorageAccountProperties', name, function (error, response) {
        progress.end();
        if (!error) {
          if (response.body.StorageServiceProperties) {
            if (log.format().json) {
              log.json(clean(response.body));
            } else {
              log.data('Name',  clean(response.body.ServiceName));
              log.data('Url',  clean(response.body.Url));
              logEachData('Account Properties',  clean(response.body.StorageServiceProperties));
              logEachData('Extended Properties',  clean(response.body.ExtendedProperties));
              logEachData('Capabilities',  clean(response.body.Capabilities));
              }
          } else {
            log.info('No storage account found');
          }
        }

        callback(error);
      });
    });

  storage.command('create <name>')
    .description('Creates a storage account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('--label <label>', 'The label')
    .option('--accountDescription <accountDescription>', 'The description')
    .option('--location <location>', 'The location')
    .option('--affinityGroup <affinityGroup>', 'The affinity group')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var storageOptions = {
        Location: options.location,
        AffinityGroup: options.AffinityGroup,
        Description: options.accountDescription,
        Label: options.label
      };

      var progress = cli.progress('Creating storage account');
      utils.doServiceManagementOperation(channel, 'createStorageAccount', name, storageOptions, function (error, response) {
        progress.end();

        callback(error);
      });
    });

  storage.command('update <name>')
    .description('Updates a storage account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('--label <label>', 'The label')
    .option('--accountDescription <accountDescription>', 'The description')
    .option('--geoReplicationEnabled <geoReplicationEnabled>', 'Indicates if the geo replication is enabled')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var storageOptions = {
        Description: options.accountDescription,
        Label: options.label,
        GeoReplicationEnabled: options.geoReplicationEnabled
      };

      var progress = cli.progress('Updating storage account');
      utils.doServiceManagementOperation(channel, 'updateStorageAccount', name, storageOptions, function (error, response) {
        progress.end();

        callback(error);
      });
    });

  storage.command('delete <name>')
    .description('Deletes a storage account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var progress = cli.progress('Deleting storage account');
      utils.doServiceManagementOperation(channel, 'deleteStorageAccount', name, function (error, response) {
        progress.end();

        callback(error);
      });
    });

  keys.command('list <name>')
    .description('Lists the keys for a storage account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      var progress = cli.progress('Getting storage account keys');
      utils.doServiceManagementOperation(channel, 'getStorageAccountKeys', name, function (error, response) {
        progress.end();

        if (!error) {
          if (response.body.StorageServiceKeys) {
            if (log.format().json) {
              log.json(response.body.StorageServiceKeys);
            } else {
              log.data('Primary: ', response.body.StorageServiceKeys.Primary);
              log.data('Secondary: ', response.body.StorageServiceKeys.Secondary);
            }
          } else {
            log.info('No storage account keys found');
          }
        }

        callback(error);
      });
    });

  keys.command('renew <name>')
    .description('Renews a key for a storage account from your account')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('--primary', 'update the primary key')
    .option('--secondary', 'update the secondary key')
    .execute(function (name, options, callback) {
      var channel = utils.createServiceManagementService(cli.category('account').lookupSubscriptionId(options.subscription),
          cli.category('account'), log);

      if (!options.primary && !options.secondary) {
        throw new Error('Need to specify either --primary or --secondary');
      }

      var type = options.primary ? 'primary' : 'secondary';

      var progress = cli.progress('Renewing storage account key');
      utils.doServiceManagementOperation(channel, 'regenerateStorageAccountKeys', name, type, function (error, response) {
        progress.end();

        callback(error);
      });
    });

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
