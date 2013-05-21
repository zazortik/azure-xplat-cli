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
var os = require('os');

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
    console.warn('received buffer', buffer, 'encoding', encoding);
    if (typeof buffer === 'string') {
      pendingLines += buffer;
    } else {
      pendingLines += buffer.toString(encoding);
    }
    process.nextTick(filterPendingLines.bind(this));
  }

  function end(buffer, encoding) {
    if (buffer) {
      this.write(buffer, encoding);
    }
    if (pendingLines.length > 0) {
      filterPendingLines.call(this);
    }
    stream.emit('end');
    stream.emit('close');
  }

  var EOL = '\n';

  function filterPendingLines() {
    console.warn('processing lines, xmlFound=', xmlFound);
    if (xmlFound) {
      console.warn('sending xml');
      this.emit('data', pendingLines);
      pendingLines = '';
    } else {
      console.warn('looking for xml start');
      var lines = pendingLines.split(EOL);
      if (pendingLines.slice(-(EOL.length)) !== EOL) {
        // We've got a partial line, sock it away until we get more data
        console.warn('last line isn\'t complete, saving for later');
        pendingLines = lines[lines.length - 1];
        lines.pop();
      } else {
        pendingLines = '';
      }
      console.warn('looking for xml start line, there are', lines.length, 'lines to process');
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
      console.warn('lines processed, output.length=', output.length);
      if (output.length > 0) {
        this.emit('data', output.join(os.EOL));
      }
    }
  }
}

process.stdin.pipe(testResultFilter()).pipe(process.stdout);
process.stdin.resume();
