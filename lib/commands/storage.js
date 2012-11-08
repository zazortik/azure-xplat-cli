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

var common = require('../common');
var fs = require('fs');
var path = require('path');
var url = require('url');
var crypto = require('crypto');
var pfx2pem = require('../util/certificates/pkcs').pfx2pem;
var Channel = require('../channel');
var async = require('async');
var utils = require('../utils');
var constants = require('../constants');
var cacheUtils = require('../cacheUtils');

var linkedRevisionControl = require('../linkedrevisioncontrol');

exports.init = function (cli) {

  var log = cli.output;
  var account = cli.category('account');

  var storage = account.category('storage')
    .description('Commands to manage your Azure storage account');

  storage.command('list')
        .description('List storage accounts available for your account')
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
};
