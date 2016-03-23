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
  var insightsAutoscaleNotificationsCommand = cli.category('insights').category('autoscale').category('notifications')
    .description($('Creates autoscale notifications'));

  var insightsAutoscaleNotificationsWebhookCommand = insightsAutoscaleNotificationsCommand.category('webhook')
    .description($('Creates autoscale webhook notifications'));

  insightsAutoscaleNotificationsWebhookCommand._prepareAndExecuteNotification = function (options) {
    log.silly(util.inspect(options));

    if (!(options.sendEmailToSubscriptionAdministrator || options.sendEmailToSubscriptionCoAdministrators) && 
      ((!options.webhooks || options.webhooks.length < 1) && (!this.customEmails || this.customEmails.length < 1))) {
      throw new Error($('At least one Webhook or one CustomeEmail must be present, or the notification must be sent to the admin or co-admin'));
    }

    var eMailNotification = {
      customEmails: options.customEmails,
      sendToSubscriptionAdministrator: options.sendEmailToSubscriptionAdministrator,
      sendToSubscriptionCoAdministrators: options.sendEmailToSubscriptionCoAdministrators
    };

    var notification = {
      eMail: eMailNotification,
      operation: 'Scale',
      webhooks: options.webhooks
    };

    if (options.json) {
      cli.output.json(notification);
    } else {
      log.data(JSON.stringify(notification));
    }
  };

  insightsAutoscaleNotificationsCommand.command('create')
      .description($('Creates an autoscale notification.'))
      .usage('[options]')
      .option('-e --customEmails <customEmails>', $('The list of end custom e-mails.'))
      .option('-o --sendEmailToSubscriptionAdministrator', $('Flag to send em-mail to the subscription administrator when the rule fires.'))
      .option('-p --sendEmailToSubscriptionCoAdministrators', $('Flag to send em-mail to the subscription coadministrators when the alert fires.'))
      .execute(function (options, _) {
        log.silly('Unused callback: ' + _);
        insightsAutoscaleNotificationsWebhookCommand._prepareAndExecuteNotification(options);
      });
  
  var insightsAlertsWebhookActionsCommand = insightsAutoscaleNotificationsCommand.category('webhook')
    .description($('Creates alert rule webhook actions'));

  insightsAutoscaleNotificationsWebhookCommand._prepareAndExecuteWebhook = function (serviceUri, options) {
    log.silly(serviceUri);
    log.silly(util.inspect(options));

    if (!__.isString(options.serviceUri)) {
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

  insightsAutoscaleNotificationsWebhookCommand.command('create <serviceUri>')
      .description($('Creates an autoscale webhook.'))
      .usage('[options]')
      .option('-e --serviceUri <serviceUri>', $('The service Uri.'))
      .option('-o --properties <properties>', $('The list of property / value pairs.'))
      .execute(function (serviceUri, options, _) {
        log.silly('Unused callback: ' + _);
        insightsAlertsWebhookActionsCommand._prepareAndExecuteWebhook(serviceUri, options);
      });
};
