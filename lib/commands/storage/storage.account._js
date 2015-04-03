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

var __ = require('underscore');
var util = require('util');

var profile = require('../../util/profile');
var utils = require('../../util/utils');
var validation = require('../../util/validation');
var storageUtil = require('../../util/storage.util');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var isResourceMode = utils.readConfig().mode === 'arm';
  var storage = cli.category('storage');

  var storageAccount = storage.category('account')
    .description($('Commands to manage your Storage accounts'));

  var keys = storageAccount.category('keys')
    .description($('Commands to manage your Storage account keys'));

  var connectionString = storageAccount.category('connectionstring')
    .description($('Commands to show your Storage connection string'));

  var serviceType = { blob: 0, queue: 1, table: 2, file: 3 };

  function wrapEndpoint(uri, type) {
    if (!uri) {
      return '';
    }

    if (uri.indexOf('//') != -1 && !utils.stringStartsWith(uri, 'http://') && !utils.stringStartsWith(uri, 'https://')) {
      throw new Error($('The provided URI "' + uri + '" is not supported.'));
    }

    if (validation.isValidUri(uri)) {
      var tag;
      switch (type) {
        case serviceType.blob: tag = 'BlobEndpoint='; break;
        case serviceType.queue: tag = 'QueueEndpoint='; break;
        case serviceType.table: tag = 'TableEndpoint='; break;
        case serviceType.file: tag = 'FileEndpoint='; break;
      }
      return tag + uri + ';';
    }

    return '';
  }

  function createStorageManagementClient(subscriptionOrName, log) {
    var client;
    if(__.isString(subscriptionOrName) || !subscriptionOrName) {
      subscriptionOrName = profile.current.getSubscription(subscriptionOrName);
    }
    if (isResourceMode) {
      client = utils.createStorageResourceProviderClient(subscriptionOrName, log);
    } else {
      client = utils.createStorageClient(subscriptionOrName, log);
    }
    return client;
  }

  function validateResourceGroupName(options, _) {
    options.resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), options.resourceGroup, _);
  }

  function listAccounts(serviceClient, options, _) {
    if (isResourceMode && options.resourceGroup) {
      return serviceClient.storageAccounts.listByResourceGroup(options.resourceGroup, _).storageAccounts;
    } else {
      return serviceClient.storageAccounts.list(_).storageAccounts;
    }
  }

  function showAccount(serviceClient, accountName, options, _) {
    if (isResourceMode) {
      validateResourceGroupName(options, _);
      return serviceClient.storageAccounts.getProperties(options.resourceGroup, accountName, _).storageAccount;
    } else {
      return serviceClient.storageAccounts.get(accountName, _).storageAccount;
    }
  }

  function createAccount(serviceClient, parameters, options, _) {
     if (isResourceMode) {
      validateResourceGroupName(options, _);
      return serviceClient.storageAccounts.create(options.resourceGroup, parameters.name, parameters, _);
    } else {
      return serviceClient.storageAccounts.create(parameters, _);
    }
  }

  function updateAccount(serviceClient, accountName, parameters, options, _) {
    if (isResourceMode) {
      validateResourceGroupName(options, _);
      return serviceClient.storageAccounts.update(options.resourceGroup, accountName, parameters, _);
    } else {
      return serviceClient.storageAccounts.update(accountName, parameters, _);
    }
  }

  function deleteAccount(serviceClient, accountName, options, _) {
    if (isResourceMode) {
      validateResourceGroupName(options, _);
      return serviceClient.storageAccounts.deleteMethod(options.resourceGroup, accountName, _);
    } else {
      return serviceClient.storageAccounts.deleteMethod(accountName, _);
    }
  }

  function getAccountKeys(serviceClient, accountName, options, _) {
    if (isResourceMode) {
      validateResourceGroupName(options, _);
      return serviceClient.storageAccounts.listKeys(options.resourceGroup, accountName, _);
    } else {
      return serviceClient.storageAccounts.getKeys(accountName, _);
    }
  }

  function regenerateAccountKeys(serviceClient, accountName, options, _) {
    var keyType;
    if (isResourceMode) {
      validateResourceGroupName(options, _);
      keyType = options.primary ? 'key1' : 'key2';
      return serviceClient.storageAccounts.regenerateKeys(options.resourceGroup, accountName, keyType, _);
    } else {
      keyType = options.primary ? 'primary' : 'secondary';

      var parameters = { name: accountName, keyType: keyType };
      return serviceClient.storageAccounts.regenerateKeys(parameters, _);
    }
  }

  storageAccount.listCommand = function (options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    var storageAccounts;
    var progress = cli.interaction.progress($('Getting storage accounts'));
    try {
      storageAccounts = listAccounts(service, options, _);
    } finally {
      progress.end();
    }

    cli.interaction.formatOutput(storageAccounts, function (outputData) {
      if(outputData.length === 0) {
        log.info($('No storage accounts defined'));
      } else {
        log.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Label'), item.label ? item.properties.label : '');
          row.cell($('Location'), item.properties.location ||
            (item.properties.affinityGroup || '') +
            (item.properties.geoPrimaryRegion ? ' (' + item.properties.geoPrimaryRegion + ')' : ''));
        });
      }
    });
  };

  storageAccount.showCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    var storageAccount;
    var progress = cli.interaction.progress($('Getting storage account'));

    try {
      storageAccount = showAccount(service, name, options, _);
    } finally {
      progress.end();
    }

    if (storageAccount) {
      cli.interaction.formatOutput(storageAccount, function(outputData) {
        log.data($('Name'), outputData.name);
        log.data($('Url'), outputData.uri);

        cli.interaction.logEachData($('Account Properties'), outputData.properties);
        cli.interaction.logEachData($('Extended Properties'), outputData.extendedProperties);
        cli.interaction.logEachData($('Capabilities'), outputData.capabilities);
      });
    } else {
      log.info($('No storage account found'));
    }
  };

  storageAccount.createCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);
    var managementService = utils.createManagementClient(profile.current.getSubscription(options.subscription), log);

    var storageOptions = {
      name: name,
      label: options.label ? options.label : name
    };

    if (options.type){      
      validation.isValidEnumValue(options.type, Object.keys(storageUtil.AccountTypeForCreating));
    } else {
      options.type = cli.interaction.chooseIfNotGiven($('Account Type: '), $('Getting type'), options.type,
        function (cb) {
          cb(null, Object.keys(storageUtil.AccountTypeForCreating));
        }, _);
    }
    storageOptions.accountType = storageUtil.AccountTypeForCreating[options.type.toUpperCase()];

    if (__.isString(options.description)) {
      storageOptions.description = options.description;
    }

    if (options.affinityGroup) {
      storageOptions.affinityGroup = options.affinityGroup;
    } else {
      storageOptions.location = cli.interaction.chooseIfNotGiven($('Location: '), $('Getting locations'), options.location,
        function (cb) {
          managementService.locations.list(function (err, result) {
            if (err) { return cb(err); }

            cb(null, result.locations.map(function (location) { return location.name; }));
          });
        }, _);
    }

    var progress = cli.interaction.progress($('Creating storage account'));
    try {
      createAccount(service, storageOptions, options, _);
    } finally {
      progress.end();
    }
  };

  storageAccount.updateCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    var storageOptions = { };
    if (__.isString(options.description)) {
      storageOptions.description = options.description;
    }

    if (options.label) {
      storageOptions.label = options.label;
    }

    if (options.type){      
      validation.isValidEnumValue(options.type, Object.keys(storageUtil.AccountTypeForChanging));
      storageOptions.accountType = storageUtil.AccountTypeForChanging[options.type.toUpperCase()];
    }

    var progress = cli.interaction.progress($('Updating storage account'));
    try {
      updateAccount(service, name, storageOptions, options, _);
    } finally {
      progress.end();
    }
  };

  storageAccount.deleteCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    if (!options.quiet && !cli.interaction.confirm(util.format($('Delete storage account %s? [y/n] '), name), _)) {
      return;
    }

    var progress = cli.interaction.progress($('Deleting storage account'));
    try {
      deleteAccount(service, name, options, _);
    } finally {
      progress.end();
    }
  };

  keys.listCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    var keys;
    var progress = cli.interaction.progress($('Getting storage account keys'));
    try {
      keys = getAccountKeys(service, name, options, _);
    } finally {
      progress.end();
    }

    if (keys) {
      cli.interaction.formatOutput(keys, function(outputData) {
        log.data($('Primary'), outputData.primaryKey);
        log.data($('Secondary'), outputData.secondaryKey);
      });
    } else {
      log.info($('No storage account keys found'));
    }
  };

  keys.renewCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);

    if (!options.primary && !options.secondary) {
      throw new Error($('Need to specify either --primary or --secondary'));
    } else if (options.primary && options.secondary) {
      throw new Error($('Only one of primary or secondary keys can be renewed at a time'));
    }

    var progress = cli.interaction.progress($('Renewing storage account key'));
    try {
      keys = regenerateAccountKeys(service, name, options, _);
    } finally {
      progress.end();
    }

    if (keys) {
      cli.interaction.formatOutput(keys, function(outputData) {
        log.data($('Primary'), outputData.primaryKey || outputData.key1);
        log.data($('Secondary'), outputData.secondaryKey || outputData.key2);
      });
    } else {
      log.info($('No storage account keys found'));
    }
  };

  connectionString.showCommand = function (name, options, _) {
    var service = createStorageManagementClient(options.subscription, log);
    var keys = getAccountKeys(service, name, options, _);
    var connection = { string: '' };
    connection.string = 'DefaultEndpointsProtocol=' + (options.useHttp ? 'http;' : 'https;');
    connection.string += wrapEndpoint(options.blobEndpoint, serviceType.blob);
    connection.string += wrapEndpoint(options.queueEndpoint, serviceType.queue);
    connection.string += wrapEndpoint(options.tableEndpoint, serviceType.table);
    connection.string += wrapEndpoint(options.fileEndpoint, serviceType.file);
    connection.string += 'AccountName=' + name + ';';
    connection.string += 'AccountKey=' + keys.primaryKey;
    cli.interaction.formatOutput(connection, function (outputData) {
      log.data($('connectionstring'), outputData.string);
    });
  };

  var subscriptionOrResourceGroupOption = isResourceMode ? '--resource-group <resourceGroup>' : '-s, --subscription <id>';
  var subscriptionOrResourceGroupDescription = isResourceMode ? $('the resource group name') : $('the subscription id');
  
  // Command: azure storage account list
  storageAccount.command('list')
    .description($('List storage accounts'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .execute(storageAccount.listCommand);

  // Command: azure storage account show
  storageAccount.command('show <name>')
    .description($('Show a storage account'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .execute(storageAccount.showCommand);

  // Command: azure storage account create
  var accountCreateCommand = storageAccount.command('create <name>').description($('Create a storage account'));
  if (!isResourceMode) {
    accountCreateCommand.option('-e, --label <label>', $('the storage account label'))
      .option('-d, --description <description>', $('the storage account description'))
      .option('-a, --affinity-group <name>', $('the affinity group'));
  }
  accountCreateCommand.option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .option('-l, --location <name>', $('the location'))
    .option('--type <type>', $('the account type(LRS/ZRS/GRS/RAGRS/PLRS)'))
    .execute(storageAccount.createCommand);

  // Command: azure storage account set
  var accountSetCommand = storageAccount.command('set <name>').description($('Update a storage account'));
  if (!isResourceMode) {
    accountSetCommand.option('-e, --label <label>', $('the storage account label'))
      .option('-d, --description <description>', $('the storage account description'));
  }
  accountSetCommand.option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .option('--type <type>', $('the account type(LRS/GRS/RAGRS)'))
    .execute(storageAccount.updateCommand);

  // Command: azure storage account delete
  storageAccount.command('delete <name>')
    .description($('Delete a storage account'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(storageAccount.deleteCommand);

  // Command: azure storage account keys list
  keys.command('list <name>')
    .description($('List the keys for a storage account'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .execute(keys.listCommand);

  // Command: azure storage account keys renew
  keys.command('renew <name>')
    .description($('Renew a key for a storage account from your account'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .option('--primary', $('Update the primary key'))
    .option('--secondary', $('Update the secondary key'))
    .execute(keys.renewCommand);

  // Command: azure storage account connectionstring show
  connectionString.command('show <name>')
    .description($('Show the connection string for your account'))
    .option(subscriptionOrResourceGroupOption, subscriptionOrResourceGroupDescription)
    .option('--use-http', $('Use http as default endpoints protocol'))
    .option('--blob-endpoint <blobEndpoint>', $('the blob endpoint'))
    .option('--queue-endpoint <queueEndpoint>', $('the queue endpoint'))
    .option('--table-endpoint <tableEndpoint>', $('the table endpoint'))
    .option('--file-endpoint <fileEndpoint>', $('the file endpoint'))
    .execute(connectionString.showCommand);
};