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

var CLITest = require('../../../framework/arm-cli-test');
var testprefix = 'arm-cli-provider-tests';

describe('arm', function () {
  var suite;

    before(function (done) {
      suite = new CLITest(this, testprefix);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(done);
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

  describe('provider', function () {
    it('list should work', function (done) {
      suite.execute('provider list --json', function (result) {
        result.exitStatus.should.equal(0);
        var providers = JSON.parse(result.text);
        providers.length.should.be.above(0);
        done();
      });
    });

    it('show should work', function (done) {
      suite.execute('provider show %s --json', 'Microsoft.web', function (result) {
        result.exitStatus.should.equal(0);
        var provider = JSON.parse(result.text);
        provider.namespace.should.match(/^Microsoft.Web$/ig);
        done();
      });
    });

    it('register should work', function (done) {
      suite.execute('provider register %s --json', 'Microsoft.AppService', function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('provider show %s --json', 'Microsoft.AppService', function (result) {
          result.exitStatus.should.equal(0);
          var provider = JSON.parse(result.text);
          provider.namespace.should.match(/^Microsoft.AppService$/ig);
          provider.registrationState.should.match(/.*register.*/ig);
          done();
        });
      });
    });

    it('unregister should work', function (done) {
      suite.execute('provider unregister %s --json', 'Microsoft.AppService', function (result) {
        result.exitStatus.should.equal(0);
        suite.execute('provider show %s --json', 'Microsoft.AppService', function (result) {
          result.exitStatus.should.equal(0);
          var provider = JSON.parse(result.text);
          provider.namespace.should.match(/^Microsoft.AppService$/ig);
          provider.registrationState.should.match(/.*unregister.*/ig);
          done();
        });
      });
    });
  });


  describe('provider operations', function () {
    it('show for all providers should work', function (done) {
      suite.execute('provider operations show %s --json', '*', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        done();
      });
    });
    
    it('show for all operations of Microsoft.Authorization provider should work', function (done) {
      suite.execute('provider operations show -o %s --json', 'Microsoft.Authorization/*', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        operations.forEach(function (operation) {
          operation.operation.should.match(/^Microsoft.Authorization.*$/ig);
        });
        done();
      });
    });
    
    it('show for all operations of case insensitive provider name should work', function (done) {
      suite.execute('provider operations show -o %s --json', 'MICROSOFT.inSiGHTs/*', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        operations.forEach(function (operation) {
          operation.operation.should.match(/^Microsoft.Insight.*$/ig);
        });
        done();
      });
    });
    
    it('show for all read operations of Microsoft.Authorization should work', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'Microsoft.Authorization/*/read', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        operations.forEach(function (operation) {
          operation.operation.should.match(/^Microsoft.Authorization.*\/read$/ig);
        });
        done();
      });
    });

    it('show for all read operations of all providers should work', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', '*/read', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        operations.forEach(function (operation) {
          operation.operation.should.match(/.*\/read$/ig);
        });
        done();
      });
    });

    it('show for a particular action should work', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'Microsoft.OperationalInsights/workspaces/usages/read', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.be.above(0);
        operations.forEach(function (operation) {
          operation.operation.should.equal("Microsoft.OperationalInsights/workspaces/usages/read");
        });
        done();
      });
    });
    
    it('show for a string with wildcard and other characters should result in error', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'Microsoft.OperationalInsights*/*', function (result) {
        result.exitStatus.should.equal(1);
        done();
      });
    });

    it('show for an invalid action should return empty operation list', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'Microsoft.OperationalInsights/workspaces/usages/blah', function (result) {
        result.exitStatus.should.equal(0);
        var operations = JSON.parse(result.text);
        operations.length.should.equal(0);
        done();
      });
    });

    it('show for a specific action of a non existing provider should fail', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'InvalidOperation/blah', function (result) {
        result.exitStatus.should.equal(1);
        done();
      });
    });

    it('show for all actions of a non existing provider should fail', function (done) {
      suite.execute('provider operations show --operationSearchString %s --json', 'InvalidOperation/*', function (result) {
        result.exitStatus.should.equal(1);
        done();
      });
    });
  });
});