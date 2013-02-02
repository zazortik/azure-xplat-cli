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
var path = require('path');
var utils = require('../../utils');

// Making sure this works on node 0.6.20 as well as 0.8
fs.existsSync = fs.existsSync || path.existsSync;
path.sep = path.sep || '\\';

var templatesDir = __dirname;
var log = { info: function () { } };
var confirm = function () { return false; };

var ScriptType = {
  batch: 'BATCH',
  bash: 'BASH'
};

var ProjectType = {
  wap: 'WAP',
  website: 'WEBSITE',
  node: 'NODE',
  basic: 'BASIC'
}

exports.ScriptType = ScriptType;
exports.ProjectType = ProjectType;

function ScriptGenerator(repositoryRoot, projectType, projectPath, solutionPath, sitePath, scriptType, noDotDeployment, noSolution, logger, confirmFunc) {
  argNotNull(repositoryRoot, 'repositoryRoot');
  argNotNull(projectType, 'projectType');
  argNotNull(scriptType, 'scriptType');
  argNotNull(sitePath, 'sitePath');

  scriptType = scriptType.toUpperCase();
  if (scriptType !== ScriptType.batch && scriptType !== ScriptType.bash) {
    throw new Error('Script type should be either batch or bash');
  }
  this.scriptType = scriptType;

  log = logger || log;
  confirm = confirmFunc || confirm;

  if (projectPath) {
    if (!isPathSubDir(repositoryRoot, projectPath)) {
      throw new Error('The project file path should be a sub-directory of the repository root');
    }

    var relativeProjectPath = path.relative(repositoryRoot, projectPath);
    log.info('Project file path: .' + path.sep + relativeProjectPath);
    this.projectPath = relativeProjectPath;
  }

  if (solutionPath) {
    if (!isPathSubDir(repositoryRoot, solutionPath)) {
      throw new Error('The solution file path should be the same as repository root or a sub-directory of it.');
    }

    var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);
    log.info('Solution file path: .' + path.sep + relativeSolutionPath);
    this.solutionPath = relativeSolutionPath;
  }

  if (!isPathSubDir(repositoryRoot, sitePath)) {
    throw new Error('The site directory path should be the same as repository root or a sub-directory of it.');
  }

  var relativeSitePath = path.relative(repositoryRoot, sitePath);
  if (relativeSitePath) {
    relativeSitePath = path.sep + relativeSitePath;
    log.info('The site directory path: .' + relativeSitePath);
  }
  this.sitePath = relativeSitePath || '';

  projectType = projectType.toUpperCase();

  this.repositoryRoot = repositoryRoot;
  this.projectType = projectType;
  this.noDotDeployment = noDotDeployment;
  this.noSolution = noSolution;
  this.absoluteSitePath = path.join(this.repositoryRoot, this.sitePath);

  this.generators = [];
  this.generators[ProjectType.wap] = generateWapDeploymentScript;
  this.generators[ProjectType.website] = generateWebSiteDeploymentScript;
  this.generators[ProjectType.node] = generateNodeDeploymentScript;
  this.generators[ProjectType.basic] = generateBasicWebSiteDeploymentScript;
}

function generateWapDeploymentScript(scriptGenerator, _) {
  scriptGenerator.generateWapDeploymentScript(_);
}

function generateWebSiteDeploymentScript(scriptGenerator, _) {
  scriptGenerator.generateWebSiteDeploymentScript(_);
}

function generateNodeDeploymentScript(scriptGenerator, _) {
  scriptGenerator.generateNodeDeploymentScript(_);
}

function generateBasicWebSiteDeploymentScript(scriptGenerator, _) {
  if (scriptGenerator.solutionPath) {
    throw new Error('Solution path is not supported with this website type');
  }
  scriptGenerator.generateWebSiteDeploymentScript(_);
}

