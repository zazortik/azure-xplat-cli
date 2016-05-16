'use strict';

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

/// <reference path="../../../../typings/main.d.ts" />

var should = require('should');

var path = require('path');
var util = require('util');
var fs = require('fs');

var CLITest = require('../../../framework/arm-cli-test');
var testUtil = require('../../../util/util');
var utils = require('../../../../lib/util/utils');

var testprefix = 'arm-cli-server-management-tests';

var requiredEnvironment = [{
  requiresToken: true
}, {
  name: 'AZURE_ARM_SMT_TEST_LOCATION',
  defaultValue: 'centralus'
}, {
  name: 'AZURE_ARM_SMT_TEST_RESOURCE_GROUP',
  defaultValue: 'sdktest'
}, {
  name: 'AZURE_ARM_SMT_GATEWAY_PREFIX',
  defaultValue: 'sdk_test'
}, {
  name: 'AZURE_ARM_SMT_NODE_PREFIX',
  defaultValue: 'sdk_test_node'
}, {
  name: 'AZURE_ARM_SMT_NODE_USERNAME',
  defaultValue: 'gsAdmin'
}, {
  name: 'AZURE_ARM_SMT_NODE_PASSWORD',
  defaultValue: 'S0meP@sswerd!'
}];

var resourceGroupName;
var location;
var gateways = [];
var nodes = [];
var sessions = [];

function log(text) {
  // rem uncomment this for interactive testing.
  // console.log(text);
}

function dump(obj) {
  log('');
  log(util.inspect(obj, false, 2));
}

