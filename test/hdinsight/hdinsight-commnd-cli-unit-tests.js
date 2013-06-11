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

var mocha = require('mocha');
var should = require('should');
var sinon = require('sinon');
var _ = require('underscore');

// Test includes
var testutil = require('../util/util');

// Lib includes
var util = testutil.libRequire('util/utils');
var hdInsightCli = require('../../lib/commands/hdinsight._js')

function cliStub() {
  var categoryStub = sinon.stub();
  var cliStub = sinon.stub();
  cliStub.category = sinon.stub().returns(categoryStub);
  categoryStub.category = sinon.stub().returns(categoryStub);
  categoryStub.description = sinon.spy();
  categoryStub.usage = sinon.spy();
  categoryStub.option = sinon.spy();
  categoryStub.execute = sinon.spy();
  return cliStub;
}

describe('HDInsight command line (under unit test)', function() {

  it('init should perform the correct calls to the cli object', function(done) {
    should.exist(hdInsightCli.init);
    var cli = cliStub();
    should.exist(cli);
    done();
  });
});