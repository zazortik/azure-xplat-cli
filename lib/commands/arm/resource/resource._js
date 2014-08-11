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

var groupUtils = require('../group/groupUtils');
var profile = require('../../../util/profile');
var tagUtils = require('../tag/tagUtils');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  var resource = cli.category('resource')
    .description($('Commands to manage your resources'));

  resource.command('create [resource-group] [name] [resource-type] [location] [api-version]')
    .description($('Creates a resource in a resource group'))
    .usage('[options] <resource-group> <name> <resource-type> <location> <api-version>')
    .option('-g --resource-group <resource-group>', $('the resource group name'))
    .option('-n --name <name>', $('the resource name'))
    .option('-l --location <location>', $('the location where we will create the resource'))
    .option('-r --resource-type <resource-type>', $('the resource type'))
    .option('-o --api-version <api-version>', $('the API version of the resource provider'))
    .option('--parent <parent>', $('the name of the parent resource (if needed), in path/path/path format'))
    .option('-p --properties <properties>', $('a JSON-formatted string containing properties'))
    .option('-t --tags <tags>', $('Tags to set to the resource group. Can be mutliple. ' +
            'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, resourceType, location, apiVersion, options, _) {
      resource.createResource(resourceGroup, name, resourceType, location, apiVersion, options.properties, options, _);
    });

  resource.command('set [resource-group] [name] [resource-type] [properties] [api-version]')
    .usage('[options] <resource-group> <name> <resource-type> <properties> <api-version>')
    .description($('Updates a resource in a resource group without any templates or parameters'))
    .option('-g --resource-group <resource-group>', $('the resource group name'))
    .option('-n --name <name>', $('the resource name'))
    .option('-r --resource-type <resource-type>', $('the resource type'))
    .option('-p --properties <properties>', $('a JSON-formatted string containing properties'))
    .option('-o --api-version <api-version>', $('the API version of the resource provider'))
    .option('--parent <parent>', $('the name of the parent resource (if needed), in path/path/path format'))
    .option('-t --tags <tags>', $('Tags to set to the resource. Can be multiple. ' +
      'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, resourceType, properties, apiVersion, options, _) {
      resource.createResource(resourceGroup, name, resourceType, '', apiVersion, properties, options, _);
    });

  resource.createResource = function (resourceGroup, name, resourceType, location, apiVersion, propertiesParam, options, _) {
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

    // Create group if it does not exist
    var group = withProgress($('Checking resource group'),
      function (log, _) {
        var g = groupUtils.getGroup(client, resourceGroup, _);
        if (!g) {
          g = client.resourceGroups.createOrUpdate(resourceGroup, { location: location }, _).resourceGroup;
        }
        return g;
      }, _);

    var identity = {
      resourceName: name,
      resourceProviderNamespace: getProviderName(resourceType),
      resourceProviderApiVersion: apiVersion,
      resourceType: getResourceTypeName(resourceType),
      // TODO: parent should be optional in the API. temporary workaround.
      parentResourcePath: __.isString(options.parent) ? options.parent : ''
    };

    var resource = withProgress(util.format($('Getting resource %s'), name),
      function (log, _) {
        return groupUtils.getResource(client, resourceGroup, identity, _);
      }, _);

    resource = resource || {};
    var properties = {};
    if (propertiesParam) {
      properties = JSON.parse(propertiesParam);
    }

    var tags = {};
    tags = tagUtils.buildTagsParameter(tags, options);

    var message = util.format($('Creating resource %s'), name);
    var doneMessage = util.format($('Created resource %s'), name);
    if (resource) {
      message = util.format($('Updating resource %s'), name);
      doneMessage = util.format($('Resource %s is updated'), name);
    }

    var resourceLocation = location || resource.location || group.location;
    if (!resourceLocation){
      cli.missingArgument('location');
    }

    var newResource;
    cli.interaction.withProgress(util.format($('Creating resource %s'), name),
      function (log, _) {
        newResource = client.resources.createOrUpdate(resourceGroup,
          identity,
          {
            location: resourceLocation,
            resource: resource,
            properties: properties,
            resourceProviderApiVersion: apiVersion,
            tags: tags
          }, _).resource;
      }, _);

    log.info(doneMessage);
    log.data('');
    log.data($('Name:     '), name);
    log.data($('Type:     '), resourceType);
    log.data($('Location: '), resourceLocation);
    log.data($('Tags:     '), tagUtils.getTagsInfo(newResource.tags));
  };

  resource.command('list [resource-group]')
    .description($('Lists the resources'))
    .option('-g --resource-group <resource-group>', $('the resource group name'))
    .option('-r --resource-type <resource-type>', $('the resource type'))
    .option('-t --tags <tags>', $('Tag to use to filter to the resource group. Can only take 1 tag. ' +
        'In the format of "name=value". Name is required and value is optional. ' +
        'For example, -t tag1 or -t tag1=value1.'))
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
          if (options.tags) {
            tagUtils.populateQueryFilterWithTagInfo(options.tags, parameters);
          }
        }

        if (resourceGroup) {
          parameters.resourceGroupName = resourceGroup;
        }

        resources = client.resources.list(parameters, _).resources;
      } finally {
        progress.end();
      }

      if (resources.length === 0) {
        log.info($('No matched resources were found.'));
      } else {
        log.table(resources, function (row, item) {
          var resourceInformation = getResourceInformation(item.id);
          row.cell($('Name'), resourceInformation.resourceName || item.name);
          row.cell($('Resource Group'), resourceInformation.resourceGroup || '');
          row.cell($('Type'), resourceInformation.resourceType || item.type);
          row.cell($('Parent'), resourceInformation.parentResource ? resourceInformation.parentResource : '');
          row.cell($('Location'), item.location);
          row.cell($('Tags'), tagUtils.getTagsInfo(item.tags));
        });
      }
    });

  resource.command('show [resource-group] [name] [resource-type] [api-version]')
    .description($('Gets one resource within a resource group or subscription'))
    .usage('[options] <resource-group> <name> <resource-type> <api-version>')
    .option('-g --resource-group <resource-group>', $('the resource group name'))
    .option('-n --name <name>', $('the resource name'))
    .option('-r --resource-type <resource-type>', $('the resource type'))
    .option('-o --api-version <api-version>', $('the API version of the resource provider'))
    .option('--parent <parent>', $('the name of the parent resource (if needed), in path/path/path format'))
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
        var identity = {
          resourceName: name,
          resourceProviderNamespace: getProviderName(resourceType),
          resourceProviderApiVersion: apiVersion,
          resourceType: getResourceTypeName(resourceType),
          // TODO: parent should be optional in the API. temporary workaround.
          parentResourcePath: __.isString(options.parent) ? options.parent : ''
        };

        resource = client.resources.get(resourceGroup, identity, _).resource;
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(resource, function (outputData) {
        var resourceInformation = getResourceInformation(outputData.id);
        log.data($('Name:     '), resourceInformation.resourceName || outputData.name);
        log.data($('Type:     '), resourceInformation.resourceType || outputData.type);
        log.data($('Parent:   '), resourceInformation.parentResource || '');
        log.data($('Location: '), outputData.location);
        log.data($('Tags:     '), tagUtils.getTagsInfo(outputData.tags));
        log.data('');
        log.data($('Properties:'));
        cli.interaction.logEachData($('Property'), outputData.properties);
      });
    });

  resource.command('delete [resource-group] [name] [resource-type] [api-version]')
    .description($('Deletes a resource in a resource group'))
    .usage('[options] <resource-group> <name> <resource-type> <api-version>')
    .option('-g --resource-group <resource-group>', $('the resource group name'))
    .option('-n --name <name>', $('the resource name'))
    .option('-r --resource-type <resource-type>', $('the resource type'))
    .option('-o --api-version <api-version>', $('the API version of the resource provider'))
    .option('--parent <parent>', $('the name of the parent resource (if needed), in path/path/path format'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
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
        var identity = {
          resourceName: name,
          resourceProviderNamespace: getProviderName(resourceType),
          resourceProviderApiVersion: apiVersion,
          resourceType: getResourceTypeName(resourceType),
          // TODO: parent should be optional in the API. temporary workaround.
          parentResourcePath: __.isString(options.parent) ? options.parent : ''
        };

        if (!resourceExists(client, resourceGroup, identity, _)) {
          throw new Error($('Resource does not exist'));
        }

        client.resources.delete(resourceGroup, identity, _);
      } finally {
        progress.end();
      }
    });
};