describe('arm', function() {

  describe('servermanagement', function() {
    var suite;
    var testVault;

    before(function(done) {
      suite = new CLITest(this, testprefix, requiredEnvironment);

      // for interactive debugging
      suite._execute = suite.execute;
      suite.execute = function(cmd, fn) {
        log('\n executing "' + cmd + '"');
        return suite._execute(cmd, fn);
      };
      suite.setupSuite(done);
    });

    after(function(done) {
      suite.teardownSuite(done);
    });

    beforeEach(function(done) {
      suite.setupTest(function() {
        location = process.env.AZURE_ARM_SMT_TEST_LOCATION;
        resourceGroupName = process.env.AZURE_ARM_SMT_TEST_RESOURCE_GROUP;
        done();
      });
    });

    afterEach(function(done) {
      // remove any test nodes
      /*
      for(var each in nodes) {
         suite.execute(`servermanagement node show ${resourceGroupName} ${nodes[each]} --json`, (result) => {
           if( result.exitStatus === 0 ) { 
            suite.execute(`servermanagement node show ${resourceGroupName} ${nodes[each]} --json`, (result) => {
           }
         });
      }
      */

      // remove any test gateways

      suite.teardownTest(done);
    });

    describe('gateways', function() {
      it('list some gateways', function(done) {
        suite.execute('servermanagement gateway list --json', function(result) {
          // check that the command executed ok.
          result.errorText.should.be.equal('');
          result.exitStatus.should.be.equal(0);

          // parse the json output
          var output = JSON.parse(result.text);

          output.length.should.not.be.equal(0);
          done();
        });
      });

      it('crud gateway', function(done) {

        var gwName = suite.generateId(process.env.AZURE_ARM_SMT_GATEWAY_PREFIX, gateways);
        suite.execute('servermanagement gateway create ' + resourceGroupName + ' ' + location + ' ' +
          gwName + ' --json',
          function(result) {
            // check that the command executed ok.
            result.errorText.should.be.equal('');
            result.exitStatus.should.be.equal(0);

            // parse the json output
            var createdGateway = JSON.parse(result.text);
            createdGateway.name.should.be.equal(gwName);

            // list the gateways, check to see if we got the one we created
            suite.execute('servermanagement gateway list --json', function(result) {
              // check that the command executed ok.
              result.errorText.should.be.equal('');
              result.exitStatus.should.be.equal(0);

              // parse the json output
              var listOfGateways = JSON.parse(result.text);
              listOfGateways.length.should.not.be.equal(0);
              var found = false;

              for (var each in listOfGateways) {
                if (listOfGateways[each].name == gwName) {
                  found = true;
                  break;
                }
              }
              // we should have found it.
              should(found)
                .be.equal(true);

              // next, issue a show for the gateway
              suite.execute('servermanagement gateway show ' + resourceGroupName + ' ' + gwName +
                ' --json',
                function(result) {
                  // check that the command executed ok.
                  result.errorText.should.be.equal('');
                  result.exitStatus.should.be.equal(0);
                  // parse the json output 
                  var showGw = JSON.parse(result.text);

                  // is it the right one?
                  showGw.name.should.equal(gwName);

                  // ok, delete it.
                  suite.execute('servermanagement gateway delete ' + resourceGroupName + ' ' +
                    gwName + ' --json',
                    function(result) {
                      // check that the command executed ok.
                      result.errorText.should.be.equal('');
                      result.exitStatus.should.be.equal(0);

                      // and check to see that it's not there anymore.
                      suite.execute('servermanagement gateway show ' + resourceGroupName +
                        ' ' + gwName + ' --json',
                        function(result) {
                          // check that the command executed, but failed.
                          result.errorText.should.not.be.equal('');
                          result.exitStatus.should.not.be.equal(0);
                          done();
                        });
                    });
                });
            });
          });
      });

      it('should not find random gateway', function(done) {
        var gwName = suite.generateId(process.env.AZURE_ARM_SMT_GATEWAY_PREFIX, gateways);

        suite.execute('servermanagement gateway show ' + resourceGroupName + ' ' + gwName + ' --json',
          function(result) {
            // check that the command executed, but failed.
            result.errorText.should.not.be.equal('');
            result.exitStatus.should.not.be.equal(0);
            done();
          });
      });

      it('list some nodes', function(done) {
        suite.execute('servermanagement node list --json', function(result) {
          // check that the command executed ok.
          result.errorText.should.be.equal('');
          result.exitStatus.should.be.equal(0);

          // parse the json output
          var output = JSON.parse(result.text);

          output.length.should.not.be.equal(0);
          done();
        });
      });

      it('crud node', function(done) {
        var nodeName = suite.generateId(process.env.AZURE_ARM_SMT_NODE_PREFIX, nodes);
        var gwName = suite.generateId(process.env.AZURE_ARM_SMT_GATEWAY_PREFIX, gateways);

        // create the gateway
        suite.execute('servermanagement gateway create ' + resourceGroupName + ' ' + location + ' ' +
          gwName + ' --json',
          function(result) {
            // check that the command executed ok.
            result.errorText.should.be.equal('');
            result.exitStatus.should.be.equal(0);

            // parse the json output
            var createdGateway = JSON.parse(result.text);
            createdGateway.name.should.be.equal(gwName);

            //now, create the node
            suite.execute('servermanagement node create ' + resourceGroupName + ' ' + location + ' ' +
              gwName + ' ' + nodeName + ' --user-name ' + process.env.AZURE_ARM_SMT_NODE_USERNAME +
              ' --password ' + process.env.AZURE_ARM_SMT_NODE_PASSWORD + '  --json',
              function(result) {
                // check that the command executed ok.
                result.errorText.should.be.equal('');
                result.exitStatus.should.be.equal(0);

                var createdNode = JSON.parse(result.text);
                createdNode.name.should.be.equal(nodeName);

                // get the node again
                suite.execute('servermanagement node show ' + resourceGroupName + ' ' + nodeName +
                  '  --json',
                  function(result) {
                    // check that the command executed ok.
                    result.errorText.should.be.equal('');
                    result.exitStatus.should.be.equal(0);

                    var nodeAgain = JSON.parse(result.text);
                    nodeAgain.name.should.be.equal(nodeName);

                    //delete the node
                    suite.execute('servermanagement node delete ' + resourceGroupName + ' ' +
                      nodeName + '  --json',
                      function(result) {
                        // check that the command executed ok.
                        result.errorText.should.be.equal('');
                        result.exitStatus.should.be.equal(0);

                        // check if it is there
                        suite.execute('servermanagement node show ' + resourceGroupName + ' ' +
                          nodeName + '  --json',
                          function(result) {
                            // check that the command executed ok.
                            result.errorText.should.not.be.equal('');
                            result.exitStatus.should.not.be.equal(0);

                            done();
                          });
                      });
                  });
              });
          });
      });

      it('should not find random node', function(done) {
        var nodeName = suite.generateId(process.env.AZURE_ARM_SMT_NODE_PREFIX, nodes);

        suite.execute('servermanagement node show ' + resourceGroupName + ' ' + nodeName + ' --json',
          function(result) {
            // check that the command executed, but failed.
            result.errorText.should.not.be.equal('');
            result.exitStatus.should.not.be.equal(0);
            done();
          });
      });

      it('can execute powershell code', function(done) {

        function executePowershellTest() {
          var sessionName = suite.generateId("session_", sessions);
          var nodeName = require('os')
            .hostname();
          suite.execute('servermanagement session create ' + resourceGroupName + ' ' + nodeName + ' ' +
            sessionName + ' --user-name ' + process.env.AZURE_ARM_SMT_NODE_USERNAME + ' --password ' +
            process.env.AZURE_ARM_SMT_NODE_PASSWORD + ' --json',
            function(result) {
              // check that the command executed ok.
              result.errorText.should.be.equal('');
              result.exitStatus.should.be.equal(0);

              suite.execute('servermanagement powershell create ' + resourceGroupName + ' ' +
                nodeName + ' ' + sessionName + ' --json',
                function(result) {
                  // check that the command executed ok.
                  result.errorText.should.be.equal('');
                  result.exitStatus.should.be.equal(0);

                  var psSession = JSON.parse(result.text);
                  psSession.sessionId.should.not.be.equal('');

                  // psSession.sessionId

                  suite.execute('servermanagement powershell invoke ' + resourceGroupName + ' ' +
                    nodeName + ' ' + sessionName + ' ' + psSession.sessionId +
                    ' --command $PSVersionTable --json',
                    function(result) {
                      // check that the command executed ok.
                      result.errorText.should.be.equal('');
                      result.exitStatus.should.be.equal(0);

                      // check the output
                      var output = JSON.parse(result.text);
                      output.results[0].value.should.not.be.equal('');
                      log(output.results[0]);

                      // delete the session
                      suite.execute('servermanagement session delete ' + resourceGroupName + ' ' +
                        nodeName + ' ' + sessionName + ' --json',
                        function(result) {
                          // check that the command executed ok.
                          result.errorText.should.be.equal('');
                          result.exitStatus.should.be.equal(0);

                          done();
                        });
                    });
                });
            });
        }

        // to run this code in record/live mode you must have a gateway properly installed called 'mygateway' on the local pc
        if (!suite.isPlayback()) {
          // verify that there is a 'mygateway' gateway
          suite.execute('servermanagement gateway show ' + resourceGroupName + ' mygateway --json',
            function(result) {
              // check that the command worked.
              result.errorText.should.be.equal('');
              result.exitStatus.should.be.equal(0);

              // is there a node created for this pc?
              var nodeName = require('os')
                .hostname();
              suite.execute('servermanagement node show ' + resourceGroupName + ' ' + nodeName +
                ' --json',
                function(result) {
                  if (result.exitStatus === 0) {
                    // yes, the node exists.
                    executePowershellTest();
                  } else {

                    // no, the node doesn't exist, but we can create it easy enough.
                    suite.execute('servermanagement node create ' + resourceGroupName + ' ' +
                      location + ' mygateway ' + nodeName + ' --user-name ' + process.env.AZURE_ARM_SMT_NODE_USERNAME +
                      ' --password ' + process.env.AZURE_ARM_SMT_NODE_PASSWORD + ' --json',
                      function(result) {
                        // check that the command executed ok.
                        result.errorText.should.be.equal('');
                        result.exitStatus.should.be.equal(0);

                        var createdNode = JSON.parse(result.text);
                        createdNode.name.should.be.equal(nodeName);

                        // ok, the node exists, do the actual test part now.
                        executePowershellTest();
                      });
                  }
                });
            });
        } else {
          executePowershellTest();
        }
      });
    });
  });
});