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

// If running from MSI installed version, don't use the
// compile on the fly streamline files. MSI install precompiles
// the streamline files
if (!process.env.PRECOMPILE_STREAMLINE_FILES) {
  require('streamline').register({cache: true});
}

var commander = require('commander');
var omelette = require('omelette');

var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('underscore');

var log = require('winston');
var eyes = require('eyes');
var Table = require('easy-table');

var utils = require('./util/utils');
var Interactor = require('./util/interaction');

var EnvironmentManager = require('./util/environmentmanager');

require('./util/patch-winston');

function AzureCli(name, parent) {
  this.parent = parent;
  this.output = log;
  this.interaction = new Interactor(this);

  AzureCli['super_'].call(this, name);

  if (!parent) {
    this.initSetup();

    this.enableNestedCommands(this);

    // Check node.js version.
    // Do it after changing exception handler.
    this.checkVersion();

    this.harvestPlugins();
    this.harvestModules();

    this.enableAutoComplete();
  }
}

util.inherits(AzureCli, commander.Command);

_.extend(AzureCli.prototype, {
  initSetup: function() {
    var self = this;

    self.environmentManager = new EnvironmentManager();

    self.debug = process.env.AZURE_DEBUG === '1';

    // Install global unhandled exception handler to make unexpected errors more user-friendly.
    if (!self.debug && process.listeners('uncaughtException').length === 0) {
      self.uncaughExceptionHandler = function (err) {
        self.interaction.clearProgress();

        // Exceptions should always be logged to the console
        var noConsole = false;
        if (!log['default'].transports.console) {
          noConsole = true;
          self.output.add(self.output.transports.Console);
        }

        var loggedFullError = false;
        if (err.message) {
          log.error(err.message);
        } else if (err.Message) {
          log.error(err.Message);
        } else {
          log.json('error', err);
          loggedFullError = true;
        }

        if (!loggedFullError) {
          if (err.stack) {
            log.verbose('stack', err.stack);
          }

          log.json('silly', err);
        }

        self.recordError(err);

        if (noConsole) {
          self.output.remove(self.output.transports.Console);
        }

        self.exit('error', null, 1);
      };

      process.addListener('uncaughtException', self.uncaughExceptionHandler);
    }
  },

  recordError: function(err) {
    if (err && err.stack) {
      try {
        fs.writeFileSync('azure.err', (new Date()) + ':\n' +
            util.inspect(err) + '\n' + err.stack + '\n');
        (log.format().json ? log.error : log.info)('Error information has been recorded to azure.err');
      } catch(err2) {
        log.warn('Cannot save error information :' + util.inspect(err2));
      }
    }
  },

  exit: function (level, message, exitCode) {
    var self = this;

    self.interaction.clearProgress();
    if (message) {
      log.log(level, message);
    }

    if (self.uncaughtExceptionHandler) {
      process.removeListener('uncaughtException', self.uncaughExceptionHandler);
    }

    process.exit(exitCode);
  },

  execute: function (fn) {
    var self = this;

    return self.action(function () {
      self.setupCommandOutput();

      if (log.format().json) {
        log.verbose('Executing command ' + self.fullName().bold);
      } else {
        log.info('Executing command ' + self.fullName().bold);
      }

      try {
        // pass no more arguments than the function expects, including options and callback at the end (unless it expects 0 or 1)
        var argCount = fn.length <= 1 ? arguments.length : fn.length - 1; // not including callback
        var args = new Array(argCount);
        var optionIndex = arguments.length - 1;
        for (var i = 0; i < arguments.length; ++i) {
          if (typeof arguments[i] === 'object') {
            optionIndex = i;
            break;
          }
          if (i < argCount - 1) {
            args[i] = arguments[i];
          }
        }
        // append with options and callback
        args[argCount - 1] = arguments[optionIndex];
        args.push(callback);
        fn.apply(this, args);
      } catch (err) {
        callback(err);
      }

      function callback(err) {
        if (err) {
          // Exceptions should always be logged to the console
          var noConsole = false;
          if (!log['default'].transports.console) {
            noConsole = true;
            self.output.add(self.output.transports.Console);
          }

          if (err.message) {
            log.error(err.message);
            log.json('silly', err);
          } else if (err.Message) {
            if (typeof err.Message === 'object' && typeof err.Message['#'] === 'string') {
              var innerError;
              try {
                innerError = JSON.parse(err.Message['#']);
              } catch (e) {
                // empty
              }

              if (innerError) {
                if (noConsole) {
                  self.output.remove(self.output.transports.Console);
                }

                return callback(innerError);
              }
            }

            log.error(err.Message);
            log.json('verbose', err);
          } else {
            log.error(err);
          }

          self.recordError(err);
          if (err.stack) {
            (self.debug ? log.error : log.verbose)(err.stack);
          }

          if (noConsole) {
            self.output.remove(self.output.transports.Console);
          }

          self.exit('error', self.fullName().bold + ' command ' + 'failed\n'.red.bold, 1);
        } else {
          if (log.format().json) {
            self.exit('verbose', self.fullName().bold + ' command ' + 'OK'.green.bold, 0);
          }
          else {
            self.exit('info', self.fullName().bold + ' command ' + 'OK'.green.bold, 0);
          }
        }
      }
    });
  },

  /*
  * Extends the default parseOptions to support multiple levels in commans parsing.
  */
  parseOptions: function(argv) {
    var args = [];
    var len = argv.length;
    var literal = false;
    var option;
    var arg;

    var unknownOptions = [];

    // parse options
    for (var i = 0; i < len; ++i) {
      arg = argv[i];

      // literal args after --
      if ('--' == arg) {
        literal = true;
        continue;
      }

      if (literal) {
        args.push(arg);
        continue;
      }

      // find matching Option
      option = this.optionFor(arg);

      //// patch begins
      var commandOption = null;

      if (!option && arg[0] === '-') {
        var command = this;
        var arga = null;
        for(var a = 0; a < args.length && command && !commandOption; ++a) {
          arga = args[a];
          if (command.categories && (arga in command.categories)) {
            command = command.categories[arga];
            commandOption = command.optionFor(arg);
            continue;
          }
          break;
        }
        if (!commandOption && arga && command && command.commands) {
          for(var j in command.commands) {
            if (command.commands[j].name === arga) {
              commandOption = command.commands[j].optionFor(arg);
              break;
            }
          }
        }
      }
      //// patch ends

      // option is defined
      if (option) {
        // requires arg
        if (option.required) {
          arg = argv[++i];
          if (!arg) {
            return this.optionMissingArgument(option);
          }

          if ('-' === arg[0]) {
            return this.optionMissingArgument(option, arg);
          }

          this.emit(option.name(), arg);
        } else if (option.optional) {
          // optional arg
          arg = argv[i+1];
          if (!arg || '-' === arg[0]) {
            arg = null;
          } else {
            ++i;
          }

          this.emit(option.name(), arg);
        // bool
        } else {
          this.emit(option.name());
        }
        continue;
      }

      // looks like an option
      if (arg.length > 1 && '-' == arg[0]) {
        unknownOptions.push(arg);

        // If the next argument looks like it might be
        // an argument for this option, we pass it on.
        //// patch: using commandOption if available to detect if the next value is an argument
        // If it isn't, then it'll simply be ignored
        commandOption = commandOption || {optional : 1}; // default assumption
        if (commandOption.required || (commandOption.optional && argv[i+1] && '-' != argv[i+1][0])) {
          unknownOptions.push(argv[++i]);
        }
        continue;
      }

      // arg
      args.push(arg);
    }

    return { args: args, unknown: unknownOptions };
  },

  setupCommand: function(args, raw, topMost) {
    var category = '*';

    for (var i = 0, len = raw.length; i < len; ++i) {
      if (category === '*') {
        category = raw[i];
      } else {
        args.push(raw[i]);
      }
    }

    if (topMost) {
      var opts = {
        json: false,
        level: 'info'
      };

      log.format(opts);
    }

    return category;
  },

  setupCommandOutput: function(raw) {
    var self = this;
    var verbose = 0;
    var json = 0;

    if (!raw) {
      raw = self.normalize(self.parent.rawArgs.slice(2));
    }

    function hasOption(optionName) {
      return self.options.some(function (o) { return o.long === optionName; });
    }

    for (var i = 0, len = raw.length; i < len; ++i) {
      if (hasOption('--json') &&
        raw[i] === '--json') {
        ++json;
      } else if (hasOption('--verbose') &&
        (raw[i] === '-v' || raw[i] === '--verbose')) {
        ++verbose;
      }
    }

    var opts = { };
    if (verbose || json) {
      if (json) {
        opts.json = true;
        opts.level = 'data';
      }

      if (verbose == 1) {
        opts.json = false;
        opts.level = 'verbose';
      }

      if (verbose >= 2) {
        opts.json = false;
        opts.level = 'silly';
      }

      log.format(opts);
    }
  },

  enableAutoComplete: function() {
    var root = this;

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
                return currentWord !== c.name && utils.stringStartsWith(c.name, currentWord);
              }).map(function (c) {
                return c.name;
              });

              results = results.concat(Object.keys(currentCategory.categories).filter(function (c) {
                return currentWord !== c && utils.stringStartsWith(c, currentWord);
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
  },

  enableNestedCommands: function(command) {
    if (!command.parent) {
      command.option('-v, --version', 'output the application version');
    }

    command.categories = {};

    command.category = function (name) {
      var category = command.categories[name];
      if (!command.categories[name]) {
        category = command.categories[name] = new AzureCli(name, this);
        category.helpInformation = command.categoryHelpInformation;
        command.enableNestedCommands(category);
      }

      return category;
    };

    command.on('*', function () {
      var args = command.rawArgs.slice(0, 2);
      var raw = command.normalize(command.rawArgs.slice(2));

      var category = command.setupCommand(args, raw, command.parent === undefined);

      if (!command.categories[category]) {
        log.error('\'' + category + '\' is not an azure command. See \'azure help\'.');
      } else {
        command.categories[category].parse(args);
        if (command.categories[category].args.length === 0) {
          args.push('-h');
          command.categories[category].parse(args);
        }
      }
    });
  },

  command: function (name){
    var args = name.split(/ +/);
    var cmd = new AzureCli(args.shift(), this);
    cmd.option('-v, --verbose', 'use verbose output');
    cmd.option('--json', 'use json output');

    cmd.helpInformation = cmd.commandHelpInformation;

    this.commands.push(cmd);
    cmd.parseExpectedArgs(args);
    return cmd;
  },

  deprecatedDescription: function (text, newCommand) {
    return this.description(util.format('%s (deprecated. This command is deprecated and will be removed in a future version. Please use \"%s\" instead', text, newCommand));
  },

  detailedDescription: function (str) {
    if (0 === arguments.length) return this._detailedDescription;
    this._detailedDescription = str;
    return this;
  },

  harvestPlugins: function() {
    var self = this;

    function scan(scanPath) {
      var results = fs.readdirSync(scanPath);

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

      // combine file path
      results = results.map(function (fileName) {
        return path.join(scanPath, fileName);
      });

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
    }

    var basePath = path.dirname(__filename);

    var plugins = scan(path.join(basePath, 'commands'));
    plugins.forEach(function (plugin) { plugin.init(self); });
  },

  harvestModules: function() {
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
        } catch(error) {
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
  },

  checkVersion: function() {
    // Uploading VHD needs 0.6.15 on Windows
    var version = process.version;
    var ver = version.split('.');
    var ver1num = parseInt(ver[1], 10);
    var ver2num = parseInt(ver[2], 10);
    if (ver[0] === 'v0') {
      if (ver1num < 6 || (ver1num === 6 && ver2num < 15)) {
        throw new Error('You need node.js v0.6.15 or higher to run this code. Your version: ' +
            version);
      }
      if (ver1num === 7 && ver2num <= 7) {
        throw new Error('You need node.js v0.6.15 or higher to run this code. Your version ' +
            version + ' won\'t work either.');
      }
    }
  },

  //////////////////////////////
  // override help subsystem

  fullName: function () {
    var name = this.name;
    var scan = this.parent;
    while (scan.parent !== undefined) {
      name = scan.name + ' ' + name;
      scan = scan.parent;
    }

    return name;
  },

  usage: function (str) {
    var ret;

    if (str) {
      ret = commander.Command.prototype.usage.call(this, str);
    } else {
      ret = commander.Command.prototype.usage.call(this);
      ret = ret.replace(/,/g,' ');
    }

    return ret;
  },

  helpInformation: function() {
    var self = this;

    if (!self.parent) {
      var args = process.argv.slice(0, 2);
      var raw = self.normalize(process.argv.slice(2));

      var packagePath = path.join(__dirname, '../package.json');
      var packageInfo = JSON.parse(fs.readFileSync(packagePath));

      if (raw.indexOf('-v') >= 0) {
        console.log(packageInfo.version);
      } else if (raw.indexOf('--version') >= 0) {
        console.log(util.format('%s (node: %s)', packageInfo.version, process.versions.node));
      } else {
        self.setupCommand(args, raw, true);

        if (log.format().logo === 'on') {
          log.info('         _    _____   _ ___ ___'.cyan);
          log.info('        /_\\  |_  / | | | _ \\ __|'.cyan);
          log.info('  _ ___'.grey + '/ _ \\'.cyan + '__'.grey + '/ /| |_| |   / _|'.cyan + '___ _ _'.grey);
          log.info('(___  '.grey + '/_/ \\_\\/___|\\___/|_|_\\___|'.cyan + ' _____)'.grey);
          log.info('   (_______ _ _)         _ ______ _)_ _ '.grey);
          log.info('          (______________ _ )   (___ _ _)'.grey);
          log.info('');
        }

        log.info('Windows Azure: Microsoft\'s Cloud Platform');
        log.info('');
        log.info('Tool version', packageInfo.version);

        self.helpCommands();
        self.helpCategoriesSummary(self.showMore());
        self.helpOptions();
      }
    } else {
      log.help(self.description());
      log.help('');
      log.help('Usage:', self.fullName() + ' ' + self.usage());
      self.helpOptions();
    }

    return '';
  },

  showMore: function () {
    var raw = this.normalize(process.argv.slice(2));
    return raw.indexOf('--help') >= 0 || raw.indexOf('-h') >= 0;
  },

  categoryHelpInformation: function() {
    var self = this;

    log.help(self.description());
    self.helpCommands();
    self.helpCategories(-1) ;
    self.helpOptions();

    return '';
  },

  commandHelpInformation: function() {
    var self = this;

    if (self._detailedDescription) {
      log.help(self.detailedDescription());
    } else {
      log.help(self.description());
    }

    log.help('');
    log.help('Usage:', self.fullName() + ' ' + self.usage());

    self.helpOptions();

    return '';
  },

  helpJSON: function() {
    var result = {};

    if (this.categories && Object.keys(this.categories).length > 0) {
      result.categories = {};

      for (var name in this.categories) {
        result.categories[name] = this.categories[name].helpJSON();
      }
    }

    if (this.commands && this.commands.length > 0) {
      result.commands = [];

      this.commands.forEach(function (cmd) {
        var command = {
          name: cmd.fullName(),
          description: cmd.description(),
          options: cmd.options,
          usage: cmd.usage()
        };

        result.commands.push(command);
      });
    }

    return result;
  },

  helpCategories: function(levels) {
    for (var name in this.categories) {
      var cat = this.categories[name];
      log.help('');
      log.help(cat.description().cyan);

      if (levels === -1 || levels > 0) {
        for (var index in cat.commands) {
          var cmd = cat.commands[index];
          log.help(' ', cmd.fullName() + ' ' + cmd.usage());
        }

        cat.helpCategories(levels !== -1 ? --levels : -1);
      } else {
        log.help(' ', cat.fullName());
      }
    }
  },

  helpCategoriesSummary: function(showMore) {
    var categories = [];
    function scan(parent, levels, each) {
      for (var name in parent.categories) {
        var cat = parent.categories[name];
        each(cat);

        if (levels === -1 || levels > 0) {
          scan(cat, levels !== -1 ? --levels : -1, each);
        }
      }
    }

    scan(this, showMore ? -1 : 0, function (cat) { categories.push(cat); });
    var maxLength = 14;

    // Sort categories by alphabetical order
    categories.sort(function (a, b) {
      return (a.fullName() <  b.fullName()) ? -1 : (a.fullName() >  b.fullName()) ? 1 : 0;
    });

    categories.forEach(function (cat) {
      if (maxLength < cat.fullName().length)
        maxLength = cat.fullName().length;
    });

    log.help('');
    log.help('Commands:');
    categories.forEach(function (cat) {
      var name = cat.fullName();
      while (name.length < maxLength) {
        name += ' ';
      }
      log.help('  ' + name + ' ' + cat.description().cyan);
    });
  },

  helpCommands: function() {
    this.commands.forEach(function (cmd) {
      log.help('');
      log.help(cmd.description().cyan);
      log.help(' ', cmd.fullName() + ' ' + cmd.usage());
    });
  },

  helpOptions: function(cmdExtra) {
    var self = this;

    var revert = self.options;
    if (cmdExtra) {
      self.options = self.options.concat(cmdExtra.options);
    }

    log.help('');
    log.help('Options:');
    self.optionHelp().split('\n').forEach(function (line) { log.help(' ', line); });
    self.options = revert;
  }
});

// TODO: Move this code to a separate file

// use cli output settings by default
log.cli();

log.format = function (options) {
  for (var i in log['default'].transports) {
    if (log['default'].transports.hasOwnProperty(i)) {
      var transport = log['default'].transports[i];
      if (arguments.length === 0) {
        return {
          json: transport.json,
          terse: transport.terse,
          level: transport.level,
          logo: log.format.logo
        };
      }

      if (options.json) {
        log.padLevels = false;
        log.stripColors = true;
        transport.json = true;
        transport.terse = true;
      } else {
        log.padLevels = true;
        log.stripColors = false;
        transport.json = false;
        transport.terse = false;
      }

      if (options.terse) {
        log.padLevels = false;
        transport.terse = true;
      }

      if (options.level) {
        transport.level = options.level;
      }

      if (options.logo) {
        log.format.logo = options.logo;
      }
    }
  }
};

log.json = function (level, data) {
  if (arguments.length == 1) {
    data = level;
    level = 'data';
  }

  if (log.format().json) {
    log.log(level, typeof data, data);
  } else {
    var lines = eyes.inspect(data, level, { stream: false });
    lines.split('\n').forEach(function (line) {
      // eyes all is "cyan" by default, so this property accessor will
      // fix the entry/exit color codes of the line. it's needed because we're
      // splitting the eyes formatting and inserting winston formatting where it
      // wasn't before.
      log.log(level, line[eyes.defaults.styles.all]);
    });
  }
};

log.table = function (level, data, transform) {
  if (arguments.length == 2) {
    transform = data;
    data = level;
    level = 'data';
  }

  if (log.format().json) {
    log.log(level, 'table', data);
  } else {
    var table = new Table();
    table.LeftPadder = Table.LeftPadder;
    table.padLeft = Table.padLeft;
    table.RightPadder = Table.RightPadder;
    table.padRight = Table.padRight;

    if (data && data.forEach) {
      data.forEach(function (item) { transform(table, item); table.newLine(); });
    } else if (data) {
      for (var item in data) {
        transform(table, item);
        table.newLine();
      }
    }

    var lines = table.toString();
    lines.substring(0, lines.length - 1).split('\n').forEach(function (line) {
      log.log(level, line);
    });
  }
};

exports = module.exports = AzureCli;