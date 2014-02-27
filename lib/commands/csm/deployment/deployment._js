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

var util = require('util');

var Constants = require('../../../util/constants');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('groupdeployment')
    .description($('Commands to manage your deployment in a resource group'));

  group.command('list [resourceGroup] [state]')
    .description($('get deployments'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('--state <state>', $('Optional. Filter the deployments by provisioning state. Valid values are  Accepted, Running, Failed and Succeeded'))
    .option('--subscription <subscription>', $('Subscription to create resource in'))
    .execute(function(resourceGroup, state, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('listing deployments'));
      try {
        var response = client.deployments.listForResourceGroup(
        resourceGroup,
        {
            provisioningState: state
        }, 
        _);
      } finally {
        progress.end();
      }
    });
};