ScriptGenerator.prototype.generateDeploymentScript = function (_) {
  var generator = this.generators[this.projectType];
  if (!generator) {
    throw new Error('Invalid project type received: ' + this.projectType);
  }

  generator(this, _);
}

function isPathSubDir(parentPath, childPath) {
  var relativePath = path.relative(parentPath, childPath);

  // The parent path is actually the parent of the child path if the result of path.relative:
  // a. Doesn't contain '..' at the start
  // b. Doesn't equal to the child path entirely
  return relativePath.indexOf('..') != 0
      && relativePath != path.resolve(childPath);
}

ScriptGenerator.prototype.generateNodeDeploymentScript = function (_) {
  log.info('Generating deployment script for node.js Web Site');

  createIisNodeWebConfigIfNeeded(this.absoluteSitePath);
  utils.copyIisNodeWhenServerJsPresent(log, this.absoluteSitePath, _);

  this.generateBasicDeploymentScript('node.template', _);
}

function getNodeStartFile(sitePath) {
  var nodeStartFiles = ['server.js', 'app.js'];

  for (var i in nodeStartFiles) {
    var nodeStartFilePath = path.join(sitePath, nodeStartFiles[i]);
    // TODO: Change to async and add retry
    if (fs.existsSync(nodeStartFilePath)) {
      return nodeStartFiles[i];
    }
  }

  return null;
}

function createIisNodeWebConfigIfNeeded(sitePath) {
  var webConfigPath = path.join(sitePath, 'web.config');

  if (!fs.existsSync(webConfigPath)) {
    log.info('Creating Web.config to enable Node.js activation.');

    var nodeStartFilePath = getNodeStartFile(sitePath);
    if (!nodeStartFilePath) {
      throw new Error('Missing server.js/app.js file which is required for a node.js site');
    }

    var webConfigContent = getTemplateContent('iisnode.config.template');
    webConfigContent =
        webConfigContent.replace(/{NodeStartFile}/g, fixPathSeperatorToWindows(nodeStartFilePath));
    writeContentToFile(webConfigPath, webConfigContent);
  }
}

ScriptGenerator.prototype.generateWapDeploymentScript = function (_) {
  argNotNull(this.projectPath, 'projectPath');

  if (this.scriptType != ScriptType.batch) {
    throw new Error('Only batch script files are supported for .NET Web Application');
  }

  if (!this.solutionPath && !this.noSolution) {
    throw new Error('Missing solution file path (--solutionPath), to explicitly not require a solution use the flag --no-solution');
  }

  log.info('Generating deployment script for .NET Web Application');

  var msbuildArguments = '"%DEPLOYMENT_SOURCE%\\' + this.projectPath + '" /nologo /verbosity:m /t:Build /t:pipelinePreDeployCopyAllFilesToOneFolder /p:_PackageTempDir="%DEPLOYMENT_TEMP%";AutoParameterizationWebConfigConnectionStrings=false;Configuration=Release %build_args%';

  if (this.solutionPath != null) {
    var solutionDir = path.dirname(this.solutionPath);
    msbuildArguments += ' /p:SolutionDir="%DEPLOYMENT_SOURCE%\\' + solutionDir + '\\\\\"  %build_args%';
  }

  this.generateDotNetDeploymentScript('deploy.batch.aspnet.wap.template', msbuildArguments, _);
}

ScriptGenerator.prototype.generateWebSiteDeploymentScript = function (_) {
  if (this.solutionPath) {
    // Solution based website (.NET)
    log.info('Generating deployment script for .NET Web Site');

    if (this.scriptType != ScriptType.batch) {
      throw new Error('Only batch script files are supported for .NET Web Site');
    }

    var msbuildArguments = '"%DEPLOYMENT_SOURCE%\\' + fixPathSeperatorToWindows(this.solutionPath) + '" /verbosity:m /nologo';
    this.generateDotNetDeploymentScript('deploy.batch.aspnet.website.template', msbuildArguments, _);
  } else {
    // Basic website
    log.info('Generating deployment script for Web Site');

    var packageJsonFilePath = path.join(this.absoluteSitePath, 'package.json');
    if (fs.existsSync(packageJsonFilePath)) {
      // On package.json, use node.template which will install npm packages
      this.generateBasicDeploymentScript('node.template', _);
    } else {
      // Otherwise it's a simple copy to deploy
      this.generateBasicDeploymentScript('basic.template', _);
    }
  }
}

