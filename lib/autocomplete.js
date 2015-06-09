var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var log = require('./util/logging');
var CmdLoader = require('./cmdLoader');

function AutoComplete(mode) {
  this.mode = mode;
  this.cmdMetadataFile = path.join(__dirname, 'plugins.' + mode  + '.json');
  this.cmdBasePath = __dirname;
  var loader = new CmdLoader(this, mode);
  if (loader.cmdMetadataExists()) {
    this.initFromCmdMetadata(AutoCompleteEntity);
  }
  
  this.enableAutoComplete();
}

_.extend(AutoComplete.prototype, {
  stringStartsWith: function (text, prefix, ignoreCase) {
    if (_.isNull(prefix)) {
      return true;
    }
  
    if (ignoreCase) {
      return text.toLowerCase().substr(0, prefix.toLowerCase().length) === prefix.toLowerCase();
    } else {
      return text.substr(0, prefix.length) === prefix;
    }
  },
  
  initFromCmdMetadata: function(Entity) {
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
                return currentWord !== c.name && root.stringStartsWith(c.name, currentWord);
              }).map(function (c) {
                return c.name;
              });

              results = results.concat(Object.keys(currentCategory.categories).filter(function (c) {
                return currentWord !== c && root.stringStartsWith(c, currentWord);
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

function AutoCompleteEntity(name, parent) {
  this.name = name;
  this.parent = parent;
}

module.exports = AutoComplete;