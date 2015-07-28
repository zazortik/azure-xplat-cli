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
      var args = line.trim().split(' ')
        .filter(function (a) {
          return a !== '';
        }).map(function (c) {
          return c.trim();
        });
     
      // discard "azure" word
      var index = 1;
      var arg = arg[index];
      var currentCategory = root;
      var parentCategory;
      var currentCommand;

      while (currentCategory && arg) {
        arg = args[index++];
        parentCategory = currentCategory;
        currentCategory = currentCategory[arg];
      }

      if (!currentCategory && arg) {
        currentCommand = parentCategory.commands[arg];
      }

      if (currentCategory) {
        //return sub categories and command combind (arg must be null)
        return this.reply(Object.keys(currentCategory.categories).concat(
          currentCategory.commands.map(function (c) { return c.name; })
        ));
      }
      
      //if we have no more argument
      if (!currentCategory && arg && index === args.length) {
        if (!currentCommand) {
          //return sub categories starting with the 'arg'
          var candidate = Object.keys(parentCategory.categories).concat(
            currentCategory.commands.map(function (c) { return c.name; }));
          return this.reply(candidate.filter(function (c) {
            return utilsCore.stringStartsWith(c, arg);
          }));
        } else {
          //return all options of the command
          return this.reply(command.options.map(function (o) { return o.long; }));
        }
      }
      
      //if command is null, or we are not in any interesting option
      if (!currentCommand ||
        currentCommand && !utilsCore.stringStartsWith(args[index], '-')) {
        return this.reply([]);
      }

      //check whether we have a file based option, if yes, return files under PWD
      var option = currentCommand.options.filter(function (c) {
        return c.fileRelatedOption && (c.short === arg || c.long === arg);
      })[0];

      if (option) {
        return this.reply(fs.readdirSync(__dirname));
      }
      
      return this.reply([]);
    }

    root.autoComplete.on('complete', handleAutocomplete);
    root.autoComplete.init();
  }
});

module.exports = AutoComplete;