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
exports.init_skip = function(cli) {
  
  //Init batchUtil
  batchUtil.init(cli);

  /**
  * Define batch compute node command usage
  */
  var batch = cli.category('batch')
    .description($('Commands to manage your Batch objects'));

  var logger = cli.output;

  var interaction = cli.interaction;

  var certificate = batch.category('certificate')
    .description($('Commands to manage your Batch certificate'));

  //certificate.command('create [thumbprint] [certificate-file]')
  //  .description($('Add a certificate'))
  //  .appendBatchAccountOption()
  //  .execute(addCertificate);

  certificate.command('delete [thumbprint]')
      .description($('Delete the specified batch certificate'))
      .option('--thumbprint <thumbprint>', $('the certificate thumbprint'))
      .option('--thumbprint-algorithm <thumbprint-algorithm>', $('the certificate thumbprint algorithm'))
      .option('--abort', $('cancel the deletion'))
      .option('-q, --quiet', $('delete the specified certificate without confirmation'))
      .appendBatchAccountOption()
      .execute(deleteCertificate);

  certificate.command('show [thumbprint]')
      .description($('Show details of the batch certificate'))
      .option('--thumbprint <thumbprint>', $('the certificate thumbprint'))
      .option('--thumbprint-algorithm <thumbprint-algorithm>', $('the certificate thumbprint algorithm'))
      .appendODataFilterOption(true, false, false)
      .appendBatchAccountOption()
      .execute(showCertificate);

  certificate.command('list')
    .description($('List batch certificates'))
    .appendODataFilterOption(true, true, false)
    .appendBatchAccountOption()
    .execute(listCertificate);

  /**
  * Implement batch certificate cli
  */

  /**
  * Add batch certificate
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function addCertificate(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = util.format($('Adding node user %s'), userName);
    var batchOptions = {};
    batchOptions.computeNodeAddUserOptions = batchUtil.getBatchOperationDefaultOption();

    startProgress(tips);
    try {
      client.certificateOperations.addUser(poolId, nodeId, param, batchOptions, _);
    } catch (err) {
      if (err.message) {
        if (typeof err.message === 'object') {
          err.message = err.message.value;
        }
      }

      throw err;
    }
    finally {
      endProgress();
    }

    logger.verbose(util.format($('User %s has been added to node %s successfully'), userName, nodeId));
  }

  /**
   * Delete the specified user
   * @param {string} [thumbprint] certificate thumbprint
   * @param {object} options command line options
   * @param {callback} _ callback function
   */
  function deleteCertificate(thumbprint, options, _) {
    if (!thumbprint) {
      thumbprint = options.thumbprint;
    }
    thumbprint = interaction.promptIfNotGiven($('Certificate thumbprint: '), thumbprint, _);
    var thumbprintAlgorithm = options.thumbprintAlgorithm;
    if (!thumbprintAlgorithm) {
      thumbprintAlgorithm = 'sha1';
    }

    var client = batchUtil.createBatchServiceClient(options);

    if (options.abort) {
      var tips = util.format($('Cacnelling certificate %s deletion'), thumbprint);
      var batchOptions = {};
      batchOptions.certificateCancelDeletionOptions = batchUtil.getBatchOperationDefaultOption();

      startProgress(tips);

      try {
        client.certificateOperations.cancelDeletion(thumbprintAlgorithm, thumbprint, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Certificate %s doesn\'t exist'), thumbprint));
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

      logger.info(util.format($('Certificate %s won\'t be deleted'), thumbprint));
    } else {
      if (!options.quiet) {
        if (!interaction.confirm(util.format($('Do you want to delete certificate %s? '), thumbprint), _)) {
          return;
        }
      }

      var tips = util.format($('Deleting certificate %s'), thumbprint);
      var batchOptions = {};
      batchOptions.certificateDeleteMethodOptions = batchUtil.getBatchOperationDefaultOption();

      startProgress(tips);

      try {
        client.certificateOperations.deleteMethod(thumbprintAlgorithm, thumbprint, batchOptions, _);
      } catch (err) {
        if (batchUtil.isNotFoundException(err)) {
          throw new Error(util.format($('Certificate %s doesn\'t exist'), thumbprint));
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

      logger.info(util.format($('Certificate %s has been deleted successfully'), thumbprint));
    }
  }

  /**
  * Show the details of the specified Batch certificate
  * @param {string} [thumbprint] certificate thumbprint
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function showCertificate(thumbprint, options, _) {
    if (!thumbprint) {
      thumbprint = options.thumbprint;
    }
    thumbprint = interaction.promptIfNotGiven($('Certificate thumbprint: '), thumbprint, _);
    var thumbprintAlgorithm = options.thumbprintAlgorithm;
    if (!thumbprintAlgorithm) {
      thumbprintAlgorithm = 'sha1';
    }

    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Getting Batch certificate information');
    var batchOptions = {};
    batchOptions.certificateGetOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.certificateGetOptions.select = options.selectClause;
    }

    var certificate = null;
    startProgress(tips);

    try {
      certificate = client.certificateOperations.get(thumbprintAlgorithm, thumbprint, batchOptions, _);
    } catch (err) {
      if (batchUtil.isNotFoundException(err)) {
        throw new Error(util.format($('Certificate %s doesn\'t exist'), thumbprint));
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

    batchShowUtil.showCertificate(certificate, cli.output);
  }

  /**
  * List batch certificates
  * @param {object} options command line options
  * @param {callback} _ callback function
  */
  function listCertificate(options, _) {
    var client = batchUtil.createBatchServiceClient(options);
    var tips = $('Listing batch certficates');
    var batchOptions = {};
    batchOptions.certificateListOptions = batchUtil.getBatchOperationDefaultOption();

    if (options.selectClause) {
      batchOptions.certificateListOptions.select = options.selectClause;
    }
    if (options.filterClause) {
      batchOptions.certificateListOptions.filter = options.filterClause;
    }

    var certficates = [];
    startProgress(tips);

    try {
      var result = client.certificateOperations.list(batchOptions, _);
      result.forEach(function (cert) {
        certficates.push(cert);
      });
      var nextLink = result.odatanextLink;

      while (nextLink) {
        batchOptions.certificateListOptions = batchUtil.getBatchOperationDefaultOption();
        result = client.certificateOperations.listNext(nextLink, batchOptions, _);
        result.forEach(function (cert) {
          certficates.push(cert);
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

    cli.interaction.formatOutput(certficates, function (outputData) {
      if (outputData.length === 0) {
        logger.info($('No certificate found'));
      } else {
        logger.table(outputData, function(row, item) {
          row.cell($('Thumbprint'), item.thumbprint);
          row.cell($('State'), item.state);
          row.cell($('Previous State'), item.previousState);
          row.cell($('Deletion Error'), !!item.deleteCertificateError);
        });
      }
    });
  }
};
