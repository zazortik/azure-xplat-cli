Setup Instructions

- From the root, run "node bin\azure login" and follow the instructions to login with your Azure account.
- The tests will create resource groups, a Batch account, and a Storage account. Use the AZURE_ARM_TEST_LOCATION environment to specify which region to use. If the variable is not set, "westus" will be used by default.
- Set the NOCK_OFF and AZURE_NOCK_RECORD environment variables appropriately for the desired test mode. https://github.com/Azure/azure-xplat-cli-pr/blob/master/Documentation/TestModes.md
- To launch the tests, from the root run "node .\scripts\unit.js testlist-arm-batch-live.txt"