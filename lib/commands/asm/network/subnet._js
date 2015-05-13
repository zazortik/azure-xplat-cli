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

function Subnet(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(Subnet.prototype, {
  list: function (vNetName, options, _) {
    var vNet = this._getVnetByName(vNetName, _);

    var output = this.cli.output;
    if (vNet) {
      this.cli.interaction.formatOutput(vNet.subnets, function (outputData) {
        if (outputData.length === 0) {
          output.warn($('No virtual subnet networks found'));
        } else {
          output.table(outputData, function (row, item) {
            row.cell($('Name'), item.name);
            row.cell($('Address prefix'), item.addressPrefix);
          });
        }
      });
    } else {
      output.warn(util.format($('Virtual network with name %s not found'), vNetName));
    }
  },

  get: function (vNetName, subnetName, options, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the subnet "%s"'), subnetName));
    try {
      var vNet = this._getVnetByName(vNetName, _);
      var output = this.cli.output;
      if (!vNet) {
        output.warn(util.format($('Virtual network with name %s not found'), vNetName));
        return;
      }

      if (!vNet.subnets || vNet.subnets.length === 0) {
        output.warn($('Virtual network has no subnets'));
      }

      var subnets = vNet.subnets;
      for (var i = 0; i < subnets.length; i++) {
        if (utils.ignoreCaseEquals(subnets[i].name, subnetName)) {
          return subnets[i];
        }
      }
    } catch (e) {
      if (e.code === 'NotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  show: function (vNetName, subnetName, options, _) {
    var subnet = this.get(vNetName, subnetName, options, _);
    var output = this.cli.output;

    if (subnet) {
      output.nameValue($('Name'), subnet.name);
      output.nameValue($('Address prefix'), subnet.addressPrefix);
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A virtual network subnet with name "%s" not found'), subnetName));
      }
    }
  },

  _getVnetByName: function (vNetName, _) {
    var virtualNetworkSiteList;
    var progress = this.cli.interaction.progress($('Getting virtual network with name ') + vNetName);
    try {
      virtualNetworkSiteList = this.networkManagementClient.networks.list(_);

      if (virtualNetworkSiteList) {
        virtualNetworkSiteList = virtualNetworkSiteList.virtualNetworkSites;
        for (var i = 0; i < virtualNetworkSiteList.length; i++) {
          if (utils.ignoreCaseEquals(virtualNetworkSiteList[i].name, vNetName)) {
            return virtualNetworkSiteList[i];
          }
        }
      }
    } finally {
      progress.end();
    }
  }
});

module.exports = Subnet;
