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

var mcOption = Array.prototype.indexOf.call(args, '--mc') !== -1;

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

var defaultSubscription = 'db1ab6f0-4769-4b27-930e-01e2ef9c123c';

// Fake certificate
var defaultCertificate = '-----BEGIN CERTIFICATE-----' +
  'MIIEogCCAaygAwIBAgIQfIIiKKjiT5pEFD7tP9Ye7DANBgkqhkiG9w0BAQUFADAe' +
  'MRwwGgYDVQQDExNXaW5kb3dzIEF6dXJlIFRvb2xzMB4XDTEyMTExNTE4NTYyN1oX' +
  'DTEzMTExNTE4NTYyN1owHjEcMBoGA1UEAxMTV2luZG93cyBBenVyZSBUb29sczCC' +
  'ASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALVe0fjGjODxadyNcVZxxPZI' +
  'KYGd/KqPtknlw9EdYnyBTZY9zYITsL4GxYnArKLXlmfU5sb4tXPCDPh/UiCI3Em8' +
  'nM/WPlxDQuwsj/v6wKRcSdPwkR3U/XgPV/cgYZ7HgKs03RwtKmPa3vizFk2Xtwuw' +
  'jcFkanhfpJmiVnt6n0lgLzBGuMTIhjO2NAeoM8+94wJXHtxJAyiUExMvXzwircWy' +
  'LWNSRs05KEu+D8SiOxKHnY6QHOIWyq+J9nqg4rhFLVk+hxZZ6etx9774ht3LbKaa' +
  'M0YSReBcwfd/HPVyup-it-is-fake-for-real-fakeFzaLRfmL5TzZhYg+fomEC' +
  'AwEAATANBgkqhkiG9w0BAQUFAAOCAQEAZzcxis/J3/iTf6scp1AIfAAZ2N/rXCft' +
  '02ZezJlTei4a7WYnGvLrjcmP+bhw4G9h1ducyXyaIlb94LwftEyar4G27k3A4r/p' +
  'SkUFCdhHmgZDGglmlj72uJFtKy7UAjHsXOXh5nV9Wc99TbAXupPIeFr8VFkV/SNx' +
  'xw5wzcpLS+L7gicFnJcqomDctSrbJFHhaQgJh1x1nxgQPpA59pOL/FS5bRMbTmhc' +
  'wHHVg8+sk7Dm3V9UxAxPjaCFf4ATFlpRCCQ9cmkYidSYZxQuloJ24SwdyOtGvivr' +
  'oHxyTDZ6H7IoGUS7zP3/SzGQ/NdbGcCn02LR3hhbCV5JFhIH2YlNfQ==' +
  '-----END CERTIFICATE-----';

