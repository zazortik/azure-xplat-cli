//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var __ = require('underscore');
var util = require('util');

var profile = require('../util/profile');
var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var account = cli.category('account');
  var environment = account.category('env')
    .description($('Commands to manage your account environment'));

  environment.command('list')
    .description($('List the environments'))
    .execute(function (options, callback) {
      var environments = profile.current.environments;

      if (log.format().json) {
        log.json(environments);
      } else {
        log.table(Object.keys(environments), function (row, s) {
          row.cell('Name', s);
        });
      }

      callback();
    });

  environment.command('show [environment]')
    .description($('Show an environment'))
    .option('--environment <environment>', $('the environment name'))
    .execute(function (environment, options, _) {
      environment = cli.interaction.promptIfNotGiven('Environment name: ', environment, _);

      var existingEnvironment = profile.current.getEnvironment(environment);

      if (!existingEnvironment) {
        throw new Error(util.format($('Unknown environment %s'), environment));
      } else {
        if (log.format().json) {
          log.json(existingEnvironment);
        } else {
          __.keys(existingEnvironment).forEach(function (propertyName) {
            var prop = existingEnvironment[propertyName];
            if (prop === null || __.isUndefined(prop)) {
              prop = '';
            }
            log.data(util.format($('Environment %s '), propertyName), prop);
          });
        }
      }
    });

  var envFieldsToOptionsFields = [
    ['publishingProfileUrl', 'publishSettingsFileUrl'],
    ['portalUrl', 'managementPortalUrl'],
    ['managementEndpointUrl', 'serviceEndpoint'],
    ['storageEndpoint', 'storageEndpoint'],
    ['sqlManagementEndpointUrl', 'sqlDatabaseEndpoint'],
    ['resourceManagerEndpointUrl', 'resourceManagerEndpoint'],
    ['activeDirectoryEndpointUrl', 'activeDirectoryEndpoint'],
    ['galleryEndpointUrl', 'galleryEndpoint']
  ];

  // Helper function that creates a new options object with
  // field names translated according to envFieldsToOptionsFields
  // if the option is specified and matches. So
  //  new.publishingProfileUrl = old.publishSettingsFileUrl,
  // etc. Only fields that actually exist in the original options
  // are converted.
  function safeOptions(options) {
    return __.reduce(envFieldsToOptionsFields, function (memo, keys) {
      if (options[keys[1]]) {
        memo[keys[0]] = options[keys[1]];
      }
      return memo;
    }, {});
  }

  environment.command('add [environment]')
    .description($('Add an environment'))
    .option('--environment <environment>', $('the environment name'))
    .option('--publish-settings-file-url <publishSettingsFileUrl>', $('the publish settings file URL'))
    .option('--management-portal-url <managementPortalUrl>', $('the management portal URL'))
    .option('--service-endpoint <serviceEndpoint>', $('the management service endpoint'))
    .option('--storage-endpoint <storageEndpoint>', $('the storage service endpoint'))
    .option('--sql-database-endpoint <sqlDatabaseEndpoint>', $('the SQL database endpoint'))
    .option('--active-directory-endpoint <activeDirectoryEndpoint>', $('The active directory endpoint'))
    .option('--resource-manager-endpoint <resourceManagerEndpoint>', $('Endpoint for resource management'))
    .option('--gallery-endpoint <galleryEndpoint>',$('Endpoint for template gallery'))
    .execute(function (environment, options, _) {
      environment = cli.interaction.promptIfNotGiven('New Environment name: ', environment, _);

      var existingEnvironment = profile.current.getEnvironment(environment);

      if (existingEnvironment) {
        throw new Error(util.format($('Duplicate environment %s'), existingEnvironment));
      } else {

        var newEnvironment = new profile.Environment(safeOptions(options));
        newEnvironment.name = environment;
        profile.current.addEnvironment(newEnvironment);
        profile.current.save();
        log.info(util.format($('New environment %s created'), environment));
      }
    });

  environment.command('set [environment]')
    .description($('Update an environment'))
    .option('--environment <environment>', $('the environment name'))
    .option('--publish-settings-file-url <publishSettingsFileUrl>', $('the publish settings file URL'))
    .option('--management-portal-url <managementPortalUrl>', $('the management portal URL'))
    .option('--service-endpoint <serviceEndpoint>', $('the management service endpoint'))
    .option('--storage-endpoint <storageEndpoint>', $('the storage service endpoint'))
    .option('--sql-database-endpoint <sqlDatabaseEndpoint>', $('the SQL database endpoint'))
    .option('--active-directory-endpoint <activeDirectoryEndpoint>', $('The active directory endpoint'))
    .option('--resource-manager-endpoint <resourceManagerEndpoint>', $('Endpoint for resource management'))
    .option('--gallery-endpoint <galleryEndpoint>',$('Endpoint for template gallery'))
    .execute(function (environment, options, _) {
      environment = cli.interaction.promptIfNotGiven('New Environment name: ', environment, _);

      var updates = safeOptions(options);
      if (__.keys(updates).length === 0) {
        throw new Error($('No URL to update was specified'));
      }

      var existingEnvironment = profile.current.getEnvironment(environment);

      if (!existingEnvironment) {
        throw new Error(util.format($('Unknown environment %s'), environment));
      } else {
        __.extend(existingEnvironment, updates);
        profile.current.save();
      }
    });

  environment.command('delete [environment]')
    .description($('Delete an environment'))
    .option('--environment <environment>', $('the environment name'))
    .execute(function (environment, options, _) {
      environment = cli.interaction.promptIfNotGiven('New Environment name: ', environment, _);

      var existingEnvironment = profile.current.getEnvironment(environment);

      if (!existingEnvironment) {
        throw new Error(util.format($('Unknown environment %s'), environment));
      } else {
        profile.current.deleteEnvironment(existingEnvironment);
        profile.current.save();
      }
    });
};