ScriptGenerator.prototype.generateBasicDeploymentScript = function (templateFileName, _) {
  argNotNull(templateFileName, 'templateFileName');

  var lowerCaseScriptType = this.scriptType.toLowerCase();
  var fixedSitePath = this.scriptType === ScriptType.batch ? fixPathSeperatorToWindows(this.sitePath) : fixPathSeperatorToUnix(this.sitePath);
  var templateContent =
      getTemplatesContent([
          'deploy.' + lowerCaseScriptType + '.prefix.template',
          'deploy.' + lowerCaseScriptType + '.' + templateFileName,
          'deploy.' + lowerCaseScriptType + '.postfix.template'])
      .replace(/{SitePath}/g, fixedSitePath);

  this.writeDeploymentFiles(templateContent, _);
}

ScriptGenerator.prototype.generateDotNetDeploymentScript = function (templateFileName, msbuildArguments, _) {
  argNotNull(templateFileName, 'templateFileName');

  var templateContent =
        getTemplatesContent([
            'deploy.batch.prefix.template',
            'deploy.batch.aspnet.template',
            templateFileName,
            'deploy.batch.postfix.template'])
        .replace(/{MSBuildArguments}/g, msbuildArguments)
        .replace(/{SitePath}/g, fixPathSeperatorToWindows(this.sitePath));

  this.writeDeploymentFiles(templateContent, _);
}

function getTemplatesContent(fileNames) {
  var content = '';

  for (var i in fileNames) {
    content += getTemplateContent(fileNames[i]);
  }

  return content;
}

function fixPathSeperatorToWindows(pathStr) {
  return pathStr.replace(/\//g, '\\');
}

function fixPathSeperatorToUnix(pathStr) {
  return pathStr.replace(/\\/g, '/');
}

ScriptGenerator.prototype.writeDeploymentFiles = function (templateContent, _) {
  argNotNull(templateContent, 'templateContent');

  var deployScriptFileName;
  var deploymentCommand;
  if (this.scriptType == ScriptType.batch) {
    deployScriptFileName = 'deploy.cmd';
    deploymentCommand = deployScriptFileName;
  } else {
    deployScriptFileName = 'deploy.sh';
    deploymentCommand = 'bash ' + deployScriptFileName;
  }

  var deployScriptPath = path.join(this.repositoryRoot, deployScriptFileName);
  var deploymentFilePath = path.join(this.repositoryRoot, '.deployment');

  // Write the custom deployment script
  writeContentToFile(deployScriptPath, templateContent, _);

  if (!this.noDotDeployment) {
    // Write the .deployment file
    writeContentToFile(deploymentFilePath, '[config]\ncommand = ' + deploymentCommand, _);
  }

  log.info('Generated deployment script files');
}

function getTemplateContent(templateFileName) {
  return fs.readFileSync(getTemplatePath(templateFileName), 'utf8');
}

function getTemplatePath(fileName) {
  return path.join(templatesDir, fileName);
}

function writeContentToFile(path, content, _) {
  // TODO: Add check whether file exist
  if (fs.existsSync(path)) {
    if (!confirm('The file: "' + path + '" already exists\nAre you sure you want to overwrite it (y/n): ', _)) {
      // Do not overwrite the file
      return;
    }
  }

  fs.writeFile(path, content, _);
}

function argNotNull(arg, argName) {
  if (arg === null || arg === undefined) {
    throw new Error('The argument "' + argName + '" is null');
  }
}

exports.ScriptGenerator = ScriptGenerator;
