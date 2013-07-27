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

var interaction = require('../util/interaction');
var utils = require('../util/utils');

exports.init = function (cli) {
  var log = cli.output;

  var account = cli.category('account');
  var environment = account.category('env')
    .description('Commands to manage your account environment');

  environment.command('list')
    .description('Lists the available environments')
    .execute(function (options, callback) {
      var environments = cli.environmentManager.getEnvironmentUrls();

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
    .description('Shows an available environment')
    .option('--environment <environment>', 'The environment name')
    .execute(function (environment, options, _) {
      var params = utils.normalizeParameters({
        environment: [environment, options.environment]
      });

      if (params.err) { throw params.err; }

      environment = interaction.promptIfNotGiven(cli, 'Environment name: ', params.values.environment, _);

      cli.environmentManager.load();

      var existingEnvironment = Object.keys(cli.environmentManager.environments).filter(function (env) {
        return utils.ignoreCaseEquals(env, environment);
      })[0];

      if (!existingEnvironment) {
        throw new Error('Unknown environment ' + environment);
      } else {
        if (log.format().json) {
          log.json(cli.environmentManager.environments[existingEnvironment]);
        } else {
          for (var property in cli.environmentManager.environments[existingEnvironment]) {
            log.data('Environment ', cli.environmentManager.environments[existingEnvironment][property].toString());
          }
        }
      }
    });

  environment.command('add [environment]')
    .description('Adds an environment')
    .option('--environment <environment>', 'The environment name')
    .option('--publish-settings-file-url <publishSettingsFileUrl>', 'The publish settings file URL')
    .option('--management-portal-url <managementPortalUrl>', 'The management portal URL')
    .option('--service-endpoint <serviceEndpoint>', 'The management service endpoint')
    .option('--storage-endpoint <storageEndpoint>', 'The storage service endpoint')
    .option('--sql-database-endpoint <sqlDatabaseEndpoint>', 'The SQL database endpoint')
    .execute(function (environment, options, _) {
      var params = utils.normalizeParameters({
        environment: [environment, options.environment]
      });

      if (params.err) { throw params.err; }

      environment = interaction.promptIfNotGiven(cli, 'New Environment name: ', params.values.environment, _);

      cli.environmentManager.load();

      var existingEnvironment = Object.keys(cli.environmentManager.environments).filter(function (env) {
        return utils.ignoreCaseEquals(env, environment);
      })[0];

      if (existingEnvironment) {
        throw new Error('Duplicate environment ' + existingEnvironment);
      } else {
        cli.environmentManager.environments[environment] = {};

        if (!options.publishSettingsFileUrl) {
          throw new Error('Publish settings file URL needs to be defined');
        } else {
          cli.environmentManager.environments[environment]['publishingProfile'] = options.publishSettingsFileUrl;
        }

        if (!options.managementPortalUrl) {
          throw new Error('Portal URL needs to be defined');
        } else {
          cli.environmentManager.environments[environment]['portal'] = options.managementPortalUrl;
        }

        if (!options.serviceEndpoint) {
          throw new Error('Service endpoint needs to be defined');
        } else {
          cli.environmentManager.environments[environment]['serviceEndpoint'] = options.serviceEndpoint;
        }

        if (!options.storageEndpoint) {
          throw new Error('Storage endpoint needs to be defined');
        } else {
          cli.environmentManager.environments[environment]['storageEndpoint'] = options.storageEndpoint;
        }

        if (!options.sqlDatabaseEndpoint) {
          throw new Error('SQL database endpoint needs to be defined');
        } else {
          cli.environmentManager.environments[environment]['sqlDatabaseEndpoint'] = options.sqlDatabaseEndpoint;
        }

        cli.environmentManager.save();
      }
    });

  environment.command('set [environment]')
    .description('Updates an environment')
    .option('--environment <environment>', 'The environment name')
    .option('--publish-settings-file-url <publishSettingsFileUrl>', 'The publish settings file URL')
    .option('--management-portal-url <managementPortalUrl>', 'The management portal URL')
    .option('--service-endpoint <serviceEndpoint>', 'The management service endpoint')
    .option('--storage-endpoint <storageEndpoint>', 'The storage service endpoint')
    .option('--sql-database-endpoint <sqlDatabaseEndpoint>', 'The SQL database endpoint')
    .execute(function (environment, options, _) {
      var params = utils.normalizeParameters({
        environment: [environment, options.environment]
      });

      if (params.err) { throw params.err; }

      environment = interaction.promptIfNotGiven(cli, 'New Environment name: ', params.values.environment, _);

      if (!options.publishSettingsFileUrl && !options.managementPortalUrl &&
        !options.serviceEndpoint && !options.storageEndpoint && !options.sqlDatabaseEndpoint) {
        throw new Error('No URL to update was specified');
      }

      cli.environmentManager.load();

      var existingEnvironment = Object.keys(cli.environmentManager.environments).filter(function (env) {
        return utils.ignoreCaseEquals(env, environment);
      })[0];

      if (!existingEnvironment) {
        throw new Error('Unknown environment ' + environment);
      } else {
        if (options.publishSettingsFileUrl) {
          cli.environmentManager.environments[existingEnvironment]['publishingProfile'] = options.publishSettingsFileUrl;
        }

        if (options.managementPortalUrl) {
          cli.environmentManager.environments[existingEnvironment]['portal'] = options.managementPortalUrl;
        }

        if (options.serviceEndpoint) {
          cli.environmentManager.environments[existingEnvironment]['serviceEndpoint'] = options.serviceEndpoint;
        }

        if (options.storageEndpoint) {
          cli.environmentManager.environments[existingEnvironment]['storageEndpoint'] = options.storageEndpoint;
        }

        if (options.sqlDatabaseEndpoint) {
          cli.environmentManager.environments[existingEnvironment]['sqlDatabaseEndpoint'] = options.sqlDatabaseEndpoint;
        }

        cli.environmentManager.save();
      }
    });

  environment.command('delete [environment]')
    .description('Deletes an environment')
    .option('--environment <environment>', 'The environment name')
    .execute(function (environment, options, _) {
      var params = utils.normalizeParameters({
        environment: [environment, options.environment]
      });

      if (params.err) { throw params.err; }

      environment = interaction.promptIfNotGiven(cli, 'New Environment name: ', params.values.environment, _);

      cli.environmentManager.load();

      var existingEnvironment = Object.keys(cli.environmentManager.environments).filter(function (env) {
        return utils.ignoreCaseEquals(env, environment);
      })[0];

      if (!existingEnvironment) {
        throw new Error('Unknown environment ' + environment);
      } else {
        delete cli.environmentManager.environments[existingEnvironment];
        cli.environmentManager.save();
      }
    });
};