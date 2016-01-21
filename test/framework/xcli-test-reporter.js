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
var util = require('util');
var _ = require('underscore');
var ms = require('../../node_modules/mocha/lib/ms');


/**
 * Initialize a new `Custom Xcli List` test reporter.
 *
 * @param {Runner} runner
 * 
 */

function List(runner) {
  Base.call(this, runner);

  var self = this
    , stats = this.stats
    , n = 0;
  var boundEpilogue = self.epilogue.bind(self);
  var boundXcliEpilogue = self.xcliEpilogue.bind(self);
  
  runner.on('start', function(){
    console.log();
  });
  
  runner.on('test', function(test){
    process.stdout.write(color('pass', '    ' + test.fullTitle() + ': '));
    testLogger.setCurrentTest(test.fullTitle());
    testLogger.logData();
    testLogger.logData(new Date().toISOString() + '  --Start--    ' + test.fullTitle() + ': ');
  });

  runner.on('pending', function(test){
    var fmt = color('checkmark', '  -')
      + color('pending', ' %s');
    console.log(fmt, test.fullTitle());
    testLogger.logData(new Date().toISOString() + '  --Skipped--    ' + test.fullTitle());
    testLogger.logData();
  });

  runner.on('pass', function(test){
    var fmt = color('checkmark', '  '+Base.symbols.dot)
      + color('pass', ' %s: ')
      + color(test.speed, '%dms');
    cursor.CR();
    console.log(fmt, test.fullTitle(), test.duration);
    testLogger.logData(new Date().toISOString() + '  --End--   ' + test.fullTitle() + ': ' + test.duration + ' ms');
    testLogger.logData();
  });

  runner.on('fail', function(test, err){
    cursor.CR();
    console.log(color('fail', '  %d) %s'), ++n, test.fullTitle());
    testLogger.logData(new Date().toISOString() + '  --End--    ' + n + ')  ' + test.fullTitle());
    testLogger.logData();
  });
  
  runner.on('end', function() {
    boundEpilogue();
    boundXcliEpilogue();
  });
}

/**
 * Inherit from `Base.prototype`.
 */
util.inherits(List, Base);

_.extend(List.prototype, {
  xList: function(failures) {
    testLogger.logData();
    failures.forEach(function(test, i){

      // msg
      var err = test.err
        , message = err.message || ''
        , stack = err.stack || message
        , index = stack.indexOf(message) + message.length
        , msg = stack.slice(0, index);

      // uncaught
      if (err.uncaught) {
        msg = 'Uncaught ' + msg;
      }

      // log the info
      testLogger.logData((i+1) + ') ' + test.fullTitle());
      testLogger.logData();
      testLogger.logData(msg);
      testLogger.logData();
      testLogger.logData(stack);
      testLogger.logData();
    });
  },

  xcliEpilogue: function() {
    var stats = this.stats;
    var tests;
    var fmt;

    testLogger.logData();

    // passes
    var numPass = stats.passes || 0;
    testLogger.logData(numPass + ' passing (' + ms(stats.duration) + ')');
  
    // pending
    if (stats.pending) {
      testLogger.logData(stats.pending + ' pending');
    }
  
    // failures
    if (stats.failures) {
      testLogger.logData(stats.failures + ' failing');
      this.xList(this.failures);
      testLogger.logData();
    }
  },
});

exports = module.exports = List;