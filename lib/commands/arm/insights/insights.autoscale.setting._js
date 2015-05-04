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
var utils = require('../../../util/utils');
var insightsUtils = require('./insights.utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var insightsAutoscaleSettingCommand = cli.category('insights').category('autoscale').category('setting')
    .description($('Manages autoscale settings'));

  insightsAutoscaleSettingCommand.command('list <resourceGroup>')
    .description($('List autoscale settings for a resource.'))
    .usage('[options] <resourceGroup>')
    .option('-g --resourceGroup <resourceGroup>', $('The resource group.'))
    .option('-n --settingName <settingName>', $('The name of the setting.'))
    .execute(function (resourceGroup, options, _) {
      insightsAutoscaleSettingCommand._prepareAndExecute(resourceGroup, options, _);
    });

  insightsAutoscaleSettingCommand.command('delete <resourceGroup> <settingName>')
    .description($('Deletes an autoscale setting.'))
    .usage('[options] <resourceGroup> <settingName>')
    .option('-g --resourceGroup <resourceGroup>', $('The resource group.'))
    .option('-n --settingName <settingName>', $('The name of the setting.'))
    .execute(function (resourceGroup, settingName, options, _) {
      insightsAutoscaleSettingCommand._prepareAndExecuteDelete(resourceGroup, settingName, options, _);
    });

  insightsAutoscaleSettingCommand._prepareAndExecute = function (resourceGroup, options, _) {
    if (!__.isString(resourceGroup)) {
      cli.missingArgument('resourceGroup');
    }

    var client = insightsUtils.createInsightsManagementClient(log, options);

    this._executeCmd(client, resourceGroup, options.settingName, options, _);
  };

  insightsAutoscaleSettingCommand._prepareAndExecuteDelete = function (resourceGroup, settingName, options, _) {
    if (!__.isString(resourceGroup)) {
      cli.missingArgument('resourceGroup');
    }

    if (!__.isString(settingName)) {
      cli.missingArgument('settingName');
    }

    var client = insightsUtils.createInsightsManagementClient(log, options);

    this._executeDeleteCmd(client, resourceGroup, settingName, options, _);
  };

  insightsAutoscaleSettingCommand._executeCmd = function (client, resourceGroup, settingName, options, _) {
    var progress = cli.interaction.progress($('Querying for autoscale settings'));
    var result = [];
    var response;
    try {
      if (__.isNull(settingName) || __.isUndefined(settingName) || (__.isString(settingName) && settingName === '')) {
        log.silly('Query by resourceGroup only');
        response = client.autoscaleOperations.listSettings(resourceGroup, null, _);

        log.silly(!response ? util.inspect(response) : 'nothing in response');
        log.silly(!response && response.autoscaleSettingResourceCollection ? util.inspect(response.autoscaleSettingResourceCollection) : 'nothing in autoscaleSettingResourceCollection');

        // TODO add the detailed output functionality (null parameter for the moment)
        __.each(response.autoscaleSettingResourceCollection.value, function (element) { result.push(element); });
      } else {
        log.silly('Query by setting name');
        response = client.autoscaleOperations.getSetting(resourceGroup, settingName, _);

        log.silly(!response ? util.inspect(response) : 'nothing in response');

        // TODO add the detailed output functionality (null parameter for the moment)
        result.push(response);
      }
    } finally {
      progress.end();
    }  

    insightsUtils.formatOutputList(cli, log, options, result);
  };

  insightsAutoscaleSettingCommand._executeDeleteCmd = function (client, resourceGroup, settingName, options, _) {
    var progress = cli.interaction.progress(utils.format($('Deleting autoscale setting \"%s\"'), settingName));
    var response = null;
    try {
      response = client.autoscaleOperations.deleteSetting(resourceGroup, settingName, _);

      log.silly(!response ? util.inspect(response) : 'nothing in response');
    } finally {
      progress.end();
    }  
    
    insightsUtils.formatOutput(cli, log, options, response); 
  };
};
