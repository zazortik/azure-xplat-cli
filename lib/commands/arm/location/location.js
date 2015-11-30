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

var request = require('request');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

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
    var cred = subscription._createCredentials();
    cred.retrieveTokenFromCache(function (err, tokenType, token) {
      if (err) {
        return callback(err);
      } else {
        //TODO: incorporate into swagger spec, once "Resources" lib gets migrated to AutoRest
        var url = subscription.resourceManagerEndpointUrl +
            'subscriptions/' + subscription.id + '/locations' +
            '?api-version=2014-04-01-preview';
        var options = {
          'url': url,
          headers: {
            'User-Agent': utils.getUserAgent(),
            'Authorization': tokenType + ' ' + token
          }
        };
        request(options, function (err, response, body) {
          if (!err && response.statusCode !== 200) {
            err = new Error(body);
            err.statusCode = response.statusCode;
          }
          if (err) {
            return callback(err);
          }
          var locations = JSON.parse(body).value;
          cli.interaction.formatOutput(locations, function (data) {
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
      }
    });
  });
};
