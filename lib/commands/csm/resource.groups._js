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
// 

var utils = require('../../util/utils');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var log = cli.output;

  var cloudService = cli.category('rg')
    .mode('csm')
    .description($('Commands to manage your Resource Groups'));

  cli.command('create')
    .description($('Creates a new resource group'))
    .execute(function (options, _) {
      // TODO: to be implemented
      throw new Error('Not yet implemented');
    });
};