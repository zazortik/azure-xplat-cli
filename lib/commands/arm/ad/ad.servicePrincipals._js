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
    .description($('Commands to display Active Directory objects'));
  var adSP = ad.category('sp')
    .description($('Commands to display Active Directory service principals'));

  adSP.command('list')
    .description($('Get all Active Directory service principals in current subscription\'s tenant'))
    .option('| more', $('Provides paging support. Press \'Enter\' for more information.'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing Active Directory service principals'));
      try {
        adUtils.listGraphObjects(client, 'servicePrincipal', cli.interaction, log, _);
      } finally {
        progress.end();
      }
    });

  adSP.command('show')
    .description($('Get Active Directory service principals'))
    .option('-n --spn <spn>', $('the name of the service principal to return'))
    .option('-o --objectId <objectId>', $('the object id of the service principal to return'))
    .option('-c --search <search>', $('search display name of the service principal starting with the provided value'))
    .execute(function (options, _) {
      var spn = options.spn,
          objectId = options.objectId,
          search = options.search;

      adUtils.validateParameters({
        spn: spn,
        objectId: objectId,
        search:search
      });
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Getting Active Directory service principals'));
      var servicePrincipals = [];
      var parameters = null;
      try {
        if (spn) {
          parameters = { filter: 'servicePrincipalNames/any(c:c eq \'' + spn + '\')' };
          servicePrincipals = client.servicePrincipals.list(parameters, _);
        } else if (objectId) {
          var servicePrincipal = client.servicePrincipals.get(objectId, _);
          if (servicePrincipal) {
            servicePrincipals.push(servicePrincipal);
          }
        } else {
          parameters = { filter: 'startswith(displayName,\'' + search + '\')' };
          servicePrincipals = client.servicePrincipals.list(parameters, _);
        }
      } finally {
        progress.end();
      }

      if (servicePrincipals.length > 0) {
        adUtils.displayServicePrincipals(servicePrincipals, cli.interaction, log);
      } else {
        log.data($('No matching service principal was found'));
      }
    });

  adSP.command('create')
    .description($('Create Active Directory service principal.'))
    .option('-a --applicationId <applicationId>', $('The application Id for which service principal needs to be created. ' +
      'If this is provided then everything else will be ignored. \nWhen the applicationId is provided it means that the ' + 
      'application was already created and it needs to be used to create the service principal.'))
    .option('-n --name <name>', $('the display name for the application'))
    .option('-m --home-page <home-page>', $('the URL to the application homepage'))
    .option('-b --available', $('indicates if the application will be available to other tenants'))
    .option('-p --password <password>', $('the value for the password credential associated with the application that will be valid for one year by default'))
    .option('-i --identifier-uris <identifier-uris>', $('the comma-delimitied URIs that identify the application'))
    .option('-r --reply-urls <reply-urls>', $('the comma-delimitied application reply urls'))
    .option('--key-value <key-value>', $('the value for the key credentials associated with the application that will be valid for one year by default'))
    .option('--key-type <key-type>', $('the type of the key credentials associated with the application. Acceptable values are AsymmetricX509Cert, Password and Symmetric'))
    .option('--key-usage <key-usage>', $('the usage of the key credentials associated with the application. Acceptable values are Sign and Verify'))
    .option('--start-date <start-date>', $('the start date after which password or key would be valid. Default value is current time'))
    .option('--end-date <end-date>', $('the end date till which password or key is valid. Default value is one year after current time'))
    .execute(function (options, _) {

      var applicationId = options.applicationId;
      if (!applicationId) {
        var application = adUtils.createApplication(cli, options.name, options.homePage, options.identifierUris, options, _);
        applicationId = application.appId;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);

      var spParams = {
        accountEnabled: true,
        appId: applicationId
      };

      var servicePrincipal = withProgress(util.format($('Creating service principal for application %s'), applicationId),
      function (log, _) {
        return client.servicePrincipals.create(spParams, _);
      }, _);

      cli.interaction.formatOutput(servicePrincipal, function (data) {
        if (data) {
          adUtils.displayAServicePrincipal(data, log);
        }
      });
    });

  adSP.command('delete [objectId]')
    .description($('Deletes Active Directory service principal.'))
    .usage('[options] <objectId>')
    .option('-o --objectId <objectId>', $('the object id of the service principal to delete'))
    .option('-p --preserve-application', $('Default value: false. If you do not want to delete the underlying application then set this flag.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (objectId, options, _) {
      if (!objectId) {
        return cli.missingArgument('objectId');
      }

      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete service principal %s? [y/n] '), objectId), _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress(util.format($('Deleting service principal %s'), objectId));
      try {
        if(options.preserveApplication) {
          log.info('Preserving the underlying application.');
          client.servicePrincipals.deleteMethod(objectId, _);
        } else {
          var servicePrincipal = client.servicePrincipals.get(objectId, _);
          var parameters = { filter: 'appId eq \'' + servicePrincipal.appId + '\'' };
          var applications = client.applications.list(parameters, _);
          var applicationObjectId = applications[0].objectId;
          client.applications.deleteMethod(applicationObjectId, _);
        }
      } finally {
        progress.end();
      }
    });
};