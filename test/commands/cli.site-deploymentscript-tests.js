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

var baseTestTempDir = "__temp";
var testDirBase = "test";
var testDirIndex = 0;
var testDir = "";

suite('cli', function () {
    suite('site deploymentscript', function () {
        setup(function () {
            // Reset site deploymentscript command
            for (var i in cli.categories.site.commands) {
                var command = cli.categories.site.commands[i];
                if (command.name == 'deploymentscript') {
                    delete command.php;
                    delete command.basic;
                    delete command.aspWAP;
                    delete command.aspWebSite;
                    delete command.python;
                    delete command.node;
                    delete command.repositoryRoot;
                    delete command.suppressPrompt;
                    delete command.scriptType;
                    delete command.solutionFile;
                }
            }

            testDirIndex++;
            testDir = pathUtil.join(baseTestTempDir, testDirBase + testDirIndex);
            ensurePathExists(testDir);
        });

        teardown(function () {
            removePath(testDir);
        });

        test('generate batch basic deployment script (--basic -t batch -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --basic -t batch -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done, /*bash*/false);
        });

        test('generate bash basic deployment script (--basic -t bash -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --basic -t bash -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done, /*bash*/true);
        });

        test('generate batch php deployment script (--php -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --php -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done);
        });

        test('generate bash php deployment script (--php -t bash -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --php -t bash -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done, /*bash*/true);
        });

        test('generate batch python deployment script (--python -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --python -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done);
        });

        test('generate batch python deployment script twice with -y (--python -y -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --python -y -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, function () {
                runBasicSiteDeploymentScriptScenario(cmd, done);
            });
        });

        test('generate bash python deployment script (--python --scriptType bash -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --python --scriptType bash -r ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done, /*bash*/true);
        });

        test('generate batch basic aspWebSite deployment script (--aspWebSite --repositoryRoot)', function (done) {
            var cmd = ('node cli.js site deploymentscript --aspWebSite --repositoryRoot ' + testDir).split(' ');

            runBasicSiteDeploymentScriptScenario(cmd, done);
        });

        test('generate node deployment script (--node -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --node -r ' + testDir).split(' ');

            runNodeSiteDeploymentScriptScenario(cmd, done);
        });

        test('generate bash node deployment script (--node -t bash -r)', function (done) {
            var cmd = ('node cli.js site deploymentscript --node -t bash -r ' + testDir).split(' ');

            runNodeSiteDeploymentScriptScenario(cmd, done, /*bash*/true);
        });

        test('generate batch aspWebSite with solution file deployment script (--aspWebSite -s solutionFile.sln -r)', function (done) {
            var solutionFile = 'solutionFile.sln';
            var solutionFilePath = pathUtil.join(testDir, solutionFile);

            var cmd = ('node cli.js site deploymentscript --aspWebSite -s ' + solutionFilePath + ' -r ' + testDir).split(' ');

            runAspWebSiteDeploymentScriptScenario(cmd, done, solutionFile);
        });

        test('generate batch aspWAP deployment script (--aspWAP projectFile.csproj -r)', function (done) {
            var projectFile = 'projectFile.csproj';
            var projectFilePath = pathUtil.join(testDir, projectFile);

            var cmd = ('node cli.js site deploymentscript --aspWAP ' + projectFilePath + ' -r ' + testDir).split(' ');

            runAspWAPDeploymentScriptScenario(cmd, done, projectFile);
        });

        test('generate batch aspWAP with solution file deployment script (--aspWAP projectFile.csproj -s solutionFile.sln -r)', function (done) {
            var projectFile = 'projectFile.csproj';
            var projectFilePath = pathUtil.join(testDir, projectFile);
            var solutionFile = 'solutionFile.sln';
            var solutionFilePath = pathUtil.join(testDir, solutionFile);

            var cmd = ('node cli.js site deploymentscript --aspWAP ' + projectFilePath + ' -s ' + solutionFilePath + ' -r ' + testDir).split(' ');

            runAspWAPDeploymentScriptScenario(cmd, done, projectFile, solutionFile);
        });

        test('using exclusion flags together should fail (--aspWebSite --python ...)', function (done) {
            var cmd = ('node cli.js site deploymentscript --aspWebSite --python -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'specify only one of these flags', done);
        });

        test('using exclusion flags together should fail (--node --php ...)', function (done) {
            var cmd = ('node cli.js site deploymentscript --node --php -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'specify only one of these flags', done);
        });

        test('using exclusion flags together should fail (--aspWAP . --basic ...)', function (done) {
            var cmd = ('node cli.js site deploymentscript --aspWAP . --basic -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'specify only one of these flags', done);
        });

        test('using exclusion flags together should fail (--basic --php ...)', function (done) {
            var cmd = ('node cli.js site deploymentscript --basic --php -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'specify only one of these flags', done);
        });

        test('--aspWAP requires project file path argument', function (done) {
            var cmd = ('node cli.js site deploymentscript -r ' + testDir + ' --aspWAP').split(' ');

            runErrorScenario(cmd, 'argument missing', done);
        });

        test('--node requires directory to contain server.js file (--node)', function (done) {
            var cmd = ('node cli.js site deploymentscript --node -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'Missing server.js/app.js file', done);
        });

        test('--scriptType only accepts batch or bash (--scriptType sh)', function (done) {
            var cmd = ('node cli.js site deploymentscript --php --scriptType sh -r ' + testDir).split(' ');

            runErrorScenario(cmd, 'Script type should be either batch or bash', done);
        });
    });
});

function runAspWebSiteDeploymentScriptScenario(cmd, callback, solutionFile) {
    var scriptFileName = 'deploy.cmd';

    runSiteDeploymentScriptScenario(
        cmd,
        ['Generating deployment script for .NET Web Site', 'Generated deployment script (' + scriptFileName + ' and .deployment)'],
        ['echo Handling .NET Web Site deployment.', solutionFile, 'MSBUILD_PATH'],
        scriptFileName,
        callback);
}

function runAspWAPDeploymentScriptScenario(cmd, callback, projectFile, solutionFile) {
    var scriptFileName = 'deploy.cmd';
    solutionFile = solutionFile || '';

    runSiteDeploymentScriptScenario(
        cmd,
        ['Generating deployment script for .NET Web Application', 'Generated deployment script (' + scriptFileName + ' and .deployment)'],
        ['echo Handling .NET Web Application deployment.', projectFile, 'MSBUILD_PATH', solutionFile],
        scriptFileName,
        callback);
}

function runBasicSiteDeploymentScriptScenario(cmd, callback, bash) {
    var scriptFileName = bash ? 'deploy.sh' : 'deploy.cmd';
    var scriptExtraInclue = bash ? '#!/bin/bash' : '@echo off';

    runSiteDeploymentScriptScenario(
        cmd,
        ['Generating deployment script for Web Site', 'Generated deployment script (' + scriptFileName + ' and .deployment)'],
        ['echo Handling Basic Web Site deployment.', scriptExtraInclue],
        scriptFileName,
        callback);
}

function runNodeSiteDeploymentScriptScenario(cmd, callback, bash) {
    var nodeStartUpFile = 'server.js';

    generateNodeStartJsFile(nodeStartUpFile);

    var scriptFileName = bash ? 'deploy.sh' : 'deploy.cmd';
    var scriptExtraInclue = bash ? '#!/bin/bash' : '@echo off';

    runSiteDeploymentScriptScenario(
        cmd,
        ['Generating deployment script for node', 'Generated deployment script (' + scriptFileName + ' and .deployment)'],
        ['echo Handling node.js deployment.', scriptExtraInclue],
        scriptFileName,
        function (err) {
            if (err) {
                callback(err);
                return;
            }

            try {
                var webConfigContent = getFileContent('web.config');
                webConfigContent.should.include(nodeStartUpFile);
                webConfigContent.should.not.include('{NodeStartFile}');

                var iisNodeYmlContent = getFileContent('iisnode.yml');
                iisNodeYmlContent.should.include('node_env: production');

                callback();
            }
            catch (e) {
                callback(e);
            }
        });
}

function runSiteDeploymentScriptScenario(cmd, outputContains, scriptContains, scriptFileName, callback) {
    runCommand(cmd, function (result, e) {
        if (e) {
            callback(e);
            return;
        }

        result.exitStatus.should.equal(0, 'Received an error status exit code');

        for (var i = 0; i < outputContains.length; i++) {
            result.text.should.include(outputContains[i]);
        }

        var deployCmdContent = getFileContent(scriptFileName);
        for (var i = 0; i < scriptContains.length; i++) {
            deployCmdContent.should.include(scriptContains[i]);
        }

        var deploymentFileContent = getFileContent('.deployment');
        deploymentFileContent.should.include(scriptFileName);

        callback();
    });
}

function runErrorScenario(cmd, errorText, callback) {
    runCommand(cmd, function (result, e) {
        if (e) {
            callback(e);
            return;
        }

        result.exitStatus.should.equal(1, 'Received success status exit code');
        result.errorText.should.include(errorText);
        callback();
    });
}

function runCommand(cmd, callback) {
    capture(function () {
        cli.parse(cmd);
    }, function (result) {
        if (result.error) {
            // To avoid calling done twice
            return;
        }

        try {
            console.log('\n' + result.text);
            console.log(result.errorText);
            callback(result);
        }
        catch (e) {
            callback(result, e);
        }
    });
}

function generateNodeStartJsFile(startFile) {
    fs.writeFileSync(pathUtil.join(testDir, startFile), '//do nothing', 'utf8');
}

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
