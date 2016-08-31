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
var appserviceplanUtils = require('../webapp/webappUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var tierInfo = [ '\n\teg:\n\t\t Free, Shared',
                   '\n\t\t B1 (Basic Small),    B2 (Basic Medium),    B3 (Basic Large)',
				           '\n\t\t S1 (Standard Small), S2 (Standard Medium), S3 (Standard Large)',
				           '\n\t\t P1 (Premium Small),  P2 (Premium Medium),  P3 (Premium Large)\n'
						     ];

  var appserviceplan = cli.category('appserviceplan')
    .description($('Commands to manage your Azure appserviceplans'));

  appserviceplan.command('create [resource-group] [name] [location] [tier]')
    .description($('Create an App Service Plan'))
    .usage('[options] <resource-group> <name> <location> <tier>')
    .option('-g --resource-group <resource-group>', $('Name of the resource group'))
    .option('-n --name <name>', $('the name of the App Service Plan to create'))
    .option('-l --location <location>', $('the geographic region to create the App Service Plan, \n\t\t\t\t\t   locations found at https://azure.microsoft.com/en-us/status/'))
    .option('-t --tier <tier>', $('tier of the App Service Plan' + tierInfo.toString()))
    .option('-i --instances <numberOfInstances>', $('the number of instances in the App Service Plan, Default is 1'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function(resourceGroup, name, location, tier, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
	  var numOfInstances;
	  var sku;
	  var workerSize;
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!location) {
        return cli.missingArgument('location');
      }
      if (!tier) {
        return cli.missingArgument('tier');
      }
      
	  if('instances' in options) {
	    numOfInstances = Number(options.instances);
	  }
	  else
	  {
        numOfInstances = 1; //Default is 1
	  }
      var progress = cli.interaction.progress(util.format($('Creating appserviceplan %s'), name));
      var tierUpper = tier.toUpperCase();
      switch(tierUpper) {
      case 'FREE':
      case 'SHARED':
        workerSize = 0;
        sku = tier;
        break;
      case 'B1':
      case 'B2':
      case 'B3':
        sku = 'Basic';
        workerSize = tier.charAt(1) - 1;
        break;
      case 'S1':
      case 'S2':
      case 'S3':
        sku = 'Standard';
        workerSize = tier.charAt(1) - 1;
        break;
      case 'P1':
      case 'P2':
      case 'P3':
        sku = 'Premium';
        workerSize = tier.charAt(1) - 1;
        break;
      default:
        log.info($('Invalid Tier'));
      }
      var envelope = {
	    location: location,
	    name: name,
	      sku: {
		    name: tierUpper,
            tier: sku,
	        family: tierUpper.charAt(0),
		    capacity: numOfInstances
		  } 
	  };
		
      var result;
      try {
	      result = client.serverFarms.createOrUpdateServerFarm(resourceGroup, name, envelope, options , _);
      } finally {
        progress.end();
      }
      log.info('App Service Plan ' + name + ' has been created ');
    });

  appserviceplan.command('delete [resource-group] [name]')
    .description($('Delete a appserviceplan'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('Name of the resource group'))
    .option('-n --name <name>', $('the name of the App Service Plan to delete'))
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
        if (!cli.interaction.confirm(util.format('Delete App Service Plan %s? [y/n] ', name), _)) {
          return;
        }
      }
      var progress = cli.interaction.progress(util.format($('Deleting App Service Plan %s'), name));
      var result;
      try {
        result = client.serverFarms.deleteServerFarm(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      log.info(util.format($('appserviceplan %s has been deleted'), name));
    });

  appserviceplan.command('list [resource-group]')
    .description($('List your App Service Plans'))
    .usage('[options] <resource-group>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
	.option('-s --subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      if (!resourceGroup) {
        cli.missingArgument('resource-group');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = appserviceplanUtils.createWebappManagementClient(subscription);
      var progress = cli.interaction.progress($('Listing App Service Plans'));
      var result;
      try {
        result = client.serverFarms.getServerFarms(resourceGroup, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result.value, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name '), item.name);
            row.cell($('Location '), item.location);
            row.cell($('SKU '), item.sku.name);
            row.cell($('Number Of Workers '), item.sku.capacity);
            row.cell($('Worker Size '), translateWorkerSize(item.sku.name));
          });
        } else {
          log.info(util.format($('No app service plans found.')));
        }
      });
    });

  appserviceplan.command('show [resource-group] [name]')
    .description($('Get an App Service Plan'))
    .usage('[options] <resource-group> <name>')
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the App Service Plan to show'))
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
      var progress = cli.interaction.progress($('Getting App Service Plan'));
      var result;
      try {
        result = client.serverFarms.getServerFarm(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      cli.interaction.formatOutput(result, function (data) {
        if (!data) {
          log.info($('No App Service Plan information available'));
        } else {
          log.data($('App Service Plan Name  :'), data.name);
          log.data($('Location           :'), data.location);
          log.data($('SKU                :'), data.sku.name);
          log.data($('Number of workers  :'), data.sku.capacity);
          log.data($('Worker Size        :'), translateWorkerSize(data.sku.name));
          log.data('');
        }
      });
    });

	function translateWorkerSize(skuName)
	{
	  var workerSize = skuName.charAt(1);
	  var workerSizeNum = Number(workerSize) - 1;
	  var workerSizeLiteral = -1;
	  switch (workerSizeNum) {
		case 0:
	      workerSizeLiteral = 'Small';
	      break;
	    case 1:
		  workerSizeLiteral = 'Medium';
	      break;
		case 2:
		  workerSizeLiteral = 'Large';
	      break;
		default:
	      workerSizeLiteral = 'Undefined';
	  }
	  return workerSizeLiteral;
	}
};