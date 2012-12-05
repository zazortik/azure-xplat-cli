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

var serviceBusManagement = require('../serviceBusManagement');
var ServiceBusManagementService = serviceBusManagement.ServiceBusManagementService;
var namespaceNameIsValid = serviceBusManagement.namespaceNameIsValid;

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
      var service = createService(options.subscription);
      var progress = cli.progress('Enumerating namespaces');
      service.listNamespaces(function (err, namespaces) {
        progress.end();
        formatOutput(err, namespaces, function(outputData) {
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
        callback(err, namespaces);
      });
    });  

  sbnamespace.command('show <name>')
    .description('Get detailed information about a single Service Bus namespace')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      namespaceNameIsValid(name);
      var service = createService(options.subscription);
      var progress = cli.progress('Getting namespace');
      service.getNamespace(name, function (err, namespace) {
        progress.end();
        formatOutput(err, namespace, function (outputData) {
          Object.keys(namespace).forEach(function (key) {
            log.data(util.format('%s: %s', key, namespace[key]));
          });
        });
        callback(err);
      });
    });

  sbnamespace.command('verify <name>')
    .description('Verify that a Service Bus namespace is legal and available')
    .option('s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, callback) {
      namespaceNameIsValid(name);
      var service = createService(options.subscription);
      var progress = cli.progress('verifying namespace');
      service.verifyNamespace(name, function (err, result) {
        progress.end();
        formatOutput(err, { available: result }, function () {
          if (result) {
            log.data('Namespace ' + name + ' is available');
          } else {
            log.data('Namespace ' + name + ' is not available');
          }
        });
        callback(null, result);
      });
    });

  var location = sbnamespace.category('location')
    .description('Commands for Service Bus locations');

  location.list = location.command('list')
    .description('Show list of available Service Bus locations')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, callback) {
      var service = createService(options.subscription);
      var progress = cli.progress('Getting locations');
      service.getRegions(function (err, regions) {
        progress.end();
        formatOutput(err, regions, function (outputData) {
          log.table(outputData, function (row, region) {
            row.cell('Name', region.FullName);
            row.cell('Code', region.Code);
          });
        });
        callback(err);
      });
    });

  function createService(subscription) {
    var account = cli.category('account');
    var subscriptionId = account.lookupSubscriptionId(subscription);
    var pem = account.managementCertificate();
    var auth = {
      keyvalue: pem.key,
      certvalue: pem.cert
    };

    return new ServiceBusManagementService(subscriptionId, auth);
  }

  function formatOutput(err, outputData, humanOutputGenerator) {
    if (err) return;
    log.json('silly', outputData);
    if(log.format().json) {
      log.json(outputData);
    } else {
      humanOutputGenerator(outputData);
    }
  }
};
