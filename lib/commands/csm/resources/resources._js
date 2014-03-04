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

var Constants = require('../../../util/constants');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var groupUtils = require('../groups/groupUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var resource = cli.category('resource')
    .description($('Commands to manage your resources'));

  resource.command('create [resource-group] [name] [resource-type] [location]')
    .usage('[options] <resource-group> <name> <resource-type> <location>')
    .description($('Create a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-l --location <location>', $('The location to create resource in'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('-p --properties <properties>', $('A string in JSON format which represents the properties'))
    .option('--subscription <subscription>', $('Subscription to create group in'))
    .execute(function (resourceGroup, name, resourceType, location, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      } else if (!location) {
        return cli.missingArgument('location');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');

      cli.interaction.withProgress(util.format($('Creating resource group %s'), resourceGroup),
        function (log, _) {
          if (!groupUtils.groupExists(client, resourceGroup, _)) {
            client.resourceGroups.createOrUpdate(resourceGroup, { location: location }, _);
            log.info(util.format($('Created resource group %s'), resourceGroup));
          }
        }, _);

      cli.interaction.withProgress(util.format($('Creating resource %s'), name),
        function (log, _) {
          var resourceTypeParts = resourceType.split('/');
          var identity = {
            resourceName: name,
            resourceProviderNamespace: resourceTypeParts[0],
            resourceType: resourceTypeParts[1],
            // TODO: parent should be optional in the API. temporary workaround.
            parentResourcePath: __.isString(options.parent) ? options.parent : ''
          };

          var resource = {
            location: location
          };

          if (options.properties) {
            resource.properties = JSON.parse(options.properties);
          }

          var response = client.resources.createOrUpdate(resourceGroup,
            identity,
            {
              resource: resource
            }, _);
        }, _);
    });

  resource.command('list [resource-group]')
    .description($('Lists the resources'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
    .execute(function (resourceGroup, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Listing resources')));

      var resources;
      try {
        var parameters = {};
        if (options) {
          if (options.resourceType) {
            parameters.resourceType = options.resourceType;
          }
        }

        if (resourceGroup) {
          parameters.resourceGroupName = resourceGroup;
        }

        resources = client.resources.list(parameters, _).resources;
      } finally {
        progress.end();
      }

      log.table(resources, function (row, item) {
        row.cell($('Name'), item.name);
        row.cell($('Resource Group'), item.resourceGroup);
        row.cell($('Type'), item.type);
        row.cell($('Location'), item.location);
      });
    });

  resource.command('show [resource-group] [name] [resource-type]')
    .description($('Get one resource within a resource group or a subscription'))
    .usage('[options] <resource-group> <name> <resource-type>')
    .description($('Delete a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
    .execute(function (resourceGroup, name, resourceType, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Getting resource %s'), name));

      var resource;
      try {
        var resourceTypeParts = resourceType.split('/');
        var identity = {
          resourceName: name,
          resourceProviderNamespace: resourceTypeParts[0],
          resourceType: resourceTypeParts[1],
          // TODO: parent should be optional in the API. temporary workaround.
          parentResourcePath: __.isString(options.parent) ? options.parent : ''
        };

        resource = client.resources.get(resourceGroup, identity, _).resource;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(resource, function (outputData) {
        log.data($('Name:     '), outputData.name);
        log.data($('Type:     '), outputData.type);
        log.data($('Location: '), outputData.location);
        log.data('');
        log.data($('Properties:'));
        cli.interaction.logEachData($('Property'), outputData.properties);
      });
    });

  resource.command('delete [resource-group] [name] [resource-type]')
    .usage('[options] <resource-group> <name> <resource-type>')
    .description($('Delete a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
    .execute(function (resourceGroup, name, resourceType, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      }

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete resource %s? [y/n] '), name), _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Deleting resource %s'), name));
      try {
        var resourceTypeParts = resourceType.split('/');
        var identity = {
          resourceName: name,
          resourceProviderNamespace: resourceTypeParts[0],
          resourceType: resourceTypeParts[1],
          // TODO: parent should be optional in the API. temporary workaround.
          parentResourcePath: __.isString(options.parent) ? options.parent : ''
        };

        client.resources.delete(resourceGroup, identity, _);
      } finally {
        progress.end();
      }
    });
};