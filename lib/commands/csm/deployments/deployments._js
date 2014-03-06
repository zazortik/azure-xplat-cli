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

var fs = require('fs');
var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group');
  var deployment = group.category('deployment')
      .description($('Commands to manage your deployment in a resource group'));

  deployment.command('list [resourceGroup] [state]')
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

  deployment.command('show [resourceGroup] [deploymentName]')
    .description($('get deployments'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('-n --deployment-name <deploymentName>', $('Name of the deployment'))
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
          deployment = client.deployments.get(resourceGroup, name, _);
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

  deployment.command('stop [resourceGroup] [deploymentName]')
    .description($('stop current running deployment'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('-q --quiet', $('Quiet mode. Do not ask confirmation for stop deployment'))
    .option('-n --deployment-name <deploymentName>', $('Optional. Name of the deployment. ' +
        "If not specified, stop the current running deployment."))
    .option('--subscription <subscription>', $('Optional. Subcription containing the deployment to stop'))
    .execute(function (resourceGroup, deploymentName, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('Stopping deployment'));

      try {
        var deploymentToStop = deploymentName;

        if (!deploymentName){
          var allRunningDeployments = retrieveDeployments(client, resourceGroup, '\'Running\'', _);
          if (allRunningDeployments && allRunningDeployments.length > 0) {
            if (allRunningDeployments.length > 1) {
              throw new Error($('There are more than 1 deployment in a running state, please name one.'));
            }
            deploymentToStop = allRunningDeployments[0].deploymentName;
          }
        }

        if (deploymentToStop) {
          if (!options.quiet &&
              !cli.interaction.confirm(util.format($('Stop deployment %s? [y/n]: '), deploymentToStop), _)) {
            return;
          }
          client.deployments.cancel(resourceGroup, deploymentToStop, _);
        }
      }
      finally {
        progress.end();
      }
    });

  deployment.command('create [templateLink] [resourceGroup] [mode] [deploymentName] [parametersFile]')
    .option('-f --template-link <templateLink>', $('uri to the template file'))
    .option('-g --resource-group <resourceGroup>', $('name of the resource group'))
    .option('-m --mode <mode>', $('mode of the template deployment. Valid values are Repalce, New and Incremental'))
    .option('-n --deployment-name <deploymentName>', $('name of the deployment'))
    .option('-p --parameters-file <parametersFile>', $('file with parameters'))
    .option('--subscription <subscription>', $('Optional. Subcription containing group to delete'))
    .execute(function (templateLink, resourceGroup, mode, deploymentName, parametersFile, options, _) {

      function stripBOM(content) {
        var BOM_CHAR_CODE = 65279;
        var bom = String.fromCharCode(BOM_CHAR_CODE);

        if (content.charCodeAt(0) === bom) {
          content = content.slice(1);
        }
        return content;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('starting to create deployment'));

      var jsonFile = fs.readFileSync(parametersFile, 'utf8');
      var deploymentParameters = JSON.parse(stripBOM(jsonFile));

      try {
        client.deployments.createOrUpdate(resourceGroup,
          deploymentName,
          {
            'parameters': deploymentParameters.properties.parameters,
            'mode': mode,
            'templateLink':
            {
              'uri': templateLink
            }
          },
          _
       );
      }
      finally {
        progress.end();
      }
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
  var callback = function (newSet) {
    allDeployments.concat(newSet.deployments);
    nextLink = newSet.nextLink;
  };

  while (nextLink) {
    client.deployments.listNext(nextLink, callback, _);
  }
  return allDeployments;
}