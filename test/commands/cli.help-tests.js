//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

require('should');
var help = require('../../lib/commands/help');
describe('cli', function(){
  describe('help', function() {
    it('should display help using help <command>', function (done) {
      var cmdBody;
      var argsToParse;
      var cli = {
        rawArgs : ['node', 'azure', 'help', 'vm' ],
        command: function () { return this; },
        description: function () { return this; },
        execute: function (impl) { cmdBody = impl; },
        parse: function (args) { argsToParse = args;}
      };
      help.init(cli);
      cmdBody('help');
      argsToParse.length.should.equal(4);
      argsToParse[2].should.equal('vm');
      argsToParse[3].should.equal('-h');
      done();
    });
  });
});