// Fake certificate key
var defaultCertificateKey = '-----BEGIN RSA PRIVATE KEY-----' +
  'MIIEoQIBAAKCAQEAtV7R+MaM4PFp3I1xVnHE9kgpgZ38qo+2SeXD0R1ifIFNlj3N' +
  'ghOwvgbFicCsoteWZ9Tmxvi1c8IM+H9SIIjcSbycz9Y+XENC7CyP+/rApFxJ0/CR' +
  'HdT9eA9X9yBhnseAqzTdHC0qY9re+LMWTZe3C7CNwWRqeF+kmaJWe3qfSWAvMEa4' +
  'xMiGM7Y0B6gzz73jAlce3EkDKJQTEy9fPCKtxbItY1JGzTkoS74PxKI7EoedjpAc' +
  '4hbKr4n2eqDiuEUtWT6HFlnp63H3vviG3ctsppozRhJF4FzB938c9XwUizvP+PWd' +
  '7EZh3zWEaAsNtlNL9kXNotF+YvlPNmFiD5+iYQIDAQABAoIBAFK/hqPujoLokehu' +
  '3elXMco9pTY+avM0azIu8pa7Rd5RLiFgZB03N5mTRFfzgLAxFS2dPIdGHJ9KRxmv' +
  'GTy/xGWd+Jt4f24fv+457J1Fy9ORSZu5M7Q9I0G+Gl+lNfS3x/QUw9ahoqf5SWaF' +
  'aqUPFZPvQtWbp1nxJQt1PejLStYyF5SnGung4OHNcrFLaE+mKmV3CTV1ZIlbGN6G' +
  'YKQeU27V7jthis-is-really-fakecTrsk6jZLz3m9MtDqrbN9rklnFJPMM9K4KT' +
  'kLt8k6VJoiB66tNmNdozhjTId/V033mkQUPj0vTf0qQpiLeEnnBplb2Ljtc9gi6U' +
  'bGAxZpMCgYEA5BrzIcEU+Pg3KL8Yc5DaXiqPPoRL4+sXqJ30guJlWxsZc4U7GRmb' +
  'S6xND9lU7ubcxdVPMcTYQMKiDep5tcvuDJ1auP+gFs3J+P3bPJbc9rU8jrPmOuKf' +
  'ey7fmUGlf4eMXh+3mx+8znX6+Wl23RT3skFGo2S2LesjTMdolVo1NB8CgYEAy4zK' +
  'gNF9FYIGZGiydq2y+lE4jkeSHhlucPFAxoW/Qv8+SKqPAzto30LpfAfnTfRN7xnb' +
  'GsqpEJtdg59FD8EOuDG7541slajylTHWZpGhQ0NJS/Bhcsld8IIFFUMZoq8QCNJd' +
  'fSqPwjqq6C4xhF4rya2ZZQsfkgtLwnfRzAxkWX8CfwnNHqVUppIMGFKn42UT1E43' +
  'hfApvxkMAPg90UPOdoxznaRZFTD+6K1Xuff0XrHlOZdGkyCQVLpzooL2kEQ/fvsL' +
  'x9orIbXZIdSRE9qGoPf40aFQGZRuKGwil3j+WR4htOZWdo0zz+kPKLmOzoyxWfNO' +
  '2roqmalfcSTbbKL+PUsCgYEAlNibrJ+ETJoMephlCIv0eT+zj7eejgwiysxghcuA' +
  'FUn5DcJLWh2zjq+rdVuCNWsVImdR5cGU5+P0+i8ZnW+bh+42bhjo8nfdDGSpV8/e' +
  'kQU/MBzT5dCCtUEe3nF26ZQCsbDDVKgu/+VO3QIKi7UhaBVeOplruKwx9j8QV5oo' +
  'N5kCgYB2+L/HG3G4s/oBsUMQI64niYujP0wWi3m8fwxlZWyVLBRjOzWyt9Scge35' +
  'lsbV+U5/Z/adVSJErH+7tgkCdS/Ibwztz5TvrRFeGIq+dCpDS+Tdo5AsJziuHKAF' +
  'PfQPzsqRlsb5G/VNmeQd1oY7nQXLWAfcAtIrQbHORj4U4e/Izg==' +
  '-----END RSA PRIVATE KEY-----';

var defaultCommunityImageId = 'vmdepot-1-1-1';
var defaultGithubUsername = 'azuresdkci';
var defaultGithubPassword = 'fakepassword';
var defaultGithubRepository = 'azuresdkci/azuresdkci-repo';
var defaultGitUsername = 'andrerod';

if (!process.env.NOCK_OFF) {
  if (!process.env.AZURE_NOCK_RECORD) {
    if (process.env.AZURE_SUBSCRIPTION_ID !== defaultSubscription) {
      process.env.AZURE_SUBSCRIPTION_ID = defaultSubscription;
    }

    if (process.env.AZURE_CERTIFICATE !== defaultCertificate) {
      process.env.AZURE_CERTIFICATE = defaultCertificate;
    }

    if (process.env.AZURE_CERTIFICATE_KEY !== defaultCertificateKey) {
      process.env.AZURE_CERTIFICATE_KEY = defaultCertificateKey;
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
  } else if (process.env.AZURE_NOCK_RECORD) {
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

    if (!process.env.AZURE_CERTIFICATE) {
      throw new Error('Azure certificate needs to be defined for recordings');
    }

    if (!process.env.AZURE_CERTIFICATE_KEY) {
      throw new Error('Azure certificate key needs to be defined for recordings');
    }
  }
} else {
  if (mcOption) {
    process.env.AZURE_TEST_MC = true;

    if (!process.env.AZURE_SITE_TEST_LOCATION) {
      process.env.AZURE_SITE_TEST_LOCATION = 'China North';
    }

    if (!process.env.AZURE_STORAGE_TEST_LOCATION) {
      process.env.AZURE_STORAGE_TEST_LOCATION = 'China North';
    }

    if (!process.env.AZURE_VM_TEST_LOCATION) {
      process.env.AZURE_VM_TEST_LOCATION = 'China North';
    }

    if (!process.env.AZURE_SQL_TEST_LOCATION) {
      process.env.AZURE_SQL_TEST_LOCATION = 'China North';
    }
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