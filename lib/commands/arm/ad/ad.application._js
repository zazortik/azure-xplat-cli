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
var adUtils = require('./adUtils');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var util = require('util');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  var ad = cli.category('ad')
    .description($('Commands to display active directory objects'));
  var adApp = ad.category('app')
    .description($('Commands to display active directory applications'));

  adApp.command('create')
    .description($('Creates a new active directory application'))
    .option('-n --name <name>', $('the display name for the application'))
    .option('--home-page <home-page>', $('the URL to the application homepage'))
    .option('-a --available', $('indicates if the application will be available to other tenants'))
    .option('-p --password <password>', $('the value for the password credential associated with the application that will be valid for one year by default'))
    .option('-i --identifier-uris <identifier-uris>', $('the comma-delimitied URIs that identify the application'))
    .option('--key-value <key-value>', $('the value for the key credentials associated with the application that will be valid for one year by default'))
    .option('--key-type <key-type>', $('the type of the key credentials associated with the application. Acceptable values are AsymmetricX509Cert, Password and Symmetric'))
    .option('--key-usage <key-usage>', $('the usage of the key credentials associated with the application. Acceptable values are Sign and Verify'))
    .option('--start-date <start-date>', $('the start date after which password or key would be valid. Default value is current time'))
    .option('--end-date <end-date>', $('the end date till which password or key is valid. Default value is one year after current time'))
    .execute(function (options, _) {
      if (!options.name || !options.homePage || !options.identifierUris) {
        throw new Error($('--name, --home-page and --identifier-uris are all required parameters.'));
      }
      if (options.password && options.keyValue) {
        throw new Error($('specify either --password or --key-value, but not both'));
      }

      var startDate = options.startDate ? new Date(Date.parse(options.startDate)) : new Date(Date.now());
      var endDate = (function () {
        if (options.endDate) {
          return new Date(Date.parse(options.endDate));
        } else {
          var date = new Date(startDate);
          date.setFullYear(startDate.getFullYear() + 1);
          return date;
        }
      })();

      var keyType = options.keyType ? options.KeyType : 'AsymmetricX509Cert';
      var keyUsage = options.keyUsage ? options.keyUsage : 'Verify';

      var uris = options.identifierUris ? options.identifierUris.split(',') : [];

      var appParams = {
        availableToOtherTenants: options.available ? true : false,
        displayName: options.name,
        homepage: options.homePage,
        identifierUris: uris
      };

      if (options.password) {
        appParams.passwordCredentials = [{
          startDate: startDate,
          endDate: endDate,
          keyId: utils.uuidGen(),
          value: options.password
        }];
      } else if (options.keyValue) {
        appParams.keyCredentials = [{
          startDate: startDate,
          endDate: endDate,
          keyId: utils.uuidGen(),
          value: options.keyValue,
          usage: keyUsage,
          type: keyType
        }];
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);

      var application = null;
      try {
        application = withProgress(util.format($('Creating application %s'), options.name),
        function (log, _) {
          return client.application.create(appParams, _).application;
        }, _);
      } catch (ex) {
        if (ex.statusCode && ex.statusCode === 403) {
          // Check if the User is a Guest user
          var currentUserObject = client.objects.getCurrentUser(_).aADObject;
          if (currentUserObject && currentUserObject.userType && currentUserObject.userType === 'Guest') {
            throw new Error($('Creating an application is not allowed for a Guest user. Please contact your administrator to be added as a member in your tenant.'));
          }
        }
        throw ex;
      }

      cli.interaction.formatOutput(application, function (data) {
        if (data) {
          adUtils.displayAApplication(data, log);
        }
      });
    });

  adApp.command('delete [objectId]')
    .description($('Deletes the active directory application'))
    .usage('[options] <object-id>')
    .option('--objectId <objectId>', $('the object id of the application to remove'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (objectId, options, _) {
      if (!objectId) {
        return cli.missingArgument('objectId');
      }

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete application %s? [y/n] '), objectId), _)) {
        return;
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress(util.format($('Deleting application %s'), objectId));
      try {
        client.application.deleteMethod(objectId, _);
      } finally {
        progress.end();
      }
    });

  adApp.command('list')
    .description($('Get all active directory applications in current subscription\'s tenant'))
    .execute(function (options, _) {

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var appParams = {};

      var applications = withProgress(util.format($('Listing applications')),
      function (log, _) {
        return client.application.list(appParams, _).applications;
      }, _);

      adUtils.displayApplications(applications, cli.interaction, log);
    });

  adApp.command('show')
    .description($('Get active directory applications'))
    .option('--appId <appId>', $('the name of the application to return'))
    .option('--objectId <objectId>', $('the object id of the application to return'))
    .option('--identifierUri <identifierUri>', $('the identifier uri of the application to return'))
    .option('--search <search>', $('search display name of the application starting with the provided value'))
    .execute(function (options, _) {
      var appId = options.appId,
          objectId = options.objectId,
          identifierUri = options.identifierUri,
          search = options.search;

      adUtils.validateParameters({
        appId: appId,
        objectId: objectId,
        identifierUri: identifierUri,
        search: search
      });

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting active directory application(s)'));
      var applications = [];
      var parameters = null;
      try {
        if (appId) {
          parameters = {appId: appId};
          applications = client.application.list(parameters, _).applications;
        } else if (objectId) {
          var app = client.application.get(objectId, _).application;
          if (app) {
            applications.push(app);
          }
        } else if (identifierUri) {
          parameters = { identifierUri: identifierUri };
          applications = client.application.list(parameters, _).applications;
        } else if (search) {
          parameters = { displayNameStartsWith: search };
          applications = client.application.list(parameters, _).applications;
        }
      } finally {
        progress.end();
      }

      if (applications.length > 0) {
        adUtils.displayApplications(applications, cli.interaction, log);
      } else {
        log.data($('No matching application was found'));
      }
    });
};
