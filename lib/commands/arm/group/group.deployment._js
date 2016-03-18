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
var fs = require('fs');
var path = require('path');

exports.init = function (cli) {
  var log = cli.output;

  var group = cli.category('group');
  var deployment = group.category('deployment')
      .description($('Commands to manage your deployment in a resource group'));
  var template = deployment.category('template')
      .description($('Commands to manager your deployment template in a resource group'));

  deployment.command('create [resource-group] [name]')
    .description($('Creates a deployment'))
    .option('-g --resource-group <resource-group>', $('the name of the resource group'))
    .option('-n --name <name>', $('the name of the deployment'))
    .fileRelatedOption('-f --template-file <template-file>', $('the path to the template file in the file system'))
    .option('--template-uri <template-uri>', $('the uri to the remote template file'))
    .option('--template-version <template-version>', $('the content version of the template'))
    .option('-p --parameters <parameters>', $('a JSON-formatted string containing parameters'))
    .fileRelatedOption('-e --parameters-file <parametersFile>', $('a file containing parameters'))
    .option('-m --mode <mode>', $('the deployment mode: specify one of Incremental or Complete. If no mode is specified, Incremental is used as default. When Complete mode is used, all the resources in the specified resource group, which are not included in the template, will be deleted.'))
    .option('-d --debug-setting <debugSetting>', $('the debug setting for deployment logs. Valid values include RequestContent, ResponseContent, All or None. None is the default value. When All is specified, both request content and response content will be logged, which will be visible in deployment operations.'))
    .option('-q --quiet', $('quiet mode (when complete mode is specified, do not ask for deployment confirmation)'))
    .option('--nowait', $('does not wait for the deployment to complete. Returns as soon as the deployment is created'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }

      if (options.mode && !utils.ignoreCaseEquals(options.mode, 'complete') && !utils.ignoreCaseEquals(options.mode, 'incremental')) {
        throw new Error('Please provide a valid deployment mode: Complete or Incremental.');
      }

      if (options.debugSetting && !utils.ignoreCaseEquals(options.debugSetting, 'all') &&
        !utils.ignoreCaseEquals(options.debugSetting, 'requestcontent') &&
        !utils.ignoreCaseEquals(options.debugSetting, 'responsecontent') &&
        !utils.ignoreCaseEquals(options.debugSetting, 'none')) {
        throw new Error('Please provide a valid debug setting: RequestContent, ResponseContent, All or None. Default will be None.');
      }

      if (!options.quiet && utils.ignoreCaseEquals(options.mode, 'complete') &&
        !cli.interaction.confirm(util.format($('Are you sure you want to use the Complete deployment mode? Resources in resource group %s, which are not included in the template will be deleted. [y/n] '), resourceGroup), _)) {
        return;
      }

      var deployment = groupUtils.createDeployment(cli, resourceGroup, name, options, _);
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);

      if (!options.nowait) {
        cli.interaction.withProgress($('Waiting for deployment to complete'),
        function (log, _) {
          do {
            deployment = client.deployments.get(resourceGroup, deployment.name, _);
            setTimeout(_, 5000);
          } while (deployment.properties.provisioningState === 'Running' || deployment.properties.provisioningState === 'Accepted');

          if (deployment.properties.provisioningState !== 'Succeeded') {
            log.error('Deployment provisioning state was not successful');

            //display nested template deployment errors, if any exists
            var failedOperations = groupUtils.getFailedDeploymentOperations(options.subscription, resourceGroup, deployment.name, _);

            failedOperations.forEach(function (operation) {
              if (operation.properties.statusMessage.error) {
                log.error(operation.properties.statusMessage.error.message);

                if (operation.properties.statusMessage.error.details) {
                  operation.properties.statusMessage.error.details.forEach(function (detail) {
                    if (detail.message) {
                      log.error(detail.message);
                    }
                    if (detail.details) {
                      detail.details.forEach(function (innerDetail) {
                        if (innerDetail.message) {
                          log.error(innerDetail.message);
                        }
                      });
                    }
                  });
                }
              }
            });
          }
        },
        _);
      }

      if (deployment) {
        cli.interaction.formatOutput(deployment, function (data) {
          if (data) {
            displayDeployment(data, resourceGroup, true, log);
          }
        });
      }
    });  

  deployment.command('list [resource-group] [state]')
    .usage('[options] <resource-group> [state]')
    .description($('Gets deployments'))
    .option('-g --resource-group <resourceGroup>', $('the name of the resource group.'))
    .option('--state <state>', $('filter the deployments by provisioning state (valid ' +
      'values are Accepted, Running, Failed, and Succeeded)'))
    .option('--subscription <subscription>', $('subscription containing deployments to list (optional)'))
    .execute(function (resourceGroup, state, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);
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
            displayDeployment(deployment, resourceGroup, false, log);
            if (i !== outputData.length - 1) {
              //Insert an empty line between each deployment.
              log.data($(''));
            }
          }
        }
      });
    });

  deployment.command('show [resource-group] [name]')
    .usage('[options] <resource-group> [deployment-name]')
    .description($('Shows a deployment'))
    .option('-g --resource-group <resourceGroup>', $('the name of the resource group.'))
    .option('-n --name <name>', $('the name of the deployment (if not specified, the most recent deployment is shown)'))
    .option('--subscription <subscription>', $('subscription containing the deployment to display (optional)'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);
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
        cli.interaction.formatOutput(deployment, function (data) {
          if (data) {
            displayDeployment(data, resourceGroup, true, log);
          }
        });
      }
    });

  deployment.command('stop [resource-group] [name]')
    .usage('[options] <resource-group> [deployment-name]')
    .description($('Stops a deployment'))
    .option('-g --resource-group <resourceGroup>', $('the name of the resource group'))
    .option('-q --quiet', $('quiet mode (do not ask for stop deployment confirmation)'))
    .option('-n --name <name>', $('the name of the deployment (if not specified, the currently running deployment is stopped)'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);
      var deploymentToStop = name;

      if (!name) {
        cli.interaction.withProgress($('Looking for "Running" or "Accepted" deployment'),
          function (log, _) {
            //We leverage service side filtering for simplicity and less payload on the wire. If user data
            //proves the extra round trip causes non-trivial latency, we can choose to do it at the client side.
            var allAcceptedDeployments = retrieveDeployments(client, resourceGroup, 'Accepted', _);
            var allRunningDeployments = retrieveDeployments(client, resourceGroup, 'Running', _);
            var allCancellableDeployments = allAcceptedDeployments;
            if (!allCancellableDeployments){
              allCancellableDeployments = allRunningDeployments;
            } else {
              allCancellableDeployments = allCancellableDeployments.concat(allRunningDeployments);
            }

            if (allCancellableDeployments && allCancellableDeployments.length > 0) {
              if (allCancellableDeployments.length > 1) {
                throw new Error($('There are more than 1 deployment in either "Running" or "Accepted" state, please name one.'));
              }
              deploymentToStop = allCancellableDeployments[0].name;
              log.info(util.format($('Found a deployment: %s'), deploymentToStop));
            }
            else {
              log.info($('There is no deployment to stop.'));
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

  deployment.command('delete [resource-group] [name]')
    .usage('[options] <resource-group> <deployment-name>')
    .description($('Deletes a deployment'))
    .option('-g --resource-group <resourceGroup>', $('the name of the resource group.'))
    .option('-n --name <name>', $('the name of the deployment.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('--subscription <subscription>', $('subscription containing the deployment to display (optional)'))
    .execute(function (resourceGroup, name, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete deployment %s? [y/n] '), name), _)) {
        return;
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);
      try {
        client.deployments.checkExistence(resourceGroup, name, _);
      }
      catch(err) {
        throw new Error($('The deployment does not exist.'));
      }

      var progress = cli.interaction.progress($('Deleting deployment'));
      try{
        client.deployments.deleteMethod(resourceGroup, name, _);
      }
      finally {
        progress.end();
      }
    });

  template.command('download [resource-group] [name] [directory]')
    .description($('Downloads a resource group deployment template'))
    .usage('[options] [resource-group] [name] [directory]')
    .option('-g --resource-group <resourceGroup>', $('the name of the resource group.'))
    .option('-n --name <name>', $('the name of the deployment to download'))
    .option('-d --directory <directory>', $('the name of the destination directory. If not specified, template file will be saved in the current directory.'))
    .option('-q --quiet', $('quiet mode (do not prompt for overwrite if output file exists)'))
    .option('--subscription <subscription>', $('subscription containing the deployment to display (optional)'))
    .execute(function (resourceGroup, name, directory, options, _) {
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      if (!name) {
        return cli.missingArgument('name');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createResourceClient(subscription);
      try {
        client.deployments.checkExistence(resourceGroup, name, _);
      }
      catch (err) {
        throw new Error(util.format($('Deployment %s does not exist in resource group %s'), name, resourceGroup));
      }

      var confirm = cli.interaction.confirm.bind(cli.interaction);
      var result = cli.interaction.withProgress(
        util.format($('Getting resource group deployment template %s'), name),
        function (log, _) {
          return client.deployments.exportTemplate(resourceGroup, name, _);
        }, _);

      var template = result.template;
      var fileName = directory ? path.join(directory, name + '.json') : path.join(process.cwd(), name + '.json');
      fileName = groupUtils.normalizeDownloadFileName(fileName, options.quiet, confirm, _);
      if (fileName) {
        fs.writeFileSync(fileName, JSON.stringify(template));
        log.info(util.format($('Deployment template downloaded to %s'), fileName));
      }
    });
};

function retrieveDeployments(client, resourceGroup, state, _) {
  var parameters = {};
  if (state) {
    parameters.filter = 'provisioningState eq \'' + state + '\'';
  }
  var response = client.deployments.list(resourceGroup, parameters, _);
  var allDeployments = response;
  var nextLink = response.nextLink;

  while (nextLink) {
    response = client.deployments.listNext(nextLink, _);
    allDeployments = allDeployments.concat(response);
    nextLink = response.nextLink;
  }

  return allDeployments;
}

function displayDeployment(deployment, resourceGroup, showDetail, log) {
  log.data($('DeploymentName     :'), deployment.name || deployment.deploymentName);
  log.data($('ResourceGroupName  :'), resourceGroup);
  log.data($('ProvisioningState  :'), deployment.properties.provisioningState);
  log.data($('Timestamp          :'), deployment.properties.timestamp);
  log.data($('Mode               :'), deployment.properties.mode);
  log.data($('CorrelationId      :'), deployment.properties.correlationId);
  if (showDetail) {
    if (deployment.properties.templateLink) {
      log.data($('TemplateLink       :'), deployment.properties.templateLink.uri);
      log.data($('ContentVersion     :'), deployment.properties.templateLink.contentVersion);
    }
    if (deployment.properties.parameters && Object.keys(deployment.properties.parameters).length > 0) {
      log.data($('DeploymentParameters :'));
      log.table(deployment.properties.parameters, function (row, item) {
        row.cell($('Name'), item);
        row.cell($('Type'), deployment.properties.parameters[item].type);
        row.cell($('Value'), deployment.properties.parameters[item].value);
      });
    }
  }
  if (deployment.properties.outputs && Object.keys(deployment.properties.outputs).length > 0) {
    log.data($('Outputs            :'));
    log.table(deployment.properties.outputs, function (row, item) {
      row.cell($('Name'), item);
      row.cell($('Type'), deployment.properties.outputs[item].type);
      row.cell($('Value'), deployment.properties.outputs[item].value);
    });
  }
  if (deployment.properties.debugSetting && deployment.properties.debugSetting.detailLevel) {
    log.data($('DebugSetting       :'), deployment.properties.debugSetting.detailLevel);
  }
}
