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

function ExpressRoute(cli, networkResourceProviderClient) {
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(ExpressRoute.prototype, {

  /**
   * Service provider methods
   */
  listProviders: function (options, _) {
    var self = this;
    var progress = self.interaction.progress($('Getting express route service providers'));

    var providers = null;
    try {
      providers = self.networkResourceProviderClient.expressRouteServiceProviders.list(_);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(providers.expressRouteServiceProviders, function (providers) {
      if (providers.length === 0) {
        self.output.warn($('No express route service providers found'));
        return;
      }
      self.output.table(providers, function (row, provider) {
        row.cell($('Name'), provider.name);
        var bandwidthRange = '';
        if (provider.bandwidthsOffered.length > 1) {
          bandwidthRange = util.format('%s-%s',
            provider.bandwidthsOffered.shift().offerName, provider.bandwidthsOffered.pop().offerName);
        } else if (provider.bandwidthsOffered.length == 1) {
          bandwidthRange = provider.bandwidthsOffered.shift().offerName;
        }
        row.cell($('Bandwidths offered'), bandwidthRange);
        row.cell($('Peering locations'), provider.peeringLocations.join());
      });
    });
  }

});

module.exports = ExpressRoute;