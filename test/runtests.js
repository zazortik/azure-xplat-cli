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

var fs = require('fs');

var args = (process.ARGV || process.argv);

var coverageOption = Array.prototype.indexOf.call(args, '-coverage');

if (coverageOption !== -1) {
  args.splice(coverageOption, 1);
}

var testList = args.pop();

var fileContent;
var root = false;

if  (!fs.existsSync) {
  fs.existsSync = require('path').existsSync;
}

if (fs.existsSync(testList)) {
  fileContent = fs.readFileSync(testList).toString();
} else {
  fileContent = fs.readFileSync('./test/' + testList).toString();
  root = true;
}

if (!process.env.NOCK_OFF) {
  if (!process.env.AZURE_SUBSCRIPTION_ID) {
    process.env.AZURE_SUBSCRIPTION_ID = 'db1ab6f0-4769-4b27-930e-01e2ef9c123c';
  }

  if (!process.env.AZURE_COMMUNITY_IMAGE_ID) {
    process.env.AZURE_COMMUNITY_IMAGE_ID = 'vmdepot-1-1-1';
  }

  if (!process.env.AZURE_GITHUB_USERNAME) {
    process.env.AZURE_GITHUB_USERNAME = 'azuresdkci';
  }

  if (!process.env.AZURE_GITHUB_PASSWORD) {
    process.env.AZURE_GITHUB_PASSWORD = 'fakepassword';
  }

  if (!process.env.AZURE_GITHUB_REPOSITORY) {
    process.env.AZURE_GITHUB_REPOSITORY = 'azuresdkci/azuresdkci-repo';
  }

  if (!process.env.AZURE_GIT_USERNAME) {
    process.env.AZURE_GIT_USERNAME = 'andrerod';
  }
}

var defaultSubscription = 'db1ab6f0-4769-4b27-930e-01e2ef9c123c';
var defaultCommunityImageId = 'vmdepot-1-1-1';
var defaultGithubUsername = 'azuresdkci';
var defaultGithubPassword = 'fakepassword';
var defaultGithubRepository = 'azuresdkci/azuresdkci-repo';
var defaultGitUsername = 'andrerod';

if (!process.env.NOCK_OFF && !process.env.AZURE_NOCK_RECORD) {
  if (process.env.AZURE_SUBSCRIPTION_ID !== defaultSubscription) {
    process.env.AZURE_SUBSCRIPTION_ID = defaultSubscription;
  }

  if (process.env.AZURE_COMMUNITY_IMAGE_ID !== defaultCommunityImageId) {
    process.env.AZURE_COMMUNITY_IMAGE_ID = defaultCommunityImageId;
  }

  if (process.env.AZURE_GITHUB_USERNAME !== defaultGithubUsername) {
    process.env.AZURE_GITHUB_USERNAME = defaultGithubUsername;
    process.env.AZURE_GITHUB_PASSWORD = defaultGithubPassword;
    process.env.AZURE_GITHUB_REPOSITORY = defaultGithubRepository;
  }

  if (process.env.AZURE_GIT_USERNAME !== defaultGitUsername) {
    process.env.AZURE_GIT_USERNAME = defaultGitUsername;
  }
} else if (!process.env.NOCK_OFF && process.env.AZURE_NOCK_RECORD) {
  // If in record mode, and environment variables are set, make sure they are the expected one for recording
  // NOTE: For now, only the Core team can update recordings. For non-core team PRs, the recordings will be updated
  // after merge
  if (process.env.AZURE_SUBSCRIPTION_ID && process.env.AZURE_SUBSCRIPTION_ID !== defaultSubscription) {
    throw new Error('Storage recordings can only be made with the subscription ' + defaultSubscription);
  }

  if (process.env.AZURE_COMMUNITY_IMAGE_ID && process.env.AZURE_COMMUNITY_IMAGE_ID !== defaultCommunityImageId) {
    throw new Error('VM recordings can only be made with the community image ' + defaultCommunityImageId);
  }

  if (process.env.AZURE_GITHUB_USERNAME && process.env.AZURE_GITHUB_USERNAME !== defaultGithubUsername) {
    throw new Error('Github recordings can only be made with the subscription ' + defaultGithubUsername);
  }

  if (process.env.AZURE_GIT_USERNAME && process.env.AZURE_GIT_USERNAME !== defaultGitUsername) {
    throw new Error('Git recordings can only be made with the subscription ' + defaultGitUsername);
  }
}

var files = fileContent.split('\n');

args.push('-u');
args.push('tdd');

// TODO: remove this timeout once tests are faster
args.push('-t');
args.push('500000');

files.forEach(function (file) {
  if (file.length > 0 && file.trim()[0] !== '#') {
    // trim trailing \r if it exists
    file = file.replace('\r', '');

    if (root) {
      args.push('test/' + file);
    } else {
      args.push(file);
    }
  }
});

if (coverageOption !== -1) {
  args.push('-R');
  args.push('html-cov');
} else {
  args.push('-R');
  args.push('list');
}

require('../node_modules/mocha/bin/mocha');