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

function ExpressRoute(cli, networkResourceProviderClient) {
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(ExpressRoute.prototype, {

  /**
   * Circuit methods
   */
  create: function (resourceGroupName, circuitName, location, options, _) {
    var self = this;

    var parameters = {
      name: circuitName,
      location: location,
      sku: {},
      serviceProviderProperties: {
        serviceProviderName: options.serviceProviderName,
        peeringLocation: options.peeringLocation
      }
    };

    parameters = self._parseCircuit(parameters, options, true);

    var circuit = self.get(resourceGroupName, circuitName, _);
    if (circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" already exists in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating express route circuit "%s"'), circuitName));
    try {
      self.networkResourceProviderClient.expressRouteCircuits.createOrUpdate(resourceGroupName, circuitName, parameters, _);
    } finally {
      progress.end();
    }
    self.show(resourceGroupName, circuitName, options, _);
  },

  set: function (resourceGroupName, circuitName, options, _) {
    var self = this;

    var circuit = self.get(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('A express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    circuit = self._parseCircuit(circuit, options, false);

    var progress = self.interaction.progress(util.format($('Updating express route circuit "%s"'), circuitName));
    try {
      self.networkResourceProviderClient.expressRouteCircuits.createOrUpdate(resourceGroupName, circuitName, circuit, _);
    } finally {
      progress.end();
    }
    self.show(resourceGroupName, circuitName, options, _);
  },

  list: function (resourceGroupName, options, _) {
    var self = this;
    var progress = self.interaction.progress($('Getting the express route circuits'));

    var circuits = null;
    try {
      circuits = self.networkResourceProviderClient.expressRouteCircuits.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(circuits.expressRouteCircuits, function (circuits) {
      if (circuits.length === 0) {
        self.output.warn($('No express route circuits found'));
      } else {
        self.output.table(circuits, function (row, circuit) {
          row.cell($('Name'), circuit.name);
          row.cell($('Location'), circuit.location);
          row.cell($('Provider name'), circuit.serviceProviderProperties.serviceProviderName);
          row.cell($('Peering location'), circuit.serviceProviderProperties.peeringLocation);
          row.cell($('Bandwidth, Mbps'), circuit.serviceProviderProperties.bandwidthInMbps);
          row.cell($('Circuit state'), circuit.circuitProvisioningState);
          row.cell($('SKU'), circuit.sku.name);
        });
      }
    });
  },

  show: function (resourceGroupName, circuitName, options, _) {
    var self = this;
    var circuit = self.get(resourceGroupName, circuitName, _);

    self.interaction.formatOutput(circuit, function (circuit) {
      if (circuit === null) {
        self.output.warn(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
      } else {
        var resourceInfo = resourceUtils.getResourceInformation(circuit.id);
        self.output.nameValue($('Id'), circuit.id);
        self.output.nameValue($('Name'), circuit.name);
        self.output.nameValue($('Type'), resourceInfo.resourceType);
        self.output.nameValue($('Location'), circuit.location);
        self.output.nameValue($('Provisioning state'), circuit.provisioningState);
        self.output.nameValue($('Tags'), tagUtils.getTagsInfo(circuit.tags));
        self.output.nameValue($('Circuit provisioning state'), circuit.circuitProvisioningState);
        self.output.nameValue($('Service Key'), circuit.serviceKey);

        self.output.header($('Service provider'));
        self.output.nameValue($('Name'), circuit.serviceProviderProperties.serviceProviderName, 2);
        self.output.nameValue($('Provisioning state'), circuit.serviceProviderProvisioningState, 2);
        self.output.nameValue($('Peering location'), circuit.serviceProviderProperties.peeringLocation, 2);
        self.output.nameValue($('Bandwidth in Mbps'), circuit.serviceProviderProperties.bandwidthInMbps, 2);

        self.output.header($('SKU'));
        self.output.nameValue($('Name'), circuit.sku.name, 2);
        self.output.nameValue($('Tier'), circuit.sku.tier, 2);
        self.output.nameValue($('Family'), circuit.sku.family, 2);
      }
    });
  },

  delete: function (resourceGroupName, circuitName, options, _) {
    var self = this;
    var circuit = self.get(resourceGroupName, circuitName, _);

    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete express route circuit "%s"? [y/n] '), circuitName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting express route circuit "%s"'), circuitName));
    try {
      self.networkResourceProviderClient.expressRouteCircuits.deleteMethod(resourceGroupName, circuitName, _);
    } finally {
      progress.end();
    }
  },

  get: function (resourceGroupName, circuitName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the express route circuit "%s"'), circuitName));

    try {
      var circuit = self.networkResourceProviderClient.expressRouteCircuits.get(resourceGroupName, circuitName, _);
      return circuit.expressRouteCircuit;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  _parseCircuit: function (circuit, options, useDefaults) {
    var self = this;

    if (options.bandwidthInMbps) {
      if (isNaN(options.bandwidthInMbps)) {
        throw new Error($('--bandwidth-in-mbps parameter must be an integer'));
      }
      circuit.serviceProviderProperties.bandwidthInMbps = options.bandwidthInMbps;
    } else if (useDefaults) {
      var defBandwidth = constants.expressRoute.defBandwidthInMbps;
      self.output.warn(util.format($('Using default bandwidth: %s'), defBandwidth));
      circuit.serviceProviderProperties.bandwidthInMbps = defBandwidth;
    }

    if (options.skuTier) {
      circuit.sku.tier = utils.verifyParamExistsInCollection(constants.expressRoute.tier, options.skuTier, '--sku-tier');
    } else if (useDefaults) {
      var defTier = constants.expressRoute.tier[0];
      self.output.warn(util.format($('Using default sku tier: %s'), defTier));
      circuit.sku.tier = defTier;
    }

    if (options.skuFamily) {
      circuit.sku.family = utils.verifyParamExistsInCollection(constants.expressRoute.family, options.skuFamily, '--sku-family');
    } else if (useDefaults) {
      var defFamily = constants.expressRoute.family[0];
      self.output.warn(util.format($('Using default sku family: %s'), defFamily));
      circuit.sku.family = defFamily;
    }

    if (circuit.sku.tier && circuit.sku.family) {
      circuit.sku.name = circuit.sku.tier + '_' + circuit.sku.family;
    }

    if (options.tags) {
      circuit.tags = tagUtils.buildTagsParameter(null, options);
    }

    if (options.tags === false) {
      circuit.tags = {};
    }

    return circuit;
  },

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