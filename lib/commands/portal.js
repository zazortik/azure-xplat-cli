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

exports.init = function(cli) {
  cli.command('portal')
    .description('Opens the portal in a browser')
    .option('-e, --environment <environment>', 'The publish settings download environment')
    .option('-r, --realm <realm>', 'specifies organization used for login')
    .execute(function (options) {
      var targetUrl = utils.getPortalUrl(options.realm, options.environment);
      interaction.launchBrowser(targetUrl);
    });
};