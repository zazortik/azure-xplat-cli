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

exports.buildTagsObject = function (tagsParameter) {
  var tags = {};
  tagsParameter.split(';').forEach(function (tagValue) {
    var tv = tagValue.split('=');
    if (tv.length === 2) {
      tags[tv[0]] = tv[1];
    }
    else {
      tags[tv[0]] = '';
    }
  });
  return tags;
};

exports.populateWithTagInfo = function (tag, parameters) {
  var tv = tag.split('=');
  if (tv.length > 0) {
    parameters['tagName'] = tv[0];
    parameters['tagValue'] = tv[1];//could be undefined, but that is fine.
  }
};

exports.getTagsInfo = function (tags) {
  var tagsInfo = '';
  for (var tagName in tags) {
    var tagEntity = tags[tagName] ? (tagName + '=' + tags[tagName]) : tagName;
    tagsInfo = tagsInfo ? (tagsInfo + ';' + tagEntity) : tagEntity;
  }
  return tagsInfo;
};
