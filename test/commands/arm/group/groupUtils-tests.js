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

'use strict';

var fs = require('fs');
var path = require('path');
var should = require('should');
var sinon = require('sinon');

var CLITest = require('../../../framework/cli-test');
var FakeFiles = require('../../../framework/fake-files');
var testUtil = require('../../../util/util');

var groupUtils = require('../../../../lib/commands/arm/group/groupUtils');

describe('getTemplateDownloadUrl', function () {
  it('should get correct url if case of key matches', function () {
    var templateItem = {
      definitionTemplates: {
        deploymentTemplateFileUrls: {
          website_ExistingHostingPlan: "https://blah.de.blah.example/Website_ExistingHostingPlan.json",
          website_NewHostingPlan: "https://blah.de.blah.example/Website_NewHostingPlan.json"
        },
        defaultDeploymentTemplateId: "website_NewHostingPlan"
      }
    };
    groupUtils.getTemplateDownloadUrl(templateItem).should.equal(templateItem.definitionTemplates.deploymentTemplateFileUrls.website_NewHostingPlan);
  });

  it('should get correct url if case of key does not match', function () {
    var templateItem = {
      definitionTemplates: {
        deploymentTemplateFileUrls: {
          website_ExistingHostingPlan: "https://blah.de.blah.example/Website_ExistingHostingPlan.json",
          website_NewHostingPlan: "https://blah.de.blah.example/Website_NewHostingPlan.json"
        },
        defaultDeploymentTemplateId: "WEBSITE_NEWHOSTINGPLAN"
      }
    };
    groupUtils.getTemplateDownloadUrl(templateItem).should.equal(templateItem.definitionTemplates.deploymentTemplateFileUrls.website_NewHostingPlan);
  });
});

describe('download file name', function () {
  var yes = sinon.stub().callsArgWith(1, true);
  var no = sinon.stub().callsArgWith(1, false);

  describe('when downloading to an existing file', function () {
    var sandbox;
    var filename = 'existing.json';

    before(function () {
      sandbox = sinon.sandbox.create();
      var mocked = new FakeFiles()
        .withFile('existing.json');
      mocked.setMocks(sandbox);
    });

    after(function () {
      sandbox.restore();
    });

    beforeEach(function () {
      yes.reset();
      no.reset();
    });

    it('should prompt for overwrite and continue if confirmed', function (done) {
      groupUtils.normalizeDownloadFileName('name', filename, false, yes, function (err, result) {
        if (err) { return done(err); }

        result.should.equal(path.resolve(process.cwd(), filename));
        yes.called.should.be.true;
        done();
      });
    });

    it('should exit if file exists and overwrite is denied', function (done) {
      groupUtils.normalizeDownloadFileName('name', filename, false, no, function (err, result) {
        if (err) { return done(err); }

        should(result === null);
        no.called.should.be.true;
        done();
      });
    });

    it('should not call confirmer and continue if quiet option present', function (done) {
      groupUtils.normalizeDownloadFileName('name', filename, true, no, function (err, result) {
        if (err) { return done(err); }

        result.should.equal(path.resolve(process.cwd(), filename));
        no.called.should.be.false;
        done();
      });
    });
  });

  describe('when downloading to an existing directory', function () {
    var sandbox;
    var name = 'newtemplate';
    var filename = name + '.json';
    var destdir = path.join('first', 'second');
    var createdDirs;

    before(function () {
      sandbox = sinon.sandbox.create();
      var mocked = new FakeFiles()
        .withDir(destdir);
      mocked.setMocks(sandbox);

      sandbox.stub(fs, 'mkdirSync', function (filename) { createdDirs.push(filename); });
    });

    after(function () {
      sandbox.restore();
    });

    beforeEach(function () {
      createdDirs = [];
      yes.reset();
      no.reset();
    });

    it('should return filename in subdirectory', function (done) {
      groupUtils.normalizeDownloadFileName(name, destdir, false, no, function (err, result) {
        if (err) { return done(err); }

        result.should.equal(path.resolve(path.join(destdir, filename)));
        createdDirs.should.have.length(0);
        done();
      });
    });
  });

  describe('when downloading to a new file', function () {
    var sandbox;
    var name = 'nameisnotused';
    var filename = 'newdownload.json';
    var destdir = path.join('thisexists', 'thisdoesnt', 'thisdoesnteither');
    var fullpath = path.join(destdir, filename);

    var resultPath;
    var createdDirs;

    before(function () {
      sandbox = sinon.sandbox.create();
      new FakeFiles()
        .withDir('thisexists')
        .setMocks(sandbox);

      sandbox.stub(fs, 'mkdirSync', function (dir) { createdDirs.push(dir); });
    });

    after(function () {
      sandbox.restore();
    });

    beforeEach(function (done) {
      createdDirs = [];
      yes.reset();
      no.reset();

      groupUtils.normalizeDownloadFileName(name, fullpath, false, no, function (err, result) {
        if (err) { return done(err); }
        resultPath = result;
        done();
      });
    });

    it('should return the passed in filename', function () {
      resultPath.should.equal(path.resolve(fullpath));
    });

    it('should not require confirmation', function () {
      no.called.should.be.false;
    });

    it('should have created new directories', function () {
      createdDirs.should.have.length(2);
      var dir1 = path.join('thisexists', 'thisdoesnt');
      var dir2 = path.join(dir1, 'thisdoesnteither');
      createdDirs[0].should.equal(path.resolve(dir1));
      createdDirs[1].should.equal(path.resolve(dir2));
    });
  });

  describe('when file is not given', function () {
    var name = testUtil.generateId('template');

    it('should return name of file in current directory', function (done) {
      groupUtils.normalizeDownloadFileName(name, null, false, no, function (err, result) {
        if (err) { return done(err); }

        result.should.equal(path.resolve(name + '.json'));
        done();
      });
    });
  });
});