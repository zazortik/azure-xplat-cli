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
var adUtils = require('./adUtils._js');
var profile = require('../../../util/profile');
var rbacClients = require('../role/rbacClients');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var ad = cli.category('ad')
    .description($('Commands to display active directory objects'));
  var adUser = ad.category('user')
    .description($('Commands to display active directory users'));

  adUser.command('list')
    .description($('Get all active directory users in current subscription\'s tenant'))
    .option('| more', $('Provides paging support. Press \'Enter\' for more information.'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = rbacClients.getADGraphClient(subscription);
      var progress = cli.interaction.progress($('Listing active directory users'));
      try {
        adUtils.listGraphObjects(client, 'user', log, _);
      } finally {
        progress.end();
      }
    });

  adUser.command('show [spn] [objectId] [search]')
    .description($('Get an active directory user'))
    .usage('[options] [spn] [objectId] [search]')
    .option('--servicePrincipalName <servicePrincipalName>', $('the principal name of the user to return'))
    .option('--objectId <objectId>', $('the object id of the user to return'))
    .option('--search <search>', $('search users with display name starting with the provided value'))
    .execute(function (servicePrincipalName, objectId, search, options, _) {
    //TODO: common logic to verify command line parameters
    var subscription = profile.current.getSubscription(options.subscription);
    var client = rbacClients.getADGraphClient(subscription);
    var progress = cli.interaction.progress($('Getting active directory user'));
    var users = []; 
    try {
      if (servicePrincipalName) {
        users = client.user.getBySignInName(servicePrincipalName, _).users;
      } else if (objectId){
        var user = client.user.get(objectId, _).user;
        if (user) {
          users.push(user);
        }
      } else {
        users = client.user.list('', search, _).users;
      }
    } finally {
      progress.end();
    }

    if (users.length > 0 ) {
      adUtils.displayUsers(users, log);
    } else {
      log.data($('No matching user was found'));
    }
  });
};