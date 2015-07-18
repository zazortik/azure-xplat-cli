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

/*
* You can test sample commands get loaded by xplat by following steps:
* a. Copy the folder to '<repository root>\lib\commands\arm'
* b. Under <repository root>, run 'node bin/azure config mode arm'
* c. Run 'node bin/azure', you should see 'sample' listed as a command set
* d. Run 'node bin/azure', you should see 'create', "delete", etc 
      showing up in the help text 
*/

'use strict';

var util = require('util');

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var usageUtils = require('./usageUtils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var usage = cli.category('usage')
    .description($('Commands to view your aggregated Azure usage data'));

  sample.command('list [reportedStartTime] [reportedEndTime]')
    .description($('List the usage aggregates for a provided time range'))
    .option('--reportedStartTime <reportedStartTime>, $('The start of the time range to retrieve data for.'))
    .option('--reportedEndTime <reportedEndTime>, $('The end of the time range to retrieve data for.'))
    .option('--granularity <daily/hourly>', $('Value is either daily (default) or hourly to tell the API how to return the results grouped by day or hour.'))
    .option('--showDetails <bool>', $('When set to true (default), the aggregates are broken down into the instance metadata which is more granular.'))
    .option('--continuationToken <url>', $('Retrieved from previous calls, this is the bookmark used for progress when the responses are paged.'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (options, _) {
      var subscription = profile.current.getSubscription(options.subscription);
      var client = usageUtils.getUsageDe(subscription);
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
  var sampleDetails = sampleUtils.getsampleDetails(sample);
  row.cell($('Properties'), sampleDetails.properties);
}
