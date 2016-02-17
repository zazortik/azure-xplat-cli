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

var utils = require('../../../util/utils');
var fs = require('fs');
var path = require('path');
var util = require('util');
var fse = require('fs-extra');
var child_process = require('child_process');


var constants = {
  fileSchema: 'file:',
  nativeSchema: 'fabric:ImageStore'
};

exports.uploadContent = function (connectionEndpoint, sourcePath, destinationPath, pathInImageStore, _) {
  console.log(connectionEndpoint)
  var command = util.format('mono AzureCliProxy.exe copyapplicationpackage %s %s %s %s', connectionEndpoint, sourcePath, destinationPath, pathInImageStore ? pathInImageStore : '');
  var r = child_process.exec(command, _);
  
  
  console.log(r)
  // destinationPath = destinationPath.substr(constants.fileSchema.length);
  
  // fs.accessSync(sourcePath, fs.R_OK);
  // destinationPath = destinationPath.trim();
  
  // var basename = path.basename(sourcePath);
  // var fullDestinationPath = path.join(destinationPath, basename);
  // fs.mkdir(fullDestinationPath, _);
  
  // fse.copySync(sourcePath, fullDestinationPath);
};
