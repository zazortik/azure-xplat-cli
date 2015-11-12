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
var utils = require('../../../util/utils');
var insightsUtils = require('./insights.utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var insightsDiagnosticCommand = cli.category('insights').category('diagnostic')
    .description($('Configure diagnostics for resources'))
    .command('set')
      .description($('Set the diagnostics for the resource.'))
      .usage('[options]')
      .option('-i --resourceId <resourceId>', $('The resource Id.'))
      .option('-s --storageId <storageId>', $('The storage account Id.'))
      .option('-e --enabled <enabled>', $('Whether the configuration is enabled or disabled.'))
      .option('-c --categories <categories>', $('Specifies the categories to be affected.'))
      .option('-t --timegrains <timegrains>', $('Specifies the timegrains to be affected.'))
      .execute(function (options, _) {
        insightsDiagnosticCommand._prepareAndExecute(options, _);
      });

  insightsDiagnosticCommand._prepareAndExecute = function (options, _) {
    var client = insightsUtils.createInsightsManagementClient(log, options);
    this._executeCmd(client, options, _);
  };

  insightsDiagnosticCommand._isEmptyOrSpaces = function (str) {
      return str === null || str.match(/^ *$/) !== null;
  };

  insightsDiagnosticCommand._executeCmd = function (client, options, _) {
    var putParameters = {};

    if (options.categories === null && 
        options.timegrains === null && 
        !options.enabled) {
        // This is the only case where no call to get diagnostic settings is necessary. Since we are disabling everything, we just need to request stroage account false.
        putParameters.properties = {};
    }
    else {
      var getResponse = client.serviceDiagnosticSettingsOperations.get(options.resourceId, _);
      var properties = getResponse.properties;
	  var i;
	  var category;

      if (options.enabled && 
          this._isEmptyOrSpaces(options.storageId)) {
          throw new Error('StorageId can\'t be null when enabling');
      }

      if (!this._isEmptyOrSpaces(options.storageId)) {
          properties.storageAccountId = options.storageId;
      }
      
      if (options.categories === null) {
        for (i = 0; i < properties.logs; i++) {
          properties.logs[i].enabled = options.enabled;
        }
      }
      else {
        for (category in options.categories) {
          var logSettings = null;
          for (log in properties.logs) {
            if (logSettings.category === category) {
              logSettings = log;
            }
          }

          for (i = 0; i < properties.logs; i++) {
            if (logSettings.category === category) {
              logSettings = properties.logs[i];
            }
          }

          if (logSettings === null) {
              throw new Error(util.format('Log category \'%s\' is not available for \'%s\'', category, options.storageId));
          }

          logSettings.enabled = options.enabled;
        }   
      }

      if (options.timegrains === null) {
        for (i = 0; i < properties.metrics; i++) {
          properties.metrics[i].enabled = options.enabled;
        }
      }
      else {
        for (var timegrain in options.timegrains) {
          var metricSettings = null;
          for (log in properties.logs) {
            if (metricSettings.category === category) {
              metricSettings = log;
            }
          }

          for (i = 0; i < properties.metrics; i++) {
            if (metricSettings.category === category) {
              metricSettings = properties.metrics[0];
            }
          }

          if (metricSettings === null) {
              throw new Error(util.format('Metric timegrain \'{0}\' is not available for \'{1}\'', timegrain, options.storageId));
          }

          metricSettings.enabled = options.enabled;
        }
      }

      putParameters.properties = properties;
    }

    client.serviceDiagnosticSettingsOperations.put(options.resourceId, putParameters, _);
  };
};
