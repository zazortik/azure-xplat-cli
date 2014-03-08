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

var utils = require('../../../../lib/util/utils');
var groupUtils = require('../../../../lib/commands/csm/groups/groupUtils');

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
  describe('when downloading to an existing file', function () {
    var sandbox;
    var filename = 'existing.json';

    before(function () {
      sandbox = sinon.sandbox.create();
    });

    after(function () {
      sandbox.restore();
    });

    beforeEach(function () {
      // var fullFile = path.join(process.cwd(), filename);
      // sandbox.stub(utils, 'pathExistsSync')
      //   .withArgs(fullFile)
      //   .returns(true);

      // sandbox.stub(fs, 'statSync')
      //   .withArgs(fullFile)
      //   .returns({
      //     isDirectory: function () { return false; }
      //   });
    });

    it('should prompt for overwrite and continue if confirmed', function (done) {
      var confirmer = sandbox.stub().callsArgWith(1, true);

      groupUtils.normalizeDownloadFileName('name', filename, false, confirmer, function (err, result) {
        if (err) { return done(err); }

        result.should.equal(path.resolve(process.cwd(), filename));
        confirmer.called.should.be.true;
        done();
      });
    });
  });
});