/**
* Copyright 2012 Microsoft Corporation
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

var should = require('should');

var cli = require('../cli');
var capture = require('../util').capture;

suite('cli', function(){
  suite('site deploymentscript', function() {
      teardown(function (done) {
          done();
    });

    test('generate node deployment script', function(done) {
      // Create site
      var cmd = ('node cli.js site deploymentscript --php').split(' ');

      capture(function() {
          console.log('b');
          cli.parse(cmd);
      }, function (result) {
          try {
              //result.exitStatus.should.equal(0);
              // result.text.should.equal('');
              done();
          }
          catch (e) {
              console.log(e);
              done(e);
          }
      });
    });
  });
});
