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
  var adSP = ad.category('sp')
    .description($('Commands to display active directory service principals'));

  adSP.command('list')
    .description($('Get all active directory service principals in current subscription\'s tenant'))
    .option('| more', $('Provides paging support. Press \'Enter\' for more information.'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing active directory service principals'));
      try {
        adUtils.listGraphObjects(client, 'servicePrincipal', cli.interaction, log, _);
      } finally {
        progress.end();
      }
    });

  adSP.command('show')
    .description($('Get active directory service principals'))
    .option('--spn <spn>', $('the name of the service principal to return'))
    .option('--objectId <objectId>', $('the object id of the service principal to return'))
    .option('--search <search>', $('search display name of the service principal starting with the provided value'))
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
      var progress = cli.interaction.progress($('Getting active directory service principals'));
      var servicePrincipals = [];
      var parameters = null;
      try {
        if (spn) {
          parameters = { filter: 'servicePrincipalNames/any(c:c eq \'' + spn + '\')' };
          servicePrincipals = client.servicePrincipalOperations.list(parameters, _);
        } else if (objectId) {
          var servicePrincipal = client.servicePrincipalOperations.get(objectId, _);
          if (servicePrincipal) {
            servicePrincipals.push(servicePrincipal);
          }
        } else {
          parameters = { filter: 'startswith(displayName,\'' + search + '\')' };
          servicePrincipals = client.servicePrincipalOperations.list(parameters, _);
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

  adSP.command('create [applicationId]')
    .description($('Create active directory service principal'))
    .usage('[options] <applicationId>')
    .option('--applicationId <applicationId>', $('the application Id for which service principal is created'))
    .execute(function (applicationId, options, _) {
      if (!applicationId) {
        return cli.missingArgument('applicationId');
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = adUtils.getADGraphClient(subscription);

      var spParams = {
        accountEnabled: true,
        appId: applicationId
      };

      var servicePrincipal = withProgress(util.format($('Creating service principal for application %s'), applicationId),
      function (log, _) {
        return client.servicePrincipalOperations.create(spParams, _);
      }, _);

      cli.interaction.formatOutput(servicePrincipal, function (data) {
        if (data) {
          adUtils.displayAServicePrincipal(data, log);
        }
      });
    });

  adSP.command('delete [objectId]')
    .description($('Deletes active directory service principal'))
    .usage('[options] <objectId>')
    .option('--objectId <objectId>', $('the object id of the service principal to delete'))
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
        client.servicePrincipalOperations.deleteMethod(objectId, _);
      } finally {
        progress.end();
      }
    });
};