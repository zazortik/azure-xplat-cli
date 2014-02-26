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

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var resource = cli.category('resource')
    .description($('Commands to manage your resources'));

  resource.command('create [resource-group] [name] [location] [resourceType]')
    .usage('[options] <resource-group> <name> <location> <resourceType>')
    .description($('Create a resource in a resource group'))
    .option('-g --resource-group <resource-group>', $('The resource group name'))
    .option('-n --name <name>', $('The name'))
    .option('-l --location <location>', $('The location to create resource in'))
    .option('-r --resource-type <resource-type>', $('The resource type'))
    .option('--parent <parent>', $('The name of the parent resource if needed. In the format of greatgranda/grandpa/dad.'))
    .option('-p --properties <properties>', $('A string in JSON format which represents the properties'))
    .option('--subscription <subscription>', $('Subscription to create group in'))
    .execute(function (resourceGroup, name, location, resourceType, options, _) {
      var resourceTypeParts = resourceType.split('/');

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress(util.format($('Creating resource %s'), name));
      try {
        var identity = {
          resourceName: name,
          resourceProviderNamespace: resourceTypeParts[0],
          resourceType: resourceTypeParts[1]
        };

        if (__.isString(options.parent)) {
          identity.parentResourcePath = options.parent;
        } else {
          // TODO: this should be optional in the API. temporary workaround.
          identity.parentResourcePath = '';
        }

        var resource = {
          location: location
        };

        if (options.properties) {
          resource.properties = options.properties;
        }

        var response = client.resources.createOrUpdate(resourceGroup, 
          identity,
          {
            resource: resource
          }, _);
      } finally {
        progress.end();
      }
    });
};