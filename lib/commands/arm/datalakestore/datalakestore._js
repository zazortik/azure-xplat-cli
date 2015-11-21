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
var util = require('util');
var fs = require('fs');
var profile = require('../../../util/profile');
var utils = require('../../../util/utils');
var tagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;
var dataLakeStoreUtils = require('./datalakestore.utils');

exports.init = function (cli) {
  var log = cli.output;
  var withProgress = cli.interaction.withProgress.bind(cli.interaction);

  // This includes the following three categories:
  // Account Management (category of 'Account')
  // FileSystem Management (category of 'FileSystem')
  // FileSystem Permissions Management (category of 'Permissions')
  var dataLakeCommands = cli.category('datalake')
    .description($('Commands to manage your Data Lake objects')); 
  
  var dataLakeStoreCommands = dataLakeCommands.category('store')
    .description($('Commands to manage your Data Lake Storage objects'));
  
  var dataLakeStoreFileSystem = dataLakeStoreCommands.category('filesystem')
    .description($('Commands to manage your Data Lake Storage FileSystem'));
  
  dataLakeStoreFileSystem.command('list [accountName] [path]')
    .description($('Lists the contents of the specified path (files and folders).'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to list (e.g. /someFolder or /someFolder/someNestedFolder)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      var parameters = {
        top: 100 // we will always return the top 100 file entries in the path. In the future this should change to have a next link to return everything.
      };
      
      var fileStatuses = client.fileSystem.listFileStatus(path, accountName, parameters, _).fileStatuses.fileStatus;
      dataLakeStoreUtils.formatOutputList(cli, log, options, fileStatuses);
    });
    
    dataLakeStoreFileSystem.command('show [accountName] [path]')
    .description($('Gets the specified Data Lake Store file or folder details'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      var fileStatus = client.fileSystem.getFileStatus(path, accountName, _).fileStatus;
      dataLakeStoreUtils.formatOutput(cli, log, options, fileStatus);
    });
    
    dataLakeStoreFileSystem.command('delete [accountName] [path] [recurse]')
    .description($('deletes the specified Data Lake Store file or folder, with the option for recursive delete (if the folder has contents)'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-r --recurse', $('optionally indicates that this should be a recursive delete, which will delete a folder and all contents underneath it.'))
    .option('-q --quiet', $('optionally indicates the delete should be immediately performed with no confirmation or prompting. Use carefully.'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, recurse, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the file or folder at path: %s? [y/n] '), path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(!recurse) {
        recurse = false;
      }
      else {
        recurse = true;
      }
      
      client.fileSystem.deleteMethod(path, accountName, recurse, _);
      log.info($('Successfully deleted the item at path: ' + path));
    });
    
    dataLakeStoreFileSystem.command('create [accountName] [path] [value] [folder] [force]')
    .description($('Creates the specified folder or file, with the option to include content in file creation.'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to add content to (e.g. /someFolder/someFile.txt)'))
    .option('-v --value <value>', $('optional indicates the contents (as a string) to create the file with. NOTE: This parameter cannot be specified with --folder (-d)'))
    .option('-d --folder', $('optionally specify that the item being created is a folder, not a file. If this is not specified, a file will be created. NOTE: This parameter cannot be specified with --encoding (-e) or --value (-v)'))
    .option('-f --force', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, value, folder, force, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if((value && folder)) {
        throw new Error($('--folder cannot be specified with --value'));
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var clientOptions = {
        disableLogFilter: true
      };
      
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription, clientOptions);
      
      if(folder) {
        var result = client.fileSystem.mkdirs(path, accountName, null, _).operationResult;
        if (result !== true) { // we pass in null for permissions because permission setting is not supported in public preview.
          throw new Error($('Failed to create the desired directory!'));
        }
      }
      else {
        var parameters = {};
        
        if(force) {
          parameters.overwrite = true;
        }
        else {
          parameters.overwrite = false;
        }
        
        parameters.permission = null;
        withProgress(util.format($('Creating file %s'), path),
        function (log, _) {
          if (!value) {
            value = '';
          }
          client.fileSystem.directCreate(path, accountName, value, parameters, _);
        }, _);
      }
      
      log.info($('Successfully created the specified item at path:  ' + path));
    });
  
  dataLakeStoreFileSystem.command('import [accountName] [path] [destination] [force]')
    .description($('Uploads the specified the specified file, to the target destination in an Azure Data Lake. NOTE: Only text files are supported by this command at present.'))
    .usage('[options] <accountName> <path> <destination>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full local path to the file to import (e.g. /someFolder/someFile.txt or C:\somefolder\someFile.txt)'))
    .option('-d --destination <destination>', $('the full path in the Data Lake Store where the file should be imported to (e.g. /someFolder/someFile.txt'))
    .option('-f --force', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, destination, force, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!destination) {
        return cli.missingArgument('destination');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var clientOptions = {
        disableLogFilter: true
      };
      
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription, clientOptions);
      
      var parameters = {};
      
      if(force) {
        parameters.overwrite = true;
      }
      else {
        parameters.overwrite = false;
      }
      
      parameters.permission = null;
      
      var fileStats = fs.stat(path, _);
      if(fileStats.isDirectory()){
          throw new Error($('Cannot import directories, please specify a valid file path'));
      }
      
      withProgress(util.format($('Uploading file %s to the Data Lake Store location: %s'), path, destination),
      function (log, _) {
        var fileSizeInBytes = fileStats.size;
        var maxBytesToRead = 4 * 1024 * 1024; // 4mb
        
        var fileHandle = fs.open(path, 'r', _);
        try {
          var offset = 0;
          while(offset < fileSizeInBytes ) {
            var bytesToRead = maxBytesToRead;
            if(offset + maxBytesToRead > fileSizeInBytes) {
              bytesToRead = fileSizeInBytes - offset;
            }
            
            var buffer = new Buffer(bytesToRead);
            fs.read(fileHandle, buffer, 0, bytesToRead, offset, _);
            
            if(offset === 0) {
              client.fileSystem.directCreate(destination, accountName, buffer, parameters, _);
            }
            else {
              client.fileSystem.directAppend(destination, accountName, buffer, null, _);
            }
            
            offset += bytesToRead;
          }
        }
        finally {
          fs.close(fileHandle);
        }
      }, _);

      log.info($('Successfully created the specified item at path:  ' + destination));
    });
  
  dataLakeStoreFileSystem.command('concat [accountName] [paths] [destination] [force]')
    .description($('Concatenates the specified list of files into the specified destination file.'))
    .usage('[options] <accountName> <paths> <destination>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --paths <paths>', $('a comma seperated list of full paths to concatenate (e.g. \'/someFolder/someFile.txt,/somefolder/somefile2.txt,/anotherFolder/newFile.txt\')'))
    .option('-d --destination <destination>', $('specify the target file that all of the files in --paths should be concatenated into (e.g /someFolder/targetFile.txt)'))
    .option('-f --force', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, paths, destination, force, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!paths) {
        return cli.missingArgument('paths');
      }
      
      if (!destination) {
        return cli.missingArgument('destination');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(force) {
        try {
          var fileStatus = client.fileSystem.getFileStatus(destination, accountName, _).fileStatus;
          if (fileStatus.type.toLowerCase() === 'file') {
            client.fileSystem.deleteMethod(destination, accountName, false, _);
          }
          else {
            throw new Error($('Cannot forcibly concatenate files into a path that is an existing directory. Please use the delete command to remove the directory and try again.'));
          }
        }
        catch (err) {
          // do nothing since this means the file does not exist and that is fine
        }
      }
      
      var pathsBuf = new Buffer('sources=' + paths);
      withProgress(util.format($('Concatenating specified files into target location: %s'), destination),
        function (log, _) {
          client.fileSystem.msConcat(destination, accountName, pathsBuf, false, _);
      }, _);
      log.info($('Successfully concatenated the file list into the specified item at path:  ' + destination));
    });
  
  dataLakeStoreFileSystem.command('move [accountName] [path] [destination] [force]')
    .description($('Moves (renames) the specified file or folder into the specified destination file or folder.'))
    .usage('[options] <accountName> <path> <destination>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the path to the file or folder to move (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-d --destination <destination>', $('specify the target location to move the file or folder to'))
    .option('-f --force', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, destination, force, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('paths');
      }
      
      if (!destination) {
        return cli.missingArgument('destination');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(force) {
        try {
          client.fileSystem.deleteMethod(destination, accountName, true, _);
        }
        catch (err) {
          // do nothing since this means the file does not exist and that is fine
        }
      }
      
      var response = client.fileSystem.rename(path, accountName, destination, _);
      if (!response.operationResult) {
        throw new Error($('Failed to move source: ' + path + ' to destination: ' + destination + '. Please ensure the file or folder exists at the source and that the destination does not or force was used.'));
      }
      log.info($('Successfully moved the file or folder to: ' + destination));
    });
  
  dataLakeStoreFileSystem.command('addcontent [accountName] [path] [value]')
    .description($('Appends the specified content to the end of the Data Lake Store file path specified.'))
    .usage('[options] <accountName> <path> <value>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to add content to (e.g. /someFolder/someFile.txt)'))
    .option('-v --value <value>', $('the contents to append to the file'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, value, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!value) {
        return cli.missingArgument('value');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      var clientOptions = {
        disableLogFilter: true
      };
      
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription, clientOptions);
      withProgress(util.format($('Adding specified content to file %s'), path),
      function (log, _) {
        client.fileSystem.directAppend(path, accountName, value, null, _);
      }, _);
      log.info($('Successfully appended content at the specified path:  ' + path));
    });
  
  dataLakeStoreFileSystem.command('export [accountName] [path] [destination] [force]')
    .description($('Downloads the specified file to the target location. NOTE: Only text files are supported by this command at present.'))
    .usage('[options] <accountName> <path> <destination>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path in the Data Lake Store where the file should be imported to (e.g. /someFolder/someFile.txt'))
    .option('-d --destination <destination>', $('the full local path to the file to import (e.g. /someFolder/someFile.txt or C:\somefolder\someFile.txt)'))
    .option('-f --force', $('optionally indicates that the file being created can overwrite the file at path if it already exists (default is false).'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, destination, force, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!destination) {
        return cli.missingArgument('destination');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      var maxBytesToRead = 4 * 1024 * 1024; //4MB
      var fileStatus = client.fileSystem.getFileStatus(path, accountName, _).fileStatus;
      
      withProgress(util.format($('Downloading file %s to the specified location: %s'), path, destination),
      function (log, _) {
        var fileSizeInBytes = fileStatus.length;
        var fileHandle;
        if(force) {
          fileHandle = fs.open(destination, 'w', _);
        }
        else {
          try {
            fileHandle = fs.open(destination, 'wx', _);
          }
          catch (err){
            throw new Error($('The file at path: ' + destination + ' already exists. Please use the --force option to overwrite this file. Actual error reported: ' + err ));
          }
        }
        try {
          var offset = 0;
          while(offset < fileSizeInBytes ) {
            var bytesToRead = maxBytesToRead;
            if(offset + maxBytesToRead > fileSizeInBytes) {
              bytesToRead = fileSizeInBytes - offset;
            }
            
            var parameters = {
              length: bytesToRead,
              offset: offset
            };
            
            var response = client.fileSystem.directOpen(path, accountName, parameters, _);
            fs.write(fileHandle, new Buffer(response.fileContents), 0, bytesToRead, offset, _);
            offset += bytesToRead;
          }
        }
        catch (err) {
          log.info(err);
        }
        finally {
          fs.close(fileHandle);
        }
      }, _);
      
      log.info($('Successfully downloaded the specified item at path:  ' + path +  ' to local path: ' + destination));
    });
  
  dataLakeStoreFileSystem.command('read [accountName] [path] [length] [offset]')
    .description($('Previews the specified Data Lake Store file starting at index 0 (or the specified offset) until the length is reached, displaying the results to the console.'))
    .usage('[options] <accountName> <path> <length>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to download (e.g. /someFolder/someFile.txt)'))
    .option('-l --length <length>', $('the length, in bytes, to read from the file'))
    .option('-o --offset <offset>', $('the optional offset to begin reading at (default is 0)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, length, offset, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!length) {
        return cli.missingArgument('length');
      }
      
      if(offset && offset < 0) {
        throw new Error($('--offset must be greater than or equal to 0. Value passed in: ' + offset));
      }
      
      var parameters = {
        length: length
      };
      
      if(offset) {
        parameters.offset = offset;
      }
      else {
        parameters.offset = 0;
      }
      
      
      var subscription = profile.current.getSubscription(options.subscription);
      var response;
      withProgress(util.format($('Previewing contents of file %s'), path),
      function (log, _) {
        var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
        response = client.fileSystem.directOpen(path, accountName, parameters, _);
      }, _);
      
      log.data(response.fileContents);
    });
  
  var dataLakeStoreFileSystemPermissions = dataLakeStoreCommands.category('permissions')
    .description($('Commands to manage your Data Lake Storage FileSystem Permissions'));
 
  dataLakeStoreFileSystemPermissions.command('show [accountName] [path]')
    .description($('Gets the specified Data Lake Store folder ACL'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      var aclStatus = client.fileSystem.getAclStatus(path, accountName, _).aclStatus;
      dataLakeStoreUtils.formatOutput(cli, log, options, aclStatus);
    });
 
  dataLakeStoreFileSystemPermissions.command('delete [accountName] [path] [defaultAcl]')
    .description($('Deletes the entire ACL associated with a folder'))
    .usage('[options] <accountName> <path>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-d --defaultAcl', $('optionally indicates that the default ACL should be removed instead of the regular ACL. Default is false.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, defaultAcl, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake Store ACLs for account %s at path %s? [y/n] '), accountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(defaultAcl) {
        client.fileSystem.removeDefaultAcl(path, accountName, _);  
      }
      else {
        client.fileSystem.removeAcl(path, accountName, _);
      }
      log.info($('Successfully removed the specified ACL'));
    });
    
  var dataLakeStoreFileSystemPermissionsEntries = dataLakeStoreFileSystemPermissions.category('entry')
    .description($('Commands to manage your Data Lake Storage FileSystem granular permissions entries'));
    
  dataLakeStoreFileSystemPermissionsEntries.command('delete [accountName] [path] [aclEntries]')
    .description($('deletes the specific ACE entry or entries from the path'))
    .usage('[options] <accountName> <path> <aclEntries>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACEs from (e.g. /someFolder)'))
    .option('-a --aclEntries <aclEntries>', $('a comma delimited list of the fully qualified ACE entry or entries to delete in the format [default:]<user>|<group>:<object Id> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a\')'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, aclEntries, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclEntries) {
        return cli.missingArgument('aclEntries');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake Store ACL entries: %s for account %s at path %s? [y/n] '), aclEntries, accountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.removeAclEntries(path, accountName, aclEntries, _);
      log.info($('Successfully removed the specified ACL entries'));
    });
    
  dataLakeStoreFileSystemPermissionsEntries.command('set [accountName] [path] [aclEntries]')
    .description($('sets the specified Data Lake Store folder ACE entry or entries'))
    .usage('[options] <accountName> <path> <aclEntries>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to set ACEs on (e.g. /someFolder)'))
    .option('-a --aclEntries <aclEntries>', $('a comma delimited list of the fully qualified ACE entries to set in the format [default:]<user>|<group>:<object Id>:<permissions> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a:r-x\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a:rwx\')'))
    .option('-q, --quiet', $('quiet mode (do not ask for overwrite confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, aclEntries, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclEntries) {
        return cli.missingArgument('aclEntries');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Potentially overwrite existing Data Lake Store ACL entries: %s for account %s at path %s? [y/n] '), aclEntries, accountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.modifyAclEntries(path, accountName, aclEntries, _);
      log.info($('Successfully set the specified ACL entries'));
    });
    
  dataLakeStoreFileSystemPermissions.command('set [accountName] [path] [aclSpec]')
    .description($('sets the specified Data Lake Store folder ACL (overwriting the previous ACL entries)'))
    .usage('[options] <accountName> <path> <aclSpec>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-a --aclSpec <aclSpec>', $('a comma delimited list of fully qualified ACL entries to set in the format [default:]<user>|<group>:<object Id>:<permissions> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a:r-x\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a:rwx\'). This list must also include default entries (no object ID in the middle)'))
    .option('-q, --quiet', $('quiet mode (do not ask for overwrite confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, path, aclSpec, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclSpec) {
        return cli.missingArgument('aclSpec');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Overwrite existing Data Lake Store ACL with the following ACL: %s for account %s at path %s? [y/n] '), aclSpec, accountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.setAcl(path, accountName, aclSpec, _);
      log.info($('Successfully set the ACL'));
    });
    
  var dataLakeStoreAccount = dataLakeStoreCommands.category('account')
    .description($('Commands to manage your Data Lake Storage accounts'));
 
  dataLakeStoreAccount.command('list [resource-group]')
    .description($('List all Data Lake Store accounts available for your subscription or subscription and resource group'))
    .usage('[options]')
    .option('-g --resource-group <resource-group>', $('the optional resource group to list the accounts in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var accounts = listAllDataLakeStoreAccounts(subscription, resourceGroup, _);
      dataLakeStoreUtils.formatOutputList(cli, log, options, accounts);
    });

  dataLakeStoreAccount.command('show [accountName] [resource-group]')
    .description($('Shows a Data Lake Store Account based on account name'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to list the accounts in'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if(!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      var dataLakeStoreAccount = client.dataLakeStoreAccount.get(resourceGroup, accountName, _).dataLakeStoreAccount;

      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);
    });
    
  dataLakeStoreAccount.command('delete [accountName] [resource-group]')
    .description($('Deletes a Data Lake Store Account based on account name'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('the Data Lake Store account name'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to force the command to find the Data Lake Store account to delete in.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, options, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake Store Account %s? [y/n] '), accountName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if(!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      var response = client.dataLakeStoreAccount.deleteMethod(resourceGroup, accountName, _);
      
      if (response.status !== 'Succeeded') {
        throw new Error(util.format($('Data Lake Store account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      log.info($('Successfully deleted the specified Data Lake Store account.'));
    });
    
  dataLakeStoreAccount.command('create [accountName] [location] [resource-group] [defaultGroup]')
    .description($('Creates a Data Lake Store Account'))
    .usage('[options] <accountName> <location> <resource-group>')
    .option('-n --accountName <accountName>', $('The Data Lake Store account name to create'))
    .option('-l --location <location>', $('the location the Data Lake Store account will be created in. Valid values are: North Central US, South Central US, Central US, West Europe, North Europe, West US, East US, East US 2, Japan East, Japan West, Brazil South, Southeast Asia, East Asia, Australia East, Australia Southeast'))
    .option('-g --resource-group <resource-group>', $('the resource group to create the account in'))
    .option('-d --defaultGroup <defaultGroup>', $('the optional default permissions group to add to the account when created'))
    .option('-t --tags <tags>', $('Tags to set to the the Data Lake Store account. Can be mutliple. ' +
            'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, location, resourceGroup, defaultGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var tags = {};
      tags = tagUtils.buildTagsParameter(tags, options);
      var dataLakeStoreAccount = createOrUpdateDataLakeStoreAccount(subscription, accountName, resourceGroup, location, defaultGroup, tags, _);
      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);
    });
  
  dataLakeStoreAccount.command('set [accountName] [resource-group] [defaultGroup]')
    .description($('Updates the properties of an existing Data Lake Store Account'))
    .usage('[options] <accountName>')
    .option('-n --accountName <accountName>', $('The Data Lake Store account name to update with new tags and/or default permissions group'))
    .option('-g --resource-group <resource-group>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-d --defaultGroup <defaultGroup>', $('the optional default permissions group to set in the existing account'))
    .option('-t --tags <tags>', $('Tags to set to the Data Lake Store account. Can be mutliple. ' +
            'In the format of \'name=value\'. Name is required and value is optional. For example, -t tag1=value1;tag2'))
    .option('--no-tags', $('remove all existing tags'))
    .option('-s, --subscription <id>', $('the subscription identifier'))
    .execute(function (accountName, resourceGroup, defaultGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if (!resourceGroup) {
        resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, accountName, _);
      }
      
      var dataLakeStoreAccount = client.dataLakeStoreAccount.get(resourceGroup, accountName, _).dataLakeStoreAccount;
      
      if (!defaultGroup) {
        defaultGroup = dataLakeStoreAccount.properties.defaultGroup;
      }
      
      var tags = {};
      if(!options.tags && !options.no-tags) {
        tags = dataLakeStoreAccount.tags;
      }
      else {
        tags = tagUtils.buildTagsParameter(tags, options);
      }
      
      dataLakeStoreAccount  = createOrUpdateDataLakeStoreAccount(subscription, accountName, resourceGroup, dataLakeStoreAccount.location, defaultGroup, tags, _);
      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);     
    });
    
  function createOrUpdateDataLakeStoreAccount(subscription, accountName, resourceGroup, location, defaultGroup, tags, _) {
      if (!accountName) {
        return cli.missingArgument('accountName');
      }
      if (!location) {
        return cli.missingArgument('location');
      }
      if (!resourceGroup) {
        return cli.missingArgument('resourceGroup');
      }
      
      var client = utils.createDataLakeStoreManagementClient(subscription);
      var create = false;
      try {
        client.dataLakeStoreAccount.get(resourceGroup, accountName, _);
      }
      catch(err){
        create = true;
      }
      
      var accountParams = {
        dataLakeStoreAccount: {
          name: accountName,
          location: location,
          properties: {
            defaultGroup: defaultGroup
          },
          tags: tags
        }
      };
      var response;
      if(create) {
        response = client.dataLakeStoreAccount.create(resourceGroup, accountParams, _);
      }
      else {
        response = client.dataLakeStoreAccount.update(resourceGroup, accountParams, _);
      }
      
      if (response.status !== 'Succeeded') {
        throw new Error(util.format($('Data Lake Store account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      return client.dataLakeStoreAccount.get(resourceGroup, accountName, _).dataLakeStoreAccount;
  }
  
  function listAllDataLakeStoreAccounts(subscription, resourceGroup, _) {
    var client = utils.createDataLakeStoreManagementClient(subscription);
    var response = client.dataLakeStoreAccount.list(resourceGroup, _);
    var accounts = response.value;
    while (response.nextLink) {
      response = client.dataLakeStoreAccount.listNext(response.nextLink);
      accounts.push.apply(accounts, response.value);
    }
    return accounts;
  }
  
  function getResrouceGroupByAccountName(subscription, resourceGroup, name, _) {
    var accounts = listAllDataLakeStoreAccounts(subscription, resourceGroup, _);
    for (var i = 0; i < accounts.length; i++) {
      if (accounts[i].name === name) {
        var acctId = accounts[i].id;
        var rgStart = acctId.indexOf('resourceGroups/') + ('resourceGroups/'.length);
        var rgEnd = acctId.indexOf('/providers/');
        return acctId.substring(rgStart, rgEnd);
      }
    }
    
    throw new Error($('Could not find account: ' + name + ' in any resource group in subscription: ' + subscription.name + ' with id: ' + subscription.id ));
  }
};
