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

//Custom List reporter that would log the info in a file as well as on console in a list format

var testLogger = require('./test-logger');
var Base = require('../../node_modules/mocha/lib/reporters/base')
  , cursor = Base.cursor
  , color = Base.color;

/**
 * Expose `List`.
 */

exports = module.exports = List;


/**
 * Initialize a new `List` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function List(runner) {
  Base.call(this, runner);

  var self = this
    , stats = this.stats
    , n = 0;

  runner.on('start', function(){
    console.log();
  });
  
  runner.on('test', function(test){
    process.stdout.write(color('pass', '    ' + test.fullTitle() + ': '));
    testLogger.logData();
    testLogger.logData('--Start--    ' + test.fullTitle() + ': ');
  });

  runner.on('pending', function(test){
    var fmt = color('checkmark', '  -')
      + color('pending', ' %s');
    console.log(fmt, test.fullTitle());
    testLogger.logData('--Skipped--    ' + test.fullTitle());
    testLogger.logData();
  });

  runner.on('pass', function(test){
    var fmt = color('checkmark', '  '+Base.symbols.dot)
      + color('pass', ' %s: ')
      + color(test.speed, '%dms');
    cursor.CR();
    console.log(fmt, test.fullTitle(), test.duration);
    testLogger.logData('--End--   ' + test.fullTitle() + ': ' + test.duration + ' ms');
    testLogger.logData();
  });

  runner.on('fail', function(test, err){
    cursor.CR();
    console.log(color('fail', '  %d) %s'), ++n, test.fullTitle());
    testLogger.logData('--End--    ' + n + ')  ' + test.fullTitle());
    testLogger.logData();
  });

  runner.on('end', self.epilogue.bind(self));
}

/**
 * Inherit from `Base.prototype`.
 */

List.prototype.__proto__ = Base.prototype;
