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

/*
* You can test webapp commands get loaded by xplat by following steps:
* a. Copy the folder to '<repository root>\lib\commands\arm'
* b. Under <repository root>, run 'node bin/azure config mode arm'
* c. Run 'node bin/azure', you should see 'appserviceplan' listed as a command set
* d. Run 'node bin/azure', you should see 'create', "delete", etc 
      showing up in the help text 
*/

'use strict';

var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var appserviceplanUtils = require('./appserviceplanUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var appserviceplan = cli.category('appserviceplan')
    .description($('Commands to manage your Azure appserviceplans'));

  appserviceplan.command('create [resource-group] [name] [location] [sku] [numberOfWorkers] [workerSize]')
    .description($('Create an appserviceplan'))
    .usage('[options] <resource-group> <name> <location> <sku> <number-of-workers> <worker-size>')
    .option('-g --resource-group <resource-group>', $('Name of the resource group'))
    .option('-n --name <name>', $('the name of the appserviceplan to create'))
    .option('-l --location <location>', $('the geographic region to create the appserviceplan'))
    .option('-k --sku <sku>', $('the sku of the appserviceplan eg: Basic.'))
    .option('-w --workers <numberOfWorkers>', $('the number of workers in the appserviceplan'))
    .option('-z --workersize <workerSize>', $('the size of workers in the appserviceplan'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, location, sku, numberOfWorkers, workerSize, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!location) {
        return cli.missingArgument('location');
      }
      if (!sku) {
        return cli.missingArgument('sku');
      }
      if (!numberOfWorkers) {
        return cli.missingArgument('numberOfWorkers');
      }
      if (!workerSize) {
        return cli.missingArgument('workerSize');
      }
      var progress = cli.interaction.progress(util.format($('Creating appserviceplan %s'), name));
      var parameters = {
        webHostingPlan: {
          name: name,
          location: location,
          properties: {
            sku: sku,
            numberOfWorkers: numberOfWorkers,
            workerSize: workerSize
          }
        }
      };
      
      log.info('---' + JSON.stringify(parameters));
      var result;
      try {
        result = client.webHostingPlans.createOrUpdate(resourceGroup, parameters, _);
      } finally {
        progress.end();
      }
      log.info('appserviceplan ' + name + ' has been created ');
    });

  appserviceplan.command('delete [resource-group] [name]')
    .description($('Delete a appserviceplan'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('Name of the resource group'))
    .option('-n --name <name>', $('the name of the appserviceplan to delete'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!options.quiet) {
        if (!cli.interaction.confirm(util.format('Delete appserviceplan %s? [y/n] ', name), _)) {
          return;
        }
      }
      var progress = cli.interaction.progress(util.format($('Deleting appserviceplan %s'), name));
      var result;
      try {
        result = client.webHostingPlans.deleteMethod(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      log.info(util.format($('appserviceplan %s has been deleted'), name));
    });

  appserviceplan.command('list [resource-group]')
    .description($('List your appserviceplans'))
    .usage('[options] <resource-group>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
	  .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Listing appserviceplans'));
      var name;
      var result;
      try {
        result = client.webHostingPlans.list(resourceGroup, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.webHostingPlans, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name '), item.name);
            row.cell($('Location '), item.location);
            row.cell($('SKU '), item.properties.sku);
            row.cell($('Number Of Workers '), item.properties.numberOfWorkers);
            row.cell($('Worker Size '), item.properties.workerSize);
          });
        } else {
          log.info(util.format($('No app service plans found.')));
        }
      });
    });

  appserviceplan.command('show [resource-group] [name]')
    .description($('Get an appserviceplan'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the appserviceplan to show'))
    .option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Getting appserviceplan'));
      var getProp;
      var result;
      try {
        result = client.webHostingPlans.get(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
        if (!data) {
          log.info($('No appserviceplan information available'));
        } else {
          log.data($('App Service Plan Name  :'), data.webHostingPlan.name);
          log.data($('Location           :'), data.webHostingPlan.location);
          log.data($('SKU                :'), data.webHostingPlan.properties.sku);
          log.data($('Number of workers  :'), data.webHostingPlan.properties.numberOfWorkers);

		  var workerSizeLiteral;

		  switch (data.webHostingPlan.properties.workerSize) {
		    case 0:
			  workerSizeLiteral = "Small";
			  break;
			case 1:
			  workerSizeLiteral = "Medium";
			  break;
			case 2:
			  workerSizeLiteral = "Large";
			  break;
			default:
			  workerSizeLiteral = data.webHostingPlan.properties.workerSize;
		  }

          log.data($('Worker Size        :'), workerSizeLiteral);

          log.data('');
        }
      });
    });
};
