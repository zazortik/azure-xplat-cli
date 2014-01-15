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

var utils = require('../util/utils');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  cli.command('portal')
    .description($('Open the portal in a browser'))
    .option('-e, --environment <environment>', $('the publish settings download environment'))
    .option('-r, --realm <realm>', $('the organization\'s realm'))
    .execute(function (options, _) {
      var targetUrl = cli.environmentManager.getPortalUrl(options.realm, options.environment);
      cli.interaction.launchBrowser(targetUrl, _);
    });
};