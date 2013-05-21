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

var Stream = require('stream');
var fs = require('fs');
var os = require('os');

var EOL = '\n';
var debugStream = null;

var debugIndex = process.argv.indexOf('-debug');
if (debugIndex !== -1) {
  process.argv.splice(debugIndex, 1);
  debugStream = fs.createWriteStream('filter-debug.log', { flags:'w'});
}

var source;

if (process.argv.length > 2) {
  source = fs.createReadStream(process.argv[2], { flags: 'r' });
} else {
  source = process.stdin;
}

//
// A simple transformation stream that reads in
// test results and filters out extraneous lines -
// everything before the first XML <testsuite> line.
//

function testResultFilter() {
  var stream = new Stream();
  stream.readable = true;
  stream.writable = true;

  stream.write = write;
  stream.end = end;

  var xmlFound = false;
  var pendingLines = "";

  return stream;

  function write(buffer, encoding) {
    if (typeof buffer === 'string') {
      pendingLines += buffer;
    } else {
      pendingLines += buffer.toString(encoding);
    }
    if (debugStream) {
      debugStream.write('>>>>> Received lines: ' + pendingLines);
    }
    process.nextTick(filterPendingLines.bind(this));
  }

  function end(buffer, encoding) {
    if (buffer) {
      if (debugStream) {
        debugStream.write('>>>>> end received with buffer, writing');
      }
      this.write(buffer, encoding);
    }
    if (pendingLines.length > 0) {
      if (debugStream) {
        debugStream.write('>>>>> end received, flushing remaining pending lines');
      }
      filterPendingLines.call(this);
    }
    if (debugStream) {
      debugStream.write('>>>>> Input stream has ended');
    }
    stream.emit('end');
    stream.emit('close');
  }

  function filterPendingLines() {
    if (xmlFound) {
      if (debugStream) {
        debugStream.write('>>>>> writing to output stream: ' + pendingLines);
      }
      this.emit('data', pendingLines);
    } else {
      var lines = pendingLines.split(EOL);
      if (pendingLines.slice(-(EOL.length)) !== EOL) {
        // We've got a partial line, sock it away until we get more data
        pendingLines = lines[lines.length - 1];
        lines.pop();
      } else {
        pendingLines = '';
      }
      var self = this;
      var openTag = '<testsuite';
      var output = [];

      lines.forEach(function (l) {
        if (l.slice(0, openTag.length) === openTag) {
          xmlFound = true;
        }
        if (xmlFound) {
          output.push(l);
        }
      });
      if (output.length > 0) {
        if (debugStream) {
          debugStream.write('>>>>> writing to output stream: ' + output.join(EOL));
        }
        this.emit('data', output.join(EOL));
      }
    }
  }
}

source.pipe(testResultFilter()).pipe(process.stdout);
source.resume();
