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

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var insightsAlertsActionsCommand = cli.category('insights').category('alerts').category('actions')
    .description($('Creates alert rules actions'));

  var insightsAlertsEmailActionsCommand = insightsAlertsActionsCommand.category('email')
    .description($('Creates alert rule e-mail actions'));

  insightsAlertsEmailActionsCommand._prepareAndExecuteEmailAction = function (options) {
    log.silly('options: ' + util.inspect(options));

    var customEmails;
    if (__.isString(options.customEmails)) {
      customEmails = options.customEmails.split(',');
    }
    else if (__.isArray(options.customEmails)) {
      customEmails = options.customEmails;
    } else if (__.isObject(options.customEmails)) {
      customEmails = __.toArray(options.customEmails);
    } else {
      throw new Error(util.format($('Incorect value for customEmails: %s'), options.customEmails));
    }

    if (!options.sendToServiceOwners && (__.isNull(customEmails) || __.isUndefined(customEmails) || customEmails.length < 1)) {
      throw new Error($('Either sendToServiceOwners must be set or at least one custom email must be present'));
    }

    var eMailAction = {
      customEmails: customEmails,
      sendToServiceOwners: options.sendToServiceOwners
    };

    if (options.json) {
      cli.output.json(eMailAction);
    } else {
      log.data(JSON.stringify(eMailAction));
    }
  };

  insightsAlertsEmailActionsCommand.command('create')
      .description($('Creates an alert rule e-mail action.'))
      .usage('[options]')
      .option('-e --customEmails <customEmails>', $('The string that represents thead list of end custom e-mails; the e-mails must be comma-separated.'))
      .option('-o --sendToServiceOwners', $('Flag to send em-mail to the service owners when the alert fires.'))
      .execute(function (options, _) {
        log.silly('Unused callback: ' + _);
        insightsAlertsEmailActionsCommand._prepareAndExecuteEmailAction(options);
      });
  
  var insightsAlertsWebhookActionsCommand = insightsAlertsActionsCommand.category('webhook')
    .description($('Creates alert rule webhook actions'));

  insightsAlertsWebhookActionsCommand._prepareAndExecuteWebhookAction = function (serviceUri, options) {
    log.silly('serviceUri: ' + serviceUri);
    log.silly('options: ' + util.inspect(options));

    if (!__.isString(serviceUri)) {
      cli.missingArgument('serviceUri');
    }

    var webhookAction = {
      serviceUri: serviceUri,
      properties: options.properties
    };

    if (options.json) {
      cli.output.json(webhookAction);
    } else {
      log.data(JSON.stringify(webhookAction));
    }
  };

  insightsAlertsWebhookActionsCommand.command('create <serviceUri>')
      .description($('Creates an alert rule webhook action.'))
      .usage('[options] <serviceUri>')
      .option('-e --serviceUri <serviceUri>', $('The service Uri.'))
      .option('-o --properties <properties>', $('The list of property / value pairs.'))
      .execute(function (serviceUri, options, _) {
        log.silly('Unused callback: ' + _);
        insightsAlertsWebhookActionsCommand._prepareAndExecuteWebhookAction(serviceUri, options);
      });
};
