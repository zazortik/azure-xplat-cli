### Best Practices for writing tests

Let us take an example of a test to explain best practices. Please follow the comments made at important sections to highlight the best practices.
```js
'use strict';
//"should.js" (http://unitjs.com/guide/should-js.html) is used for asserting the outcomes.
var should = require('should');

//"/test/framework/arm-cli-test.js" is the suite used for writing tests in "ARM" mode.
//"/test/framework/cli-test.js" is the suite used for writing tests in "ASM" mode.
var CLITest = require('../../../framework/arm-cli-test');

//Always provide a testPrefix. This would be the name of the directory
//in which the test recordings would be stored for playback purposes
//for example: "/test/recordings/arm-cli-location-tests/*"
var testprefix = 'arm-cli-location-tests';

//List of requiredEnvironment variables for this test. If the envt. variable is not set and a default value is provided then it will be used in the test, else the test will throw an error letting the user know that an envt variable needs to be set.
var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  'AZURE_STORAGE_ACCESS_KEY'
];

//We are using a poplular javascript testing framework named "mocha" (http://mochajs.org/) for writing tests.
//As per mocha, describe() defines a "test-suite" and it() defines a "test" in a test-suite.
describe('arm', function () {
  describe('location', function () {
    var suite;

    before(function (done) {
      suite = new CLITest(testprefix);
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

    describe('list', function () {
      it('should work', function (done) {
        suite.execute('location list --json', function (result) {
          result.exitStatus.should.equal(0);
          //verify the command indeed produces something valid such as a well known provider: sql provider
          var allResources = JSON.parse(result.text);
          allResources.some(function (res) {
            return res.name.match(/Microsoft.Sql\/servers/gi);
          }).should.be.true;
          done();
        });
      });
    });
  });
});
```
