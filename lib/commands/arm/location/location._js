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

var util = require('util');
 
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var providerUtils = require('../providers/providerUtils');

var resourceLib = require('azure-arm-resource');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  var group = cli.category('location')
    .description($('Commands to get the available locations'));
  
  group.command('list')
    .description($('list the available locations'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(withClient(function (client, options, _) {
    var providers;

    withProgress($('Getting ARM registered providers'),
        function (log, _) {
          providers = providerUtils.getAllProviders(client, _);
        }, _);

    if (!options.json) {
      log.warn('The "location list" commands is changed to list subscription\'s locations. ' + 
      'For old information, use "provider list or show" commands.');
      log.info('Getting locations...');
    }


    var subscription = profile.current.getSubscription(options.subscription);

    var clientA = new resourceLib.SubscriptionClient(subscription._createCredentials(), 
                                                   subscription.resourceManagerEndpointUrl);

    var result = clientA.subscriptions.listLocations(subscription.id, _);
    result = takeAwayLatLonAddProviders(result, providers);

      cli.interaction.formatOutput(result, function (data) {
        if (data.length === 0) {
          log.info($('No location found'));
        } else {
          data.forEach(function(location){
            log.data('');
            log.data($('Location    : '), location.name);
            log.data($('DisplayName : '), location.displayName);
            log.data($('Providers   : '), showList(location.providers, 4));
          });
        }
      });
  }));
};

function takeAwayLatLonAddProviders(result, providers) {
  return result.map(function(x){ return {"id": x.id, "name": x.name, "displayName": x.displayName, "providers": getProviders(providers, x.displayName) }; });
}

function showList(providerArr, numToShow){ 
  var smallerList = providerArr.slice(0, numToShow).join(", ");
  var ellipse =  providerArr.length > 4 ? "..." : "";
    return smallerList + ellipse;
}

function getProviders(locationData, name) {
  var providers = locationData.map(function(x) {
    if (x.resourceTypes.filter(function(y){ return y.locations.filter(function(z){ return z == name }).length }).length > 0) {
      return x.namespace;
    }
  }).filter(function(x){ return x != undefined });
return providers;
};

function withClient(wrappedFunction) {
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var options = args[args.length - 2];
    var subscription = profile.current.getSubscription(options.subscription);
    var client = utils.createResourceClient(subscription);
    return wrappedFunction.apply(this, [client].concat(args));
  };
}
