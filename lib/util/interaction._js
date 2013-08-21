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

var __ = require('underscore');
var log = require('winston');
var tty = require('tty');
var fs = require('fs');
var util = require('util');

/*jshint camelcase:false*/
var child_process = require('child_process');

function Interactor(cli) {
  this.cli = cli;
}

__.extend(Interactor.prototype, {
  prompt: function (msg, callback) {
    this.cli.prompt(msg, function (result) {
      callback(null, result);
    });
  },

  confirm: function(msg, callback) {
    this.cli.confirm(msg, function(ok) {
      callback(null, ok);
    });
  },

  promptPassword: function (msg, callback) {
    this.password(msg, '*', function (result) {
      callback(null, result);
    });
  },

  promptPasswordIfNotGiven: function (promptString, currentValue, _) {
    if (__.isUndefined(currentValue)) {
      var value = this.promptPassword(promptString, _);
      return value;
    } else {
      return currentValue;
    }
  },

  promptPasswordOnce: function (msg, callback) {
    exports.passwordOnce(msg, '*', function (result) {
      callback(null, result);
    });
  },

  promptPasswordOnceIfNotGiven: function (promptString, currentValue, _) {
    if (__.isUndefined(currentValue)) {
      var value = exports.promptPasswordOnce(promptString, _);
      return value;
    } else {
      return currentValue;
    }
  },

  promptIfNotGiven: function (promptString, currentValue, _) {
    if (__.isUndefined(currentValue)) {
      var value = this.prompt(promptString, _);
      return value;
    } else {
      return currentValue;
    }
  },

  choose: function (values, callback) {
    this.choose(values, function(value) {
      callback(null, value);
    });
  },

  chooseIfNotGiven: function (promptString, progressString, currentValue, valueProvider, _) {
    if (__.isUndefined(currentValue)) {
      var progress = this.cli.progress(progressString);
      var values = valueProvider(_);
      progress.end();

      this.cli.output.help(promptString);
      var i = this.choose(this.cli, values, _);
      return values[i];
    } else {
      return currentValue;
    }
  },

  formatOutput: function (outputData, humanOutputGenerator) {
    this.cli.output.json('silly', outputData);
    if(this.cli.output.format().json) {
      this.cli.output.json(outputData);
    } else {
      humanOutputGenerator(outputData);
    }
  },

  logEachData: function (title, data) {
    var cleaned = data;
    for (var property in cleaned) {
      this.cli.output.data(title + ' ' + property, cleaned[property]);
    }
  },

  launchBrowser: function (url) {
    log.info('Launching browser to', url);
    if (process.env.OS !== undefined) {
      // escape & characters for start cmd
      var cmd = util.format('start %s', url).replace(/&/g, '^&');
      child_process.exec(cmd);
    } else {
      child_process.spawn('open', [url]);
    }
  },

  passwordOnce: function (currentStr, mask, callback) {
    var buf = '';

    // default mask
    if ('function' === typeof mask) {
      callback = mask;
      mask = '';
    }

    if (!process.stdin.setRawMode) {
      process.stdin.setRawMode = tty.setRawMode;
    }

    process.stdin.resume();
    process.stdin.setRawMode(true);
    fs.writeSync(this.istty1 ? 1 : 2, currentStr);

    process.stdin.on('data', function (character) {
      // Exit on Ctrl+C keypress
      character = character.toString();
      if (character === '\003') {
        console.log('%s', buf);
        process.exit();
      }

      // Return password in the buffer on enter key press
      if (character === '\015') {
        process.stdin.pause();
        process.stdin.removeAllListeners('data');
        process.stdout.write('\n');
        process.stdin.setRawMode(false);

        return callback(buf);
      }

      // Backspace handling 
      // Windows usually sends '\b' (^H) while Linux sends '\x7f'
      if (character === '\b' || character === '\x7f') {
        if (buf) {
          buf = buf.slice(0, -1);
          for (var j = 0; j < mask.length; ++j) {
            process.stdout.write('\b \b'); // space the last character out
          }
        }

        return;
      }

      character = character.split('\015')[0]; // only use the first line if many (for paste)
      for(var i = 0; i < character.length; ++i) {
        process.stdout.write(mask); // output several chars (for paste)
      }

      buf += character;
    });
  },

  // Allow cli.password to accept empty passwords
  password: function (str, mask, fn) {
    // Prompt first time
    this.passwordOnce(str, mask, function (pass) {
      // Prompt for confirmation
      this.passwordOnce('Confirm password: ', mask, function (pass2) {
        if (pass === pass2) {
          fn (pass);
        } else {
          throw new Error('Passwords do not match.');
        }
      });
    });
  }
});

module.exports = Interactor;