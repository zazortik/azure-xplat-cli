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

var utils = require('../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var account = cli.category('account');

  var storageAccount = cli.category('storage')
    .category('account');
  var storageAccountKeys = storageAccount.category('keys');

  var storage = account.category('storage')
    .deprecatedDescription($('Commands to manage your Storage accounts'), 'storage account');

  var keys = storage.category('keys')
    .deprecatedDescription($('Commands to manage your Storage account keys'), 'storage account keys');

  storage.command('list')
    .deprecatedDescription($('List storage accounts'), 'storage account')
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccount.listCommand.apply(storageAccount, arguments);
    });

  storage.command('show <name>')
    .deprecatedDescription($('Show a storage account'), 'storage account')
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccount.showCommand.apply(storageAccount, arguments);
    });

  storage.command('create <name>')
    .deprecatedDescription($('Create a storage account'), 'storage account')
    .option('-e, --label <label>', $('the storage account label'))
    .option('-d, --description <description>', $('the storage account description'))
    .option('-l, --location <name>',$('The data center location'))
    .option('-a, --affinity-group <name>', $('the affinity group'))
    .option('--geoReplication', $('indicates if the geo replication is enabled'))
    .option('--disable-geoReplication', $('indicates if the geo replication is disabled'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccount.createCommand.apply(storageAccount, arguments);
    });

  storage.command('update <name>')
    .deprecatedDescription($('Update a storage account'), 'storage account')
    .option('-e, --label <label>', $('the storage account label'))
    .option('-d, --description <description>', $('the storage account description'))
    .option('--geoReplication', $('indicates if the geo replication is enabled'))
    .option('--disable-geoReplication', $('indicates if the geo replication is disabled'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccount.updateCommand.apply(storageAccount, arguments);
    });

  storage.command('delete <name>')
    .deprecatedDescription($('Delete a storage account'), 'storage account')
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccount.deleteCommand.apply(storageAccount, arguments);
    });

  keys.command('list <name>')
    .deprecatedDescription($('List the keys for a storage account'), 'storage account keys')
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccountKeys.listCommand.apply(storageAccountKeys, arguments);
    });

  keys.command('renew <name>')
    .deprecatedDescription($('Renew a key for a storage account from your account'), 'storage account keys')
    .option('--primary', $('indicates if the primary key should be updated'))
    .option('--secondary', $('indicates if the secondary key should be updated'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function () {
      storageAccountKeys.renewCommand.apply(storageAccountKeys, arguments);
    });
};