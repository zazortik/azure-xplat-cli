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

var _ = require('underscore');

var should = require('should');
var mocha = require('mocha');

var util = require('util');
var uuid = require('node-uuid');
var executeCmd = require('../framework/cli-executor').execute;

var AFFINITYGROUP_NAME_PREFIX = 'xplatcli-';
var AFFINITYGROUP_LOCATION = 'West US';

describe('cli', function () {
  var affinityGroupName;

  before(function () {
    affinityGroupName = AFFINITYGROUP_NAME_PREFIX + uuid.v4().substr(0, 8);
  });

  describe('account affinity-group create', function () {
    it('should succeed', function (done) {
      var cmd = ('node cli.js account affinity-group create').split(' ');
      cmd.push(affinityGroupName);
      cmd.push('--location');
      cmd.push(AFFINITYGROUP_LOCATION);
      cmd.push('--description');
      cmd.push('AG-DESC');
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);
        result.text.should.be.empty;

        done();
      });
    });
  });

  describe('account affinity-group show', function () {
    it('should fail if name is invalid', function (done) {
      var cmd = ('node cli.js account affinity-group show').split(' ');
      cmd.push('!NotValid$');
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(1);
        result.errorText.should.not.be.empty;
        result.text.should.be.empty;

        done();
      });
    });

    it('should succeed', function (done) {
      var cmd = ('node cli.js account affinity-group show').split(' ');
      cmd.push(affinityGroupName);
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);

        var affinityGroup = JSON.parse(result.text);

        affinityGroup.Name.should.equal(affinityGroupName);
        affinityGroup.Description.should.equal('AG-DESC');
        affinityGroup.Location.should.equal(AFFINITYGROUP_LOCATION);
        affinityGroup.Label.should.equal(new Buffer(affinityGroupName).toString('base64'));

        done();
      });
    });
  });

  describe('account affinity-group list', function () {
    it('should succeed', function (done) {
      var cmd = ('node cli.js account affinity-group list').split(' ');
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);

        var found = false;
        JSON.parse(result.text).forEach(function (affinityGroup) {
          if(affinityGroup.Name === affinityGroupName) {
            found = true;

            affinityGroup.Name.should.equal(affinityGroupName);
            affinityGroup.Description.should.equal('AG-DESC');
            affinityGroup.Location.should.equal(AFFINITYGROUP_LOCATION);
            affinityGroup.Label.should.equal(new Buffer(affinityGroupName).toString('base64'));
          }
        });
        found.should.equal(true);

        done();
      });
    });
  });

  describe('account affinity-group delete', function () {
    it('should fail if name is invalid', function (done) {
      var cmd = ('node cli.js account affinity-group delete').split(' ');
      cmd.push('!NotValid$');
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(1);
        result.errorText.should.not.be.empty;
        result.text.should.be.empty;

        done();
      });
    });

    it('should succeed', function (done) {
      var cmd = ('node cli.js account affinity-group delete').split(' ');
      cmd.push(affinityGroupName);
      cmd.push('--json');

      executeCmd(cmd, function (result) {
        result.exitStatus.should.equal(0);
        result.text.should.be.empty;

        done();
      });
    });
  });
});