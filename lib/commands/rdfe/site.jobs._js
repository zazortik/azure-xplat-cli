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

var profile = require('../../util/profile');
var utils = require('../../util/utils');
var WebsitesClient = require('./websites/websitesclient');

var validation = require('../../util/validation');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;
  var site = cli.category('site');
  var siteJobs = site.category('job')
    .description($('Commands to manage your Web Site Web Jobs'));

  siteJobs.command('list [name]')
    .description($('List all the web jobs under a web site'))
    .option('--job-type <job-type>', $('optional. The type of the webjob. Valid value is "triggered" or "continuous". By default return webjobs of all types.'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (name, options, _) {
      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      if (options.jobType) {
        validation.isValidEnumValue(options.jobType, [ 'continuous', 'triggered' ]);
      }

      var service = createWebsiteExtensionsClient(context, _);

      var webJobs;
      var progress = cli.interaction.progress($('Getting web jobs'));
      try {
        webJobs = service.webJobs.list(_);
      } finally {
        progress.end();
      }

      if (webJobs && webJobs.jobs && options.jobType) {
        webJobs.jobs = webJobs.jobs.filter(function (s) {
          return utils.ignoreCaseEquals(s.type, options.jobType);
        });
      }

      cli.interaction.formatOutput(webJobs.jobs, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Type'), item.type);
            row.cell($('Run Command'), item.runCommand);
            row.cell($('Latest Run'), item.latestRun ? item.latestRun.startTime : '');
            row.cell($('Status'), item.latestRun ? item.latestRun.status : '');
          });
        } else {
          log.info($('No jobs exist.'));
        }
      });
    });

  siteJobs.command('show [jobName] [jobType] [name]')
    .usage('[options] <jobName> <jobType> [name]')
    .description($('Show details of a specific webjob'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--job-type <job-type>', $('required. The type of the webjob. Valid value is "triggered" or "continuous".'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, jobType, name, options, _) {
      if (jobType) {
        validation.isValidEnumValue(jobType, [ 'continuous', 'triggered' ]);
      } else {
        throw new Error($('--job-type is required'));
      }

      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);

      var webJob;
      var progress = cli.interaction.progress($('Getting web job'));
      try {
        if (utils.ignoreCaseEquals(jobType, 'continuous')) {
          webJob = service.webJobs.getContinuous(jobName, _);
        } else if (utils.ignoreCaseEquals(jobType, 'triggered')) {
          webJob = service.webJobs.getTriggered(jobName, _);
        }
      } finally {
        progress.end();
      }

      cli.interaction.logEachData($('Web Job'), webJob.webJob);
    });

  siteJobs.command('delete [jobName] [jobType] [name]')
    .usage('[options] <jobName> <jobType> [name]')
    .description($('Delete a web job'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--job-type <job-type>', $('required. The type of the webjob. Valid value is "triggered" or "continuous".'))
    .option('-q, --quiet', $('quiet mode, do not ask for delete confirmation'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, jobType, name, options, _) {
      if (jobType) {
        validation.isValidEnumValue(jobType, [ 'continuous', 'triggered' ]);
      } else {
        throw new Error($('--job-type is required'));
      }

      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      if (!options.quiet && !cli.interaction.confirm(util.format('Delete web job %s? [y/n] ', jobName), _)) {
        return;
      }

      var service = createWebsiteExtensionsClient(context, _);
      var progress = cli.interaction.progress($('Deleting web job'));
      try {
        if (utils.ignoreCaseEquals(jobType, 'continuous')) {
          service.webJobs.deleteContinuous(jobName, true, _);
        } else if (utils.ignoreCaseEquals(jobType, 'triggered')) {
          service.webJobs.deleteTriggered(jobName, true, _);
        }
      } finally {
        progress.end();
      }

      log.info(util.format($('Web job %s has been deleted'), jobName));
    });

  siteJobs.command('upload [jobName] [jobType] [jobFile] [name]')
    .usage('[options] <jobName> <jobType> <jobFile> [name]')
    .description($('Delete a web job'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--job-type <job-type>', $('required. The type of the webjob. Valid value is "triggered" or "continuous".'))
    .option('--job-file <job-file>', $('required. The job file.'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, jobType, jobFile, name, options, _) {
      if (jobType) {
        validation.isValidEnumValue(jobType, [ 'continuous', 'triggered' ]);
      } else {
        throw new Error($('--job-type is required'));
      }

      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      if (!jobFile) {
        throw new Error($('--job-file is required'));
      } else if (!fs.existsSync(jobFile)) {
        throw new Error($('Specified file does not exist'));
      }

      if (options.singleton &&
        !utils.ignoreCaseEquals(jobType, 'continuous')) {
        throw new Error($('Only continuous jobs can be set to singleton'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);
      var progress = cli.interaction.progress($('Uploading new web job'));
      try {
        var fileContent = fs.readFile(jobFile, _);

        if (utils.ignoreCaseEquals(jobType, 'continuous')) {
          service.webJobs.uploadContinuous(jobName, fileContent, _);
        } else if (utils.ignoreCaseEquals(jobType, 'triggered')) {
          service.webJobs.uploadTriggered(jobName, fileContent, _);
        }
      } finally {
        progress.end();
      }

      log.info(util.format($('Web job %s has been uploaded'), jobName));
    });

  siteJobs.command('start [jobName] [jobType] [name]')
    .usage('[options] <jobName> <jobType> [name]')
    .description($('Start a web job'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--job-type <job-type>', $('required. The type of the webjob. Valid value is "triggered" or "continuous".'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, jobType, name, options, _) {
      if (jobType) {
        validation.isValidEnumValue(jobType, [ 'continuous', 'triggered' ]);
      } else {
        throw new Error($('--job-type is required'));
      }

      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);
      var progress = cli.interaction.progress($('Starting web job'));
      try {
        if (utils.ignoreCaseEquals(jobType, 'continuous')) {
          service.webJobs.startContinuous(jobName, _);
        } else if (utils.ignoreCaseEquals(jobType, 'triggered')) {
          service.webJobs.runTriggered(jobName, _);
        }
      } finally {
        progress.end();
      }

      log.info(util.format($('Web job %s has been started'), jobName));
    });

  siteJobs.command('stop [jobName] [name]')
    .usage('[options] <jobName> <jobType> [name]')
    .description($('Stops a web job. Only continuous jobs can  be stopped'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, name, options, _) {
      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);
      var progress = cli.interaction.progress($('Starting web job'));
      try {
        service.webJobs.stopContinuous(jobName, _);
      } finally {
        progress.end();
      }

      log.info(util.format($('Web job %s has been stopped'), jobName));
    });

  var siteJobHistory = siteJobs.category('history')
    .description($('Commands to manage your Web Site Web Jobs History'));

  siteJobHistory.command('list [jobName] [name]')
    .description($('List all the triggered web jobs runs under a web site'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, name, options, _) {
      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);

      var webJobRuns;
      var progress = cli.interaction.progress($('Getting web job runs'));
      try {
        webJobRuns = service.webJobs.listRuns(jobName, _);
      } finally {
        progress.end();
      }

      cli.interaction.formatOutput(webJobRuns.jobRuns, function (data) {
        if (data.length > 0) {
          log.table(data, function (row, item) {
            row.cell($('Id'), item.id);
            row.cell($('Status'), item.status);
            row.cell($('Duration'), item.duration);
            row.cell($('Start Time'), item.startTime);
            row.cell($('End Time'), item.endTime);
          });
        } else {
          log.info($('No job runs exist.'));
        }
      });
    });

  siteJobHistory.command('show [jobName] [runId] [name]')
    .description($('Get the detaisl for a triggered web jobs run under a web site'))
    .option('--job-name <job-name>', $('required. The name of the webjob.'))
    .option('--run-id <run-id>', $('optional. The id of the run history. If not specified, show the latest run.'))
    .option('--slot <slot>', $('the name of the slot'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function (jobName, runId, name, options, _) {
      if (!jobName) {
        throw new Error($('--job-name is required'));
      }

      var parsedSiteName = WebsitesClient.parseSiteName(name);
      var context = {
        subscription: profile.current.getSubscription(options.subscription).id,
        site: {
          name: parsedSiteName.name,
          slot: options.slot ? options.slot : parsedSiteName.slot
        }
      };

      var service = createWebsiteExtensionsClient(context, _);

      var webJobRun;
      var progress = cli.interaction.progress($('Getting web job run'));
      try {
        webJobRun = service.webJobs.getRun(jobName, runId, _);
      } finally {
        progress.end();
      }

      cli.interaction.logEachData($('Web Job run'), webJobRun.jobRun);
    });

  function createWebsiteExtensionsClient(context, _) {
    var websiteClient = new WebsitesClient(cli, context.subscription);
    websiteClient.lookupSiteNameAndWebSpace(context, _);
    var siteData = websiteClient.getSite(context, _);
    var authData = websiteClient.getRepositoryAuthData(siteData);

    return utils._createWebSiteExtensionsClient(context.site.name, authData.username, authData.password);
  }
};