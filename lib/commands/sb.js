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

var _ = require('underscore');
var util = require('util');

var ServiceBusManagementService = require('../serviceBusManagement').ServiceBusManagementService;

exports.init = function (cli) {
  var log = cli.output;

  var sb = cli.category('sb')
    .description('Commands to manage your Service Bus configuration');

  var sbnamespace = sb.category('namespace')
    .description('Commands to manage your Service Bus namespaces');

  sbnamespace.command('list')
    .description('List currently defined Service Bus namespaces')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, callback) {
      var account = cli.category('account');

      var subscriptionId = account.lookupSubscriptionId(options.subscription);

      var service = createService(subscriptionId);
      var progress = cli.progress('Enumerating namespaces');
      service.listNamespaces(function (err, namespaces) {
        progress.end();
        if (err) {
          return callback(err);
        }
        log.json('silly', namespaces);
        formatOutput(namespaces, function(outputData) {
          if(outputData.length === 0) {
            log.info('No namespaces defined');
          } else {
            log.table(outputData, function (row, ns) {
              row.cell('Name', ns.Name);
              row.cell('Region', ns.Region);
              row.cell('Status', ns.Status);
            });
          }
        });
        callback(null, namespaces);
      });
    });  

  sbnamespace.command('show <name>')
    .description('Get detailed information about a single Service Bus namespace')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      var account = cli.category('account');
      var subscriptionId = account.lookupSubscriptionId(options.subscription);

      var service = createService(subscriptionId);
      var progress = cli.progress('Getting namespace');
      service.getNamespace(name, function (err, namespace) {
        progress.end();
        if (err) {
          return callback(err);
        }
        log.json('silly', namespace);
        formatOutput(namespace, function (outputData) {
          Object.keys(namespace).forEach(function (key) {
            log.data(util.format('%s: %s', key, namespace[key]));
          });
        });
        callback();
      });
    });

  function createService(subscriptionId) {
    var account = cli.category('account');
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return new ServiceBusManagementService(subscriptionId, auth);
  }

  function formatOutput(outputData, humanOutputGenerator) {
    if(log.format().json) {
      log.json(outputData);
    } else {
      humanOutputGenerator(outputData);
    }
  }
};
