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

exports.prompt = function (cli, msg, callback) {
  cli.prompt(msg, function (result) {
    callback(null, result);
  });
};

exports.confirm = function(cli, msg, callback) {
  cli.confirm(msg, function(ok) {
    callback(null, ok);
  });
};

exports.promptPassword = function (cli, msg, callback) {
  exports.password(cli, msg, '*', function (result) {
    callback(null, result);
  });
};

exports.promptPasswordIfNotGiven = function (cli, promptString, currentValue, _) {
  if (__.isUndefined(currentValue)) {
    var value = exports.promptPassword(cli, promptString, _);
    return value;
  } else {
    return currentValue;
  }
};

exports.promptPasswordOnce = function (cli, msg, callback) {
  exports.passwordOnce(msg, '*', function (result) {
    callback(null, result);
  });
};

exports.promptPasswordOnceIfNotGiven = function (cli, promptString, currentValue, _) {
  if (__.isUndefined(currentValue)) {
    var value = exports.promptPasswordOnce(cli, promptString, _);
    return value;
  } else {
    return currentValue;
  }
};

exports.promptIfNotGiven = function (cli, promptString, currentValue, _) {
  if (__.isUndefined(currentValue)) {
    var value = exports.prompt(cli, promptString, _);
    return value;
  } else {
    return currentValue;
  }
};

exports.choose = function (cli, values, callback) {
  cli.choose(values, function(value) {
    callback(null, value);
  });
};

exports.chooseIfNotGiven = function (cli, promptString, progressString, currentValue, valueProvider, _) {
  if (__.isUndefined(currentValue)) {
    var progress = cli.progress(progressString);
    var values = valueProvider(_);
    progress.end();

    cli.output.help(promptString);
    var i = exports.choose(cli, values, _);
    return values[i];
  } else {
    return currentValue;
  }
};

exports.formatOutput = function (cli, outputData, humanOutputGenerator) {
  cli.output.json('silly', outputData);
  if(cli.output.format().json) {
    cli.output.json(outputData);
  } else {
    humanOutputGenerator(outputData);
  }
};

exports.logEachData = function (cli, title, data) {
  var cleaned = data;
  for (var property in cleaned) {
    cli.output.data(title + ' ' + property, cleaned[property]);
  }
};

exports.launchBrowser = function (url) {
  log.info('Launching browser to', url);
  if (process.env.OS !== undefined) {
    // escape & characters for start cmd
    var cmd = util.format('start %s', url).replace(/&/g, '^&');
    child_process.exec(cmd);
  } else {
    child_process.spawn('open', [url]);
  }
};

exports.passwordOnce = function (cli, currentStr, mask, callback) {
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
  fs.writeSync(cli.istty1 ? 1 : 2, currentStr);

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
};

// Allow cli.password to accept empty passwords
exports.password = function (cli, str, mask, fn) {
  // Prompt first time
  exports.passwordOnce(cli, str, mask, function (pass) {
    // Prompt for confirmation
    exports.passwordOnce(cli, 'Confirm password: ', mask, function (pass2) {
      if (pass === pass2) {
        fn (pass);
      } else {
        throw new Error('Passwords do not match.');
      }
    });
  });
};