function resourceExists(client, resourceGroup, identity, _) {
  try {
    client.resources.get(resourceGroup, identity, _);
    return true;
  } catch (e) {
    return false;
  }
}

function getProviderName(resourceType) {
  var firstIndex = resourceType.indexOf('/');
  var providerName;
  if (firstIndex !== -1){
    providerName = resourceType.substr(0, firstIndex);
  }
  return providerName;
}

function getResourceTypeName(resourceType) {
  var lastIndex = resourceType.lastIndexOf('/');
  var resourceTypeName;
  if (lastIndex !== -1){
    resourceTypeName = resourceType.substr(lastIndex+1);
  }
  return resourceTypeName;
}

function getResourceInformation(resourceIDFromServer) {
  function removeEmptyElement(existing) {
    var newArray = [];
    for (var i = 0; i < existing.length; i++) {
      if (existing[i]) {
        newArray.push(existing[i]);
      }
    }
    return newArray;
  }

  if (!resourceIDFromServer){
    return {};
  }

  var tokens = resourceIDFromServer.split('/');
  tokens = removeEmptyElement(tokens);
  if (tokens.length < 8){
    throw new Error('invald resoruce id from server');
  }
  var resourceGroupName = tokens[3];
  var resourceName = tokens[tokens.length - 1];

  var resourceTypeBuilder = [];
  resourceTypeBuilder.push(tokens[5]);

  // Extract out the 'parent resource' and 'full resource type'
  // for id like: subscriptions/abc123/resourceGroups/group1/providers/Microsoft.Test/servers/r12345sql/db/r45678db,
  // we will extract out parent resource: 'servers/r12345sql'.
  // from id like: subscriptions/abc123/resourceGroups/group1/providers/Microsoft.Test/db/r45678db,
  // parent resource does not exist.
  var parentResourceBuilder = [];
  for (var i = 6; i <= tokens.length - 3; i++){
    parentResourceBuilder.push(tokens[i]);
    //from 'resourceType/resourcName/<same pattern...>', skip the "resourceName" and keep the type
    if (i%2 === 0){
      resourceTypeBuilder.push(tokens[i]);
    }
  }
  resourceTypeBuilder.push(tokens[tokens.length - 2]);

  var parentResource;
  if (parentResourceBuilder.length > 0){
    parentResource = parentResourceBuilder.join('/');
  }

  var resourceType;
  if (resourceTypeBuilder.length > 0){
    resourceType = resourceTypeBuilder.join('/');
  }

  return {
    'resourceName': resourceName,
    'resourceGroup' : resourceGroupName,
    'resourceType' : resourceType,
    'parentResource' : parentResource
  };
}
