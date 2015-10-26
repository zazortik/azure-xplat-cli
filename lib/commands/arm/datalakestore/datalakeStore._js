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
var $ = utils.getLocaleString;
var dataLakeStoreUtils = require('./dataLakeStore.utils');

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
  
  dataLakeStoreFileSystem.command('list [dataLakeStoreAccountName] [path]')
    .description($('Lists the contents of the specified path (files and folders).'))
    .usage('[options] <dataLakeStoreAccountName> <path>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to list (e.g. /someFolder or /someFolder/someNestedFolder)'))
    .execute(function (dataLakeStoreAccountName, path, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      var parameters = {
          top: 100 // we will always return the top 100 file entries in the path. In the future this should change to have a next link to return everything.
      };
      
      var fileStatuses = client.fileSystem.listFileStatus(path, dataLakeStoreAccountName, parameters, _).fileStatuses.fileStatus;
      dataLakeStoreUtils.formatOutputList(cli, log, options, fileStatuses);
    });
    
    dataLakeStoreFileSystem.command('show [dataLakeStoreAccountName] [path]')
    .description($('Gets the specified Data lake file or folder details'))
    .usage('[options] <dataLakeStoreAccountName> <path>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .execute(function (dataLakeStoreAccountName, path, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      var fileStatus = client.fileSystem.getFileStatus(path, dataLakeStoreAccountName, _).fileStatus;
      dataLakeStoreUtils.formatOutput(cli, log, options, fileStatus);
    });
    
    dataLakeStoreFileSystem.command('delete [dataLakeStoreAccountName] [path] [recurse]')
    .description($('deletes the specified Data lake file or folder, with the option for recursive delete (if the folder has contents)'))
    .usage('[options] <dataLakeStoreAccountName> <path>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-r --recurse <recurse>', $('optionally indicates that this should be a recursive delete, which will delete a folder and all contents underneath it.'))
    .option('-q --quiet <quiet>', $('optionally indicates the delete should be immediately performed with no confirmation or prompting. Use carefully.'))
    .execute(function (dataLakeStoreAccountName, path, recurse, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete the file or folder at path: %s? [y/n] '), path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(!recurse || recurse.toLowerCase() !== 'true') {
          recurse = false;
      }
      
      client.fileSystem.deleteMethod(path, dataLakeStoreAccountName, recurse, _);
      log.info($('Successfully deleted the item at path: ' + path));
    });
    
    dataLakeStoreFileSystem.command('create [dataLakeStoreAccountName] [path] [value] [folder] [force]')
    .description($('Creates the specified folder or file, with the option to include content in file creation.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <value>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to add content to (e.g. /someFolder/someFile.txt)'))
    .option('-v --value <value>', $('optional indicates the contents (as a string) to create the file with. NOTE: This parameter cannot be specified with --folder (-d)'))
    .option('-d --folder <folder>', $('optionally specify that the item being created is a folder, not a file. If this is not specified, a file will be created. NOTE: This parameter cannot be specified with --encoding (-e) or --value (-v)'))
    .option('-f --force <force>', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .execute(function (dataLakeStoreAccountName, path, value, folder, force, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if((value && folder)) {
          throw new Error($('--folder cannot be specified with --value'));
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var clientOptions = 
      {
          disableLogFilter: true
      };
      
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription, clientOptions);
      
      if(folder) {
          var result = client.fileSystem.mkdirs(path, dataLakeStoreAccountName, null, _).operationResult;
          log.info('value of result: ' + result);
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
            var response = client.fileSystem.internalBeginCreate(path, dataLakeStoreAccountName, parameters, _);
            client.fileSystem.create(response.location, value, _);
        }, _);
      }
      
      log.info($('Successfully created the specified item at path:  ' + path));
    });
  
  dataLakeStoreFileSystem.command('import [dataLakeStoreAccountName] [path] [destination] [force]')
    .description($('Uploads the specified the specified file, to the target destination in an Azure Data Lake.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <destination>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full local path to the file to import (e.g. /someFolder/someFile.txt or C:\somefolder\someFile.txt)'))
    .option('-d --destination <destination>', $('the full path in the Data Lake where the file should be imported to (e.g. /someFolder/someFile.txt'))
    .option('-f --force', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .execute(function (dataLakeStoreAccountName, path, destination, force, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!destination) {
        return cli.missingArgument('destination');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var clientOptions = 
      {
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
      
      withProgress(util.format($('Uploading file %s to the Data Lake location: %s'), path, destination),
      function (log, _) {
          var fileSizeInBytes = fileStats.size;
          var maxBytesToRead = 4 * 1024 * 1024; // 4mb
          
          var response;
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
                      response = client.fileSystem.internalBeginCreate(destination, dataLakeStoreAccountName, parameters, _);
                      client.fileSystem.create(response.location, buffer, _);
                  }
                  else {
                     response = client.fileSystem.internalBeginAppend(destination, dataLakeStoreAccountName, null, _);
                     client.fileSystem.append(response.location, buffer, _);
                  }
                  
                  offset += bytesToRead;
              }
          }
          finally {
              fs.close(fileHandle);
          }
      }, _);
      
      /*
      var stream = fs.createReadStream(path);
      var response = stream.on('readable', function(_){
          var eachChunk;
          log.info(stream.read());
          
          log.info(eachChunk.length);
          var chunk;
          while(null !== (chunk = stream.read()) && eachChunk.length < maxBytesToRead) {
            eachChunk += chunk;
            log.info(eachChunk.length);
          }
          
          var response = client.fileSystem.internalBeginCreate(destination, dataLakeStoreAccountName, parameters, _);
          client.fileSystem.create(response.location, eachChunk, _);
          
          eachChunk = stream.read();
          while(eachChunk !== null) {
              while(null !== (chunk = stream.read()) && eachChunk.length < maxBytesToRead) {
                  eachChunk += chunk
              }
              var response = client.fileSystem.internalBeginAppend(destination, dataLakeStoreAccountName, null, _);
              client.fileSystem.append(response.location, chunk, _);
              eachChunk = stream.read();
          }
      }, _);
      */
      
      log.info($('Successfully created the specified item at path:  ' + destination));
    });
  
  dataLakeStoreFileSystem.command('concat [dataLakeStoreAccountName] [paths] [destination] [force]')
    .description($('Concatenates the specified list of files into the specified destination file.'))
    .usage('[options] <dataLakeStoreAccountName> <paths> <destination> <force>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --paths <paths>', $('a comma seperated list of full paths to concatenate (e.g. \'/someFolder/someFile.txt,/somefolder/somefile2.txt,/anotherFolder/newFile.txt\')'))
    .option('-d --destination <destination>', $('specify the target file that all of the files in --paths should be concatenated into (e.g /someFolder/targetFile.txt)'))
    .option('-f --force <force>', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .execute(function (dataLakeStoreAccountName, paths, destination, force, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
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
            var fileStatus = client.fileSystem.getFileStatus(destination, dataLakeStoreAccountName, _).fileStatus;
            if (fileStatus.type.toLowerCase() === 'file') {
              client.fileSystem.deleteMethod(destination, dataLakeStoreAccountName, false, _);
            }
            else {
              throw new Error($('Cannot forcibly concatenate files into a path that is an existing directory. Please use the delete command to remove the directory and try again.'));
            }
          }
          catch (err) {
              // do nothing since this means the file does not exist and that is fine
          }
      }
      
      paths = 'sources=' + paths;
      withProgress(util.format($('Concatenating specified files into target location: %s'), destination),
        function (log, _) {
          client.fileSystem.msConcat(destination, dataLakeStoreAccountName, paths, _);
      }, _);
      log.info($('Successfully concatenated the file list into the specified item at path:  ' + destination));
    });
  
  dataLakeStoreFileSystem.command('move [dataLakeStoreAccountName] [path] [destination] [force]')
    .description($('Concatenates the specified list of files into the specified destination file.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <destination> <force>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the path to the file or folder to move (e.g. /someFolder or /someFolder/someFile.txt)'))
    .option('-d --destination <destination>', $('specify the target location to move the file or folder to'))
    .option('-f --force <force>', $('optionally indicates that the file or folder being created can overwrite the file or folder at path if it already exists (default is false). \'true\' must be passed in for the overwrite to work'))
    .execute(function (dataLakeStoreAccountName, path, destination, force, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
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
            client.fileSystem.deleteMethod(destination, dataLakeStoreAccountName, true, _);
          }
          catch (err) {
              // do nothing since this means the file does not exist and that is fine
          }
      }
      
      var response = client.fileSystem.rename(path, dataLakeStoreAccountName, destination, _);
      if (!response.operationResult) {
          throw new Error($('Failed to move source: ' + path + ' to destination: ' + destination + '. Please ensure the file or folder exists at the source and that the destination does not or force was used.'));
      }
      log.info($('Successfully moved the file or folder to: ' + destination));
    });
  
  dataLakeStoreFileSystem.command('addcontent [dataLakeStoreAccountName] [path] [value]')
    .description($('Appends the specified content to the end of the Data Lake file path specified.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <value>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to add content to (e.g. /someFolder/someFile.txt)'))
    .option('-v --value <value>', $('the contents to append to the file'))
    .execute(function (dataLakeStoreAccountName, path, value, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!value) {
        return cli.missingArgument('value');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      
      var clientOptions = 
      {
          disableLogFilter: true
      };
      
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription, clientOptions);
      withProgress(util.format($('Adding specified content to file %s'), path),
      function (log, _) {
        var response = client.fileSystem.internalBeginAppend(path, dataLakeStoreAccountName, null, _);
        client.fileSystem.append(response.location, value, _);
      }, _);
      log.info($('Successfully appended content at the specified path:  ' + path));
    });
  
  dataLakeStoreFileSystem.command('export [dataLakeStoreAccountName] [path] [destination] [force]')
    .description($('Downloads the specified file to the target location.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <destination>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path in the Data Lake where the file should be imported to (e.g. /someFolder/someFile.txt'))
    .option('-d --destination <destination>', $('the full local path to the file to import (e.g. /someFolder/someFile.txt or C:\somefolder\someFile.txt)'))
    .option('-f --force', $('optionally indicates that the file being created can overwrite the file at path if it already exists (default is false).'))
    .execute(function (dataLakeStoreAccountName, path, destination, force, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
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
      var fileStatus = client.fileSystem.getFileStatus(path, dataLakeStoreAccountName, _).fileStatus;
      
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
                  
                  var response = client.fileSystem.internalBeginOpen(path, dataLakeStoreAccountName, parameters, _);
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
  
  dataLakeStoreFileSystem.command('read [dataLakeStoreAccountName] [path] [length] [offset]')
    .description($('Previews the specified Data Lake file starting at index 0 (or the specified offset) until the length is reached, outputting the results to the console.'))
    .usage('[options] <dataLakeStoreAccountName> <path> <length> <offset>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the file to download (e.g. /someFolder/someFile.txt)'))
    .option('-l --length <length>', $('the length, in bytes, to read from the file'))
    .option('-o --offset <offset>', $('the optional offset to begin reading at (default is 0)'))
    .execute(function (dataLakeStoreAccountName, path, length, offset, options, _) {
    if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
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
        response = client.fileSystem.internalBeginOpen(path, dataLakeStoreAccountName, parameters, _);
      }, _);
      
      log.data(response.fileContents);
    });
  
  var dataLakeStoreFileSystemPermissions = dataLakeStoreCommands.category('permissions')
    .description($('Commands to manage your Data Lake Storage FileSystem Permissions'));
 
 dataLakeStoreFileSystemPermissions.command('show [dataLakeStoreAccountName] [path]')
    .description($('Gets the specified Data lake folder ACL'))
    .usage('[options] <dataLakeStoreAccountName> <path>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder or file to get (e.g. /someFolder or /someFolder/someFile.txt)'))
    .execute(function (dataLakeStoreAccountName, path, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      var aclStatus = client.fileSystem.getAclStatus(path, dataLakeStoreAccountName, _).aclStatus;
      dataLakeStoreUtils.formatOutput(cli, log, options, aclStatus);
    });
 
 dataLakeStoreFileSystemPermissions.command('delete [dataLakeStoreAccountName] [path] [defaultAcl]')
    .description($('Deletes the entire ACL associated with a folder'))
    .usage('[options] <dataLakeStoreAccountName> <path> <default>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-d --defaultAcl', $('optionally indicates that the default ACL should be removed instead of the regular ACL. Default is false.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (dataLakeStoreAccountName, path, defaultAcl, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake ACLs for account %s at path %s? [y/n] '), dataLakeStoreAccountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      if(defaultAcl) {
        client.fileSystem.removeDefaultAcl(path, dataLakeStoreAccountName, _);  
      }
      else {
        client.fileSystem.removeAcl(path, dataLakeStoreAccountName, _);
      }
      log.info($('Successfully removed the specified ACL'));
    });
    
    dataLakeStoreFileSystemPermissions.command('deleteentry [dataLakeStoreAccountName] [path] [aclEntries]')
    .description($('Gets the specified Data lake file or folder details'))
    .usage('[options] <dataLakeStoreAccountName> <path> <aclEntries>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-a --aclEntries <aclEntries>', $('a comma delimited list of the fully qualified ACL entry to delete in the format [default:]<user>|<group>:<object Id> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a\')'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (dataLakeStoreAccountName, path, aclEntries, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclEntries) {
        return cli.missingArgument('aclEntries');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake ACL entries: %s for account %s at path %s? [y/n] '), aclEntries, dataLakeStoreAccountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.removeAclEntries(path, dataLakeStoreAccountName, aclEntries, _);
      log.info($('Successfully removed the specified ACL entries'));
    });
    
    dataLakeStoreFileSystemPermissions.command('setentry [dataLakeStoreAccountName] [path] [aclEntries]')
    .description($('sets the specified Data lake folder ACL entries'))
    .usage('[options] <dataLakeStoreAccountName> <path> <aclEntries>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-a --aclEntries <aclEntries>', $('a comma delimited list of the fully qualified ACL entries to set in the format [default:]<user>|<group>:<object Id>:<permissions> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a:r-x\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a:rwx\')'))
    .option('-q, --quiet', $('quiet mode (do not ask for overwrite confirmation)'))
    .execute(function (dataLakeStoreAccountName, path, aclEntries, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclEntries) {
        return cli.missingArgument('aclEntries');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Potentially overwrite existing Data Lake ACL entries: %s for account %s at path %s? [y/n] '), aclEntries, dataLakeStoreAccountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.modifyAclEntries(path, dataLakeStoreAccountName, aclEntries, _);
      log.info($('Successfully set the specified ACL entries'));
    });
    
    dataLakeStoreFileSystemPermissions.command('set [dataLakeStoreAccountName] [path] [aclSpec]')
    .description($('sets the specified Data lake folder ACL (overwriting the previous ACL entries)'))
    .usage('[options] <dataLakeStoreAccountName> <path> <aclSpec>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the Data Lake account name to execute the action on'))
    .option('-p --path <path>', $('the full path to the folder to remove ACLs from (e.g. /someFolder)'))
    .option('-a --aclSpec <aclSpec>', $('a comma delimited list of fully qualified ACL entries to set in the format [default:]<user>|<group>:<object Id>:<permissions> (e.g \'user:5546499e-795f-4f5f-b411-8179051f8b0a:r-x\' or \'default:group:5546499e-795f-4f5f-b411-8179051f8b0a:rwx\'). This list must also include default entries (no object ID in the middle)'))
    .option('-q, --quiet', $('quiet mode (do not ask for overwrite confirmation)'))
    .execute(function (dataLakeStoreAccountName, path, aclSpec, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!path) {
        return cli.missingArgument('path');
      }
      
      if (!aclSpec) {
        return cli.missingArgument('aclSpec');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Overwrite existing Data Lake ACL with the following ACL: %s for account %s at path %s? [y/n] '), aclSpec, dataLakeStoreAccountName, path), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreFileSystemManagementClient(subscription);
      
      client.fileSystem.setAcl(path, dataLakeStoreAccountName, aclSpec, _);
      log.info($('Successfully set the ACL'));
    });
    
  var dataLakeStoreAccount = dataLakeStoreCommands.category('account')
    .description($('Commands to manage your Data Lake Storage accounts'));
 
  dataLakeStoreAccount.command('list [resourceGroup]')
    .description($('List all Data Lake accounts available for your subscription or subscription and resource group'))
    .usage('[options] <resourceGroup>')
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (resourceGroup, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var accounts = listAllDataLakeStoreAccounts(subscription, resourceGroup, _);
      dataLakeStoreUtils.formatOutputList(cli, log, options, accounts);
    });

  dataLakeStoreAccount.command('show [dataLakeStoreAccountName] [resourceGroup]')
    .description($('Shows a Data Lake Account based on account name'))
    .usage('[options] <dataLakeStoreAccountName> <resourceGroup>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the dataLakeStoreAccount name'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to list the accounts in'))
    .execute(function (dataLakeStoreAccountName, resourceGroup, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeStoreAccountName, _);
      }
      
      var dataLakeStoreAccount = client.dataLakeStoreAccount.get(resourceGroup, dataLakeStoreAccountName, _).dataLakeStoreAccount;

      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);
    });
    
    dataLakeStoreAccount.command('delete [dataLakeStoreAccountName] [resourceGroup]')
    .description($('Deletes a Data Lake Account based on account name'))
    .usage('[options] <dataLakeStoreAccountName> <resourceGroup>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('the dataLakeStoreAccount name'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to force the command to find the Data Lake account to delete in.'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .execute(function (dataLakeStoreAccountName, resourceGroup, options, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
      }
      
      if (!options.quiet && !cli.interaction.confirm(util.format($('Delete Data Lake Account %s? [y/n] '), dataLakeStoreAccountName), _)) {
        return;
      }
      
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if(!resourceGroup)
      {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeStoreAccountName, _);
      }
      
      var response = client.dataLakeStoreAccount.deleteMethod(resourceGroup, dataLakeStoreAccountName, _);
      
      if (response.Status !== 'Succeeded') {
         throw new Error(util.format($('Data Lake account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      log.info($('Successfully deleted the specified Data Lake account.'));
    });
    
    dataLakeStoreAccount.command('create [dataLakeStoreAccountName] [location] [resourceGroup] [defaultGroup] [tags]')
    .description($('Creates a Data Lake Account'))
    .usage('[options] <dataLakeStoreAccountName> <location> <resourceGroup> <defaultGroup> <tags>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('The Data Lake account name to create'))
    .option('-l --location <location>', $('the location the Data Lake account will be created in. Valid values are: North Central US, South Central US, Central US, West Europe, North Europe, West US, East US, East US 2, Japan East, Japan West, Brazil South, Southeast Asia, East Asia, Australia East, Australia Southeast'))
    .option('-g --resourceGroup <resourceGroup>', $('the resource group to create the account in'))
    .option('-d --defaultGroup <defaultGroup>', $('the optional default permissions group to add to the account when created'))
    .option('-t --tags <tags>', $('the optional key, value paired set of tags to associate with this account resource.'))
    .execute(function (dataLakeStoreAccountName, location, resourceGroup, defaultGroup, tags, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var dataLakeStoreAccount = createOrUpdateDataLakeStoreAccount(subscription, dataLakeStoreAccountName, resourceGroup, location, defaultGroup, tags, _);
      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);
    });
  
    dataLakeStoreAccount.command('set [dataLakeStoreAccountName] [resourceGroup] [defaultGroup] [tags]')
    .description($('Creates a Data Lake Account'))
    .usage('[options] <dataLakeStoreAccountName> <resourceGroup> <defaultGroup> <tags>')
    .option('-n --dataLakeStoreAccountName <dataLakeStoreAccountName>', $('The Data Lake account name to update with new tags and/or default permissions group'))
    .option('-g --resourceGroup <resourceGroup>', $('the optional resource group to forcibly look for the account to update in'))
    .option('-d --defaultGroup <defaultGroup>', $('the optional default permissions group to set in the existing account'))
    .option('-t --tags <tags>', $('the optional key, value paired set of tags to associate with this account resource.'))
    .execute(function (dataLakeStoreAccountName, resourceGroup, defaultGroup, tags, options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.createDataLakeStoreManagementClient(subscription);
      
      if (!resourceGroup) {
          resourceGroup = getResrouceGroupByAccountName(subscription, resourceGroup, dataLakeStoreAccountName, _);
      }
      
      var dataLakeStoreAccount = client.dataLakeStoreAccount.get(resourceGroup, dataLakeStoreAccountName, _).dataLakeStoreAccount;
      
      if (!defaultGroup) {
          defaultGroup = dataLakeStoreAccount.properties.defaultGroup;
      }
      if(!tags) {
          tags = dataLakeStoreAccount.tags;
      }
      
      dataLakeStoreAccount  = createOrUpdateDataLakeStoreAccount(subscription, dataLakeStoreAccountName, resourceGroup, dataLakeStoreAccount.location, defaultGroup, tags, _);
      dataLakeStoreUtils.formatOutput(cli, log, options, dataLakeStoreAccount);     
    });
    
  function createOrUpdateDataLakeStoreAccount(subscription, dataLakeStoreAccountName, resourceGroup, location, defaultGroup, tags, _) {
      if (!dataLakeStoreAccountName) {
        return cli.missingArgument('dataLakeStoreAccountName');
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
        client.dataLakeStoreAccount.get(resourceGroup, dataLakeStoreAccountName, _);
      }
      catch(err){
        create = true;
      }
      
      var accountParams = {
          dataLakeStoreAccount: {
              name: dataLakeStoreAccountName,
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
         throw new Error(util.format($('Data Lake account operation failed with the following error code: %s and message: %s', response.error.code, response.error.message)));
      }
      
      return client.dataLakeStoreAccount.get(resourceGroup, dataLakeStoreAccountName, _).dataLakeStoreAccount;
  }
  
  function listAllDataLakeStoreAccounts(subscription, resourceGroup, _) {
    var client = utils.createDataLakeStoreManagementClient(subscription);
    var response = client.dataLakeStoreAccount.list(resourceGroup, _);
    var accounts = response.value;
    while (response.nextLink)
    {
        response = client.dataLakeStoreAccount.listNext(response.nextLink);
        accounts.push.apply(accounts, response.value);
    }
    
    return accounts;
  }
  
  function getResrouceGroupByAccountName(subscription, resourceGroup, name, _) {
    var accounts = listAllDataLakeStoreAccounts(subscription, resourceGroup, _);
    for (var i = 0; i < accounts.length; i++)
    {
        if (accounts[i].name === name)
        {
            var acctId = accounts[i].id;
            var rgStart = acctId.indexOf('resourceGroups/') + ('resourceGroups/'.length);
            var rgEnd = acctId.indexOf('/providers/');
            return acctId.substring(rgStart, rgEnd);
        }
    }
    
    throw new Error($('Could not find account: ' + name + ' in any resource group in subscription: ' + subscription ));
  }
};