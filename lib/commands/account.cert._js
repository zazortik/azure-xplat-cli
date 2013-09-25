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

var AccountClient = require('./account/accountclient');

var utils = require('../util/utils');
var $ = utils.getLocaleString;

exports.init = function (cli) {
  var accountClient = new AccountClient(cli);

  var account = cli.category('account');
  var cert = account.category('cert')
    .description($('Commands to manage your account certificates'));

  cert.command('export')
    .description($('Exports the publish settings file as a PEM file'))
    .option('-f, --file <file>', $('the name of the cert file. If not specified, generate a file in pwd using the subscription ID as the file name'))
    .option('-p, --publishsettings <publishsettings>', $('the publish settings file'))
    .option('--subscription <subscription>', $('the Name or ID for the subscription whose cert you want to export. If not specified, use the current subscription'))
    .execute(function (options, callback) {
      accountClient.export(options, callback);
    });
};