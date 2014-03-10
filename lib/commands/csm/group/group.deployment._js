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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var groupUtils = require('./groupUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group');
  var deployment = group.category('deployment')
      .description($('Commands to manage your deployment in a resource group'));

  deployment.command('list [resource-group] [state]')
    .usage('[options] <resource-group> [state]')
    .description($('Get deployments'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('--state <state>', $('Optional. Filter the deployments by provisioning state, valid ' +
      'values are Accepted, Running, Failed and Succeeded.'))
    .option('--subscription <subscription>', $('Optional. Subscription containing deployments to list'))
    .execute(function (resourceGroup, state, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('Listing deployments'));
      var allDeployments;
      try {
        allDeployments = retrieveDeployments(client, resourceGroup, state, _);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(allDeployments, function (outputData) {
        if (outputData) {
          for (var i = 0; i < outputData.length; i++) {
            var deployment = outputData[i];
            //TODO, will polish the output later
            log.data($('================'), deployment.deploymentName);
            cli.interaction.logEachData($(''), deployment);
            cli.interaction.logEachData($(''), deployment.properties);
            cli.interaction.logEachData($(''), deployment.properties.parameters);
          }
        }
      });
    });

  deployment.command('show [resource-group] [name]')
    .usage('[options] <resource-group> [deployment-name]')
    .description($('Show a deployment'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('-n --name <name>', $('Optional. Name of the deployment. ' +
            'If not specified, show the most recent deployment.'))
    .option('--subscription <subscription>', $('Optional. Subscription containing the deployment to display'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('Getting deployments'));
      var deployment;
      try {
        if (name) {
          deployment = client.deployments.get(resourceGroup, name, _).deployment;
        }
        else {
          //look for the most recent one 
          var allDeployments = retrieveDeployments(client, resourceGroup, '', _);
          if (allDeployments && allDeployments.length > 0) {
            allDeployments.sort(function (a, b) {
              return Date.parse(a.properties.timestamp) < Date.parse(b.properties.timestamp);
            });
            deployment = allDeployments[0];
          }
        }
      } finally {
        progress.end();
      }

      if (deployment) {
        //TODO, will polish the output later
        log.data($('================'), deployment.name || deployment.deploymentName);
        cli.interaction.logEachData($(''), deployment);
        cli.interaction.logEachData($(''), deployment.properties);
        cli.interaction.logEachData($(''), deployment.properties.parameters);
      }
    });

  deployment.command('stop [resource-group] [name]')
    .usage('[options] <resource-group> [deployment-name]')
    .description($('Stop a specified deployment or a current running one.'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('-q --quiet', $('Quiet mode. Do not ask confirmation for stop deployment'))
    .option('-n --name <name>', $('Optional. Name of the deployment. ' +
        'If not specified, stop the current running deployment.'))
    .option('--subscription <subscription>', $('Optional. Subcription containing the deployment to stop'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var deploymentToStop = name;

      if (!name) {
        cli.interaction.withProgress($('Looking for current running deployment'),
          function (log, _) {
            var allRunningDeployments = retrieveDeployments(client, resourceGroup, 'Running', _);
            if (allRunningDeployments && allRunningDeployments.length > 0) {
              if (allRunningDeployments.length > 1) {
                throw new Error($('There are more than 1 deployment in a running state, please name one.'));
              }
              deploymentToStop = allRunningDeployments[0].deploymentName;
              log.info(util.format($('Found a running deployment %s'), deploymentToStop));
            }
            else {
              log.info($('There is no running deployment to stop.'));
            }
          }, _);
      }

      if (deploymentToStop) {
        if (!options.quiet &&
            !cli.interaction.confirm(util.format($('Stop deployment %s? [y/n]: '), deploymentToStop), _)) {
          return;
        }

        var progress = cli.interaction.progress($('Stopping deployment'));

        try {
          client.deployments.cancel(resourceGroup, deploymentToStop, _);
        } finally {
          progress.end();
        }
      }
    });

  deployment.command('create [resource-group] [mode] [name]')
    .description($('Creates a deployment.'))
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the deployment'))
    .option('-y --gallery-template <gallery-template>', $('the name of the template in the gallery'))
    .option('-f --file-template <file-template>', $('the path to the template file, local or remote'))
    .option('--template-hash <template-hash>', $('the expect content hash of the template'))
    .option('--template-hash-algorithm <template-hash-algorithm>', $('the algorithm used to hash the template content'))
    .option('--template-version <template-version>', $('the expect content version of the template'))
    .option('-s --storage-account <storage-account>', $('the storage account where to upload the template file to'))
    .option('-m --mode <mode>', $('the mode of the template deployment. Valid values are Replace, New and Incremental'))
    .option('-p --parameters <parameters>', $('the string in JSON format which represents the parameters'))
    .option('-e --parameters-file <parametersFile>', $('the file with parameters'))
    .option('--parameters-hash <parameters-hash>', $('the expect content hash of the parameters'))
    .option('--parameters-hash-algorithm <parameters-hash-algorithm>', $('the algorithm used to hash the parameters content'))
    .option('--parameters-version <parameters-version>', $('the expect content version of the parameters'))
    .option('--subscription <subscription>', $('Optional. Subcription containing group to delete'))
    .execute(function (resourceGroup, mode, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }

      groupUtils.createDeployment(cli, resourceGroup, mode, name, options, _);
    });
};

function retrieveDeployments(client, resourceGroup, state, _) {
  //Wrap with single quots(needed for constructing RESTful query string)
  var stateFilter = state;
  if (stateFilter && !(utils.stringStartsWith(stateFilter, '\''))) {
    stateFilter = '\'' + stateFilter + '\'';
  }

  var response = client.deployments.list(resourceGroup, { provisioningState: stateFilter }, _);
  var allDeployments = response.deployments;
  var nextLink = response.nextLink;

  while (nextLink) {
    response = client.deployments.listNext(nextLink, _);
    allDeployments.concat(response.deployments);
    nextLink = response.nextLink;
  }

  return allDeployments;
}