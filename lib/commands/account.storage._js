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

exports.init = function (cli) {
  var account = cli.category('account');

  var storageAccount = cli.category('storage').category('account');
  var storageAccountKeys = storageAccount.category('keys');

  var storage = account.category('storage')
    .description('Commands to manage your Storage accounts (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')');

  var keys = storage.category('keys')
    .description('Commands to manage your Storage account keys (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account keys\')');

  storage.command('list')
    .description('List storage accounts (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(storageAccount.listCommand);


  storage.command('show <name>')
    .description('Shows a storage account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(storageAccount.showCommand);

  storage.command('create <name>')
    .description('Creates a storage account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('-e, --label <label>', 'storage account label')
    .option('-d, --description <description>', 'storage account description')
    .option('-l, --location <name>', 'location of the data center')
    .option('-a, --affinity-group <name>', 'affinity group')
    .execute(storageAccount.createCommand);

  storage.command('update <name>')
    .description('Updates a storage account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('-e, --label <label>', 'storage account label')
    .option('-d, --description <description>', 'storage account description')
    .option('--geoReplicationEnabled <geoReplicationEnabled>', 'Indicates if the geo replication is enabled')
    .execute(storageAccount.updateCommand);

  storage.command('delete <name>')
    .description('Deletes a storage account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account\')')
    .option('-q, --quiet', 'quiet mode, do not ask for delete confirmation')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(storageAccount.deleteCommand);

  keys.command('list <name>')
    .description('Lists the keys for a storage account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account keys\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(storageAccountKeys.listCommand);

  keys.command('renew <name>')
    .description('Renews a key for a storage account from your account (deprecated. This command is deprecated and will be removed in a future version. Please use \'storage account keys\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .option('--primary', 'update the primary key')
    .option('--secondary', 'update the secondary key')
    .execute(storageAccountKeys.renewCommand);
};