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
var constants = require('./constants');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');

function PublicIp(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(PublicIp.prototype, {
  /**
   * Public methods
   */
  create: function (resourceGroupName, publicIpName, options, _) {
    var self = this;

    var parameters = {
      name: publicIpName,
      location: options.location
    };

    parameters = self._parsePublicIP(parameters, options, true);

    var publicIp = self.get(resourceGroupName, publicIpName, _);
    if (publicIp) {
      throw new Error(util.format($('A public ip address with name "%s" already exists in the resource group "%s"'), publicIpName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating public ip address "%s"'), publicIpName));
    try {
      publicIp = self.networkManagementClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIpName, parameters, _);
    } finally {
      progress.end();
    }
    self._showPublicIP(publicIp);
  },

  set: function (resourceGroupName, publicIpName, options, _) {
    var self = this;

    var publicIp = self.get(resourceGroupName, publicIpName, _);
    if (!publicIp) {
      throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), publicIpName, resourceGroupName));
    }

    publicIp = self._parsePublicIP(publicIp, options, false);

    var progress = self.interaction.progress(util.format($('Updating public ip address "%s"'), publicIpName));
    try {
      publicIp = self.networkManagementClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIpName, publicIp, _);
    } finally {
      progress.end();
    }
    
    self._showPublicIP(publicIp);
  },

  show: function (resourceGroupName, publicIpName, options, _) {
    var self = this;
    var publicIp = self.get(resourceGroupName, publicIpName, _);

    self.interaction.formatOutput(publicIp, function (publicIp) {
      if (publicIp === null) {
        self.output.warn(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), publicIpName, resourceGroupName));
      } else {
        self._showPublicIP(publicIp);
      }
    });
  },

  delete: function (resourceGroupName, publicIpName, options, _) {
    var self = this;

    var publicIp = self.get(resourceGroupName, publicIpName, _);
    if (!publicIp) {
      throw new Error(util.format($('A public ip address with name "%s" not found in the resource group "%s"'), publicIpName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete public ip address "%s"? [y/n] '), publicIpName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting public ip address "%s"'), publicIpName));
    try {
      self.networkManagementClient.publicIPAddresses.deleteMethod(resourceGroupName, publicIpName, _);
    } finally {
      progress.end();
    }
  },

  list: function (options, _) {
    var self = this;

    var publicIPs = null;
    var progress = self.interaction.progress($('Getting the public ip addresses'));

    try {
      if (options.resourceGroup) {
        publicIPs = self.networkManagementClient.publicIPAddresses.list(options.resourceGroup, _);
      } else {
        publicIPs = self.networkManagementClient.publicIPAddresses.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(publicIPs, function (publicIPs) {
      if (publicIPs.length === 0) {
        self.output.warn($('No public ip addresses found'));
      } else {
        self.output.table(publicIPs, function (row, publicIp) {
          row.cell($('Name'), publicIp.name);
          row.cell($('Location'), publicIp.location);
          var resInfo = resourceUtils.getResourceInformation(publicIp.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), publicIp.provisioningState);
          row.cell($('Allocation method'), publicIp.publicIPAllocationMethod);
          row.cell($('Idle timeout, minutes'), publicIp.idleTimeoutInMinutes || '');
          var fqdn = publicIp.dnsSettings ? publicIp.dnsSettings.fqdn : '';
          row.cell($('FQDN'), fqdn);
        });
      }
    });
  },

  get: function (resourceGroupName, publicIpName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the public ip "%s"'), publicIpName));
    try {
      var publicIP = self.networkManagementClient.publicIPAddresses.get(resourceGroupName, publicIpName, null, _);
      return publicIP;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  /**
   * Internal methods
   */
  _parsePublicIP: function (publicIp, options, useDefaults) {
    var self = this;

    if (options.idleTimeout) {
      if (isNaN(options.idleTimeout)) {
        throw new Error($('--idle-timeout parameter must be an integer'));
      }
      publicIp.idleTimeoutInMinutes = utils.parseInt(options.idleTimeout);
    } else if (useDefaults) {
      var defTimeout = constants.publicIp.defTimeout;
      self.output.warn(util.format($('Using default idle timeout, minutes: %s'), defTimeout));
      publicIp.idleTimeoutInMinutes = defTimeout;
    }

    if (options.allocationMethod) {
      publicIp.publicIPAllocationMethod = utils.verifyParamExistsInCollection(constants.publicIp.allocation,
        options.allocationMethod, '--allocation-method');
    } else if (useDefaults) {
      var defAllocation = constants.publicIp.allocation[0];
      self.output.warn(util.format($('Using default allocation method: %s'), defAllocation));
      publicIp.publicIPAllocationMethod = defAllocation;
    }

    if (options.domainNameLabel) {
      if (utils.argHasValue(options.domainNameLabel)) {
        if (!publicIp.dnsSettings) publicIp.dnsSettings = {};
        publicIp.dnsSettings.domainNameLabel = options.domainNameLabel;
      } else {
        delete publicIp.dnsSettings;
      }
    }

    if (options.reverseFqdn) {
      if (!publicIp.dnsSettings) publicIp.dnsSettings = {};
      publicIp.dnsSettings.reverseFqdn = options.reverseFqdn;
    }

    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(publicIp, options);
      } else {
        publicIp.tags = {};
      }
    }

    return publicIp;
  },

  _showPublicIP: function (publicIp) {
    var self = this;
    self.output.nameValue($('Id'), publicIp.id);
    self.output.nameValue($('Name'), publicIp.name);
    self.output.nameValue($('Type'), publicIp.type);
    self.output.nameValue($('Location'), publicIp.location);
    self.output.nameValue($('Provisioning state'), publicIp.provisioningState);
    self.output.nameValue($('Tags'), tagUtils.getTagsInfo(publicIp.tags));
    self.output.nameValue($('Allocation method'), publicIp.publicIPAllocationMethod);
    self.output.nameValue($('Idle timeout in minutes'), publicIp.idleTimeoutInMinutes);
    self.output.nameValue($('IP Address'), publicIp.ipAddress);
    if (publicIp.ipConfiguration) {
      self.output.nameValue($('IP configuration id'), publicIp.ipConfiguration.id);
    }
    if (publicIp.dnsSettings) {
      self.output.nameValue($('Domain name label'), publicIp.dnsSettings.domainNameLabel);
      self.output.nameValue($('FQDN'), publicIp.dnsSettings.fqdn);
    }
  }
});

module.exports = PublicIp;