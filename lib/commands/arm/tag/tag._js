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

var profile = require('../../../util/profile');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.init = function (cli) {
  var log = cli.output;

  var tag = cli.category('tag')
    .description($('Commands to manage your resource manager tags'));

  tag.command('add [name] [value]')
    .description($('add a tag'))
    .usage('[options] <name> <value>')
    .option('-n --name <name>', $('the tag name'))
    .option('--value <value>', $('the tag value'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, value, options, _) {
      if (!name) {
        return cli.missingArgument('name');
      }
      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');

      var progress = cli.interaction.progress($('Creating tag'));
      var result;
      try {
        result = client.tags.create(name, _);
      } finally {
        progress.end();
      }

      if (value) {
        progress = cli.interaction.progress($('Setting tag value'));
        try {
          result = client.tags.createValue(name, value, _);
        } finally {
          progress.end();
        }
      }
    });

  tag.command('delete [name] [value]')
    .description($('Remove an entire tag or a tag value'))
    .usage('[options] <name> <value>')
    .option('-n --name <name>', $('the tag name'))
    .option('--value <value>', $('the tag value'))
    .option('-q, --quiet', $('quiet mode (do not ask for delete confirmation)'))
    .option('--subscription <subscription>', $('the subscription identifier'))
    .execute(function (name, value, options, _) {
      if (!name) {
        return cli.missingArgument('name');
      }

      var promptText = value ? util.format($('Delete tag value \'%s\'? [y/n] '), value)
        : util.format($('Delete entire tag \'%s\'? [y/n] '), name);

      if (!options.quiet && !cli.interaction.confirm(promptText, _)) {
        return;
      }

      var subscription = profile.current.getSubscription(options.subscription);
      var client = subscription.createResourceClient('createResourceManagementClient');

      var progressText = value ? $('Deleting tag value') : $('Deleting tag');
      var progress = cli.interaction.progress(progressText);
      try {
        if (value) {
          client.tags.deleteValue(name, value, _);
        } else {
          client.tags.delete(name, _);
        }
      } finally {
        progress.end();
      }
    });

  tag.command('list')
  .description($('Lists the tag information'))
  .option('-d, --details', $('show additional resource group details'))
  .option('--subscription <subscription>', $('the subscription identifier'))
  .execute(function (options, _) {
    var subscription = profile.current.getSubscription(options.subscription);
    var client = subscription.createResourceClient('createResourceManagementClient');
    var progress = cli.interaction.progress($('Listing tags'));

    var result;
    try {
      result = client.tags.list(_);
    } finally {
      progress.end();
    }

    if (options.details) {
      for (var i = 0; i < result.tags.length; i++) {
        showTagDetails(result.tags[0], log);
      }
    } else {
      cli.interaction.formatOutput(result.tags, function (data) {
        if (data.length === 0) {
          log.info($('No tags defined'));
        } else {
          log.table(data, function (row, tag) {
            row.cell($('Name'), tag.name);
            row.cell($('Count'), getTagCountInfo(tag.count));
          });
        }
      });
    }
  });

  tag.command('show [name]')
  .description($('Get a tag'))
  .option('-n, --name', $('the tag name'))
  .option('--subscription <subscription>', $('the subscription identifier'))
  .execute(function (name, options, _) {
    if (!name) {
      return cli.missingArgument('name');
    }
    var subscription = profile.current.getSubscription(options.subscription);
    var client = subscription.createResourceClient('createResourceManagementClient');
    var progress = cli.interaction.progress($('Listing tags'));

    var result;
    try {
      result = client.tags.list(_);
    } finally {
      progress.end();
    }

    //Filtering at the server side is not supported, so we do it at the client side.
    var tag;
    for (var i = 0; i < result.tags.length; i++) {
      if (utils.ignoreCaseEquals(result.tags[i].name, name)) {
        tag = result.tags[i];
        break;
      }
    }

    if (tag) {
      showTagDetails(tag, log);
    } else {
      log.info(util.format($('tag \'%s\' does not exist.'), name));
    }
  });

};

function showTagDetails(tag, log) {
  log.data($('Name:  '), tag.name);
  log.data($('Count: '), getTagCountInfo(tag.count));

  if (tag.values && tag.values.length > 0) {
    log.data($('Values:'));

    log.table(tag.values, function (row, item) {
      row.cell($('Name'), item.id);
      row.cell($('Count'), getTagCountInfo(item.count));
    });
  } else {
    log.data($('Values:  []'));
    log.data($(''));
  }
}

function getTagCountInfo(tagCount) {
  return tagCount.value ? tagCount.value : '0';
}



