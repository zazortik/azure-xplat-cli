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
var CLITest = require('./cli-test');

function ARMCLITest(testPrefix, env, forceMocked) {
  this.requiresToken = true;
  ARMCLITest['super_'].call(this, testPrefix, env, forceMocked);
  this.skipSubscription = true;
  this.commandMode = 'arm';
}

util.inherits(ARMCLITest, CLITest);

module.exports = ARMCLITest;
