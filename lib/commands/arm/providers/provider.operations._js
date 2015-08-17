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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var Wildcard = utils.Wildcard;
var __ = require('underscore');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);
  
  var provider = cli.category('provider');
  var providerOperations = provider.category('operations')
    .description($('Commands to get the operations or actions allowed by an Azure resource provider.'));
  
  providerOperations.command('show [actionString]')
    .description($('Show providerOperations for the requested provider actionString'))
    .usage('[options] <actionString>')
    .option('-a --actionString <actionString>', $('the provider action string (with possible wildcard (*) characters)'))
    .option('-s --subscription <subscription', $('subscription to show provider operations for'))
    .execute(function (actionString, options, _) {
    var subscription = profile.current.getSubscription(options.subscription);
    var client = utils.createResourceClient(subscription);
    
    var flattenedProviderOperations = [];

    if (Wildcard.containWildcards(actionString)) {
      // ActionString has wildcard character
      flattenedProviderOperations = ProviderOperationsWithWildCard(client, actionString, _);
    }
    else {
      flattenedProviderOperations = ProviderOperationsWithoutWildCard(client, actionString, _);
    }
    
    cli.interaction.formatOutput(flattenedProviderOperations, function (data) {
      console.log("data length", data.length);
      
      if (!data || data.length === 0) {
        log.info($('No operations available matching the input action string'));
      } else {
        data.forEach(function (operation) {
          displayAProviderOperation(operation);
        });
      }
    });
  });
  
  function ProviderOperationsWithWildCard(client, actionString, _) {
    var operationsToDisplay = [];
    var providers = [];

    var nonWildCardPrefix = Wildcard.getNonWildcardPrefix(actionString);

    if (!nonWildCardPrefix || nonWildCardPrefix.length === 0) {
      // Get operations for all providers
      var allProviders = ListAllProviderOperationsMetadata(client, providerFullName, _);
      providers = providers.concat(allProviders);
    }
    else {
      var providerFullName = getProviderFullName(nonWildCardPrefix);

      if (!providerFullName || providerFullName.length === 0) {

        // Get operations for all providers
        var allProviders = ListAllProviderOperationsMetadata(client, providerFullName, _);
        providers = providers.concat(allProviders);
      }
      else {
        var specificProvider = GetProviderOperationsMetadata(client, providerFullName, _);
        providers.push(specificProvider);
      }
    }

    providers.forEach(function (provider) {
      var operations = GetFlattenedOperationsFromProviderOperationsMetadata(provider);

      operations.forEach(function (operation) {
        if (Wildcard.isMatchCaseInsensitive(operation.operation, actionString)) {
          operationsToDisplay.push(operation);
        }
      });
    });
    
    return operationsToDisplay;
  }

  function ProviderOperationsWithoutWildCard(client, actionString, _) {
    var operationsToDisplay = [];

    var providerFullName = getProviderFullName(actionString);

    if (providerFullName && providerFullName != '') {
      var provider = GetProviderOperationsMetadata(client, providerFullName, _);
      var operations = GetFlattenedOperationsFromProviderOperationsMetadata(provider);

      operationsToDisplay = __.where(operations, { operation: actionString });
    }
    return operationsToDisplay;
  }

  function getProviderFullName(actionString) {
    var index = actionString.indexOf("/");
    var fullName = '';
    if (index > 0) {
      fullName = actionString.substring(0, index);
    }
    return fullName;
  }

  function displayAProviderOperation(resourceProviderOperation) {
    log.data($('Operation         : '), resourceProviderOperation.operation);
    log.data($('OperationName     : '), resourceProviderOperation.operationName);
    log.data($('ProviderNamespace : '), resourceProviderOperation.providerNamespace);
    log.data($('ResourceName      : '), resourceProviderOperation.resourceName);
    log.data($('Description       : '), resourceProviderOperation.description);
    log.data('');
  }

  function GetProviderOperationsMetadata(client, providerFullName, _){
    return withProgress($('Getting providerOperations metadata'),
        function (log, _) {
      return client.providerOperationsMetadata.get(providerFullName, _).provider;
    }, _);
  }

  function ListAllProviderOperationsMetadata(client, providerFullName, _) {
    return withProgress($('Getting providerOperations metadata'),
        function (log, _) {
      return client.providerOperationsMetadata.list(_).providers;
    }, _);
  }

  function GetFlattenedOperationsFromProviderOperationsMetadata(provider) {
    var flattenedOperations = [];
    provider.operations.forEach(function (operation) {
      if (IsUserOperation(operation)) {
        flattenedOperations.push(GetFlattenedOperationObject(operation, provider.displayName));
      }
    });
    
    if (provider.resourceTypes) {
      provider.resourceTypes.forEach(function (rt) {
        rt.operations.forEach(function (operation) {
          if (IsUserOperation(operation)) {
            flattenedOperations.push(GetFlattenedOperationObject(operation, provider.displayName, rt.displayName));
          }
        });
      });
    }
    return flattenedOperations;
  }
  
  function IsUserOperation(operation) {
    return (!operation.origin || operation.origin.indexOf("user") > -1);
  }
  
  function GetFlattenedOperationObject(operation, providerDisplayName, resourceDisplayName) {

    var operationObject = {
      operation: operation.name,
      operationName: operation.displayName,
      description: operation.description,
      providerNamespace: providerDisplayName,
      resourceName: !resourceDisplayName ? "" : resourceDisplayName
    };

    return operationObject;
  }
};
