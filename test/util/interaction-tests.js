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

var assert = require('assert');
var promptPkg = require('prompt');
var sinon = require('sinon');

var Interactor = require('../../lib/util/interaction');

describe('logging-test', function () {
  var sandbox;
  var CANCEL_MSG = 'cancelled';
  before(function () {
    sandbox = sinon.sandbox.create();
    sandbox.stub(promptPkg, 'get', function (props, callback) {
      return callback(new Error(CANCEL_MSG));
    });
  });
  
  after(function () {
    sandbox.restore();
  });
  
  it('should reprot error when prompt gets cancelled', function (done) {
    var instance = new Interactor();
    instance.prompt('some messages', function (err) {
      assert.equal(err.message, CANCEL_MSG);
      done();
    });
  });
});