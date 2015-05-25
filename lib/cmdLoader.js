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

var utils = require('./util/utils.js'); 

function CmdLoader(cmdSrc, topCmd) {
  this.topCmd = topCmd;
}

_.extend(CmdLoader.prototype, {
  _harvestPlugins: function () {
    var self = this;
    
    var basePath = path.dirname(__filename);
    
    var plugins = this._scan(path.join(basePath, 'commands'), false);
    plugins.forEach(function (plugin) { plugin.init(self.topCmd); });
    
    // Load mode plugins
    var modePlugins = this._scan(path.join(basePath, 'commands', self.topCmd.getMode()), true);
    modePlugins.forEach(function (plugin) { plugin.init(self); });
  },

  _scan: function(scanPath, recursively) {
    var results = utils.getFiles(scanPath, recursively);
    
    results = results.filter(function (filePath) {
      var extname = path.extname(filePath);
      if (filePath.substring(0, 5) === 'tmp--') {
        return false;
      } else if (extname !== '.js' && extname !== '._js') {
        //Skip unrelated/temp files
        return false;
      }
      return true;
    });
    
    if (process.env.PRECOMPILE_STREAMLINE_FILES) {
      results = results.filter(function (filePath) {
        if (filePath.substring(filePath.length - 4) === '._js') {
          return false;
        }
        return true;
      });
    }
    
    // sort them so they load in a predictable order
    results = results.sort();
    
    // skip directories
    results = results.filter(function (filePath) {
      return fs.statSync(filePath).isFile();
    });
    
    // load modules
    results = results.map(function (filePath) {
      return require(filePath);
    });
    
    // look for exports.init
    results = results.filter(function (entry) {
      return entry.init !== undefined;
    });
    return results;
  }, 

  harvestModules: function () {
    var self = this;
    
    var basePath = path.dirname(__filename);
    
    var walkPath = path.join(basePath, '../node_modules');
    var harvestPaths = [walkPath];
    
    while (path.basename(walkPath) === 'node_modules' && path.dirname(walkPath) !== 'npm') {
      var nextPath = path.join(walkPath, '../..');
      if (nextPath === walkPath) {
        break;
      }
      harvestPaths.push(nextPath);
      walkPath = nextPath;
    }
    
    var modules = [];
    harvestPaths.forEach(function (harvestPath) {
      modules = modules.concat(scan(harvestPath));
    });
    
    modules.forEach(function (module) {
      module.plugin.init(self);
    });
    
    function scan(scanPath) {
      var results = fs.readdirSync(scanPath);
      
      results = results.map(function (moduleName) {
        return {
          moduleName: moduleName,
          modulePath: path.join(scanPath, moduleName)
        };
      });
      
      results = results.filter(function (item) {
        try {
          item.moduleStat = fs.statSync(item.modulePath);
        } catch (error) {
          return false;
        }
        return item.moduleStat.isDirectory();
      });
      
      results = results.filter(function (item) {
        item.packagePath = path.join(item.modulePath, 'package.json');
        item.packageStat = utils.pathExistsSync(item.packagePath) ? fs.statSync(item.packagePath) : undefined;
        return item.packageStat && item.packageStat.isFile();
      });
      
      results = results.filter(function (item) {
        try {
          item.packageInfo = JSON.parse(fs.readFileSync(item.packagePath));
          return item.packageInfo && item.packageInfo.plugins && item.packageInfo.plugins['azure-cli'];
        }
        catch (err) {
          return false;
        }
      });
      
      results = flatten(results.map(function (item) {
        var plugins = item.packageInfo.plugins['azure-cli'];
        if (!_.isArray(plugins)) {
          plugins = [plugins];
        }
        
        return plugins.map(function (relativePath) {
          return {
            context: item,
            pluginPath: path.join(item.modulePath, relativePath)
          };
        });
      }));
      
      results = results.filter(function (item) {
        item.plugin = require(item.pluginPath);
        return item.plugin.init;
      });
      
      return results;
    }
    
    function flatten(arrays) {
      var result = [];
      arrays.forEach(function (array) {
        result = result.concat(array);
      });
      return result;
    }
  }
});


