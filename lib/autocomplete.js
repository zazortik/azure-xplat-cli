var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var CmdLoader = require('./cmdLoader');
var Constants = require('./util/constants');

function AutoComplete() {
  this.mode = this.getMode();
  this.cmdMetadataFile = path.join(__dirname, 'plugins.' + this.mode  + '.json');
  this.cmdBasePath = __dirname;
  var loader = new CmdLoader(this, this.mode);
  if (loader.cmdMetadataExists()) {
    this.initFromCmdMetadata(AutoCompleteEntity);
  }
  
  this.enableAutoComplete();
}

_.extend(AutoComplete.prototype, {
  homeFolder: function () {
    if (process.env.HOME !== undefined) {
      return process.env.HOME;
    }
  
    if (process.env.HOMEDRIVE && process.env.HOMEPATH) {
      return process.env.HOMEDRIVE + process.env.HOMEPATH;
    }
  
    throw new Error('No HOME path available');
  },
  
  pathExistsSync: fs.existsSync ? fs.existsSync : path.existsSync,
  
  azureDir: function () {
    var dir = process.env.AZURE_CONFIG_DIR ||
      path.join(this.homeFolder(), '.azure');
  
    if (!this.pathExistsSync(dir)) {
      fs.mkdirSync(dir, 502); // 0766
    }
  
    return dir;
  },
  
  readConfig: function () {
    var azureConfigPath = path.join(this.azureDir(), 'config.json');
  
    var cfg = {};
  
    if (this.pathExistsSync(azureConfigPath)) {
      try {
        cfg = JSON.parse(fs.readFileSync(azureConfigPath));
      } catch (err) {
        cfg = {};
      }
    }
  
    return cfg;
  },
  
  getMode: function () {
    var config = this.readConfig();
    if (config.mode) {
      var basePath = path.dirname(__filename);
      var modeDirectory = path.join(basePath, 'commands', config.mode);

      if (fs.existsSync(modeDirectory)) {
        return config.mode;
      }
    }

    return Constants.API_VERSIONS.ASM;
  },
  
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