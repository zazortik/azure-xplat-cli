// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.

var fs = require('fs');
var path = require('path');
var util = require('util');
var npmlog = require('npmlog');

var getHomeFolder = require('../lib/util/utilsCore').homeFolder;
var streamLineFolder = path.join(getHomeFolder(), '.streamline');

if (fs.existsSync(streamLineFolder)) {
  var error = 'Installation of \'azure-cli\' is complete. It is highly recommended ' +
    'to remove the folder of \'%s\' to get rid of stale streamlined files.' +
    require('os').EOL;

  npmlog.warn(util.format(error, streamLineFolder));
}