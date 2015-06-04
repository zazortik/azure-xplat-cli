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

var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function TrafficManager(cli, trafficManagerManagementClient) {
  this.cli = cli;
  this.trafficManagerManagementClient = trafficManagerManagementClient;
}

__.extend(TrafficManager.prototype, {

  list: function (options, _) {
    var progress = this.cli.interaction.progress($('Getting traffic manager profiles'));
    var tmProfiles = null;
    try {
      tmProfiles = this.trafficManagerManagementClient.profiles.list(_);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(tmProfiles.profiles, function (outputData) {
      if (outputData.length === 0) {
        output.warn(util.format($('No traffic manager profiles found')));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Domain name'), item.domainName);
          row.cell($('Status'), item.status);
        });
      }
    });
  },

  delete: function (profileName, options, _) {
    var tmProfile = this.get(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete traffic manager profile %s? [y/n] '), profileName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting traffic manager profile "%s"'), profileName));
    try {
      this.trafficManagerManagementClient.profiles.deleteMethod(profileName, _);
    } finally {
      progress.end();
    }
  },

  enable: function (profileName, options, _) {
    var tmProfile = this.get(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
    }

    var definitionVersionNumber = tmProfile.profile.definitions[0].version;
    this.update(profileName, 'Enabled', definitionVersionNumber, _);
  },

  disable: function (profileName, options, _) {
    var tmProfile = this.get(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
    }

    var definitionVersionNumber = tmProfile.profile.definitions[0].version;
    this.update(profileName, 'Disabled', definitionVersionNumber, _);
  },

  get: function (profileName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the traffic manager profile "%s"'), profileName));
    try {
      var tmProfile = this.trafficManagerManagementClient.profiles.get(profileName, _);
      return tmProfile;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  update: function (profileName, profileStatus, definitionVersionNumber, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating traffic manager profile "%s"'), profileName));
    try {
      this.trafficManagerManagementClient.profiles.update(profileName, profileStatus, definitionVersionNumber, _);
    } finally {
      progress.end();
    }
  }

});

module.exports = TrafficManager;