Setup Instructions

- Set the NOCK_OFF and AZURE_NOCK_RECORD environment variables appropriately for the desired test mode. https://github.com/Azure/azure-xplat-cli-pr/blob/master/Documentation/TestModes.md
- If recording, set the following environment variables. In playback mode, the account name and url will be read from the recorded file instead, and the key will be set to a default value.
  - AZURE_BATCH_ACCOUNT: The name of the Batch account you're using for recording.
  - AZURE_BATCH_ACCESS_KEY: The key for the Batch account.
  - AZURE_BATCH_ENDPOINT: The url of the account. 
- To launch the tests, from the root run "node .\scripts\unit.js testlist-batch-live.txt"