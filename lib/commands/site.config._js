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
  var site = cli.category('site');

  var siteAppsettings = site.category('appsetting');

  var siteConfig = site.category('config')
    .description('Commands to manage your Web Site configurations (deprecated. Please use \'site appsetting\'.)');

  siteConfig.command('list [name]')
    .usage('[options] [name]')
    .description('Show your site application settings. (deprecated. This command is deprecated and will be removed in a future version. Please use \'site appsetting\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(siteAppsettings.listCommand);

  siteConfig.command('add <keyvaluepair> [name]')
    .usage('[options] <keyvaluepair> [name]')
    .description('Adds an application setting for your site (for values containing the character \';\', use quotes in the format of "\\"value\\"". e.g. SB_CONN="\\"Endpoint=sb://namespace.servicebus.windows.net/;SharedSecretIssuer=owner"\\"). (deprecated. This command is deprecated and will be removed in a future version. Please use \'site appsetting\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(siteAppsettings.addCommand);

  siteConfig.command('clear <key> [name]')
    .usage('[options] <key> [name]')
    .description('Clears an application setting for your site. (deprecated. This command is deprecated and will be removed in a future version. Please use \'site appsetting\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(siteAppsettings.deleteCommand);

  siteConfig.command('get <key> [name]')
    .usage('[options] <key> [name]')
    .description('Gets an application setting for your site. (deprecated. This command is deprecated and will be removed in a future version. Please use \'site appsetting\')')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(siteAppsettings.showCommand);
};