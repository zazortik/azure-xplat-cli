/**
* Copyright 2012 Microsoft Corporation
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

var uuid = require('node-uuid');

var should = require('should');
var cli = require('../cli');
var capture = require('../util').capture;

var gitUsername = process.env['AZURE_GIT_USERNAME'];

suite('cli', function () {
  suite('site log', function () {

    var createdSites = [];

    function newName() {
      var name = 'testsite-' + uuid.v4().substr(0, 8);
      createdSites.push(name);
      return name;
    }

    teardown(function (done) {
      var deleteSites = function () {
        if (createdSites.length > 0) {
          deleteSite(createdSites.pop(), deleteSites);
        } else {
          done();
        }
      };

      deleteSites();
    });

    test('tail', function (done) {
      var siteName = newName();

      createSite(siteName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        showSite(siteName, function (result) {
          result.exitStatus.should.equal(0);

          connectLogStream(siteName, function (result) {
            result.text.should.include('Welcome, you are now connected to log-streaming service.');

            done();
          });
        });
      });
    });

    function createSite(siteName, callback) {
      var cmd = ('node cli.js site create ' + siteName + ' --git --gitusername ' + gitUsername + ' --json --location').split(' ');
      cmd.push('West US');
      capture(function() {
        cli.parse(cmd);
      }, callback);
    }

    function showSite(siteName, callback) {
      var cmd = ('node cli.js site show ' + siteName + ' --json').split(' ');
      capture(function() {
        cli.parse(cmd);
      }, callback);
    }

    function deleteSite(siteName, callback) {
      var cmd = ('node cli.js site delete ' + siteName + ' --json --quiet').split(' ');
      capture(function() {
        cli.parse(cmd);
      }, callback);
    }

    function connectLogStream(siteName, callback) {
      setTimeout(function () { process.exit(0); }, 5000);
      var cmd = ('node cli.js site log tail ' + siteName).split(' ');
      capture(function() {
        cli.parse(cmd);
      }, callback);
    }
  });
});
