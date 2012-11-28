var fs = require('fs');
var path = require('path');
var utils = require('../../utils');

if (!fs.existsSync) {
    fs.existsSync = pathUtil.existsSync;
}

var templatesDir = __dirname;
var log = { info: function () { } };
var confirm = function () { return false; };

exports.generateDeploymentScript = function (repositoryRoot, projectType, projectPath, solutionPath, sitePath, scriptType, logger, confirmFunc, _) {
    argNotNull(repositoryRoot, "repositoryRoot");
    argNotNull(projectType, "projectType");
    argNotNull(scriptType, "scriptType");
    argNotNull(sitePath, "sitePath");

    scriptType = scriptType.toUpperCase();
    if (scriptType != "BATCH" && scriptType != "BASH") {
        throw new Error("Script type should be either batch or bash");
    }

    log = logger || log;
    confirm = confirmFunc || confirm;

    if (projectPath) {
        if (!isPathSubDir(repositoryRoot, projectPath)) {
            throw new Error("The project file path should be a sub-directory of the repository root");
        }

        var relativeProjectPath = path.relative(repositoryRoot, projectPath);
        log.info('Project file path: .' + path.sep + relativeProjectPath);
    }

    if (solutionPath) {
        if (!isPathSubDir(repositoryRoot, solutionPath)) {
            throw new Error("The solution file path should be the same as repository root or a sub-directory of it.");
        }

        var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);
        log.info('Solution file path: .' + path.sep + relativeSolutionPath);
    }

    if (!isPathSubDir(repositoryRoot, sitePath)) {
        throw new Error("The site directory path should be the same as repository root or a sub-directory of it.");
    }

    var relativeSitePath = path.relative(repositoryRoot, sitePath);
    if (relativeSitePath) {
        relativeSitePath = path.sep + relativeSitePath;
        log.info('The site directory path: .' + relativeSitePath);
    }

    projectType = projectType.toUpperCase();
    if (projectType === "WAP") {
        generateWapDeploymentScript(repositoryRoot, relativeProjectPath, relativeSolutionPath, scriptType, relativeSitePath, _);
    }
    else if (projectType === "WEBSITE") {
        generateWebSiteDeploymentScript(repositoryRoot, relativeSolutionPath, scriptType, relativeSitePath, _);
    }
    else if (projectType === "NODE") {
        generateNodeDeploymentScript(repositoryRoot, scriptType, relativeSitePath, _);
    }
    else if (projectType === "BASIC") {
        if (solutionPath) {
            throw new Error("Solution path is not supported with this website type");
        }
        generateWebSiteDeploymentScript(repositoryRoot, relativeSolutionPath, scriptType, relativeSitePath, _);
    }
    else {
        throw new Error("Invalid project type received: " + projectType);
    }
}

function isPathSubDir(parentPath, childPath) {
    var relativePath = path.relative(parentPath, childPath);

    // The parent path is actually the parent of the child path if the result of path.relative:
    // a. Doesn't contain '..' at the start
    // b. Doesn't equal to the child path entirely
    return relativePath.indexOf('..') != 0
        && relativePath != path.resolve(childPath);
}

function generateNodeDeploymentScript(repositoryRoot, scriptType, sitePath, _) {
    argNotNull(repositoryRoot, "repositoryRoot");

    createIisNodeWebConfigIfNeeded(repositoryRoot);
    utils.copyIisNodeWhenServerJsPresent(log, repositoryRoot, _);

    generateBasicDeploymentScript("node.template", scriptType, repositoryRoot, sitePath, _);
}

function getNodeStartFile(repositoryRoot) {
    var nodeStartFiles = ["server.js", "app.js"];

    for (var i in nodeStartFiles) {
        var nodeStartFilePath = path.join(repositoryRoot, nodeStartFiles[i]);
        // TODO: Change to async and add retry
        if (fs.existsSync(nodeStartFilePath)) {
            return nodeStartFiles[i];
        }
    }

    return null;
}

function createIisNodeWebConfigIfNeeded(repositoryRoot) {
    var webConfigPath = path.join(repositoryRoot, "web.config");

    log.info('Generating deployment script for node.js Web Site');

    if (!fs.existsSync(webConfigPath)) {
        log.info("Creating Web.config to enable Node.js activation.");

        var nodeStartFilePath = getNodeStartFile(repositoryRoot);
        if (!nodeStartFilePath) {
            throw new Error("Missing server.js/app.js file which is required for a node.js site");
        }

        var webConfigContent = getTemplateContent("iisnode.config.template");
        webConfigContent =
            webConfigContent.replace(/{NodeStartFile}/g, nodeStartFilePath);
        writeContentToFile(webConfigPath, webConfigContent);
    }
}

function generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath, scriptType, sitePath, _) {
    argNotNull(repositoryRoot, "repositoryRoot");
    argNotNull(projectPath, "projectPath");

    if (scriptType != "BATCH") {
        throw new Error("Only batch script files are supported for .NET Web Application");
    }

    log.info('Generating deployment script for .NET Web Application');

    var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + projectPath + "\" /nologo /verbosity:m /t:pipelinePreDeployCopyAllFilesToOneFolder /p:_PackageTempDir=\"%DEPLOYMENT_TEMP%\";AutoParameterizationWebConfigConnectionStrings=false;Configuration=Release";
    if (solutionPath != null) {
        msbuildArguments += " /p:SolutionDir=\"%DEPLOYMENT_SOURCE%\\" + solutionPath + "\"";
    }

    generateDotNetDeploymentScript("deploy.batch.aspnet.wap.template", msbuildArguments, repositoryRoot, sitePath, _);
}

function generateWebSiteDeploymentScript(repositoryRoot, solutionPath, scriptType, sitePath, _) {
    if (solutionPath) {
        // Solution based website (.NET)
        log.info('Generating deployment script for .NET Web Site');

        if (scriptType != "BATCH") {
            throw new Error("Only batch script files are supported for .NET Web Site");
        }

        var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + solutionPath + "\" /verbosity:m /nologo";
        generateDotNetDeploymentScript("deploy.batch.aspnet.website.template", msbuildArguments, repositoryRoot, sitePath, _);
    }
    else {
        // Basic website
        generateBasicDeploymentScript("basic.template", scriptType, repositoryRoot, sitePath, _);
    }
}

function generateBasicDeploymentScript(templateFileName, scriptType, repositoryRoot, sitePath, _) {
    argNotNull(templateFileName, "templateFileName");

    log.info('Generating deployment script for Web Site');

    var lowerCaseScriptType = scriptType.toLowerCase();
    var templateContent =
        getTemplatesContent([
            "deploy." + lowerCaseScriptType + ".prefix.template",
            "deploy." + lowerCaseScriptType + "." + templateFileName,
            "deploy." + lowerCaseScriptType + ".postfix.template"])
        .replace(/{SitePath}/g, sitePath);

    writeDeploymentFiles(templateContent, scriptType, repositoryRoot, _);
}

function generateDotNetDeploymentScript(templateFileName, msbuildArguments, repositoryRoot, sitePath, _) {
    argNotNull(templateFileName, "templateFileName");

    var templateContent =
        getTemplatesContent([
            "deploy.batch.prefix.template",
            "deploy.batch.aspnet.template",
            templateFileName,
            "deploy.batch.postfix.template"])
        .replace(/{MSBuildArguments}/g, msbuildArguments)
        .replace(/{SitePath}/g, sitePath);

    writeDeploymentFiles(templateContent, "BATCH", repositoryRoot, _);
}

function getTemplatesContent(fileNames) {
    var content = "";

    for (var i in fileNames) {
        content += getTemplateContent(fileNames[i]);
    }

    return content;
}

function writeDeploymentFiles(templateContent, scriptType, repositoryRoot, _) {
    argNotNull(templateContent, "templateContent");

    var deployScriptFileName;
    var deploymentCommand;
    if (scriptType == "BATCH") {
        deployScriptFileName = "deploy.cmd";
        deploymentCommand = deployScriptFileName;
    }
    else {
        deployScriptFileName = "deploy.sh";
        deploymentCommand = "bash " + deployScriptFileName;
    }

    var deployScriptPath = path.join(repositoryRoot, deployScriptFileName);
    var deploymentFilePath = path.join(repositoryRoot, ".deployment");

    // Write the custom deployment script
    writeContentToFile(deployScriptPath, templateContent, _);

    // Write the .deployment file
    writeContentToFile(deploymentFilePath, "[config]\ncommand = " + deploymentCommand, _);

    log.info("Generated deployment script (" + deployScriptFileName + " and .deployment)");
}

function getTemplateContent(templateFileName) {
    return fs.readFileSync(getTemplatePath(templateFileName), "utf8");
}

function getTemplatePath(fileName) {
    return path.join(templatesDir, fileName);
}

function writeContentToFile(path, content, _) {
    // TODO: Add check whether file exist
    if (fs.existsSync(path)) {
        if (!confirm("The file: \"" + path + "\" already exists\nAre you sure you want to overwrite it (y/n): ", _)) {
            // Do not overwrite the file
            return;
        }
    }

    fs.writeFile(path, content, _);
}

function argNotNull(arg, argName) {
    if (arg === null || arg === undefined) {
        throw new Error("The argument '" + argName + "' is null");
    }
}
