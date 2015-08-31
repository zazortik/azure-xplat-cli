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
var utils = require('../../../util/utils');
var util = require('util');
var rbacClients = require('../role/rbacClients');
var adUtils = require('../ad/adUtils');

var $ = utils.getLocaleString;


exports.processInsightsResults = function (log, insightsResults, subscription) {
  var startEvents = {}, endEvents = {}, offlineEvents = {}, event ,parsedEvent;
  console.log("insights lengts: %s", util.inspect(insightsResults.length, { depth: null }));
  
  // Divide into 3 buckets, start, end and offline
  for (var i = 0; i < insightsResults.length; i++) {
   if (insightsResults[i]["httpRequest"] !== null && utils.ignoreCaseEquals((insightsResults[i]["status"]).value, "Started")) {
      startEvents[insightsResults[i]["operationId"]] = insightsResults[i];
   } else if (insightsResults[i]["httpRequest"] !== null && !utils.ignoreCaseEquals((insightsResults[i]["status"]).value, "Started")) {
      endEvents[insightsResults[i]["operationId"]] = insightsResults[i];
    }
    else if (insightsResults[i]["httpRequest"] == null ) {
      offlineEvents[insightsResults[i]["operationId"]] = insightsResults[i];
    }
  }

  var graphClient = adUtils.getADGraphClient(subscription);
  var output = [];
  var principalDetailsCache = {};
  
  // Cache all roledefinitions
  var roleDefinitionCache = {};
  var authzClient = rbacClients.getAuthzClient(subscription);
  var result = authzClient.roleDefinitions.list(_);
  for (var i = 0; i < result.length; i++) {
    roleDefinitionCache[result[i]["id"]] = result[i];
  }

  //Process StartEvents
  // Find matching EndEvents that succeeded and relating to role assignments only
  var se;
  for (se in startEvents) {
    var out = {};
    if ((endEvents[se] != undefined) && (utils.stringStartsWith(endEvents[se]["operationName"].value, 'Microsoft.Authorization/RoleAssignments', true))
      && utils.ignoreCaseEquals(endEvents[se]["status"].value, 'Succeeded')) {
   
      var endEvent = endEvents[se];
      var startEvent = startEvents[se];
      out["TimeStamp"] = endEvent["eventTimestamp"];
      out["Caller"] = startEvent["caller"]
      
      var messageBody;
      if (utils.ignoreCaseEquals(startEvent["httpRequest"]["method"], 'PUT')) {
        out["Action"] = 'Granted';
        messageBody = JSON.Parse(startEvent["properties"].requestBody);
      } else if (utils.ignoreCaseEquals(startEvent["httpRequest"]["method"], 'DELETE')) {
        out["Action"] = 'Revoked';
        messageBody = JSON.Parse(endEvent["properties"].responseBody);
      }
      
      if (messageBody) {
        out["PrincipalId"] = messageBody["properties"]["principalId"];
        if (out["PrincipalId"] != null) {
          var principalDetails = getPrincipalDetails(out["PrincipalId"], principalDetailsCache);
          out["PrincipalName"] = principalDetails.Name;
          out["PrincipalType"] = principalDetails.Type;
        }

        out["Scope"] = messageBody["properties"]["scope"];
        if (out["Scope"]) {
          var resourceDetails = getResourceDetails(out["Scope"]);
          out["ScopeName"] = resourceDetails.Name;
          out["ScopeType"] = resourceDetails.Type;
        }

        out["RoleDefinitionId"] = messageBody["properties"]["roleDefinitionId"];
        if (out["RoleDefinitionId"]) {
          if (roleDefinitionCache[out["RoleDefinitionId"]]) {
            out["RoleName"] = roleDefinitionCache[out["RoleDefinitionId"]].Name;
          } else {
            out["RoleName"] = '';
          }
        }
      }
    }

    output.push(out); 
  } //end of startevent processing
  
  // Filter classic admins events
  var oe;
  for (oe in offlineEvents) {
    var out = {};
    var offlineEvent = offlineEvents[oe];

    if (offlineEvent["status"] && utils.ignoreCaseEquals(offlineEvent["status"], 'Succeeded') && offlineEvent["operationName"] && utils.stringStartsWith(offlineEvent["operationName"].value, 'Microsoft.Authorization/ClassicAdministrators', true)) {
      out["TimeStamp"] = offlineEvent["eventTimestamp"];
      out["Caller"] = 'Subscription Admin';

      if (utils.ignoreCaseEquals(offlineEvent["operationName"],'Microsoft.Authorization/ClassicAdministrators/write')) {
        out["Action"] = 'Granted';
      }
      else if (utils.ignoreCaseEquals(offlineEvent["operationName"], 'Microsoft.Authorization/ClassicAdministrators/delete')) {
        out["Action"] = 'Revoked';
      }
      
      out["RoleDefinitionId"] = null;
      out["PrincipalId"] = null;
      out["PrincipalType"] = "User";
      out["Scope"] = '/subscriptions/' + subscriptionId;
      out["ScopeType"] = 'Subscription';
      out["ScopeName"] = subscriptionId;
      
      if (offlineEvent["Properties"]) {
        out["PrincipalName"] = offlineEvent["Properties"]["adminEmail"];
        out["RoleName"] = 'Classic ' + offlineEvent["Properties"]["adminType"];
      }
    }

    output.push(out); 
  } //end of offline event processing

  for (var i = 0; i < output.length; i++) {
    displayRecord(output[i], log);
  }
};

