var fs = require('fs');
var path = require('path');

var fs = require('fs');
if (!fs.existsSync) {
    fs.existsSync = pathUtil.existsSync;
}

var templatesDir = __dirname;
var log = { info: function () { } };

exports.generateDeploymentScript = function (repositoryRoot, projectType, projectPath, solutionPath, scriptType, logger) {
    argNotNull(repositoryRoot, "repositoryRoot");
    argNotNull(projectType, "projectType");
    argNotNull(scriptType, "scriptType");

    scriptType = scriptType.toUpperCase();
    if (scriptType != "BATCH" && scriptType != "BASH") {
        throw new Error("Script type should be either batch or bash");
    }

    log = logger || log;

    if (projectPath) {
        if (!isPathSubDir(repositoryRoot, projectPath)) {
            throw new Error("The project file path should be a sub-directory of the repository root");
        }

        log.info('Project file path: .' + path.sep + path.relative(repositoryRoot, projectPath));
    }
    if (solutionPath) {
        if (!isPathSubDir(repositoryRoot, solutionPath)) {
            throw new Error("The solution file path should be a sub-directory of the repository root");
        }

        log.info('Solution file path: .' + path.sep + path.relative(repositoryRoot, solutionPath));
    }

    projectType = projectType.toUpperCase();
    if (projectType === "WAP") {
        generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath, scriptType);
    }
    else if (projectType === "WEBSITE") {
        generateWebSiteDeploymentScript(repositoryRoot, solutionPath, scriptType);
    }
    else if (projectType === "NODE") {
        generateNodeDeploymentScript(repositoryRoot, scriptType);
    }
    else if (projectType === "BASIC") {
        if (solutionPath) {
            throw new Error("Solution path is not supported with this website type");
        }
        generateWebSiteDeploymentScript(repositoryRoot, solutionPath, scriptType);
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

function generateNodeDeploymentScript(repositoryRoot, scriptType) {
    argNotNull(repositoryRoot, "repositoryRoot");

    createIisNodeWebConfigIfNeeded(repositoryRoot);

    generateBasicDeploymentScript("node.template", scriptType);
}

function getNodeStartFile(repositoryRoot) {
    var nodeStartFiles = ["server.js", "app.js"];

    for (var i in nodeStartFiles) {
        var nodeStartFilePath = path.join(repositoryRoot, nodeStartFiles[i]);
        // TODO: Change to async and add retry
        if (fs.existsSync(nodeStartFilePath)) {
            return nodeStartFilePath;
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
            webConfigContent.replace("{NodeStartFile}", nodeStartFilePath);
        writeContentToFile(webConfigPath, webConfigContent);
    }
}

function generateWapDeploymentScript(repositoryRoot, projectPath, solutionPath, scriptType) {
    argNotNull(repositoryRoot, "repositoryRoot");
    argNotNull(projectPath, "projectPath");

    if (scriptType != "BATCH") {
        throw new Error("Only batch script files are supported for .NET Web Application");
    }

    log.info('Generating deployment script for .NET Web Application');

    var relativeProjectPath = path.relative(repositoryRoot, projectPath);
    var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);

    var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + relativeProjectPath + "\" /nologo /verbosity:m /t:pipelinePreDeployCopyAllFilesToOneFolder /p:_PackageTempDir=\"%DEPLOYMENT_TEMP%\";AutoParameterizationWebConfigConnectionStrings=false;Configuration=Release";
    if (solutionPath != null) {
        msbuildArguments += " /p:SolutionDir=\"%DEPLOYMENT_SOURCE%\\" + relativeSolutionPath + "\"";
    }

    generateDotNetDeploymentScript("deploy.batch.aspnet.wap.template", msbuildArguments);
}

function generateWebSiteDeploymentScript(repositoryRoot, solutionPath, scriptType) {
    if (solutionPath) {
        // Solution based website (.NET)
        log.info('Generating deployment script for .NET Web Site');

        if (scriptType != "BATCH") {
            throw new Error("Only batch script files are supported for .NET Web Site");
        }

        var relativeSolutionPath = path.relative(repositoryRoot, solutionPath);

        var msbuildArguments = "\"%DEPLOYMENT_SOURCE%\\" + relativeSolutionPath + "\" /verbosity:m /nologo";
        generateDotNetDeploymentScript("deploy.batch.aspnet.website.template", msbuildArguments);
    }
    else {
        // Basic website
        generateBasicDeploymentScript("basic.template", scriptType);
    }
}

function generateBasicDeploymentScript(templateFileName, scriptType) {
    argNotNull(templateFileName, "templateFileName");

    log.info('Generating deployment script for Web Site');

    var lowerCaseScriptType = scriptType.toLowerCase();
    var templateContent =
        getTemplatesContent([
            "deploy." + lowerCaseScriptType + ".prefix.template",
            "deploy." + lowerCaseScriptType + "." + templateFileName,
            "deploy." + lowerCaseScriptType + ".postfix.template"]);

    writeDeploymentFiles(templateContent, scriptType);
}

function generateDotNetDeploymentScript(templateFileName, msbuildArguments) {
    argNotNull(templateFileName, "templateFileName");

    var templateContent = getTemplatesContent(["deploy.batch.prefix.template", "deploy.batch.aspnet.template", templateFileName, "deploy.batch.postfix.template"]);
    templateContent =
        templateContent.replace("{MSBuildArguments}", msbuildArguments);

    writeDeploymentFiles(templateContent, "BATCH");
}

function getTemplatesContent(fileNames) {
    var content = "";

    for (var i in fileNames) {
        content += getTemplateContent(fileNames[i]);
    }

    return content;
}

function writeDeploymentFiles(templateContent, scriptType) {
    argNotNull(templateContent, "templateContent");

    var deployScriptFileName;
    var deploymentCommand;
    if (scriptType == "BATCH") {
        deployScriptFileName = "deploy.cmd";
        deploymentCommand = deployScriptFileName;
    }
    else {
        deployScriptFileName = "deploy.sh";
        deploymentCommand = "sh --login " + deployScriptFileName;
    }

    // Write the custom deployment script
    writeContentToFile(deployScriptFileName, templateContent);

    // Write the .deployment file
    writeContentToFile(".deployment", "[config]\ncommand = " + deploymentCommand);

    log.info("Generated deployment script (" + deployScriptFileName + " and .deployment)");
}

function getTemplateContent(templateFileName) {
    return fs.readFileSync(getTemplatePath(templateFileName), "utf8");
}

function getTemplatePath(fileName) {
    return path.join(templatesDir, fileName);
}

function writeContentToFile(path, content) {
    // TODO: Add check whether file exist
    fs.writeFileSync(path, content);
}

function argNotNull(arg, argName) {
    if (arg === null || arg === undefined) {
        throw new Error("The argument '" + argName + "' is null");
    }
}
