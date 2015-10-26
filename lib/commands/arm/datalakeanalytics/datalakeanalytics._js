/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the 'License');
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an 'AS IS' BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';
var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var dataLakeAnalyticsUtils = require('./dataLakeAnalytics.utils');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  // This includes the following three categories:
  // Account Management (category of 'dataLakeAnalyticsaccount')
  // Job Management (category of 'dataLakeAnalyticsjob')
  // Catalog Management (category of 'dataLakeAnalyticscatlog')
  var dataLakeCommands = cli.category('datalake')
    .description($('Commands to manage your Data Lake objects'));
  
  var dataLakeAnalyticsCommands = dataLakeCommands.category('analytics')
    .description($('Commands to manage your Data Lake Analytics objects'));
    
  var dataLakeAnalyticsJob = dataLakeAnalyticsCommands.category('job')
    .description($('Commands to manage your Data Lake Analytics Jobs'));
  
  dataLakeAnalyticsJob.command('create [dataLakeAnalyticsAccountName] [jobName] [script] [runtime] [compileMode] [compileOnly] [degreeOfParallelism] [priority] [resourceGroup]' )
    .description($('Submits a job to the specified DataLakeAnalytics account.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <jobName> <script> <runtime> <compileMode> <compileOnly> <degreeOfParallelism> <priority> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to execute the action on'))
    .option('-j --jobName <jobName>', $('the name for this job submission'))
    .option('-s --script <script>', $('the script to run'))
    .option('-r --runtime <runtime>', $('optionally indicates the runtime to use. Default is the current default runtime.'))
    .option('-m --compileMode <compileMode>', $('optionally specify the type of compilation to do. Valid values are \'Semantic\', \'Full\', and \'SingleBox\' Default is Full.'))
    .option('-c --compileOnly <compileOnly>', $('optionally indicates that this job should only be compiled and not run.'))
    .option('-d --degreeOfParallelism <degreeOfParallelism>', $('optionally specify the degree of parallelism for the job in a range from 1 to 50. Default value is 1.'))
    .option('-p --priority <priority>', $('optionally specify the priority for the job. Default value is 1000, with lower values having higher priority.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force lookup of the DataLakeAnalytics account in.'))
    .execute(function (dataLakeAnalyticsAccountName, jobName, script, runtime, compileMode, compileOnly, degreeOfParallelism, priority, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!jobName) {
        return cli.missingArgument('jobName');
      }
      
      if (!script) {
        return cli.missingArgument('script');
      }
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      if(!degreeOfParallelism) {
          degreeOfParallelism = 1;
      }
      
      if(!priority) {
          priority = 1000;
      }
      
      var job = {
          jobId: utils.uuidGen(),
          name: jobName,
          type: 'USql', // NOTE: We do not support hive jobs yet.
          degreeOfParallelism: degreeOfParallelism,
          priority: priority
      };
      
      var properties = {
          type: 'USql',
          script: script
      };
      
      if(compileMode) {
          properties.compileMode = compileMode;
      }
      
      if(runtime) {
          properties.runtimeVersion = runtime;
      }
      
      job.properties = properties;
      var parameters = {
          job: job
      };
      var jobResponse = {};
      if(compileOnly) {
          jobResponse = client.jobs.build(resourceGroup, dataLakeAnalyticsAccountName, parameters, _).job;
      }
      else {
          jobResponse = client.jobs.create(resourceGroup, dataLakeAnalyticsAccountName, parameters, _).job;
      }
      
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, jobResponse);
  });
  
  dataLakeAnalyticsJob.command('get [dataLakeAnalyticsAccountName] [jobId] [includeDebugInfo] [includeStatistics] [resourceGroup]' )
    .description($('Gets the specified job and additional data if desired.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <jobId> <includeDebugInfo> <includeStatistics> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to execute the action on'))
    .option('-j --jobId <jobId>', $('the job ID of the job to retrieve.'))
    .option('-d --includeDebugInfo', $('optionally indicates that debug info should be output for the job as well.'))
    .option('-s --includeStatistics', $('optionally indicates that statistics for the job should be output as well.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force lookup of the DataLakeAnalytics account in.'))
    .execute(function (dataLakeAnalyticsAccountName, jobId, includeDebugInfo, includeStatistics, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!jobId) {
        return cli.missingArgument('jobId');
      }
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var jobResponse = client.jobs.get(resourceGroup, dataLakeAnalyticsAccountName, jobId, _).job;
      
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, jobResponse);
      
      if(includeStatistics) {
          try {
            var statistics = client.jobs.getStatistics(resourceGroup, dataLakeAnalyticsAccountName, jobId, _).statistics;
            log.data('Statistics:');
            log.data('  lastUpdateTimeUtc: ' + statistics.lastUpdateTimeUtc);
            dataLakeAnalyticsUtils.formatOutputList(cli, log, options, statistics.stages);
          }
          catch (err) {
            log.info('Could not recover statistics info for the job. This happens if the job failed to start. Error reported: ' + err);
          }
      }
      
      if(includeDebugInfo) {
        log.info('made it in here');
        try {
          var debugData = client.jobs.getDebugDataPath(resourceGroup, dataLakeAnalyticsAccountName, jobId, _).jobData.paths;
          log.data('Debug Data Paths:');
          dataLakeAnalyticsUtils.formatOutputList(cli, log, options, debugData);
        }
        catch (err) {
            log.info('Could not recover debug info for the job. This happens if the job completed successfully. Error reported: ' + err);
        }
      }
  });
  
  dataLakeAnalyticsJob.command('cancel [dataLakeAnalyticsAccountName] [jobId] [resourceGroup]' )
    .description($('cancels the specified job.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <jobId> <includeDebugInfo> <includeStatistics> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to execute the action on'))
    .option('-j --jobId <jobId>', $('the job ID of the job to retrieve.'))
    .option('-q, --quiet', $('quiet mode (do not ask for cancel confirmation)'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force lookup of the DataLakeAnalytics account in.'))
    .execute(function (dataLakeAnalyticsAccountName, jobId, includeDebugInfo, includeStatistics, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!jobId) {
        return cli.missingArgument('jobId');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Cancel Job with id %s in account %s? [y/n] '), jobId, dataLakeAnalyticsAccountName), _)) {
        return;
      }
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      client.jobs.cancel(resourceGroup, dataLakeAnalyticsAccountName, jobId);
      
      log.data($('Successfully canceled the job with ID: ' + jobId));
  });
  
  dataLakeAnalyticsJob.command('list [dataLakeAnalyticsAccountName] [jobName] [submitter] [submittedAfter] [submittedBefore] [state] [result] [resourceGroup]' )
    .description($('cancels the specified job.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <jobId> <includeDebugInfo> <includeStatistics> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to execute the action on'))
    .option('-j --jobName <jobName>', $('An optional filter which returns jobs with only the specified friendly name.'))
    .option('-s, --submitter <submitter>', $('An optional filter which returns jobs only by the specified submitter.'))
    .option('-a, --submittedAfter <submittedAfter>', $('An optional filter which returns jobs only submitted after the specified time (as a date time offset).'))
    .option('-b, --submittedBefore <submittedAfter>', $('An optional filter which returns jobs only submitted before the specified time (as a date time offset).'))
    .option('-t, --state <state[]>', $('An optional filter which returns jobs with only the specified states (as an array)'))
    .option('-r, --result <result[]>', $('An optional filter which returns jobs with only the specified states (as an array)'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force lookup of the DataLakeAnalytics account in.'))
    .execute(function (dataLakeAnalyticsAccountName, jobName, submitter, submittedAfter, submittedBefore, state, result, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var filter = [];
      if(submitter) {
          filter.push('Submitter eq \'' + submitter + '\'');
      }
      
      if(jobName) {
          filter.push('Name eq \'' + jobName + '\'');
      }
      
      if(submittedAfter) {
          filter.push('SubmitTime ge datetimeoffset\'' + submittedAfter + '\'');
      }
      
      if(submittedBefore) {
          filter.push('SubmitTime lt datetimeoffset\'' + submittedBefore + '\'');
      }
      
      if(state && state.length > 0) {
          var stateString = '(';
          var stateArray = [];
          for(var i = 0; i < state.length; i++) {
              stateArray.push('State eq \'' + state[i] + '\'');
          }
          
          stateString += stateArray.join(' or ') + ')';
          filter.push(stateString);
      }
      
      if(result && result.length > 0) {
          var resultString = '(';
          var resultArray = [];
          for(var j = 0; j < result.length; j++) {
              resultArray.push('Result eq \'' + result[j] + '\'');
          }
          
          resultString += resultArray.join(' or ') + ')';
          filter.push(resultString);
      }
      
      var parameters;
      if(filter && filter.length > 0) {
        var filterString = filter.join(' and ');
        parameters = {
            filter: filterString
        };
      }
      
      var jobList = [];
          
      withProgress(util.format($('Retrieving job list for account: %s'), dataLakeAnalyticsAccountName),
        function (log, _) {
          var response = client.jobs.list(resourceGroup, dataLakeAnalyticsAccountName, parameters, _);
          jobList = response.value;
          var pushJobs = function(eachValue) {jobList.push(eachValue);};
          
          while(response.nextLink && response.nextLink.length > 0) {
            response = client.jobs.listNext(response.nextLink, resourceGroup, _);
            response.value.forEach(pushJobs, jobList);
          }
      }, _);
      
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, jobList);
  });
  
  var dataLakeAnalyticsCatalog = dataLakeAnalyticsCommands.category('catalog')
    .description($('Commands to manage your Data Lake Analytics Catalog'));
 
  dataLakeAnalyticsCatalog.command('list [dataLakeAnalyticsAccountName] [catalogItemType] [catalogItemPath] [resourceGroup]')
    .description($('Lists all of the specified catalog item type under the path or, if the full path is give, just the single catalog item at that path.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <catalogItemType> <catalogItemPath> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-t --catalogItemType <catalogItemType>', $('The catalog item type to return. Valid values are (case insensitive): database, schema, assembly, externaldatasource, table, tablevaluedfunction or tablestatistics'))
    .option('-p --catalogItemPath <catalogItemPath>', $('The path to the catalog item(s) to get or list in the format: <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeAnalyticsAccountName, catalogItemType, catalogItemPath, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!catalogItemType) {
        return cli.missingArgument('catalogItemType');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var output = getCatalogItem(subscription, resourceGroup, dataLakeAnalyticsAccountName, catalogItemPath, catalogItemType, _);
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, output);
    });
    
  dataLakeAnalyticsCatalog.command('createsecret [dataLakeAnalyticsAccountName] [databaseName] [hostUri] [secretName] [resourceGroup]')
    .description($('Creates the specified secret for the specified database.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <databaseName> <hostUri> <secretName> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database to create the secret in.'))
    .option('-h --hostUri <hostUri>', $('The full host URI associated with the external data source the secret will be used with.'))
    .option('-s --secretName <secretName>', $('secret name, will prompt if not given'))
    .option('-p --password <password>', $('secret password, will prompt if not given'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeAnalyticsAccountName, databaseName, hostUri, secretName, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!hostUri) {
        return cli.missingArgument('hostUri');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      secretName = cli.interaction.promptIfNotGiven('SecretName: ', secretName, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var params = {
          secretName: secretName,
          password: password,
          uri: hostUri
      };
      
      var response = client.catalog.createSecret(resourceGroup, dataLakeAnalyticsAccountName, databaseName, params, _).secret;
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, response);
    });
    
    dataLakeAnalyticsCatalog.command('setsecret [dataLakeAnalyticsAccountName] [databaseName] [hostUri] [secretName] [resourceGroup]')
    .description($('Updates the password and/or hostUri of the specified secret in the specified database.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <databaseName> <hostUri> <secretName> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database to create the secret in.'))
    .option('-h --hostUri <hostUri>', $('The full host URI associated with the external data source the secret will be used with.'))
    .option('-s --secretName <secretName>', $('secret name, will prompt if not given'))
    .option('-p --password <password>', $('secret password, will prompt if not given'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeAnalyticsAccountName, databaseName, hostUri, secretName, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!hostUri) {
        return cli.missingArgument('hostUri');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      secretName = cli.interaction.promptIfNotGiven('SecretName: ', secretName, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var params = {
          secretName: secretName,
          password: password,
          uri: hostUri
      };
      
      var response = client.catalog.updateSecret(dataLakeAnalyticsAccountName, resourceGroup, databaseName, params, _).secret;
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, response);
    });
    
    dataLakeAnalyticsCatalog.command('deletesecret [dataLakeAnalyticsAccountName] [databaseName] [secretName] [resourceGroup]')
    .description($('Updates the password and/or hostUri of the specified secret in the specified database.'))
    .usage('[options] <dataLakeAnalyticsAccountName> <databaseName> <hostUri> <secretName> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database to create the secret in.'))
    .option('-s --secretName <secretName>', $('Optional secret name to delete, if not specified will delete all secrets'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeAnalyticsAccountName, databaseName, secretName, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Secret(s) in database %s? [y/n] '), databaseName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      
      client.catalog.deleteSecret(resourceGroup, dataLakeAnalyticsAccountName, databaseName, secretName, _);
      
    });
    
  var dataLakeAnalyticsAccount = dataLakeAnalyticsCommands.category('account')
    .description($('Commands to manage your Data Lake Analytics accounts'));
 
  dataLakeAnalyticsAccount.command('list [resourceGroup]')
    .description($('List all DataLakeAnalytics accounts available for your subscription or subscription and resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var accounts = listAllDataLakeAnalyticsAccounts(subscription, resourceGroup, _);
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, accounts);
    });

  dataLakeAnalyticsAccount.command('show [dataLakeAnalyticsAccountName] [resourceGroup]')
    .description($('Shows a DataLakeAnalytics Account based on account name'))
    .usage('[options] <dataLakeAnalyticsAccountName> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to retrieve'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeAnalyticsAccountName, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var dataLakeAnalyticsAccount = client.dataLakeAnalyticsAccount.get(resourceGroup, dataLakeAnalyticsAccountName, _).dataLakeAnalyticsAccount;
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);
    });
    
    dataLakeAnalyticsAccount.command('delete [dataLakeAnalyticsAccountName] [resourceGroup]')
    .description($('Deletes a DataLakeAnalytics Account based on account name'))
    .usage('[options] <dataLakeAnalyticsAccountName> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('the DataLakeAnalytics account name to delete'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force the command to find the DataLakeAnalytics account to delete in.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (dataLakeAnalyticsAccountName, resourceGroup, options, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete DataLakeAnalytics Account %s? [y/n] '), dataLakeAnalyticsAccountName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var response = client.dataLakeAnalyticsAccount.delete(resourceGroup, dataLakeAnalyticsAccountName, _);
      
      if (response.Status !== 'Succeeded') {
         throw new Error(util.format($('DataLakeAnalytics account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      log.info($('Successfully deleted the specified DataLakeAnalytics account.'));
    });
    
    dataLakeAnalyticsAccount.command('create [dataLakeAnalyticsAccountName] [location] [resourceGroup] [defaultDataLake] [tags]')
    .description($('Creates a Data Lake Analytics Account'))
    .usage('[options] <dataLakeAnalyticsAccountName> <location> <resourceGroup> <defaultGroup> <tags>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to create'))
    .option('-l --location <location>', $('the location the DataLakeAnalytics account will be created in. Valid values are: North Central US, South Central US, Central US, West Europe, North Europe, West US, East US, East US 2, Japan East, Japan West, Brazil South, Southeast Asia, East Asia, Australia East, Australia Southeast'))
    .option('-g --resourceGroup <resourceGroup>', $('the resource group to create the account in'))
    .option('-d --defaultDataLake <defaultDataLake>', $('the default Data Lake to associate with this account.'))
    .option('-t --tags <tags>', $('the optional key, value paired set of tags to associate with this account resource.'))
    .execute(function (dataLakeAnalyticsAccountName, location, resourceGroup, defaultDataLake, tags, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var dataLakeAnalyticsAccount = createOrUpdateDataLakeAnalyticsAccount(subscription, dataLakeAnalyticsAccountName, resourceGroup, location, defaultDataLake, tags, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);
    });
  
    dataLakeAnalyticsAccount.command('set [dataLakeAnalyticsAccountName] [resourceGroup] [defaultDataLakeStore] [tags]')
    .description($('Updates an existing Data Lake Analytics Account'))
    .usage('[options] <dataLakeAnalyticsAccountName> <resourceGroup> <defaultDataLake> <tags>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-d --defaultDataLakeStore <defaultDataLakeStore>', $('the optional new default Data Lake Storage account to set for this account'))
    .option('-t --tags <tags>', $('the optional key, value paired set of tags to associate with this account resource.'))
    .execute(function (dataLakeAnalyticsAccountName, resourceGroup, defaultDataLakeStore, tags, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if (!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var dataLakeAnalyticsAccount = client.dataLakeAnalyticsAccount.get(resourceGroup, dataLakeAnalyticsAccountName, _).dataLakeAnalyticsAccount;
      
      if (!defaultDataLakeStore) {
          defaultDataLakeStore = dataLakeAnalyticsAccount.properties.defaultDataLakeStoreAccount;
      }
      if(!tags) {
          tags = dataLakeAnalyticsAccount.tags;
      }
      
      dataLakeAnalyticsAccount  = createOrUpdateDataLakeAnalyticsAccount(subscription, dataLakeAnalyticsAccountName, resourceGroup, dataLakeAnalyticsAccount.location, defaultDataLakeStore, tags, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);    
    });
    
    dataLakeAnalyticsAccount.command('adddatasource [dataLakeAnalyticsAccountName] [dataLakeStore] [isDefaultDataLakeStore] [azureBlob] [accessKey] [resourceGroup]')
    .description($('Adds an existing data source (Data Lake Store or Azure Blob) to the dataLakeAnalytics account'))
    .usage('[options] <dataLakeAnalyticsAccountName> <dataLakeStore> <isDefaultDataLakeStore> <azureBlob> <accessKey> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the data lake storage account to add. NOTE: this argument and --isDefaultDataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-d --isDefaultDataLakeStore', $('the optional switch to indicate that the data lake being added should be the default data lake. NOTE: this argument and --dataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to add to the account. NOTE: this argument and --accessKey are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-k --accessKey <accessKey>', $('the access key associated with the azureBlob. NOTE: this argument and --azureBlob are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to forcibly look for the account to update in'))
    .execute(function (dataLakeAnalyticsAccountName, dataLakeStore, isDefaultDataLakeStore, azureBlob, accessKey, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!dataLakeStore && !azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && accessKey) {
          throw new Error($('--accessKey can only be specified with --azureBlob.'));
      }
      
      if(azureBlob && !accessKey) {
          throw new Error($('--accessKey must be specified with --azureBlob.'));
      }
      
      if(azureBlob && isDefaultDataLakeStore) {
          throw new Error($('--isDefaultDataLakeStore can only be specified with the --dataLakeStore parameter.'));
      }
      
      if (!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      if (dataLakeStore) {
          client.dataLakeAnalyticsAccount.addDataLakeStoreAccount(resourceGroup, dataLakeAnalyticsAccountName, dataLakeStore, _);
      }
      else {
          var parameters = {
              properties: {
                  accessKey: accessKey
              }
          };
          
          client.dataLakeAnalyticsAccount.addStorageAccount(resourceGroup, dataLakeAnalyticsAccountName, azureBlob, parameters, _);
      }
      
      if(isDefaultDataLakeStore) {
        createOrUpdateDataLakeAnalyticsAccount(subscription, dataLakeAnalyticsAccountName, resourceGroup, null, dataLakeStore, null, _);
      }
      
      log.info($('Successfully added the storage account specified to the Data Lake Analytics account: ' + dataLakeAnalyticsAccountName));
    });
    
    dataLakeAnalyticsAccount.command('removedatasource [dataLakeAnalyticsAccountName] [dataLakeStore] [azureBlob] [resourceGroup]')
    .description($('removes a data source (Data Lake Store or Azure Blob) from the dataLakeAnalytics account'))
    .usage('[options] <dataLakeAnalyticsAccountName> <dataLakeStore> <azureBlob> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the data lake to remove from the account. NOTE: this argument is part of a parameter set, and cannot be specified with --azureBlob.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to remove from the account. NOTE: this argument is part of a parameter set, and cannot be specified with --dataLakeStore.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to forcibly look for the account to update in'))
    .execute(function (dataLakeAnalyticsAccountName, dataLakeStore, azureBlob, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!dataLakeStore && !azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if (!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      if (dataLakeStore) {
        client.dataLakeAnalyticsAccount.deleteDataLakeStoreAccount(resourceGroup, dataLakeAnalyticsAccountName, dataLakeStore);
      }
      else {
        client.dataLakeAnalyticsAccount.deleteStorageAccount(resourceGroup, dataLakeAnalyticsAccountName, azureBlob);
      }
      
      log.info($('Successfully removed the storage account specified from Data Lake Analytics account: ' + dataLakeAnalyticsAccountName));
    });
    
    dataLakeAnalyticsAccount.command('setdatasource [dataLakeAnalyticsAccountName] [dataLakeStore] [isDefaultDataLakeStore] [azureBlob] [accessKey] [resourceGroup]')
    .description($('Sets an existing data source (Data Lake Store or Azure Blob) in the dataLakeAnalytics account. Typically used to set the data source as default (for Data Lake) or update the access key (for Azure Blob)'))
    .usage('[options] <dataLakeAnalyticsAccountName> <dataLakeStore> <isDefaultDataLakeStore> <azureBlob> <accessKey> <resourceGroup>')
    .option('-n --dataLakeAnalyticsAccountName <dataLakeAnalyticsAccountName>', $('The DataLakeAnalytics account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the data lake to set. NOTE: this argument and --isDefaultDataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-d --isDefaultDataLakeStore', $('the optional switch to indicate that the data lake being set should be the default data lake. NOTE: this argument and --dataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to set in the account. NOTE: this argument and --accessKey are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-k --accessKey <accessKey>', $('the access key associated with the azureBlob to update. NOTE: this argument and --azureBlob are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to forcibly look for the account to update in'))
    .execute(function (dataLakeAnalyticsAccountName, dataLakeStore, isDefaultDataLakeStore, azureBlob, accessKey, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!dataLakeStore && !azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && azureBlob) {
          throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && accessKey) {
          throw new Error($('--accessKey can only be specified with --azureBlob.'));
      }
      
      if(azureBlob && !accessKey) {
          throw new Error($('--accessKey must be specified with --azureBlob.'));
      }
      
      if(azureBlob && isDefaultDataLakeStore) {
          throw new Error($('--isDefaultDataLakeStore can only be specified with the --dataLakeStore parameter.'));
      }
      
      if (!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      if (dataLakeStore) {
        if(isDefaultDataLakeStore) {
            createOrUpdateDataLakeAnalyticsAccount(subscription, dataLakeAnalyticsAccountName, resourceGroup, null, dataLakeStore, null, _);
        }
        else {
            log.warning($('Data Lake Storage Accounts can only be modified by indicating that they are now the Default Data Lake Storage account. Otherwise only Add and Remove are supported for Data Lake Storage accounts associated with a Data Lake Analytics account.'));
        }
      }
      else {
        var parameters = {
              properties: {
                  accessKey: accessKey
              }
          };
          
          client.dataLakeAnalyticsAccount.updateStorageAccount(resourceGroup, dataLakeAnalyticsAccountName, azureBlob, parameters, _);
      }
      
      log.info($('Successfully updated the storage account specified for Data Lake Analytics account: ' + dataLakeAnalyticsAccountName));
    });
    
  function createOrUpdateDataLakeAnalyticsAccount(subscription, dataLakeAnalyticsAccountName, resourceGroup, location, defaultDataLakeStore, tags, _) {
      if (!dataLakeAnalyticsAccountName) {
        return cli.missingArgument('dataLakeAnalyticsAccountName');
      }
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      var create = false;
      try {
        client.dataLakeAnalyticsAccount.get(resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      catch(err){
        create = true;
      }
      
      var accountParams = {
          dataLakeAnalyticsAccount: {
              name: dataLakeAnalyticsAccountName,
              properties: {},
              tags: tags
          }
      };
      
      var response;
      if(create) {
          if (!location) {
            return cli.missingArgument('location');
          }
          if (!defaultDataLakeStore) {
            return cli.missingArgument('defaultDataLakeStore');
          }
          
          accountParams.properties.defaultDataLakeStoreAccount = defaultDataLakeStore;
          accountParams.properties.location = location;
          
          response = client.dataLakeAnalyticsAccount.create(resourceGroup, accountParams, _);
      }
      else {
          if (defaultDataLakeStore) {
              accountParams.properties.defaultDataLakeStoreAccount = defaultDataLakeStore;
          }
          
          response = client.dataLakeAnalyticsAccount.update(resourceGroup, accountParams, _);
      }
      
      if (response.status !== 'Succeeded') {
         throw new Error(util.format($('DataLakeAnalytics account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      return client.dataLakeAnalyticsAccount.get(resourceGroup, dataLakeAnalyticsAccountName, _).dataLakeAnalyticsAccount;
  }
  
  function getCatalogItem(subscription, resourceGroup, dataLakeAnalyticsAccountName, catalogItemPath, catalogItemType, _) {
      if(!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeAnalyticsAccountName, _);
      }
      
      var isList = isCatalogItemOrList(catalogItemPath, catalogItemType);
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var catalogItem = getCatalogItemObject(catalogItemPath);
      var toReturn = [];
      
      switch (catalogItemType.toLowerCase()) {
          case 'database':
            if(isList) {
                toReturn = client.catalog.listDatabases(resourceGroup, dataLakeAnalyticsAccountName, _).databaseList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, _).database);
            }
            break;
          case 'schema':
            if(isList) {
                toReturn = client.catalog.listSchemas(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, _).schemaList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, _).schema);
            }
            break;
          case 'assembly':
            if(isList) {
                toReturn = client.catalog.listAssemblies(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, _).assemblyList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, _).assembly);
            }
            break;
          case 'externaldatasource':
            if(isList) {
                toReturn = client.catalog.listDatabases(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, _).externalDataSourceList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, _).externalDataSource);
            }
            break;
          case 'table':
            if(isList) {
                toReturn = client.catalog.listDatabases(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, _).tableList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, _).table);
            }
            break;
          case 'tablevaluedfunction':
            if(isList) {
                toReturn = client.catalog.listDatabases(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, _).tableValuedFunctionList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, _).tableValuedFunction);
            }
            break;
          case 'tablestatistics':
            if(isList) {
                toReturn = client.catalog.listDatabases(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, _).statisticsList.value;
            }
            else {
                toReturn.push(client.catalog.getDatabase(resourceGroup, dataLakeAnalyticsAccountName, catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, catalogItem.tableStatisticsName, _).statistics);
            }
            break;
          default:
            throw new Error($('Invalid catalog item type: ' + catalogItemType + ' specified. Valid values are (case insensitive): database, schema, assembly, externaldatasource, table, tablevaluedfunction or tablestatistics'));
      }
      
      return toReturn;
  }
  
  function isCatalogItemOrList(catalogItemPath, catalogItemType) {
      var isList = false;
      if(!catalogItemPath || catalogItemPath === '') {
          // in this case, it is a list of ALL catalog items of the specified type across the entire catalog.
          return true;
      }
      
      var catalogItem = getCatalogItemObject(catalogItemPath);
      switch (catalogItemType.toLowerCase()) {
          case 'database':
            if(!catalogItem.databaseName) {
                isList = true;
            }
            break;
          case 'schema':
          case 'assembly':
          case 'externaldatasource':
            if(!catalogItem.databaseName) {
                throw new Error($('Invalid catalog path: ' + catalogItemPath + 
                            '. A catalog path must be in the following format with no empty internal elements:' +
                            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
            }
            
            if(!catalogItem.schemaAssemblyOrExternalDataSourceName) {
                isList = true;
            }
            break;
          case 'table':
          case 'tablevaluedfunction':
            if(!catalogItem.databaseName || !catalogItem.schemaAssemblyOrExternalDataSourceName) {
                throw new Error($('Invalid catalog path: ' + catalogItemPath + 
                            '. A catalog path must be in the following format with no empty internal elements:' +
                            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
            }
            
            if(!catalogItem.tableOrTableValuedFunctionName) {
                isList = true;
            }
            break;
          case 'tablestatistics':
            if(!catalogItem.databaseName || !catalogItem.schemaAssemblyOrExternalDataSourceName || !catalogItem.tableOrTableValuedFunctionName) {
                throw new Error($('Invalid catalog path: ' + catalogItemPath + 
                            '. A catalog path must be in the following format with no empty internal elements:' +
                            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
            }
            
            if(!catalogItem.tableStatisticsName) {
                isList = true;
            }
            break;
      }
      
      return isList;
  }
  
  function getCatalogItemObject(catalogItemPath) {
      var toReturn = {
          fullCatalogItemPath: catalogItemPath
      };
      
      if(!catalogItemPath || !catalogItemPath.contains('.')) {
          toReturn.databaseName = catalogItemPath;
          return toReturn;
      }
      
      var regexPattern = /^(\w+|\[.+\])?(\.(\w+|\[.+\]))?(\.(\w+|\[.+\]))?(\.(\w+|\[.+\]))?$/;
      var matches = regexPattern.exec(catalogItemPath);
      if(!matches) {
          throw new Error($('Invalid catalog path: ' + catalogItemPath + 
                            '. A catalog path must be in the following format with no empty internal elements:' +
                            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
      }
      
      var firstPart = sanitizeCatalogItemPath(matches[1], catalogItemPath);
      var secondPart = sanitizeCatalogItemPath(matches[3], catalogItemPath);
      var thirdPart = sanitizeCatalogItemPath(matches[5], catalogItemPath);
      var fourthPart = sanitizeCatalogItemPath(matches[7], catalogItemPath);
      
      toReturn.databaseName = firstPart;
      toReturn.schemaAssemblyOrExternalDataSourceName = secondPart;
      toReturn.tableOrTableValuedFunctionName = thirdPart;
      toReturn.tableStatisticsName = fourthPart;
      
      return toReturn;
  }
  
  function sanitizeCatalogItemPath(path, fullPath) {
      if(!path) {
          return path;
      }
      
      if(path.startsWith('[') && path.endsWith(']')) {
          path = path.substring(1);
          path = path.substring(0, path.length -1);
      }
      
      if(path.length < 1) {
          throw new Error($('Invalid catalog path: ' + fullPath + 
                            '. A catalog path must be in the following format with no empty internal elements:' +
                            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
      }
      
      return path;
  }
  
  function listAllDataLakeAnalyticsAccounts(subscription, resourceGroup, _) {
    var client = utils.createDataLakeAnalyticsManagementClient(subscription);
    var response = client.dataLakeAnalyticsAccount.list(resourceGroup, _);
    var accounts = response.value;
    while (response.nextLink)
    {
        response = client.dataLakeAnalyticsAccount.listNext(response.nextLink);
        accounts.push.apply(accounts, response.value);
    }
    
    return accounts;
  }
  
  function getResrouceGroupByAccountName(subscription, resourceGroup, name, _) {
    var accounts = listAllDataLakeAnalyticsAccounts(subscription, resourceGroup, _);
    for (var i = 0; i < accounts.length; i++)
    {
        if (accounts[i].name === name)
        {
            var acctId = accounts[i].id;
            var rgStart = acctId.indexOf('resourceGroups/') + ('resourceGroups/'.length);
            var rgEnd = acctId.indexOf('/providers/');
            return acctId.substring(rgStart, rgEnd);
        }
    }
    
    throw new Error($('Could not find account: ' + name + ' in any resource group in subscription: ' + subscription ));
  }
};