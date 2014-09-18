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

var _ = require('underscore');
var utils =  require('../utils');

exports.find = function (query, entries) {
  //Here we do case insensitive matching on "userId": First, we filter using rest fields, then we filter on 'userId'. 
  var queryUserId = query.userId;
  if (queryUserId) {
    delete query.userId;
  }
  
  var results = _.where(entries, query);
  
  if (queryUserId) {
    results = results.filter(function (entry) {
      return utils.ignoreCaseEquals(entry.userId, queryUserId);
    });
    query.userId = queryUserId;
  }

  return results;
};
