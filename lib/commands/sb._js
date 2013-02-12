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

'use strict';

var __ = require('underscore');
var util = require('util');

var utils = require('../utils');
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
    .execute(function (options, _) {
      var service = createService(options.subscription);
      var progress = cli.progress('Enumerating namespaces');
      var namespaces = service.listNamespaces(_);
      progress.end();

      FormatOutput(namespaces, function(outputData) {
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
    });  

  sbnamespace.command('show [name]')
    .description('Get detailed information about a single Service Bus namespace')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, _) {
      name = promptIfNotGiven('Service Bus namespace: ', name, _);
      namespaceNameIsValid(name, _);
      var service = createService(options.subscription);
      var progress = cli.progress('Getting namespace');
      var namespace = service.getNamespace(name, _);
      progress.end();
      FormatOutput(namespace, function (outputData) {
        Object.keys(namespace).forEach(function (key) {
          log.data(util.format('%s: %s', key, namespace[key]));
        });
      });
    });

  sbnamespace.command('check <name>')
    .description('Check that a Service Bus namespace is legal and available')
    .option('s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, _) {
      namespaceNameIsValid(name, _);
      var service = createService(options.subscription);
      var progress = cli.progress('checking namespace ' + name);
      var result = service.verifyNamespace(name, _);
      progress.end();

      FormatOutput( { available: result }, function () {
        if (result) {
          log.data('Namespace ' + name + ' is available');
        } else {
          log.data('Namespace ' + name + ' is not available');
        }
      });
    });

  sbnamespace.command('create [namespace] [region]')
    .description('Create a new Service Bus namespace')
    .usage('[options] <namespace> <region>')
    .option('-n, --namespace <namespace>', 'name of namespace to create')
    .option('-r, --region <region>', 'Service Bus region to create namespace in')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (namespaceName, region, options, _) {
      var service = createService(options.subscription);

      var params = utils.normalizeParameters({
        namespace: [namespaceName, options.namespace],
        region: [region, options.region]
      });

      if (params.err) { throw params.err; }

      namespaceName = promptIfNotGiven("Namespace name: ", params.values.namespace, _);
      region = chooseIfNotGiven("Region: ", "Getting regions", params.values.region, 
          function (cb) {
            service.getRegions(function (err, regions) {
              if (err) { return cb(err); }
              cb(null, regions.map(function (region) { return region.Code; }));
            });
          }, _);
      var progress = cli.progress('creating namespace ' + namespaceName + ' in region ' + region);
      var createdNamespace = service.createNamespace(namespaceName, region, _);
      progress.end();
      FormatOutput(createdNamespace, function () {
        Object.keys(createdNamespace).forEach(function (key) {
          log.data(util.format('%s: %s', key, createdNamespace[key]));
        });
      });
    });

  sbnamespace.command('delete [name]')
    .description('Delete a Service Bus namespace')
    .option('-n, --namespace <name>', 'namespace to delete')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (name, options, _) {
      var service = createService(options.subscription);
      name = promptIfNotGiven("Namespace to delete: ", name, _);
      var progress = cli.progress('deleting namespace ' + name);
      service.deleteNamespace(name, _);
    });
    
  var location = sbnamespace.category('location')
    .description('Commands for Service Bus locations');

  location.list = location.command('list')
    .description('Show list of available Service Bus locations')
    .option('-s, --subscription <id>', 'use the subscription id')
    .execute(function (options, _) {
      var service = createService(options.subscription);
      var progress = cli.progress('Getting locations');
      var regions = service.getRegions(_);
      progress.end();
      FormatOutput(regions, function (outputData) {
        log.table(outputData, function (row, region) {
          row.cell('Name', region.FullName);
          row.cell('Code', region.Code);
        });
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

  function FormatOutput(outputData, humanOutputGenerator) {
    log.json('silly', outputData);
    if(log.format().json) {
      log.json(outputData);
    } else {
      humanOutputGenerator(outputData);
    }
  }

  function prompt(msg, callback) {
    cli.prompt(msg, function (result) { 
      callback(null, result);
    });
  }

  function choose(values, callback) {
    cli.choose(values, function(value) {
      callback(null, value);
    });
  }

  function promptIfNotGiven(promptString, currentValue, _) {
    if (__.isUndefined(currentValue)) {
      var value = prompt(promptString, _);
      return value;
    } else {
      return currentValue;
    }
  }

  function chooseIfNotGiven(promptString, progressString, currentValue, valueProvider, _) {
    if (__.isUndefined(currentValue)) {
      var progress = cli.progress(progressString);
      var values = valueProvider(_);
      progress.end();

      log.help(promptString);
      var i = choose(values, _);
      return values[i];
    } else {
      return currentValue;
    }
  }
};
