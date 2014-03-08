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
var utils = require('../../../util/utils');

/**
* Update any property from options with associated values from options
*/
exports.mergeCsmResourceProperties = function mergeProperties(target, options) {
  var src, copy, name, options, clone;

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object") {
    target = {};
  }
  
  if (options != null) {
    // Extend the base object
    for (name in options) {
      src = target[name];
      copy = options[name];

      // Prevent never-ending loop
      if (target === copy) {
        continue;
      }

      // Recurse if we're merging plain objects or arrays
      if (copy && (typeof obj === "object" || copy instanceof Array)) {
        if (copy instanceof Array) {
          clone = src ? src : [];
        } else {
          clone = src ? src : {};
        }

        // Never move original objects, clone them
        target[name] = mergeProperties(clone, copy);

        // Don't bring in undefined values
      } else if (copy !== undefined) {
        target[name] = copy;
      }
    }
  }
  return target;
};