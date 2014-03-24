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

// Test includes
var testutil = require('../util/util');

var CliStub = require('./stub-cli.js');
var UserInteractionStub = require('./stub-userInteractor.js');
var ExecutionProcessorStub = require('./stub-executionProcessor.js');

// Lib includes
var util = testutil.libRequire('util/utils');
var HDInsightCli = require('../../lib/commands/asm/hdinsight._js')

function GetCommand() {
  this.cli = new CliStub();
  this.user = new UserInteractionStub();
  this.processor = new ExecutionProcessorStub();
  this.hdinsight = new HDInsightCli(this.cli, this.user, this.processor);
  this.processor.listResultsForEachCall = getListCommandData();
}

function getListCommandData() {
  return [ {
    body : {
      clusters : [ {
        Name : 'test1',
        Location : 'East US',
        State : 'Running'
      } ]
    }
  }, {
    body : {
      clusters : [ {
        Name : 'test1',
        Location : 'East US',
        State : 'Running'
      }, {
        Name : 'test2',
        Location : 'East US',
        State : 'NotRelevent'
      } ]
    }
  }, {
    body : {
      clusters : [ {
        Name : 'test1',
        Location : 'East US',
        State : 'Running'
      }, {
        Name : 'test3',
        Location : 'East US',
        State : 'NotRelevent',
        Error : 'An error occurred'
      } ]
    }
  }];
}

module.exports = GetCommand;