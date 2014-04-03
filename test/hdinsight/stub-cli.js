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

var sinon = require('sinon');
var Interaction = require('../../lib/util/interaction');

var CliStub = function() {
  this.categories = { };
  this.commands = { };
  this.options = { };
  this.optionCount = 0;
  this.interaction = new Interaction(this);

  this.category = function(name) {
    var retval = new CliStub();
    this.categories[name] = retval;
    return retval;
  };
  this.option = function(option, description) {
    this.options[option] = description;
    this.optionCount++;
    return this;
  };
  this.mode = function (mode) {
    this._mode = mode;
    return this;
  };
  this.getLocaleString = function (string) {
    return string;
  },
  this.usage = sinon.stub().returns(this);
  this.description = sinon.stub().returns(this);
  this.execute = sinon.spy();
  this.command = function(command) {
    var retval = new CliStub();
    var loc = command.indexOf(' ');
    if (loc >= 0) {
      var key = command.substring(0, loc);
      var value = command.substring(loc + 1, command.length);
      retval.positionalParams = value;
      this.commands[key] = retval;
    }
    else {
      retval.positionalParams = '';
      this.commands[command] = retval;
    }
    return retval;
  };
}

module.exports = CliStub;