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
var childProcess = require('child_process');


exports.uploadContent = function (connectionEndpoint, sourcePath, destinationPath, pathInImageStore, _) {
  var command = util.format('mono AzureCliProxy.exe copyapplicationpackage %s %s %s %s', connectionEndpoint, sourcePath, destinationPath, pathInImageStore ? pathInImageStore : '');
  childProcess.exec(command, _);
};
