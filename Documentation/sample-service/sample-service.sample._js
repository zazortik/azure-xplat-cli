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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

// This assumes a file called ./sampleUtils.js is already there
var sampleUtils = require('./sampleUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var sample = cli.category('sample')
    .description($('Commands to manage your Azure samples'));

  sample.command('list')
    .description($('Get all available samples'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = utils.getSampleClient(subscription);
      var progress = cli.interaction.progress($('Listing samples'));
      var result;
      try {
        result = client.samples.list(_);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(result.samples, function (data) {
        if (data.length === 0) {
          log.info($('No samples defined'));
        } else {
          log.table(data, displayASample);
        }
      });
    });

  sample.command('show [name]')
    .description($('Get an available sample'))
    .option('-n --name <name>', $('the sample name'))
    .execute(function (name, options, _) {
    if (!name) {
      return cli.missingArgument('name');
    }
    var subscription = profile.current.getSubscription(options.subscription);
    var client = utils.getSampleClient(subscription);
    var progress = cli.interaction.progress($('Getting sample'));
    var result;
    try {
      //'sample.get' only takes guid, so we just do list and find by name ourselves
      result = client.sample.list(_);
    } finally {
      progress.end();
    }

    var samples = result.sample.filter(function (r) {
      return utils.ignoreCaseEquals(r.properties.sampleName, name);
    });

    cli.interaction.formatOutput(samples, function (data) {
      if (data.length === 0) {
        log.info($('No samples found'));
      } else {
        log.table(data, displayASample);
      }
    });
  });
};

function displayASample(row, sample) {
  row.cell($('Name'), sample.properties.sampleName);
  var sampleDetails = sampleUtils.getsampleDetails(sample.properties.details);
  row.cell($('Properties'), sampleDetails.properties);
}