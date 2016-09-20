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

var utils = require('../util/utils');
var serviceFabricUtils = require('./serviceFabricUtils');
var serviceFabricClient = require('azure-servicefabric');
var util = require('util');
var $ = utils.getLocaleString;


exports.init = function (cli) {
  var log = cli.output;
  
  var serviceFabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  var text = serviceFabric.category('text')
    .description($('Commands to manage your text'));
  
  text.command('encrypt [text] [path] [algorithmOid]')
    .description($('Encrypt text, Example: azure servicefabric text encrypt --text test --path /tmp/cert'))
    .option('--text <text>', $('the text'))
    .option('--path <path>', $('the path'))
    .option('--algorithm-oid <algorithmOid>', $('the algorithm oid'))
    .execute(function (text, path, algorithmOid, options, _) {
      var progress = cli.interaction.progress($('Encrypt text'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var command = util.format('invokeencrypttext "%s" "%s" "%s"', text, path, algorithmOid);
        var res = serviceFabricUtils.runChildProcess(command, _);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
  
  text.command('decrypt [cipherText]')
    .description($('Decrypt text, Example: azure servicefabric text decrypt --cipher-text 1234'))
    .option('--cipher-text <cipherText>', $('the cipher text'))
    .execute(function (cipherText, options, _) {
      var progress = cli.interaction.progress($('Decrypt text'));
      
      try {
        var config = serviceFabricUtils.readServiceFabricConfig(progress, _);
        
        var command = util.format('invokedecrypttext "%s"', cipherText);
        var res = serviceFabricUtils.runChildProcess(command, _);
        
        progress.end();
        
        cli.interaction.formatOutput(res, function (data) {
          log.json(data);
        });
      } catch (e) {
        progress.end();
        throw e;
      }
    });
};
