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

var should = require('should');

var cli = require('../cli');
var capture = require('../util').capture;

var fs = require('fs');
var pathUtil = require('path');
if (!fs.existsSync) {
    fs.existsSync = pathUtil.existsSync;
};

var baseTestTempDir = "temp";
var testDirBase = "test";
var testDirIndex = 0;
var testDir = "";

suite('cli', function() {
  suite('site deploymentscript', function() {
      setup(function () {
          testDirIndex++;
          testDir = pathUtil.join(baseTestTempDir, testDirBase + testDirIndex);
          ensurePathExists(testDir);
      });

      teardown(function () {
          removePath(testDir);
      });

      test('generate php deployment script (--php -y -r)', function (done) {
        // Create site
        var cmd = ('node cli.js site deploymentscript --php -y -r ' + testDir).split(' ');

        capture(function () {
            cli.parse(cmd);
        }, function (result) {
            try {
                console.log(result.text);

                result.exitStatus.should.equal(0);

                result.text.should.include('Generating deployment script for Web Site');
                result.text.should.include('Generated deployment script (deploy.cmd and .deployment)');

                var deployCmdContent = getFileContent('deploy.cmd');
                deployCmdContent.should.include('echo Handling Basic Web Site deployment.');

                var deploymentFileContent = getFileContent('.deployment');
                deploymentFileContent.should.include('deploy.cmd');

                done();
            }
            catch (e) {
                console.log(e);
                done(e);
            }
        });
    });
  });
});

function getFileContent(path) {
    path = pathUtil.join(testDir, path);
    fs.existsSync(path).should.equal(true, "File doesn't exist: " + path);
    return fs.readFileSync(path, 'utf8');
}

function removePath(path) {
    var stat = tryGetFileStat(path);
    if (stat) {
        if (!stat.isDirectory()) {
            tryRemoveFile(path);
        }
        else {
            var files = fs.readdirSync(path);
            for (var index in files) {
                var file = files[index];
                var filePath = pathUtil.join(path, file);
                removePath(filePath);
            }

            tryRemoveDir(path);
        }
    }
}

function tryGetFileStat(path) {
    try {
        return fs.statSync(path);
    }
    catch (e) {
        if (e.errno == 34) {
            // Return null if path doesn't exist
            return null;
        }

        throw e;
    }
}

function tryRemoveFile(path) {
    try {
        fs.unlinkSync(path);
    }
    catch (e) {
        console.log(e);
    }
}

function tryRemoveDir(path) {
    try {
        fs.rmdirSync(path);
    }
    catch (e) {
    }
}

function ensurePathExists(path) {
    if (!fs.existsSync(path)) {
        ensurePathExists(pathUtil.dirname(path));
        fs.mkdirSync(path);
    }
}
