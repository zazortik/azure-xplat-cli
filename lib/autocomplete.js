var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var log = require('./util/logging');
var CmdLoader = require('./cmdLoader');
function AutoComplete(gen, mode) {
  this.gen = gen;
  this.mode = mode;
  this.cmdMetadataFile = path.join(__dirname, 'plugins.' + mode  + '.json');
  this.cmdBasePath = __dirname;
  var loader = new CmdLoader(this, mode);
  if (gen) {
    loader.harvestPlugins();
    loader.harvestModules();
    loader.saveCmdMetadata();
    return;
  } else if (loader.cmdMetadataExists()) {
    this.initFromCmdMetadata(AutoCompleteEntity);
  } else {
    loader.harvestPlugins();
    loader.harvestModules();
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
    var self = this;
    var initCategory = function (category, parent) {
      function process(entity, entityParent) {
        var newEntity = new Entity(entity.name, entityParent);
        
        if (entity.description) {
          newEntity._description = entity.description;
        }
        newEntity.description = function () {
          return newEntity._description;
        };

        newEntity.fullName = function () {
          return entity.fullName;//TODO: why this field is treated differently?
        };
        
        newEntity._usage = entity.usage;
        newEntity.usage = function () {
          return newEntity._usage;
        };

        newEntity.filePath = entity.filePath ? 
          path.resolve(self.cmdBasePath, entity.filePath.split('\\').join('/')) : entity.filePath;
        //console.log('@@@@my normalized stuff:' + newEntity.filePath);
        //console.log('@@@@my join stuff:' + path.join(self.cmdBasePath, entity.filePath));
        newEntity.stub = true;//TODO needed?
        
        if (entity.options) {
          newEntity.options = entity.options;
        }
        
        return newEntity;
      }
      

      var newCategory = category;
      //can't invoke "process" for top category, which would new up a top AzureCli and 
      //get us into an infinite loop. 
      if (parent) {
        newCategory = process(category, parent);
      }

      for (var i = 0 ; i < category.commands.length; i++) {
        if (!(newCategory.commands)) newCategory.commands = [];
        newCategory.commands[i] = process(category.commands[i], newCategory);
      }
      
      if (!newCategory.categories) {
        newCategory.categories = {};
      }
      
      for (var j in category.categories) {
        newCategory.categories[j] = initCategory(category.categories[j], newCategory);
      }
      
      return newCategory;
    };
    
    var data = fs.readFileSync(this.cmdMetadataFile);
    var cachedPlugins = JSON.parse(data);
    var plugins = initCategory(cachedPlugins);
    
    this.commands = plugins.commands;
    this.categories = plugins.categories;
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
                return currentWord !== c.name && AutoComplete.prototype.stringStartsWith(c.name, currentWord);
              }).map(function (c) {
                return c.name;
              });

              results = results.concat(Object.keys(currentCategory.categories).filter(function (c) {
                return currentWord !== c && AutoComplete.prototype.stringStartsWith(c, currentWord);
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