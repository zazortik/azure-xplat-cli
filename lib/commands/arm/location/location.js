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

var resourceLib = require('azure-arm-resource');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  
  var group = cli.category('location')
    .description($('Commands to get the available locations'));
  
  group.command('list')
    .description($('list the available locations'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, callback) {
    
    if (!options.json) {
      log.warn('The "location list" commands is changed to list subscription\'s locations. ' + 
      'For old information, use "provider list or show" commands.');
      log.info('Getting locations...');
    }
    
    var subscription = profile.current.getSubscription(options.subscription);
    var client = resourceLib.createResourceSubscriptionClient(subscription._createCredentials(), 
                                                                 subscription.resourceManagerEndpointUrl);
    
    client.subscriptions.listLocations(subscription.id, function (err, result) {
      if (err) {
        return callback(err);
      }
      cli.interaction.formatOutput(result.locations, function (data) {
        if (data.length === 0) {
          log.info($('No location found'));
        } else {
          log.table(data, function (row, location) {
            row.cell($('Name'), location.name);
            row.cell($('Display Name'), location.displayName);
            row.cell($('Latitude'), location.latitude);
            row.cell($('Longitude'), location.longitude);
          });
        }
      });
      callback(null);
    });
  });
};