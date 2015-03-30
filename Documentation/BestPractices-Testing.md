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

var sitename;
var createdSites = [];

//List of requiredEnvironment variables for this test. If the envt. variable is not set 
//and a default value is provided then it will be used in the test, else the test will 
//throw an error letting the user know the list of required envt variables that need to be set.
var requiredEnvironment = [
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'East US'},
  'AZURE_STORAGE_ACCESS_KEY'
];

//We are using a poplular javascript testing framework named "mocha" (http://mochajs.org/) for writing tests.
//As per mocha, describe() defines a "test-suite" and it() defines a "test" in a test-suite.
describe('arm', function () {
  describe('location', function () {
    var suite;
    //before is executed once at the start of the this test-suite.
    before(function (done) {
      suite = new CLITest(testprefix, requiredEnvironment);
      
      //A. If nothing needs to be performed then setupSuite() needs to be called as follows:
      suite.setupSuite(done);
      
      //B. Let us assume that a test needs to create a new site that will be used by every test. 
      //Then we shall do something like this:
      suite.setupSuite(function () {
        
        //During RECORD mode, generateId will write the random test id to the recording file.
        //This id will be read from the file during PLAYBACK mode
        sitename = suite.generateId(
          "test-site" /*some good site prefix for you to identify the sites created by your test*/, 
          createdSites /*An array to maintain the list of created sites. 
                       This is useful to delete the list of created sites in teardown*/ );
        
        suite.execute("site create --location %s %s" /*Azure command to execute*/, 
              process.env.AZURE_SITE_TEST_LOCATION, 
              sitename, 
              function (result) {
          result.exitStatus.should.equal(0);
          //done is an important callback that signals mocha that the current phase in the 
          //test is complete and the mocha runner should move to the next phase in the test 
          done();
        });
      });
    });
    
    //after is execute once at the end of this test-suite
    after(function (done) {
      suite.teardownSuite(done);
    });

    //beforeEach is executed everytime before the test starts
    beforeEach(function (done) {
      //setupTest is a hook provided for the developer to perform steps that 
      //need to be performed before every test
      //Mechanism to add custom steps is the same that is explained above in setupSuite()
      suite.setupTest(done);
    });
    
    //afterEach is executed everytime after the test execution is complete,
    //irrespective of success or failure
    afterEach(function (done) {
      //teardownTest is a hook provided for the developer to perform steps that 
      //need to performed after every test
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
