//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var fs = require('fs');
var util = require('util');
var ez = require('ez-streams');
var moment = require('moment');
var batchUtil = require('./batch.util');
var batchShowUtil = require('./batch.showUtil');
var utils = require('../../util/utils');
var validation = require('../../util/validation');
var startProgress = batchUtil.startProgress;
var endProgress = batchUtil.endProgress;

var $ = utils.getLocaleString;

/**
* Init batch compute node command
*/
exports.init = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch compute node command usage
  */
  var batch = cli.category('batch')
    .description($('Commands to manage your Batch objects'));

  var logger = cli.output;

  var interaction = cli.interaction;

  var node = batch.category('node')
    .description($('Commands to manage your Batch compute nodes'));

  var nodeUser = batch.category('node-user')
      .description($('Commands to manage your Batch compute nodes'));

  nodeUser.command('create [pool-id] [node-id] [user-name] [user-password]')
    .description($('Add an user account to a batch compute node'))
    .option('--pool-id <pool-Id>', $('the batch pool id'))
    .option('--node-id <node-Id>', $('the batch compute node id'))
    .option('--user-name <user-name>', $('the name of user account to add'))
    .option('--user-password <user-password>', $('the password of user account'))
    .option('--admin', $('the user is admin'))
    .option('--expiry-time <expiry-time>', $('the time of user account to expire'))
    .appendBatchAccountOption()
    .execute(addUser);

  nodeUser.command('delete [pool-id] [node-id] [user-name]')
      .description($('Delete the user account from specified batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--user-name <user-name>', $('the name of user account to delete'))
      .option('-q, --quiet', $('remove the specified user without confirmation'))
      .appendBatchAccountOption()
      .execute(deleteUser);

  nodeUser.command('set [pool-id] [node-id] [user-name]')
      .description($('Update the user account at specified batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--user-name <user-name>', $('the name of user account to update'))
      .option('--user-password <user-password>', $('the password of user account'))
      .option('--expiry-time <expiry-time>', $('the time of user account to expire'))
      .appendBatchAccountOption()
      .execute(updateUser);

  node.command('show [pool-id] [node-id]')
      .description($('Show details of the batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .appendODataFilterOption(true, false, false)
      .appendBatchAccountOption()
      .execute(showNode);

  node.command('list [pool-id]')
    .description($('List batch compute nodes'))
    .option('--pool-id <pool-Id>', $('the batch pool id'))
    .appendODataFilterOption(true, true, false)
    .appendBatchAccountOption()
    .execute(listNode);

  node.command('reboot [pool-id] [node-id]')
      .description($('Reboot the batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--reboot-option <reboot-option>', $('option of what to do with currently running tasks when to reboot the compute node'))
      .option('-q, --quiet', $('reboot the specified compute node without confirmation'))
      .appendBatchAccountOption()
      .execute(rebootNode);

  node.command('reimage [pool-id] [node-id]')
      .description($('Reimage the batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--reimage-option <reimage-option>', $('option of what to do with currently running tasks when to reimage the compute node'))
      .option('-q, --quiet', $('reimage the specified compute node without confirmation'))
      .appendBatchAccountOption()
      .execute(reimageNode);

  node.command('disable-scheduling [pool-id] [node-id]')
      .description($('Disable scheduling on the batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--disable-option <disable-option>', $('option of what to do with currently running tasks when to disable scheduling on the compute node'))
      .appendBatchAccountOption()
      .execute(disableSchedulingNode);

  node.command('enable-scheduling [pool-id] [node-id]')
      .description($('Enable scheduling on the batch compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .appendBatchAccountOption()
      .execute(enableSchedulingNode);

  node.command('get-remote-desktop [pool-id] [node-id] [rdp-file]')
      .description($('Get remote desktop protocol file for specified compute node'))
      .option('--pool-id <pool-Id>', $('the batch pool id'))
      .option('--node-id <node-Id>', $('the batch compute node id'))
      .option('--rdp-file <rdp-file>', $('the file name to save the rdp file'))
      .option('-q, --quiet', $('force to overwrite the destination rdp file'))
      .appendBatchAccountOption()
      .execute(getRemoteDesktop);

  /**
  * Implement batch node cli
  */

  /**
  * Add compute node user
  * @param {string} [poolId] pool id
  * @param {string} [nodeId] node id
  * @param {string} [userName] the user name
  * @param {string} [userPassword] the user password
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function addUser(poolId, nodeId, userName, userPassword, options, _) {
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    if (!userName) {
      userName = options.userName;
    }
    userName = interaction.promptIfNotGiven($('User Name: '), userName, _);
    if (!userPassword) {
      userPassword = options.userPassword;
    }
    userPassword = interaction.promptIfNotGiven($('User Password: '), userPassword, _);

    var client = batchUtil.createBatchServiceClient(options);
    var tips = util.format($('Adding node user %s'), userName);
    var batchOptions = {};
    batchOptions.computeNodeAddUserOptions = batchUtil.getBatchOperationDefaultOption();

    var param = {};
    param.name = userName;
    param.password = userPassword;
    if (options.admin) {
      param.isAdmin = true;
    }
    if (options.expiryTime) {
      param.expiryTime = moment.duration(options.expiryTime);
    }

    startProgress(tips);
    try {
      client.computeNodeOperations.addUser(poolId, nodeId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('User %s has been added to node %s successfully'), userName, nodeId));
  }

  /**
   * Delete the specified user
   * @param {string} [poolId] pool Id
   * @param {string} [nodeId] node id
   * @param {string} [userName] the user name
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function deleteUser(poolId, nodeId, userName, options, _) {
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    if (!userName) {
      userName = options.userName;
    }
    userName = interaction.promptIfNotGiven($('User Name: '), userName, _);

    var client = batchUtil.createBatchServiceClient(options);
    var tips = util.format($('Deleting user %s'), userName);
    var batchOptions = {};
    batchOptions.computeNodeDeleteUserOptions = batchUtil.getBatchOperationDefaultOption();

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to delete user %s? '), userName), _)) {
        return;
      }
    }

    startProgress(tips);

    try {
      client.computeNodeOperations.deleteUser(poolId, nodeId, userName, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('User %s has been deleted successfully'), userName));
  }

  /**
   * Update compute node user
   * @param {string} [poolId] pool id
   * @param {string} [nodeId] node id
   * @param {string} [userName] the user name
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function updateUser(poolId, nodeId, userName, options, _) {
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    if (!userName) {
      userName = options.userName;
    }
    userName = interaction.promptIfNotGiven($('User Name: '), userName, _);
    if (!options.userPassword && !options.expiryTime) {
      throw new Error($('Please specify at least one of option: user-password, expiry-time'));
    }

    var client = batchUtil.createBatchServiceClient(options);
    var tips = util.format($('Updating node user %s'), userName);
    var batchOptions = {};
    batchOptions.computeNodeUpdateUserOptions = batchUtil.getBatchOperationDefaultOption();

    var param = {};
    if (options.userPassword) {
      param.password = userPassword;
    }
    if (options.expiryTime) {
      param.expiryTime = moment.duration(options.expiryTime);
    }

    startProgress(tips);
    try {
      client.computeNodeOperations.updateUser(poolId, nodeId, userName, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('User %s has been updated at node %s successfully'), userName, nodeId));
  }

  /**
  * Show the details of the specified Batch compute node
  * @param {string} [poolId] pool id
  * @param {string} [nodeId] node id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showNode(poolId, nodeId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    var tips = $('Getting Batch node information');
    var batchOptions = {};
    batchOptions.computeNodeGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.computeNodeGetOptions.select = options.selectClause;
    }

    var node = null;
    startProgress(tips);

    try {
      node = client.computeNodeOperations.get(poolId, nodeId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }
        
        throw err;
      }
    } finally {
      endProgress();
    }

    batchShowUtil.showComputeNode(node, cli.output);
  }

  /**
  * List batch compute nodes
  * @param {string} [poolId] pool id
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listNode(poolId, options, _) {
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);

    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing batch nodes');
    var batchOptions = {};
    batchOptions.computeNodeListOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.computeNodeListOptions.select = options.selectClause;
    }
    if (options.filterClause) {
      batchOptions.computeNodeListOptions.filter = options.filterClause;
    }

    var nodes = [];
    startProgress(tips);

    try {
      var result = client.computeNodeOperations.list(poolId, batchOptions, _);
      result.forEach(function (node) {
        nodes.push(node);
      });
      var nextLink = result.odatanextLink;

      while (nextLink) {
        batchOptions.computeNodeListOptions = batchUtil.getBatchOperationDefaultOption();
        result = client.computeNodeOperations.listNext(nextLink, batchOptions, _);
        result.forEach(function (node) {
          nodes.push(node);
        });
        nextLink = result.odatanextLink;
      }
    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }
      
      throw err;
    } finally {
      endProgress();
    }

    cli.interaction.formatOutput(nodes, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No node found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Id'), item.id);
          row.cell($('State'), item.state);
          row.cell($('VM Size'), item.vmSize);
          row.cell($('IP Address'), item.ipAddress);
        });
      }
    });
  }
  
  /**
   * Reboot the specified batch compute node
   * @param {string} [poolId] pool id
   * @param {string} [nodeId] node id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function rebootNode(poolId, nodeId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);

    var tips = util.format($('Rebooting compute node %s'), nodeId);
    var batchOptions = {};
    batchOptions.computeNodeRebootOptions = batchUtil.getBatchOperationDefaultOption();

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to reboot node %s? '), nodeId), _)) {
        return;
      }
    }

    var param = null;
    if (options.rebootOption) {
      param = {};
      param.nodeRebootOption = options.rebootOption;
    }

    startProgress(tips);

    try {
      client.computeNodeOperations.reboot(poolId, nodeId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Node %s has been rebooted successfully'), nodeId));
  }

  /**
   * Reimage the specified batch compute node
   * @param {string} [poolId] pool id
   * @param {string} [nodeId] node id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function reimageNode(poolId, nodeId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    var tips = util.format($('Reimaging compute node %s'), nodeId);
    var batchOptions = {};
    batchOptions.computeNodeReimageOptions = batchUtil.getBatchOperationDefaultOption();

    if (!options.quiet) {
      if (!interaction.confirm(util.format($('Do you want to reimage node %s? '), nodeId), _)) {
        return;
      }
    }

    var param = null;
    if (options.reimageOption) {
      param = {};
      param.nodeReimageOption = options.reimageOption;
    }

    startProgress(tips);

    try {
      client.computeNodeOperations.reimage(poolId, nodeId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Node %s has been reimaged successfully'), nodeId));
  }

  /**
   * Disable scheduling at the specified batch compute node
   * @param {string} [poolId] pool id
   * @param {string} [nodeId] node id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function disableSchedulingNode(poolId, nodeId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    var tips = util.format($('Disabling scheduling at compute node %s'), nodeId);
    var batchOptions = {};
    batchOptions.computeNodeDisableSchedulingOptions = batchUtil.getBatchOperationDefaultOption();

    var param = null;
    if (options.disableOption) {
      param = {};
      param.nodeDisableSchedulingOption = options.disableOption;
    }

    startProgress(tips);

    try {
      client.computeNodeOperations.disableScheduling(poolId, nodeId, param, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Node %s has been disabled scheduling successfully'), nodeId));
  }

  /**
   * Enable scheduling at the specified batch compute node
   * @param {string} [poolId] pool id
   * @param {string} [nodeId] node id
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function enableSchedulingNode(poolId, nodeId, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.poolId;
    }
    poolId = interaction.promptIfNotGiven($('Pool Id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    var tips = util.format($('Enabling scheduling at compute node %s'), nodeId);
    var batchOptions = {};
    batchOptions.computeNodeEnableSchedulingOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);

    try {
      client.computeNodeOperations.enableScheduling(poolId, nodeId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    logger.info(util.format($('Node %s has been enabled scheduling successfully'), nodeId));
  }

  /**
   * Get Remote Desktop Protocol file from the specified batch compute node
   * @param {string} [poolId] pool Id
   * @param {string} [nodeId] node id
   * @param {string} [rdpFile] the file name for saving RDP
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function getRemoteDesktop(poolId, nodeId, rdpFile, options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    if (!poolId) {
      poolId = options.id;
    }
    poolId = interaction.promptIfNotGiven($('Pool id: '), poolId, _);
    if (!nodeId) {
      nodeId = options.nodeId;
    }
    nodeId = interaction.promptIfNotGiven($('Node Id: '), nodeId, _);
    if (!rdpFile) {
      rdpFile = options.autoscaleFormula;
    }
    rdpFile = interaction.promptIfNotGiven($('RDP File: '), rdpFile, _);

    // If destination exists as a file, prompt for overwrite if not in
    // quite mode.
    var force = !!options.quiet;
    if (utils.fileExists(rdpFile, _)) {
      if (force !== true) {
        force = interaction.confirm(util.format($('Do you want to overwrite file %s? '), rdpFile), _);
        if (force !== true) {
          return;
        }
      }
    }

    var tips = util.format($('Getting RDP at node %s'), nodeId);
    var batchOptions = {};
    batchOptions.computeNodeGetRemoteDesktopOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);

    var stream;
    try {
      stream = client.computeNodeOperations.getRemoteDesktop(poolId, nodeId, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Pool %s or node %s doesn\'t exist'), poolId, nodeId));
      } else {
        if (err.message) {
          if (typeof err.message === 'object') {
            err.message = err.message.value;
          }
        }

        throw err;
      }
    } finally {
      endProgress();
    }

    var reader = ez.devices.node.reader(stream);
    var writer = ez.devices.node.writer(fs.createWriteStream(rdpFile, { flags : 'w' }));
    reader.pipe(_, writer);

    logger.info(util.format($('RDP info for node %s has been written successfully'), nodeId));
  }
};
