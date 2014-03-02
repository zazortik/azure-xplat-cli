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
var fs = require('fs');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group');
  var deployment = group.category('deployment')
      .description($('Commands to manage your deployment in a resource group'));

  deployment.command('list [resourceGroup] [state]')
    .description($('get deployments'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('--state <state>', $('Optional. Filter the deployments by provisioning state. Valid values are Accepted, Running, Failed and Succeeded'))
    .option('--subscription <subscription>', $('Subscription to create resource in'))
    .execute(function(resourceGroup, state, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('listing deployments'));
      try {
        //TODO: how to pass in state w/o a quot in command line?
        var allDeployments = GetAllDeployment(client, resourceGroup, state, _);

        cli.interaction.formatOutput(allDeployments, function (outputData) {
          if (outputData) {
            for (var i = 0; i < outputData.length; i++) {
              var deployment = outputData[i];
              log.data($('================'), deployment.deploymentName);
              cli.interaction.logEachData($(''), deployment);
              cli.interaction.logEachData($(''), deployment.properties);
              //log.data($('Name:             '), deployment.deploymentName);
              //log.data($('ResourceGroup:    '), deployment.resourceGroup)
              //log.data($('ProvisionState:   '), deployment.properties.provisioningState);
              //log.data($('Timestamp:        '), deployment.properties.timestamp);
              //log.data($('Mode:             '), deployment.properties.mode);
              //log.data($('TemplateLink:     '), deployment.properties.templateLink.uri);
              //log.data($('Parameters:'));
              cli.interaction.logEachData($(''), deployment.properties.parameters);
            }
          }
       });
      } finally {
        progress.end();
      }
    });

  deployment.command('show [resourceGroup] [deploymentName]')
    .usage('[options] <resource-group> <deploymentName>')
    .description($('get deployments'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('--deploymentName <deploymentName>', $('Optional. The name of the deployment'))
	  .option('--subscription <subscription>', $('Subscription to create resource in'))
    .execute(function(resourceGroup, deploymentName, options, _) {

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('getting deployments'));
      var deployment;
      try {
        if (deploymentName) {
          deployment = client.deployments.get(resourceGroup, deploymentName, _);
        }
        else {
          var allDeployments = GetAllDeployment(client, resourceGroup, '', _);
          if (allDeployments && allDeployments.length > 0) {
            allDeployments.sort(function (a, b) { return Date.parse(a.properties.timestamp) < parseFloat(b.properties.timestamp) });
            deployment = allDeployments[0];
          }
        }
        if (deployment){
          log.data($('================'), deployment.name || deployment.deploymentName);
          cli.interaction.logEachData($(''), deployment);
          cli.interaction.logEachData($(''), deployment.properties);
          cli.interaction.logEachData($(''), deployment.properties.parameters);
        }
      } finally {
        progress.end();
      }
  });
  
  deployment.command('stop [resourceGroup]')
    .description($('stop current running deployment'))
    .option('-g --resource-group <resourceGroup>', $('Name of the resource group.'))
    .option('-q --quiet', $('quiet mode. Do not ask confirmation for stop deployment'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
    .execute(function (resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('stopping running deployment'));

      try{
        var allRunningDeployments = GetAllDeployment(client, resourceGroup, '\'Failed\'', _);
        var runningDeployment;
        //TODO: assert only one member in the array?
        //TODO: figure out the variable declaration position.
        //TODO: print out nothing to do errors
        //TODO: figure out using single quot or double quot for strings
        if (allRunningDeployments && allRunningDeployments.length > 0) {
          runningDeployment = allRunningDeployments[0];
          //TODO: why i will need to press ENTER twice
          if (!options.quiet && !cli.interaction.confirm(util.format($('stop deployment %s? [y/n]:'), runningDeployment.deploymentName), _)) {
            log.data($('Quitting'));
            return;
          }
          client.deployments.cancel(resourceGroup, runningDeployment.deploymentName, _);
        }
        else {
          log.data($('No running deployment to stop'));
        }
      }
      finally {
        progress.end();
      }
    }
  )

  deployment.command('create [templateLink] [resourceGroup] [mode] [deploymentName] [parametersFile]')
    .option('-f --template-link <templateLink>', $('uri to the template file'))
    .option('-g --resource-group <resourceGroup>', $('name of the resource group'))
    .option('-m --mode <mode>', $('mode of the template deployment. Valid values are Repalce, New and Incremental'))
    .option('-n --deployment-name <deploymentName>', $('name of the deployment'))
    .option('-p --parameters-file <parametersFile>', $('file with parameters'))
    .option('--subscription <subscription>', $('Subcription containing group to delete'))
    .execute(function (templateLink, resourceGroup, mode, deploymentName, parametersFile, options, _) {
      function stripBOM(content) {
        if (content.charCodeAt(0) === 0xFEFF) {
          content = content.slice(1);
        }
        return content;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');
      var progress = cli.interaction.progress($('starting to create deployment'));

      var jsonFile = fs.readFileSync('params.json', 'utf8');
      var deploymentParameters = JSON.parse(stripBOM(jsonFile));

      try{
        client.deployments.create(resourceGroup, deploymentName,
          {
            'parameters': deploymentParameters.properties.parameters,
            'mode':       mode,
            'templateLink':
            {
                'uri': templateLink
            }
          }
          ,_
       )
      }
      finally {
        progress.end();
      }

    })
  
};

function GetAllDeployment(client, resourceGroup, state, _) {

  var response = client.deployments.listForResourceGroup(resourceGroup, { provisioningState: state }, _);
  var allDeployments = response.deployments;
  var nextLink = response.nextLink;

  while (nextLink) {
    client.deployments.listNext(nextLink, function (newSet) {
      allDeployments.concat(newSet.deployments);
      nextLink = nextSet.nextLink;
    })
  }
  return allDeployments;
}