function displayRecord(record, log) {
  log.data($('Timestamp         :'), record["Timestamp"]);
  log.data($('Caller            :'), record["Caller"]);
  log.data($('Action            :'), record["Action"]);
  log.data($('PrincipalId       :'), record["PrincipalId"]);
  log.data($('PrincipalName     :'), record["PrincipalName"]);
  log.data($('PrincipalType     :'), record["PrincipalType"]);
  log.data($('Scope             :'), record["Scope"]);
  log.data($('ScopeType         :'), record["ScopeType"]);
  log.data($('ScopeName         :'), record["ScopeName"]);
  log.data($('RoleDefinitionId  :'), record["RoleDefinitionId"]);
  log.data($('RoleName          :'), record["RoleName"]);
  log.data('');
}

function getPrincipalDetails(principalId, principalDetailsCache, graphClient) {
  if (principalDetailsCache[principalid] != null) {
    return principalDetailsCache[principalid];
  }

  var principalDetails;
  var user = graphClient.user.get(principalId, _).user;
  if (user) {
    principalDetails["Name"] = user.DisplayName;
    principalDetails["Type"] = 'User';
  } else {
    var group = graphClient.group.get(principalId, _).group;
    if (group) {
      principalDetails["Name"] = group.displayName;
      principalDetails["Type"] = 'Group';
    } else {
      var servicePrincipal = graphClient.servicePrincipal.get(principalId, _).servicePrincipal;
      if (servicePrincipal) {
        principalDetails["Name"] = servicePrincipal.displayName;
        principalDetails["Type"] = 'Service Principal';
      }
    }
  }

  // Add this principal to cache
  principalDetailsCache[principalid] = principalDetails;

  return principalDetails;
}

function getResourceDetails(scope) {
  var resourceDetails;
  var scopeParts = scope.split('/');
  var len = scopeParts.length;

  if (len > 0 && len < 2 && scope.toLowerCase().indexOf('subscriptions') > 0) {
    resourceDetails["Type"] = "Subscription";
    resourceDetails["Name"] = scopeParts[1];
  }
  else if(len > 0 && len <= 4 && scope.toLowerCase().indexOf("resourcegroups") > 0) {
    resourceDetails["Type"] = "Resource Group";
    resourceDetails["Name"] = scopeParts[3];
  }
  else if(len >= 6 && scope.toLowerCase().indexOf("providers") > 0) {
    resourceDetails["Type"] = "Resource";
    resourceDetails["Name"] = scopeParts[len - 1];
  }

  return resourceDetails;
}

