var https = require('https'),
    http = require('http'),
    OriginalClientRequest = http.ClientRequest, // HTTP ClientRequest before mocking by Nock
    OriginalHttpsRequest = https.request,
    OriginalHttpRequest = http.request,
    nock = require('nock'),
    NockClientRequest = http.ClientRequest, // HTTP ClientRequest mocked by Nock
    NockHttpsRequest = https.request,
    NockHttpRequest = http.request;

// The nock module should only be required once in all of the test infrastructure.
// If the nock require/OriginalClientRequest/NockClientRequest dance is done in multiple
// files, the nocked and unNocked http objects may get out of sync and break other tests.
// To use nock in your tests, use the following pattern:
//    - In all suite setups, call nockHttp(). This will enable nock on the http object.
//    - In all suite teardowns, call unNockHttp(). This will disable nock on the http object allowing other tests to run using the original http object.
//    - make sure to 'require('nock') only once across all tests and share the instance by using nock-helper.nock

exports.nock = nock;

exports.nockHttp = function() {
    http.ClientRequest = NockClientRequest;
    http.request = NockHttpRequest;
    https.request = NockHttpsRequest;
};

exports.unNockHttp = function() {
    http.ClientRequest = OriginalClientRequest;
    http.request = OriginalHttpRequest;
    https.request = OriginalHttpsRequest;
};

exports.unNockHttp(); // Revert the nock change so that tests by default run with the original, unmocked http request objects