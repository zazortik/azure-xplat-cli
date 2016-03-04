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
var batchUtil = require('./batch.util');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var batch = cli.category('batch')
    .description($('Commands to manage your Batch objects'));

  var batchAccount = batch.category('account')
    .description($('Commands to manage your Batch accounts'));

  var keys = batchAccount.category('keys')
    .description($('Commands to manage your Batch account keys'));

  var usage = {};
  usage = batchAccount.category('usage')
    .description($('Commands to manage your Batch accounts usage'));

  function showProgress(message) {
    return cli.interaction.progress(message);
  }

  function endProgress(progress)
  {
    if (progress) {
      progress.end();
    }
  }

  function validateResourceGroupName(options, _) {
    options.resourceGroup = cli.interaction.promptIfNotGiven($('Resource group name: '), options.resourceGroup, _);
  }

  function listAccounts(serviceClient, options, _) {
    var progress = showProgress($('Getting batch accounts'));
    var batchAccounts;
    try {
      if(options.resourceGroup){
          batchAccounts = __.toArray(serviceClient.account.listByResourceGroup(options.resourceGroup, _));
      }
      else{
          batchAccounts = __.toArray(serviceClient.account.list(_));
      }
    } finally {
      endProgress(progress);
    }

    return batchAccounts;
  }

  function showAccount(serviceClient, accountName, options, _) {
    var progress;
    var message = $('Getting batch account');
    var batchAccount;
    try {
      validateResourceGroupName(options, _);
      progress = showProgress(message);
      batchAccount = serviceClient.account.get(options.resourceGroup, accountName, _);
    } finally {
      endProgress(progress);
    }

    return batchAccount;
  }

  function createAccount(serviceClient, parameters, options, _) {
    var progress;
    var message = $('Creating batch account');
    var batchAccount;
    
    try {
      validateResourceGroupName(options, _);
      progress = showProgress(message);
      batchAccount = serviceClient.account.create(options.resourceGroup, parameters.name, parameters, _);
    } finally {
      endProgress(progress);
    }

    return batchAccount;
  }

  function showSubscriptionUsage(serviceClient, subscriptionId, _) {
    var progress;
    var message = $('Showing the subscription usage');
    var usage = { subscription: subscriptionId };

    if(!subscriptionId) {
      usage.subscriptionId = profile.current.getSubscription().id;
    }

    try {
      progress = showProgress(message);
      var usageList = serviceClient.usageOperations.list(_);
      for (var i = 0; i < usageList.length; i++) {
        if (usageList[i].name.value === 'BatchAccounts') {
          usage.used = usageList[i].currentValue;
          usage.limit = usageList[i].limit;
          break;
        }
      }
    } finally {
      endProgress(progress);
    }

    return usage;
  }

  function getAccountKeys(serviceClient, accountName, options, _) {
    var progress;
    var message = $('Getting batch account keys');
    var keys;
    
    try {
      validateResourceGroupName(options, _);
      progress = showProgress(message);
      keys = serviceClient.account.listKeys(options.resourceGroup, accountName, _);
    } finally {
      endProgress(progress);
    }

    return keys;
  }

  function regenerateAccountKeys(serviceClient, accountName, options, _) {
    var progress;
    var message = $('Renewing batch account key');
    var keys;

    try {
      var keyType;
      validateResourceGroupName(options, _);
      progress = showProgress(message);
      keyType = options.primary ? 'Primary' : 'Secondary';
      keys = serviceClient.account.regenerateKey(options.resourceGroup, accountName, keyType, _);
    } finally {
      endProgress(progress);
    }

    return keys;
  }

  function parseResourceGroupNameFromId(id) {
    if (!id) { return ''; }
    var keyword = '/resourceGroups/';
    var startIndex = id.indexOf(keyword) + keyword.length;
    var endIndex = id.indexOf('/', startIndex);
    return id.substring(startIndex, endIndex); 
  }

  batchAccount.listCommand = function (options, _) {
    var service = batchUtil.createBatchManagementClient(options.subscription);

    var batchAccounts = listAccounts(service, options, _);

    batchAccounts.forEach(function(batchAccount) {
     batchAccount.resourceGroup = parseResourceGroupNameFromId(batchAccount.id);
    });

    cli.interaction.formatOutput(batchAccounts, function (outputData) {
      if(outputData.length === 0) {
        log.info($('No batch accounts defined'));
      } else {
        log.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('Resource Group'), item.resourceGroup);
        });
      }
    });
  };

  batchAccount.showCommand = function (name, options, _) {
    var service = batchUtil.createBatchManagementClient(options.subscription);

    var batchAccount = showAccount(service, name, options, _);

    if (batchAccount) {
      batchAccount.resourceGroup = parseResourceGroupNameFromId(batchAccount.id);
      cli.interaction.formatOutput(batchAccount, function(outputData) {
        log.data($('Name:'), outputData.name);
        log.data($('Url:'), outputData.id);
        log.data($('Resource Group:'), outputData.resourceGroup);
        log.data($('Location:'), outputData.location);
		log.data($('Endpoint:'), outputData.properties.accountEndpoint);
        log.data($('Provisioning State:'), outputData.properties.provisioningState);
        log.data($('Auto Storage:'), outputData.properties.autoStorage);
        log.data($('Core Qutoa:'), outputData.properties.coreQuota);
        log.data($('Pool Qutoa:'), outputData.properties.poolQuota);
        log.data($('Active Job and Job scheduler Quota:'), outputData.properties.activeJobAndJobScheduleQuota);
        if (outputData.tags) {
          cli.interaction.logEachData($('Tags:'), outputData.tags);
        }
      });
    } else {
      log.info($('No batch account found'));
    }
  };

  batchAccount.createCommand = function (name, options, _) {
    var service = batchUtil.createBatchManagementClient(options.subscription);
    var managementService = utils.createManagementClient(profile.current.getSubscription(options.subscription), log);

    var batchOptions = {
      name: name,
      label: options.label ? options.label : name
    };

    if (options.type) {      
      validation.isValidEnumValue(options.type, Object.keys(batchUtil.AccountTypeForCreating));
    } else {
      options.type = cli.interaction.chooseIfNotGiven($('Account Type: '), $('Getting type'), options.type,
        function (cb) {
          cb(null, Object.keys(batchUtil.AccountTypeForCreating));
        }, _);
    }
    batchOptions.accountType = batchUtil.AccountTypeForCreating[options.type.toUpperCase()];

    if (__.isString(options.description)) {
      batchOptions.description = options.description;
    }

    if (options.affinityGroup) {
      batchOptions.affinityGroup = options.affinityGroup;
    } else {
      batchOptions.location = cli.interaction.chooseIfNotGiven($('Location: '), $('Getting locations'), options.location,
        function (cb) {
          managementService.locations.list(function (err, result) {
            if (err) { return cb(err); }

            cb(null, result.locations.map(function (location) { return location.name; }));
          });
        }, _);
    }

    if (options.tags) {
      batchOptions.tags = batchUtil.parseKvParameterInvariant(options.tags);
    }

    createAccount(service, batchOptions, options, _);
  };

  usage.usageCommand = function (subscription, options, _) {
    var service = batchUtil.createBatchManagementClient(subscription);
    var usage = showSubscriptionUsage(service, subscription, _);

    cli.interaction.formatOutput(usage, function(outputData) {
      log.data($('Subscription:'), outputData.subscriptionId);
      log.data($('Used:'), outputData.used);
      log.data($('Limit:'), outputData.limit);
    });
  };

  keys.listCommand = function (name, options, _) {
    var service = batchUtil.createBatchManagementClient(options.subscription);

    var keys = getAccountKeys(service, name, options, _);

    if (keys) {
      cli.interaction.formatOutput(keys, function(outputData) {
        log.data($('Primary:'), outputData.primary);
        log.data($('Secondary:'), outputData.secondary);
      });
    } else {
      log.info($('No batch account keys found'));
    }
  };
  
  keys.renewCommand = function (name, options, _) {
    var service = batchUtil.createBatchManagementClient(options.subscription);

    if (!options.primary && !options.secondary) {
      throw new Error($('Need to specify either --primary or --secondary'));
    } else if (options.primary && options.secondary) {
      throw new Error($('Only one of primary or secondary keys can be renewed at a time'));
    }

    var keys = regenerateAccountKeys(service, name, options, _);

    if (keys) {
      cli.interaction.formatOutput(keys, function(outputData) {
        log.data($('Primary:'), outputData.primary);
        log.data($('Secondary:'), outputData.secondary);
      });
    } else {
      log.info($('No storage account keys found'));
    }
  };

  Object.getPrototypeOf(batch).appendSubscriptionAndResourceGroupOption = function () {
    this.option('-g, --resource-group <resourceGroup>', $('the resource group name'));
    this.option('-s, --subscription <id>', $('the subscription id'));
    return this;
  };

  // Command: azure batch account list
  batchAccount.command('list')
    .description($('List batch accounts'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(batchAccount.listCommand);

  // Command: azure batch account show
  batchAccount.command('show <name>')
    .description($('Show a batch account'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(batchAccount.showCommand);

  // Command: azure batch account create
  var accountCreateCommand = batchAccount.command('create <name>').description($('Create a batch account'));
  accountCreateCommand.option('--tags <tags>', $('the account tags. Tags are key=value pairs and separated with semicolon(;)'));
  accountCreateCommand.option('-l, --location <location>', $('the location'))
    .option('--type <type>', $('the account type(LRS/ZRS/GRS/RAGRS/PLRS)'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(batchAccount.createCommand);

  // Command: azure batch account set
  var accountSetCommand;
  accountSetCommand = batchAccount.command('set <name>').description($('Update a batch account (Only one property can be updated at a time)'))
    .option('--custom-domain <customDomain>', $('the custom domain'))
    .option('--subdomain', $('whether uses the \'asverify\' subdomain to preregister the custom domain'))
    .option('--tags <tags>', $('the account tags. Tags are key=value pairs and separated with semicolon(;)'));
  accountSetCommand.option('--type <type>', $('the account type(LRS/GRS/RAGRS)'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(batchAccount.updateCommand);

  // Command: azure batch account delete
  batchAccount.command('delete <name>')
    .description($('Delete a batch account'))
    .appendSubscriptionAndResourceGroupOption()
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .execute(batchAccount.deleteCommand);

  batchAccount.command('check <name>')
    .description($('Check whether the account name is valid and is not in use.'))
    .execute(batchAccount.checkCommand);

  usage.command('show [subscription]')
    .description($('Show the current count and the limit of the batch accounts under the subscription.'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(usage.usageCommand);

  // Command: azure batch account keys list
  keys.command('list <name>')
    .description($('List the keys for a batch account'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(keys.listCommand);

  // Command: azure batch account keys renew
  keys.command('renew <name>')
    .description($('Renew a key for a batch account from your account'))
    .option('--primary', $('Update the primary key'))
    .option('--secondary', $('Update the secondary key'))
    .appendSubscriptionAndResourceGroupOption()
    .execute(keys.renewCommand);
};