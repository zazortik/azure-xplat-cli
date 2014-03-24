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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var groupUtils = require('../group/groupUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var groups = cli.category('group');

  var resource = cli.category('resource')
    .description($('Commands to manage your resources'));

  resource.command('create [resource-group] [name] [resource-type] [location] [api-version]')
    .description($('Create a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-l --location <location>', $('The location to create resource in'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('-o --api-version <api-version>', $('The API version of the resource provider'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('-p --properties <properties>', $('A string in JSON format which represents the properties'))
    .option('-q, --quiet', $('quiet mode, do not ask for update confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, resourceType, location, apiVersion, options, _) {
      resource.createResource(resourceGroup, name, resourceType, location, apiVersion, options, _);
    });

  resource.createResource = function (resourceGroup, name, resourceType, location, apiVersion, options, _) {
    if (!resourceGroup) {
      return cli.missingArgument('resourceGroup');
    } else if (!name) {
      return cli.missingArgument('name');
    } else if (!resourceType) {
      return cli.missingArgument('resourceType');
    } else if (!location) {
      return cli.missingArgument('location');
    } else if (!apiVersion) {
      return cli.missingArgument('apiVersion');
    }

    // Create group if it does not exist
    var group = groups.createResourceGroup(resourceGroup, location, options, _);

    var subscription = profile.current.getSubscription(options.subscription);
    var client = subscription.createResourceClient('createResourceManagementClient');

    var resourceTypeParts = resourceType.split('/');
    var identity = {
      resourceName: name,
      resourceProviderNamespace: resourceTypeParts[0],
      resourceProviderApiVersion: apiVersion,
      resourceType: resourceTypeParts[1],
      // TODO: parent should be optional in the API. temporary workaround.
      parentResourcePath: __.isString(options.parent) ? options.parent : ''
    };

    var resource;
    cli.interaction.withProgress(util.format($('Getting resource %s'), name),
      function (log, _) {
        resource = groupUtils.getResource(client, resourceGroup, identity, _);
        if (!resource) {
          resource = {};
        }
      }, _);

    if (!options.quiet && !cli.interaction.confirm(util.format($('The resource %s already exists. Update ? [y/n] '), name), _)) {
      return;
    }

    if (location) {
      resource.location = location;
    } else {
      resource.location = group.location;
    }

    if (options.properties) {
      resource.properties = JSON.parse(options.properties);
    }

    var message = util.format($('Creating resource %s'), name);
    var doneMessage = util.format($('Created resource %s'), name);
    if (resource) {
      message = util.format($('Updating resource %s'), name);
      doneMessage = util.format($('Updated resource %s'), name);
    }

    cli.interaction.withProgress(util.format($('Creating resource %s'), name),
      function (log, _) {
        client.resources.createOrUpdate(resourceGroup,
          identity,
          {
            resource: resource,
            resourceProviderApiVersion: apiVersion
          }, _);
      }, _);

    log.info(doneMessage);
  };

  resource.command('list [resource-group]')
    .description($('Lists the resources'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
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
        row.cell($('Resource Group'), item.id.split('/')[4]);
        row.cell($('Type'), item.type);
        row.cell($('Location'), item.location);
      });
    });

  resource.command('show [resource-group] [name] [resource-type] [api-version]')
    .description($('Get one resource within a resource group or a subscription'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('-o --api-version <api-version>', $('The API version of the resource provider'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, resourceType, apiVersion, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      } else if (!apiVersion) {
        return cli.missingArgument('apiVersion');
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
          resourceProviderApiVersion: apiVersion,
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

  resource.command('delete [resource-group] [name] [resource-type] [api-version]')
    .description($('Delete a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The resource name'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('-o --api-version <api-version>', $('The API version of the resource provider'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of path/path/path.'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, resourceType, apiVersion, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      } else if (!apiVersion) {
        return cli.missingArgument('apiVersion');
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
          resourceProviderApiVersion: apiVersion,
          resourceType: resourceTypeParts[1],
          // TODO: parent should be optional in the API. temporary workaround.
          parentResourcePath: __.isString(options.parent) ? options.parent : ''
        };

        client.resources.delete(resourceGroup, identity, _);
      } finally {
        progress.end();
      }
    });

  resource.command('set [resource-group] [name] [resource-type] [properties] [api-version]')
    .usage('[options] <resource-group> <name> <resource-type> ')
    .description($('Update a resource in a resource group without any template or parameters.'))
    .option('-g --resource-group <resource-group>', $('The resource group name.'))
    .option('-n --name <name>', $('The resource name.'))
    .option('-r --resource-type <resource-type>', $('The resource type.'))
    .option('-o --api-version <api-version>', $('The API version of the resource provider'))
    .option('--parent <parent>', $('Optional. The name of the parent resource if needed. In the format of path/path/path.'))
    .option('-p --properties <properties>', $('A string in JSON format which represents the properties.'))
    .option('--subscription <subscription>', $('Optional. Subscription to set resource in.'))
    .execute(function (resourceGroup, name, resourceType, properties, apiVersion,  options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      } else if (!name) {
        return cli.missingArgument('name');
      } else if (!resourceType) {
        return cli.missingArgument('resourceType');
      } else if (!properties) {
        return cli.missingArgument('properties');
      } else if (!apiVersion) {
        return cli.missingArgument('apiVersion');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var resourceObject;
      var identity;
      cli.interaction.withProgress(util.format($('Getting resource %s'), name),
        function (log, _) {
          var resourceTypeParts = resourceType.split('/');
          identity = {
            resourceName: name,
            resourceProviderNamespace: resourceTypeParts[0],
            resourceProviderApiVersion: apiVersion,
            resourceType: resourceTypeParts[1],
            // TODO: parent should be optional in the API. temporary workaround.
            parentResourcePath: __.isString(options.parent) ? options.parent : ''
          };
          resourceObject = client.resources.get(resourceGroup, identity, _).resource;
        }, _);

      var resource = {
        location: resourceObject.location
      };
      resource.properties = JSON.parse(properties);

      cli.interaction.withProgress(util.format($('Setting resource %s'), name),
        function (log, _) {
          client.resources.createOrUpdate(resourceGroup,
            identity,
            {
              resourceProviderApiVersion: apiVersion,
              resource: resource
            }, _);
        }, _);
    });
};
