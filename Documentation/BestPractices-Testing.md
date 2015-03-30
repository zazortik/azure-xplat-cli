### Best Practices for writing tests

Let us take an example of a test to explain best practices. Please follow the comments made at important sections to highlight the best practices/
```js
'use strict';

var should = require('should');

//"/test/framework/arm-cli-test.js" is the suite used for writing tests in "ARM" mode.
//"/test/framework/cli-test.js" is the suite used for writing tests in "ASM" mode.
var CLITest = require('../../../framework/arm-cli-test');

//Always provide a testPrefix. This would be the name of the directory
//in which the test recordings would be stored for playback purposes
//for example: "/test/recordings/arm-cli-location-tests/*"
var testprefix = 'arm-cli-location-tests';

//We are using a poplular javascript testing framework named [mocha](http://mochajs.org/) for writing tests.
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
