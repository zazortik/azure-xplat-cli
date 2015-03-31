#### Best Practices for writing tests

###### Test Prefix
Make sure to use a testPrefix while creating a new suite (test/framework.cli-test.js). This testPrefix would be the directory in which the test recordings would be stored.

###### Effectively using suite.generateId()
- Recording ids for playback
  - For the generated random Ids to be saved in the recording files, suite.generateId() should be called **inside** "setupSuite()", "setupTest()" or inside your actual test "it()"
- Deleting created artifacts
  - Declare arrays in the test file to store ids created for different types of artifacts. These arrays are passed as second argument to the suite.generateId() method. During teardownTest(), teardownSuite() or at the end of your test, one can iterate over the arrays of respective items and delete the created items. This ensures leaving the environment in a clean state
  ```
  var createdSites = [];
  var sitePrefix = "test-site";
  . . .
  describe( . . .
    before(function (done) {
        suite = new CLITest(testprefix, requiredEnvironment);
        suite.setupSuite(function () {
          sitename = suite.generateId(sitePrefix, createdSites);
          suite.execute("site create --location %s %s --json", process.env.AZURE_SITE_TEST_LOCATION, 
            sitename, function (result) {
            result.exitStatus.should.equal(0);
            done();
          });
        });
      });
  . . .
    after(function (done) {
      suite.teardownSuite(function () {
        //delete all the artifacts that were created during setup
        createdSites.forEach(function (item) {
          suite.execute('site delete %s -q --json', item, function (result) {
            result.exitStatus.should.equal(0);
          });
        });
        done();
      });
    });
  . . .
```
###### Ways to reduce playback time



