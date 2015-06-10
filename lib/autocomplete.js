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
var fs = require('fs');
var path = require('path');

var CmdLoader = require('./cmdLoader');
var utilsCore = require('./util/utilsCore');

function AutoComplete() {
  this.mode = utilsCore.getMode();
  this.cmdMetadataFile = path.join(__dirname, 'plugins.' + this.mode  + '.json');
  this.cmdBasePath = __dirname;
  var loader = new CmdLoader(this, this.mode);
  if (loader.cmdMetadataExists()) {
    this.initFromCmdMetadata();
  }
  
  this.enableAutoComplete();
}

_.extend(AutoComplete.prototype, {
   initFromCmdMetadata: function() {
    var data = fs.readFileSync(this.cmdMetadataFile);
    var cachedPlugins = JSON.parse(data);
    this.commands = cachedPlugins.commands;
    this.categories = cachedPlugins.categories;
  },
  
  enableAutoComplete: function () {
    var root = this;
    var omelette = require('omelette');
    root.autoComplete = omelette('azure');

    function handleAutocomplete(fragment, word, line) {
      var results;
      
      var args = line.trim().split(' ').filter(function (a) {
        return a !== '';
      });
      
      args.shift(); // discard "azure" word

      var currentCategory = root;
      while (currentCategory) {
        /*jshint loopfunc:true*/
        if (args.length === 0) {
          return this.reply(Object.keys(currentCategory.categories).concat(
            currentCategory.commands.map(function (c) { return c.name; })
          ));
        } else {
          var currentWord = args.shift().trim();

          if (currentCategory.categories[currentWord]) {
            currentCategory = currentCategory.categories[currentWord];
          } else if (args.length === 0) {
            var command = currentCategory.commands.filter(function (c) {
              return c.name === currentWord;
            })[0];

            if (command) {
              return this.reply(command.options.map(function (o) { return o.long; }));
            } else {
              results = currentCategory.commands.filter(function (c) {
                return currentWord !== c.name && utilsCore.stringStartsWith(c.name, currentWord);
              }).map(function (c) {
                return c.name;
              });

              results = results.concat(Object.keys(currentCategory.categories).filter(function (c) {
                return currentWord !== c && utilsCore.stringStartsWith(c, currentWord);
              }));

              return this.reply(results);
            }
          } else {
            return this.reply([]);
          }
        }
      }

      return this.reply([]);
    }

    root.autoComplete.on('complete', handleAutocomplete);
    root.autoComplete.init();
  }
});

module.exports = AutoComplete;