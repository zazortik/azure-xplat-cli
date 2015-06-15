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

var _ = require('underscore');
var path = require('path');
var should = require('should');
var sinon = require('sinon');

var packageLib = require('../../../../../lib/commands/arm/apiapp/lib/packaging');
var packageDataRoot = path.join(__dirname, 'testpackages');

describe('apiapp', function () {
  describe('lib', function() {

    describe('package validation', function () {
      it('should succeed for valid package', function (done) {
        var packageRoot = path.join(packageDataRoot, 'validPackage');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          should.not.exist(result.errors);
          result.isValid.should.be.true;
          done(err);
        });
      });

      it('should succeed for valid package with static metadata', function (done) {
        var packageRoot = path.join(packageDataRoot, 'validPackageStaticSwagger');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          should.not.exist(result.errors);
          result.isValid.should.be.true;
          done(err);
        });
      });

      it('should succeed for valid package with no metadata', function (done) {
        var packageRoot = path.join(packageDataRoot, 'validPackageNoSwagger');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          should.not.exist(result.errors);
          result.isValid.should.be.true;
          done(err);
        });
      });

      it('should fail for package missing manifest', function (done) {
        var packageRoot = path.join(packageDataRoot, 'noManifest');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          result.isValid.should.not.be.true;
          result.errors.some(function(e) { return /No manifest file/.test(e); }).should.be.true;
          done(err);
        });
      });

      it('should fail for invalid manifest format', function (done) {
        var packageRoot = path.join(packageDataRoot, 'badFormatManifest');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          result.isValid.should.not.be.true;
          result.errors.some(function (e) { return /Unable to parse/.test(e); }).should.be.true;
          done(err);
        });
      });

      it('should succeed for UIDefinition with constraints', function (done) {
        var packageRoot = path.join(packageDataRoot, 'allUIDefinitionConstraints');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          result.isValid.should.be.true;
          done(err);
        });
      });

      it('should fail for UIDefinition with bad constraints', function (done) {
        var packageRoot = path.join(packageDataRoot, 'badUIDefinitionConstraints');
        packageLib.validate(packageRoot, function (err, result) {
          should.not.exist(err);
          result.isValid.should.not.be.true;
          done(err);
        });
      });
    });
  });
});
