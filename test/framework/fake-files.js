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

var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var utils = require('../../lib/util/utils');

function FakeFiles() {
  this.existsSync = utils.pathExistsSync;
  this.statSync = fs.statSync;
}

_.extend(FakeFiles.prototype, {
  withFile: function (filePath) {
    var oldExists = this.existsSync;
    var oldStat = this.statSync;

    this.existsSync = function (p) {
      if (path.resolve(p) === path.resolve(filePath)) {
        return true;
      }
      return oldExists(p);
    };

    this.statSync = function (p) {
      if (path.resolve(p) === path.resolve(filePath)) {
        return {
          isDirectory: function () { return false; }
        };
      }
      return oldStat(p);
    };

    return this.withDir(path.dirname(filePath));
  },

  withDir: function (dirPath) {
    var oldExists = this.existsSync;
    var oldStat = this.statSync;

    if (dirPath === '.') {
      return this;
    }

    this.existsSync = function (p) {
      if (path.resolve(p) === path.resolve(dirPath)) {
        return true;
      }
      return oldExists(p);
    };

    this.statSync = function (p) {
      if (path.resolve(p) === path.resolve(dirPath)) {
        return {
          isDirectory: function () { return true; }
        };
      }
      return oldStat(p);
    };

    return this.withDir(path.dirname(dirPath));
  },

  setMocks: function (sinonObj) {
    sinonObj.stub(fs, 'statSync', this.statSync);
    sinonObj.stub(utils, 'pathExistsSync', this.existsSync);
  }
});

module.exports = FakeFiles;