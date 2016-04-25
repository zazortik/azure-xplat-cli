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
var dataLakeAnalyticsUtils = require('./datalakeanalytics.utils');
var tagUtils = require('../tag/tagUtils');
var path = require('path');
var fs = require('fs');

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
  
  dataLakeAnalyticsJob.command('create [accountName] [jobName] [script] [runtime] [compileMode] [compileOnly] [degreeOfParallelism] [priority]' )
    .description($('Submits a job to the specified Data Lake Analytics account.'))
    .usage('[options] <accountName> <jobName> <script>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to execute the action on'))
    .option('-j --jobName <jobName>', $('the name for this job submission'))
    .option('-t --script <script>', $('the script to run. This can be either the script contents, a relative path or the full path to a UTF-8 encoded script file'))
    .option('-r --runtime <runtime>', $('optionally indicates the runtime to use. The default runtime is the currently deployed production runtime.' +
                                        'Use this if you have uploaded a custom runtime to your account and want job execution to go through that one instead of the one deployed by Microsoft.'))
    .option('-m --compileMode <compileMode>', $('optionally specify the type of compilation to do. Valid values are \'Semantic\', \'Full\', and \'SingleBox\' Default is Full.'))
    .option('-c --compileOnly <compileOnly>', $('optionally indicates that this job should only be compiled and not run.'))
    .option('-d --degreeOfParallelism <degreeOfParallelism>', $('optionally specify the degree of parallelism for the job in a range from 1 to 50. Default value is 1.'))
    .option('-p --priority <priority>', $('optionally specify the priority for the job. Default value is 1000, with lower, positive, non-zero values having higher priority. 1 is the highest priority and int.maxValue is the lowest.'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, jobName, script, runtime, compileMode, compileOnly, degreeOfParallelism, priority, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!jobName) {
        return cli.missingArgument('jobName');
      }
      
      if (!script) {
        return cli.missingArgument('script');
      }
      
      var scriptAsPath = true;
      var scriptContents;
      
      try {
        var normalPath = path.normalize(script);
        scriptContents = fs.readFile(normalPath, 'utf8', _);
      }
      catch (err){
        // this means it is not a file, treat it as script contents, 
        // which will fail if the contents are not a valid script
        scriptAsPath = false;
      }
      
      if(!scriptAsPath) {
        scriptContents = script;
      }
      
      if(!degreeOfParallelism) {
        degreeOfParallelism = 1;
      }
      else {
        degreeOfParallelism = parseInt(degreeOfParallelism);
      }
      
      if(!priority) {
          priority = 1000;
      }
      else {
        priority = parseInt(priority);
      }
      
      if(priority < 1) {
        throw new Error('priority (-p or --priority) must be >= 1. Priority passed in: ' + priority);
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
        script: scriptContents
      };
      
      if(compileMode) {
        properties.compileMode = compileMode;
      }
      
      if(runtime) {
        properties.runtimeVersion = runtime;
      }
      
      job.properties = properties;
      var jobResponse = {};
      if(compileOnly) {
        jobResponse = client.job.build(job, accountName, _);
      }
      else {
        jobResponse = client.job.create(job.jobId, job, accountName, _);
      }
      
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, jobResponse);
  });
  
  dataLakeAnalyticsJob.command('show [accountName] [jobId] [includeDebugInfo] [includeStatistics]' )
    .description($('shows the specified job and additional data if desired.'))
    .usage('[options] <accountName> <jobId>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to execute the action on'))
    .option('-j --jobId <jobId>', $('the job ID of the job to retrieve.'))
    .option('-d --includeDebugInfo', $('optionally indicates that debug info should be output for the job as well.'))
    .option('-t --includeStatistics', $('optionally indicates that statistics for the job should be output as well.'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, jobId, includeDebugInfo, includeStatistics, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!jobId) {
        return cli.missingArgument('jobId');
      }
      
      var jobResponse = client.job.get(jobId, accountName, _);
      
      if(includeStatistics) {
        try {
          var statistics = client.job.getStatistics(jobId, accountName, _);
          jobResponse.properties.statistics = statistics;
        }
        catch (err) {
          log.info('Could not recover statistics info for the job. This happens if the job failed to start. Error reported: ' + err);
        }
      }
      
      if(includeDebugInfo) {
        try {
          var debugData = client.job.getDebugDataPath(jobId, accountName, _).paths;
          jobResponse.properties.debugData = debugData;
        }
        catch (err) {
          log.info('Could not recover debug info for the job. This happens if the job completed successfully. If the job did not complete successfully, please run with verbose output for more details.');
        }
      }
      
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, jobResponse);
  });
  
  dataLakeAnalyticsJob.command('cancel [accountName] [jobId]' )
    .description($('cancels the specified job.'))
    .usage('[options] <accountName> <jobId>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to execute the action on'))
    .option('-j --jobId <jobId>', $('the job ID of the job to retrieve.'))
    .option('-q, --quiet', $('quiet mode (do not ask for cancel confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, jobId, includeDebugInfo, includeStatistics, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!jobId) {
        return cli.missingArgument('jobId');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Cancel Job with id %s in account %s? [y/n] '), jobId, accountName), _)) {
        return;
      }
      
      client.job.cancel(jobId, accountName, _);
      
      log.data($('Successfully canceled the job with ID: ' + jobId));
  });
  
  dataLakeAnalyticsJob.command('list [accountName] [jobName] [submitter] [submittedAfter] [submittedBefore] [state] [result]' )
    .description($('lists the jobs in the specified account given the specified filters and criteria.'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to execute the action on'))
    .option('-j --jobName <jobName>', $('An optional filter which returns jobs with only the specified friendly name.'))
    .option('-u, --submitter <submitter>', $('An optional filter which returns jobs only by the specified submitter in the format user@domain'))
    .option('-a, --submittedAfter <submittedAfter>', $('An optional filter which returns jobs only submitted after the specified time (as a date time offset).'))
    .option('-b, --submittedBefore <submittedAfter>', $('An optional filter which returns jobs only submitted before the specified time (as a date time offset).'))
    .option('-t, --state <comma delmited string of states>', $('An optional filter which returns jobs with only the specified states (as comma delmited string). Valid states are: ' +
                                       'accepted, compiling, ended, new, queued, running, scheduling, starting and paused'))
    .option('-r, --result <comma delmited string of results>', $('An optional filter which returns jobs with only the specified results (as comma delmited string). Valid results are: ' +
                                         'none, succeeded, cancelled and failed'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, jobName, submitter, submittedAfter, submittedBefore, state, result, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsJobManagementClient(subscription);
      log.info('client created');
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      var filter = [];
      if(submitter) {
        filter.push('submitter eq \'' + submitter + '\'');
      }
      
      if(jobName) {
        filter.push('name eq \'' + jobName + '\'');
      }
      
      if(submittedAfter) {
        filter.push('submitTime ge datetimeoffset\'' + submittedAfter + '\'');
      }
      
      if(submittedBefore) {
        filter.push('submitTime lt datetimeoffset\'' + submittedBefore + '\'');
      }
      
      if(state && state.length > 0) {
        var intermediateStateArray = state.split(',');
        var stateString = '(';
        var stateArray = [];
        for(var i = 0; i < intermediateStateArray.length; i++) {
          stateArray.push('state eq \'' + intermediateStateArray[i] + '\'');
        }
        
        stateString += stateArray.join(' or ') + ')';
        filter.push(stateString);
      }
      
      if(result && result.length > 0) {
        var intermediateResultArray = result.split(',');
        var resultString = '(';
        var resultArray = [];
        for(var j = 0; j < intermediateResultArray.length; j++) {
          resultArray.push('result eq \'' + intermediateResultArray[j] + '\'');
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
          
      withProgress(util.format($('Retrieving job list for account: %s'), accountName),
        function (log, _) {
          var response = client.job.list(accountName, parameters, _);
          jobList = response;
          var pushJobs = function(eachValue) {jobList.push(eachValue);};
          while(response.nextLink && response.nextLink.length > 0) {
            response = client.job.listNext(response.nextLink, _);
            response.forEach(pushJobs, jobList);
          }
      }, _);
      
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, jobList);
  });
  
  var dataLakeAnalyticsCatalog = dataLakeAnalyticsCommands.category('catalog')
    .description($('Commands to manage your Data Lake Analytics Catalog'));
 
  dataLakeAnalyticsCatalog.command('list [accountName] [itemType] [itemPath]')
    .description($('Lists all of the specified catalog item types under the path or, if the full path is given, just the single catalog item at that path.'))
    .usage('[options] <accountName> <itemType> <itemPath>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics account name to perform the action on.'))
    .option('-t --itemType <itemType>', $('The catalog item type to return. Valid values are (case insensitive): database, schema, secret, credential, assembly, externaldatasource, table, tablevaluedfunction, view, procedure, types or tablestatistics'))
    .option('-p --itemPath <itemPath>', $('The path to the catalog item(s) to get or list in the format: <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. This MUST be null when listing all databases.'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, itemType, itemPath, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!itemType) {
        return cli.missingArgument('itemType');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      var output = getCatalogItem(subscription, accountName, itemPath, itemType, _);
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, output);
    });
  
  var dataLakeAnalyticsCatalogSecret = dataLakeAnalyticsCatalog.category('secret')
    .description($('Commands to manage your Data Lake Analytics Catalog secrets'));
    
  dataLakeAnalyticsCatalogSecret.command('create [accountName] [databaseName] [hostUri] [secretName]')
    .description($('Creates the specified secret for the specified database.'))
    .usage('[options] <accountName> <databaseName> <hostUri> <secretName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database in which the secret will be created.'))
    .option('-u --hostUri <hostUri>', $('The full host URI associated with the external data source. The secret will be used with this host URI.'))
    .option('-e --secretName <secretName>', $('secret name, will prompt if not given'))
    .option('-p --password <password>', $('secret password, will prompt if not given'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, databaseName, hostUri, secretName, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!hostUri) {
        return cli.missingArgument('hostUri');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      secretName = cli.interaction.promptIfNotGiven('SecretName: ', secretName, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var params = {
        secretName: secretName,
        password: password,
        uri: hostUri
      };
      
      var response = client.catalog.createSecret(databaseName, params.secretName, params, accountName, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, response);
    });
    
    dataLakeAnalyticsCatalogSecret.command('set [accountName] [databaseName] [hostUri] [secretName]')
    .description($('Updates the password and/or hostUri of the specified secret in the specified database.'))
    .usage('[options] <accountName> <databaseName> <hostUri> <secretName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database in which the secret will be updated.'))
    .option('-u --hostUri <hostUri>', $('The full host URI associated with the external data source. The secret will be used with this host URI.'))
    .option('-e --secretName <secretName>', $('secret name, will prompt if not given'))
    .option('-p --password <password>', $('secret password, will prompt if not given'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, databaseName, hostUri, secretName, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!hostUri) {
        return cli.missingArgument('hostUri');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      secretName = cli.interaction.promptIfNotGiven('SecretName: ', secretName, _);
      var password = cli.interaction.promptPasswordOnceIfNotGiven('Password: ', options.password, _);
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var params = {
        secretName: secretName,
        password: password,
        uri: hostUri
      };
      
      var response = client.catalog.updateSecret(databaseName, params.secretName, params, accountName, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, response);
    });
    
    dataLakeAnalyticsCatalogSecret.command('delete [accountName] [databaseName] [secretName]')
    .description($('Updates the password and/or hostUri of the specified secret in the specified database.'))
    .usage('[options] <accountName> <databaseName> <hostUri> <secretName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics account name to perform the action on.'))
    .option('-d --databaseName <databaseName>', $('The name of the database in which the secret(s) will be deleted.'))
    .option('-e --secretName <secretName>', $('Optional secret name to delete, if not specified will delete all secrets in the specified database'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, databaseName, secretName, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!databaseName) {
        return cli.missingArgument('databaseName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Secret(s) in database %s? [y/n] '), databaseName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      
      client.catalog.deleteSecret(databaseName, secretName, accountName, _);
      
    });
    
  var dataLakeAnalyticsAccount = dataLakeAnalyticsCommands.category('account')
    .description($('Commands to manage your Data Lake Analytics accounts'));
 
  dataLakeAnalyticsAccount.command('list [resource-group]')
    .description($('List all Data Lake Analytics accounts available for your subscription or subscription and resource group'))
    .usage('[options]')
    .option('-g --resource-group <resource-group>', $('the optional resource group to list the accounts in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var accounts = listAllDataLakeAnalyticsAccounts(subscription, resourceGroup, _);
      dataLakeAnalyticsUtils.formatOutputList(cli, log, options, accounts);
    });

  dataLakeAnalyticsAccount.command('show [accountName] [resource-group]')
    .description($('Shows a Data Lake Analytics account based on account name'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to retrieve'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to list the accounts in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      var dataLakeAnalyticsAccount = client.account.get(resourceGroup, accountName, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);
    });
    
    dataLakeAnalyticsAccount.command('delete [accountName] [resource-group]')
    .description($('Deletes a Data Lake Analytics Account based on account name'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('the Data Lake Analytics account name to delete'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to force the command to find the Data Lake Analytics account to delete in.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake Analytics Account %s? [y/n] '), accountName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      client.account.deleteMethod(resourceGroup, accountName, _);
      log.info($('Successfully deleted the specified Data Lake Analytics Account.'));
    });
    
    dataLakeAnalyticsAccount.command('create [accountName] [location] [resource-group] [defaultDataLakeStore]')
    .description($('Creates a Data Lake Analytics Account'))
    .usage('[options] <accountName> <location> <resource-group> <defaultDataLakeStore>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics account name to create'))
    .option('-l --location <location>', $('the location the Data Lake Analytics account will be created in. Valid values are: North Central US, South Central US, Central US, West Europe, North Europe, West US, East US, East US 2, Japan East, Japan West, Brazil South, Southeast Asia, East Asia, Australia East, Australia Southeast'))
    .option('-g --resource-group <resource-group>', $('the resource group to create the account in'))
    .option('-d --defaultDataLakeStore <defaultDataLakeStore>', $('the default Data Lake Store to associate with this account.'))
    .option('-t --tags <tags>', $('Tags to set to the the Data Lake Analytics account. Can be mutliple. ' +
            'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, location, resourceGroup, defaultDataLakeStore, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);
      var dataLakeAnalyticsAccount = createOrUpdateDataLakeAnalyticsAccount(subscription, accountName, resourceGroup, location, defaultDataLakeStore, tags, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);
    });
  
    dataLakeAnalyticsAccount.command('set [accountName] [resource-group] [defaultDataLakeStore]')
    .description($('Updates the properties of an existing Data Lake Analytics Account'))
    .usage('[options] <accountName> <defaultDataLakeStore>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics Account name to perform the action on.'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-d --defaultDataLakeStore <defaultDataLakeStore>', $('the optional new default Data Lake Store account to set for this account'))
    .option('-t --tags <tags>', $('Tags to set to the Data Lake Analytics account group. Can be mutliple. ' +
            'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, defaultDataLakeStore, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if (!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      var dataLakeAnalyticsAccount = client.account.get(resourceGroup, accountName, _);
      
      if (!defaultDataLakeStore) {
        defaultDataLakeStore = dataLakeAnalyticsAccount.properties.defaultDataLakeStoreAccount;
      }
      
      var tags = {};
      if(!options.tags && !options.no-tags) {
        tags = dataLakeAnalyticsAccount.tags;
      }
      else {
        tags = tagUtils.buildTagsParameter(tags, options);
      }
      
      dataLakeAnalyticsAccount  = createOrUpdateDataLakeAnalyticsAccount(subscription, accountName, resourceGroup, dataLakeAnalyticsAccount.location, defaultDataLakeStore, tags, _);
      dataLakeAnalyticsUtils.formatOutput(cli, log, options, dataLakeAnalyticsAccount);    
    });
    
    var dataLakeAnalyticsAccountDataSource = dataLakeAnalyticsAccount.category('datasource')
    .description($('Commands to manage your Data Lake Analytics account data sources'));
    
    dataLakeAnalyticsAccountDataSource.command('add [accountName] [dataLakeStore] [isDefaultDataLakeStore] [azureBlob] [accessKey] [resource-group]')
    .description($('Adds an existing data source (Data Lake Store or Azure Blob) to the Data Lake Analytics Account'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics Account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the Data Lake Store account to add. NOTE: this argument and --isDefaultDataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-d --isDefaultDataLakeStore', $('the optional switch to indicate that the Data Lake being added should be the default Data Lake. NOTE: this argument and --dataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to add to the account. NOTE: this argument and --accessKey are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-k --accessKey <accessKey>', $('the access key associated with the azureBlob. NOTE: this argument and --azureBlob are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, dataLakeStore, isDefaultDataLakeStore, azureBlob, accessKey, resourceGroup, options, _) {
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
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      var parameters = {};
      if (dataLakeStore) {
        //TODO: remove this when bug 7075103 is fixed.
        parameters.properties= {};
        client.account.addDataLakeStoreAccount(resourceGroup, accountName, dataLakeStore, parameters, _);
      }
      else {
        parameters.properties = {
            accessKey: accessKey
        };
        
        client.account.addStorageAccount(resourceGroup, accountName, azureBlob, parameters, _);
      }
      
      if(isDefaultDataLakeStore) {
        createOrUpdateDataLakeAnalyticsAccount(subscription, accountName, resourceGroup, null, dataLakeStore, null, _);
      }
      
      log.info($('Successfully added the storage account specified to the Data Lake Analytics account: ' + accountName));
    });
    
    dataLakeAnalyticsAccountDataSource.command('delete [accountName] [dataLakeStore] [azureBlob] [resource-group]')
    .description($('removes a data source (Data Lake Store or Azure Blob) from the Data Lake Analytics Account'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics Account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the Data Lake to remove from the account. NOTE: this argument is part of a parameter set, and cannot be specified with --azureBlob.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to remove from the account. NOTE: this argument is part of a parameter set, and cannot be specified with --dataLakeStore.'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, dataLakeStore, azureBlob, resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      
      if(!dataLakeStore && !azureBlob) {
        throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if(dataLakeStore && azureBlob) {
        throw new Error($('Either --dataLakeStore or --azureBlob and --accessKey must be specified. They are two separate options and cannot all be specified at once.'));
      }
      
      if (!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      if (dataLakeStore) {
        client.account.deleteDataLakeStoreAccount(resourceGroup, accountName, dataLakeStore, _);
      }
      else {
        client.account.deleteStorageAccount(resourceGroup, accountName, azureBlob, _);
      }
      
      log.info($('Successfully removed the storage account specified from Data Lake Analytics account: ' + accountName));
    });
    
    dataLakeAnalyticsAccountDataSource.command('set [accountName] [dataLakeStore] [isDefaultDataLakeStore] [azureBlob] [accessKey] [resource-group]')
    .description($('Sets an existing data source (Data Lake Store or Azure Blob) in the Data Lake Analytics Account. Typically used to set the data source as default (for Data Lake) or update the access key (for Azure Blob)'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('The Data Lake Analytics Account name to perform the action on.'))
    .option('-l --dataLakeStore <dataLakeStore>', $('the Data Lake Store account to set. NOTE: this argument and --isDefaultDataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-d --isDefaultDataLakeStore', $('the optional switch to indicate that the Data Lake being set should be the default Data Lake. NOTE: this argument and --dataLakeStore are part of a parameter set, and cannot be specified with --azureBlob and --accessKey.'))
    .option('-b --azureBlob <azureBlob>', $('the azure blob to set in the account. NOTE: this argument and --accessKey are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-k --accessKey <accessKey>', $('the access key associated with the azureBlob to update. NOTE: this argument and --azureBlob are part of a parameter set, and cannot be specified with --dataLakeStore and --isDefaultDataLakeStore.'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, dataLakeStore, isDefaultDataLakeStore, azureBlob, accessKey, resourceGroup, options, _) {
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
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      if (dataLakeStore) {
        if(isDefaultDataLakeStore) {
          createOrUpdateDataLakeAnalyticsAccount(subscription, accountName, resourceGroup, null, dataLakeStore, null, _);
        }
        else {
          log.warning($('Data Lake Store Accounts can only be modified by indicating that they are now the Default Data Lake Store account. Otherwise only Add and Remove are supported for Data Lake Store accounts associated with a Data Lake Analytics account.'));
        }
      }
      else {
        var parameters = {
          properties: {
            accessKey: accessKey
          }
        };
          
        client.account.updateStorageAccount(resourceGroup, accountName, azureBlob, parameters, _);
      }
      
      log.info($('Successfully updated the storage account specified for Data Lake Analytics account: ' + accountName));
    });
    
  function createOrUpdateDataLakeAnalyticsAccount(subscription, accountName, resourceGroup, location, defaultDataLakeStore, tags, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      
      var client = utils.createDataLakeAnalyticsManagementClient(subscription);
      var create = false;
      try {
        client.account.get(resourceGroup, accountName, _);
      }
      catch(err){
        create = true;
      }
      
      var accountParams = {
          name: accountName,
          properties: {},
          tags: tags
      };
      
      if(create) {
        if (!location) {
          return cli.missingArgument('location');
        }
        if (!defaultDataLakeStore) {
          return cli.missingArgument('defaultDataLakeStore');
        }
        
        accountParams.properties.defaultDataLakeStoreAccount = defaultDataLakeStore;
        accountParams.properties.dataLakeStoreAccounts = [{name: defaultDataLakeStore}];
        accountParams.location = location;
        
        client.account.create(resourceGroup, accountParams.name, accountParams, _);
      }
      else {
        if (defaultDataLakeStore) {
          accountParams.properties.defaultDataLakeStoreAccount = defaultDataLakeStore;
        }
        
        client.account.update(resourceGroup, accountParams.name, accountParams, _);
      }
      
      return client.account.get(resourceGroup, accountName, _);
  }
  
  function getCatalogItem(subscription, accountName, itemPath, itemType, _) {
      var isList = isCatalogItemOrList(itemPath, itemType);
      var client = utils.createDataLakeAnalyticsCatalogManagementClient(subscription);
      var catalogItem = getCatalogItemObject(itemPath);
      var toReturn = [];
      
      switch (itemType.toLowerCase()) {
        case 'database':
          if(isList) {
            toReturn = client.catalog.listDatabases(accountName, _);
          }
          else {
            toReturn.push(client.catalog.getDatabase(catalogItem.databaseName, accountName, _));
          }
          break;
         case 'schema':
          if(isList) {
            toReturn = client.catalog.listSchemas(catalogItem.databaseName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getSchema(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _));
          }
          break;
        case 'secret':
          if(isList) {
            throw new Error($('U-SQL Secrets can only be returned by specific database secret name combination. There is no list support.'));
          }
          else {
            toReturn.push(client.catalog.getSecret(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _));
          }
          break;

        case 'assembly':
          if(isList) {
            toReturn = client.catalog.listAssemblies(catalogItem.databaseName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getAssembly(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _));
          }
          break;
        case 'externaldatasource':
          if(isList) {
            toReturn = client.catalog.listExternalDataSources(catalogItem.databaseName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getExternalDataSource(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _));
          }
          break;
        case 'credential':
          if(isList) {
            toReturn = client.catalog.listCredentials(catalogItem.databaseName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getCredential(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _));
          }
          break;
        case 'table':
          if(isList) {
            toReturn = client.catalog.listTables(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getTable(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, accountName, _));
          }
          break;
        case 'tablevaluedfunction':
          if(isList) {
            toReturn = client.catalog.listTableValuedFunctions(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getTableValuedFunction(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, accountName, _));
          }
          break;
        case 'tablestatistics':
          if(isList) {
            toReturn = client.catalog.listTableStatistics(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getTableStatistic(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, catalogItem.tableStatisticsName, accountName, _));
          }
          break;
        case 'view':
          if(isList) {
            toReturn = client.catalog.listViews(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getView(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, accountName, _));
          }
          break;
        case 'procedure':
          if(isList) {
            toReturn = client.catalog.listProcedures(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _);
          }
          else {
            toReturn.push(client.catalog.getProcedure(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, catalogItem.tableOrTableValuedFunctionName, accountName, _));
          }
          break;
        case 'types':
          if(isList) {
            toReturn = client.catalog.listTypes(catalogItem.databaseName, catalogItem.schemaAssemblyOrExternalDataSourceName, accountName, _);
          }
          else {
            throw new Error($('U-SQL Types can only be returned in a list of all types within a database and schema combination.'));
          }
          break;
        default:
          throw new Error($('Invalid catalog item type: ' + itemType + ' specified. Valid values are (case insensitive): database, schema, assembly, externaldatasource, table, tablevaluedfunction or tablestatistics'));
      }
      
      return toReturn;
  }
  
  function isCatalogItemOrList(itemPath, itemType) {
    var isList = false;
    if(!itemPath || itemPath === '') {
      // in this case, it is a list of ALL catalog items of the specified type across the entire catalog.
      return true;
    }
    
    var catalogItem = getCatalogItemObject(itemPath);
    switch (itemType.toLowerCase()) {
      case 'database':
        if(!catalogItem.databaseName) {
          isList = true;
        }
        break;
      case 'schema':
      case 'assembly':
      case 'externaldatasource':
      case 'credential':
      case 'secret':
        if(!catalogItem.databaseName) {
          throw new Error($('Invalid catalog path: ' + itemPath + 
            '. A catalog path must be in the following format with no empty internal elements:' +
            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
        }
        
        if(!catalogItem.schemaAssemblyOrExternalDataSourceName) {
          isList = true;
        }
        break;
      case 'table':
      case 'tablevaluedfunction':
      case 'procedure':
      case 'view':
      case 'types':
        if(!catalogItem.databaseName || !catalogItem.schemaAssemblyOrExternalDataSourceName) {
          throw new Error($('Invalid catalog path: ' + itemPath + 
            '. A catalog path must be in the following format with no empty internal elements:' +
            ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
        }
        
        if(!catalogItem.tableOrTableValuedFunctionName) {
          isList = true;
        }
        break;
      case 'tablestatistics':
        if(!catalogItem.databaseName || !catalogItem.schemaAssemblyOrExternalDataSourceName || !catalogItem.tableOrTableValuedFunctionName) {
          throw new Error($('Invalid catalog path: ' + itemPath + 
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
  
  function getCatalogItemObject(itemPath) {
    var toReturn = {
      fullitemPath: itemPath
    };
    
    if(!itemPath || itemPath.indexOf('.') < 0) {
      toReturn.databaseName = itemPath;
      return toReturn;
    }
    
    var regexPattern = /^(\w+|\[.+\])?(\.(\w+|\[.+\]))?(\.(\w+|\[.+\]))?(\.(\w+|\[.+\]))?$/;
    var matches = regexPattern.exec(itemPath);
    if(!matches) {
      throw new Error($('Invalid catalog path: ' + itemPath + 
        '. A catalog path must be in the following format with no empty internal elements:' +
        ' <FirstPart>.<OptionalSecondPart>.<OptionalThirdPart>.<OptionalFourthPart>. For example: Master.dbo.tableName.tableStatisticsName'));
    }
    
    var firstPart = sanitizeitemPath(matches[1], itemPath);
    var secondPart = sanitizeitemPath(matches[3], itemPath);
    var thirdPart = sanitizeitemPath(matches[5], itemPath);
    var fourthPart = sanitizeitemPath(matches[7], itemPath);
    
    toReturn.databaseName = firstPart;
    toReturn.schemaAssemblyOrExternalDataSourceName = secondPart;
    toReturn.tableOrTableValuedFunctionName = thirdPart;
    toReturn.tableStatisticsName = fourthPart;
    
    return toReturn;
  }
  
  function sanitizeitemPath(path, fullPath) {
    if(!path) {
      return path;
    }
    
    if(path.indexOf('[') === 0 && path.lastIndexOf(']') === path.length - 1) {
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
    var accounts;
    var response;
    if (!resourceGroup) {
      response = client.account.list(_);
      log.info(util.inspect(response));
      accounts = response;
      while (response.nextLink) {
        response = client.account.listNext(response.nextLink);
        accounts.push.apply(accounts, response);
      }
    }
    else {
      response = client.account.listByResourceGroup(resourceGroup, _);
      accounts = response;
      while (response.nextLink) {
        response = client.account.listByResourceGroupNext(response.nextLink);
        accounts.push.apply(accounts, response);
      }
    }
    
    return accounts;
  }
  
  function getResrouceGroupByAccountName(subscription, resourceGroup, name, _) {
    var accounts = listAllDataLakeAnalyticsAccounts(subscription, resourceGroup, _);
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].name === name) {
        var acctId = accounts[i].id;
        var rgStart = acctId.indexOf('resourceGroups/') + ('resourceGroups/'.length);
        var rgEnd = acctId.indexOf('/providers/');
        return acctId.substring(rgStart, rgEnd);
      }
    }
    
    throw new Error($('Could not find account: ' + name + ' in any resource group in subscription: ' + subscription.name + ' with id: ' + subscription.id ));
  }
};