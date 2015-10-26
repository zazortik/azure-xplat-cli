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

var should = require('should');
var sinon = require('sinon');

var propertyPrompts = require('../../../../../lib/commands/arm/apiapp/lib/propertyPrompts');

describe('apiapp', function() {
  describe('interactive property prompts', function () {
    var sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call prompt function for string and return prompted result', function (done) {
      var parameterInfo = {
        name: 'param1',
        displayName: 'parameter 1',
        type: 'string'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, null, 'param1value');

      var interaction = {
        prompt: promptStub
      };

      var prompter = propertyPrompts.interactive(interaction);
      prompter(parameterInfo, function (err, value) {
        value.should.equal('param1value');
        promptStub.callCount.should.equal(1);
        promptStub.firstCall.args[0].should.match(/parameter 1/);
        done(err);
      });
    });

    it('should include default value in prompt', function (done) {
      var parameterInfo = {
        name: 'param1',
        displayName: 'parameter 1',
        type: 'string',
        defaultValue: 'abcd'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, null, 'param1value');

      var interaction = {
        prompt: promptStub
      };

      var prompter = propertyPrompts.interactive(interaction);
      prompter(parameterInfo, function (err, value) {
        promptStub.firstCall.args[0].should.match(/\[abcd\]/);
        done(err);
      });
    });

    it('should return int parameters as numbers', function (done) {
      var parameterInfo = {
        name: 'param1',
        displayName: 'parameter 1',
        type: 'int'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, null, '37');

      var interaction = {
        prompt: promptStub
      };

      var prompter = propertyPrompts.interactive(interaction);
      prompter(parameterInfo, function (err, value) {
        value.should.be.exactly(37);
        done(err);
      });
    });

    it('should prompt for secureString using password method', function (done) {
      var parameterInfo = {
        name: 'p1',
        type: 'secureString'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, new Error('shouldn\'t call this'));

      var passwordStub = sandbox.stub();
      passwordStub.callsArgWith(1, null, 'sekret');

      var interaction = {
        prompt: promptStub,
        promptPasswordOnce: passwordStub
      };

      var prompter = propertyPrompts.interactive(interaction);
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.should.be.equal('sekret');
        passwordStub.callCount.should.be.equal(1);
        promptStub.callCount.should.be.equal(0);
        done(err);
      });
    });

    it('should prompt for true or false when prompting for bool', function (done) {
      var parameterInfo = {
        name: 'b1',
        displayName: 'boolean parameter 1',
        type: 'bool'
      };

      var logStub = sandbox.stub(console, 'log');
      var chooseStub = sandbox.stub();
      chooseStub.callsArgWith(1, null, "false");
      var prompter = propertyPrompts.interactive({ choose: chooseStub });
      prompter(parameterInfo, function(err, value) {
        should.not.exist(err);
        value.should.be.exactly(false);
        logStub.callCount.should.equal(1);
        logStub.firstCall.args[0].should.match(/boolean parameter 1/);
        // Restore early so that the mocha test output prints for this test
        logStub.restore();
        chooseStub.callCount.should.equal(1);
        chooseStub.firstCall.args[0].should.be.Array;
        chooseStub.firstCall.args[0][0].should.equal('true');
        chooseStub.firstCall.args[0][1].should.equal('false');
        done(err);
      });
    });

    it('should split array type input on commas', function (done) {
      var parameterInfo = {
        name: 'a1',
        displayName: 'array 1',
        type: 'array'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, null, 'one, 2, three');
      var prompter = propertyPrompts.interactive({prompt: promptStub});
      prompter(parameterInfo, function (err, result) {
        should.not.exist(err);
        result.should.have.length(3);
        result[0].should.be.exactly('one');
        result[1].should.be.exactly('2');
        result[2].should.be.exactly('three');
        done(err);
      });
    });

    it('should return object when prompting for object', function (done) {
      var parameterInfo = {
        name: 'o1',
        type: 'object'
      };

      var promptStub = sandbox.stub();
      promptStub.callsArgWith(1, null, '{ "a": 5, "b": "hello world" }');
      var prompter = propertyPrompts.interactive({prompt: promptStub});
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.should.be.Object;
        value.should.have.property('a');
        value.should.have.property('b');
        value.a.should.be.exactly(5);
        value.b.should.be.exactly('hello world');
        done(err);
      });
    });

    it('should re-prompt when object input is invalid', function (done) {
      var parameterInfo = {
        name: 'p1',
        type: 'object'
      };

      var promptStub = sandbox.stub();
      promptStub.onFirstCall().callsArgWith(1, null, 'not an object')
        .onSecondCall().callsArgWith(1, null, '{ "text": "this is ok" }');

      var prompter = propertyPrompts.interactive({prompt: promptStub});
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.text.should.equal('this is ok');
        promptStub.callCount.should.equal(2);
        done(err);
      });
    });

    it('should re-prompt when value not given when no default is present', function (done) {
      var parameterInfo = {
        name: 'p1',
        type: 'string',
        constraints: {
          required: true
        }
      };

      var promptStub = sandbox.stub();
      promptStub.onFirstCall().callsArgWith(1, null, '')
        .onSecondCall().callsArgWith(1, null, 'some value');
      var prompter = propertyPrompts.interactive({prompt: promptStub});
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.should.equal('some value');
        promptStub.callCount.should.equal(2);
        done(err);
      });
    });

    it('should correctly prompt for multiple parameters', function (done) {
      var parameterInfos = [
        {
          name: 'param1',
          type: 'string'
        },
        {
          name: 'param2',
          type: 'string',
          defaultValue: 'this is number 2'
        },
        {
          name: 'param3',
          type: 'int'
        }
      ];

      var expectedValues = [ 'param 1 value', parameterInfos[1].defaultValue, 12 ];
      var promptStub = sandbox.stub();
      promptStub.onFirstCall().callsArgWith(1, null, 'param 1 value')
        .onSecondCall().callsArgWith(1, null, '')
        .onThirdCall().callsArgWith(1, null, '12');

      var prompter = propertyPrompts.interactive({prompt: promptStub});

      function promptNext(index) {
        if (index >= parameterInfos.length) {
          return done();
        }

        prompter(parameterInfos[index], function (err, value) {
          should.not.exist(err);
          value.should.equal(expectedValues[index]);
          promptNext(++index);
        });
      }
      promptNext(0);
    });
  });

  describe('object prompts', function () {
    it('should return expected parameters when prompted', function (done) {
      var parameterInfo = {
        name: 'p1',
        type: 'string'
      };

      var values = { p1: 'hi there' };

      var prompter = propertyPrompts.object(values);
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.should.equal(values.p1);
        done(err);
      });
    });

    it('should return default value if value is not present', function (done) {
      var parameterInfo = {
        name: 'p2',
        type: 'string',
        defaultValue: 'default result'
      };

      var values = {};
      var prompter = propertyPrompts.object(values);
      prompter(parameterInfo, function (err, value) {
        should.not.exist(err);
        value.should.equal(parameterInfo.defaultValue);
        done(err);
      });
    });

    it('should fail with error if value not present', function (done) {
      var parameterInfo = {
        name: 'p3',
        type: 'string'
      };

      var values = { p1: 'hi there' };

      var prompter = propertyPrompts.object(values);
      prompter(parameterInfo, function (err, value) {
        should.exist(err);
        err.should.be.Error;
        err.message.should.match(/parameter p3 has not been given/);
        done();
      });
    });
  });
});
