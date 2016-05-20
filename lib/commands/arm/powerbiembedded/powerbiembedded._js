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
* You can test powerbi embedded commands get loaded by xplat by following steps:
* a. Copy the folder to '<repository root>\lib\commands\arm'
* b. Under <repository root>, run 'node bin/azure config mode arm'
* c. Run 'node bin/azure', you should see 'powerbi' listed as a command set
* d. Run 'node bin/azure powerbi', you should see 'create', "delete", etc 
      showing up in the help text 
*/

'use strict';

var util = require('util');

var profile = require('../../../util/profile');
var tagUtils = require('../tag/tagUtils');
var utils = require('../../../util/utils');

var powerbiembeddedUtils = require('./powerbiembeddedUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var powerbiembeddedcli = cli.category('powerbi')
    .description($('Commands to manage your Azure Power BI Embedded Workspace Collections'));
    
  /**
   * Create new workspace collection
   */
  powerbiembeddedcli.command('create <resourceGroup> <name> [location] [tags]')
    .description($('Create a new workspace collection'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))
    .option('-n --name <name>', $('The name of the new workspace collection'))
    .option('-l --location [location]', $('The location (azure region/datacenter) where the workspace collection will be provisioned'))
    .option('-t --tags [tags]', $('Tags to set to the resource group. Can be multiple. ' +
        'In the format of \'name=value\'. Name is required and value is optional. ' + 
        'For example, -t \'tag1=value1;tag2\'. Providing an empty string \'\' will delete the tags.'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);
    
      var workspaceCollectionCreationOptions = {
        location: options.location || "southcentral",
        tags: tags,
        sku: {
          name: "S1",
          tier: "Standard"
        }
      };

      var progress = cli.interaction.progress(util.format($('Creating workspace collection: %s'), name));
      var workspaceCollection;
      try {
        console.log('creation parameters: ', name, workspaceCollectionCreationOptions);
        workspaceCollection = client.workspaceCollections.create(resourceGroup, name, workspaceCollectionCreationOptions, _);
      } finally {
        progress.end();
      }
      
      log.info('WorkspaceCollection ' + workspaceCollection.name + ' has been created.');
      log.info('Id: ' + workspaceCollection.id);
      log.info('Location: ' + workspaceCollection.location);
    });
    
  /**
   * Update existing workspace collection
   */
  powerbiembeddedcli.command('set <resourceGroup> <name> <tags>')
    .description($('Update a workspace collection\'s tags'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))
    .option('-n --name <name>', $('Name of workspace collection'))
    .option('-t --tags <tags>', $('Tags to set to the resource group. Can be multiple. ' +
        'In the format of \'name=value\'. Name is required and value is optional. ' + 
        'For example, -t \'tag1=value1;tag2\'. Providing an empty string \'\' will delete the tags.'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, tags, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!tags) {
        return cli.missingArgument('tags');
      }
      
      var tagsObject = {};
      tagsObject = tagUtils.buildTagsParameter(tags, {tags: tags});
    
      
      /** Create client */
      var subscription = profile.current.updateSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var body = {
        tags: tagsObject,
        sku: {
          name: "S1"
        }
      };
      
      var progress = cli.interaction.progress(util.format($('Udating workspace collection: %s'), name));
      var workspaceCollection;
      try {
        workspaceCollection = client.workspaceCollections.update(resourceGroup, name, body, _);
      } finally {
        progress.end();
      }
      
      /** Display output */
      log.info('WorkspaceCollection updated!');
    });

  /**
   * Delete existing workspace collection
   */
  powerbiembeddedcli.command('delete [resourceGroup] [name]')
    .description($('Delete existing workspace collection'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))
    .option('-n --name <name>', $('Name of workspace collection'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);

      /** Invoke client method */
      var progress = cli.interaction.progress(util.format($('Deleting workspace collection %s'), name));

      var result;
      try {
        result = client.workspaceCollections.delete(resourceGroup, name, _);
      } finally {
        progress.end();
      }
      
      log.info('Workspace Collection: ' + name + ' was deleted.');
    });
    
  /**
   * List by Subscription or by Resource Group
   */
  powerbiembeddedcli.command('list [resourceGroup]')
    .description($('List workspace collections within subscription or within resource group'))
    .option('-g --resource-group [resourceGroup]', $('Name of the resource group'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (options, _) {
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var workspaceCollections;
      if(options.resourceGroup) {
        var progress = cli.interaction.progress($('Getting workspace collections in subscription ' + subscription + ' resource group: ' + options.resourceGroup));
        try {
          workspaceCollections = client.workspaceCollections.listByResourceGroup(options.resourceGroup);
        } finally {
          progress.end();
        }
      }
      else {
        var progress = cli.interaction.progress($('Getting workspace collections in subscription: ' + subscription));
        try {
          workspaceCollections = client.workspaceCollections.listBySubscription();
        } finally {
          progress.end();
        }
      }

      /** Output result */
      log.info('WorkspaceCollections:');
      var logString = workspaceCollections
        .reduce(function (s, workspaceCollection, i) {
          s += i + '. ' + workspaceCollection.name + ' : ' + workspaceCollection.id;
          return s;
        }, '')
      
      log.info(logString);
    });

  /**
   * Get access keys for workspace collection
   */
  powerbiembeddedcli.command('get-keys <resourceGroup> <name>')
    .description($('Get access keys for a workspace collection'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))
    .option('-n --name <name>', $('Name of workspace collection'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var progress = cli.interaction.progress($('Getting workspace collection access keys...'));
      var accessKeys;
      try {
        accessKeys = client.workspaceCollections.getAccessKeys(resourceGroup, name);
      } finally {
        progress.end();
      }

      /** Output result */
      log.info('AccessKeys:');
      log.info('Key1: ' + accessKeys.key1);
      log.info('Key2: ' + accessKeys.key2);
    });
  
  /**
   * Regenerage access key
   */
  powerbiembeddedcli.command('regenerate-key <resourceGroup> <name> <keyName>')
    .description($('Get access keys for a workspace collection'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))    
    .option('-n --name <name>', $('Name of workspace collection'))
    .option('-k --keyName <keyName>', $('Name of key you would like to regenerate. Accepted values: "key1" (Primary) or "key2" (Secondary)'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, keyName, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!keyName) {
        return cli.missingArgument('keyName');
      }
      
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var progress = cli.interaction.progress($('Regenerate workspace collection access key: ' + keyName));
      var accessKeys;
      
      var body = {
        keyName: keyName
      };
      try {
        accessKeys = client.workspaceCollections.regenerateKey(resourceGroup, name, body);
      } finally {
        progress.end();
      }

      /** Output result */
      var key1string = 'key1';
      if(keyName === "key1") {
        key1string += ' (Regenerated)';
      }
      key1string += ': ' + accessKeys.key1;
      
      var key2string = 'key2';
      if(keyName === "key2") {
        key2string += ' (Regenerated)';
      }
      key2string += ': ' + accessKeys.key2;
      
      log.info('AccessKeys:');
      log.info(key1string);
      log.info(key2string);
    });
    
    /**
     * List workspaces within workspace collection
     */
    powerbiembeddedcli.command('list-workspaces <resourceGroup> <name>')
    .description($('Get workspaces within given workspace collection'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group'))
    .option('-n --name <name>', $('Name of workspace collection'))
    .option('-s --subscription [subscription]', $('The subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      /** Validate parameters */
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      
      /** Create client */
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createPowerbiManagementClient(subscription);
      
      /** Invoke client method */
      var progress = cli.interaction.progress($('Fetching workspaces...'));
      var workspaces;
      
      try {
        workspaces = client.workspaces.list(resourceGroup, name, _);
      } finally {
        progress.end();
      }

      /** Output result */
      log.info('Workspaces:');
      workspaces.forEach(function (workspace, i) {
        log.info(i + ': ' + workspace.id);
      });
    });
};
