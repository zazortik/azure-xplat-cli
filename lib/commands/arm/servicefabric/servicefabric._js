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

/*
* You can test sample commands get loaded by xplat by following steps:
* a. Copy the folder to '<repository root>\lib\commands\arm'
* b. Under <repository root>, run 'node bin/azure config mode arm'
* c. Run 'node bin/azure', you should see 'sample' listed as a command set
* d. Run 'node bin/azure', you should see 'create', "delete", etc 
      showing up in the help text 
*/

'use strict';

var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var serviceFabricUtils = require('./serviceFabricUtils');

var serviceFabricClient = require('./serviceFabricClient');
var serviceFabricPartition = require('./serviceFabricPartition');
var url = require('url');
var path = require('path');
var fs = require('fs');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  
  var servicefabric = cli.category('servicefabric')
    .description($('Commands to manage your Azure Service Fabric'));
  
  
  

  
  
  
  
  
  
  
  
  
  
};
