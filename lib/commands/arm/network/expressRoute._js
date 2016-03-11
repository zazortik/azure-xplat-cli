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

function ExpressRoute(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(ExpressRoute.prototype, {

  /**
   * Circuit methods.
   */
  createCircuit: function (resourceGroupName, circuitName, options, _) {
    var self = this;

    var parameters = {
      name: circuitName,
      location: options.location,
      sku: {},
      serviceProviderProperties: {
        serviceProviderName: options.serviceProviderName,
        peeringLocation: options.peeringLocation
      }
    };

    parameters = self._parseCircuit(parameters, options, true);

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" already exists in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var progress = self.interaction.progress(util.format($('Creating express route circuit "%s"'), circuitName));
    try {
      circuit = self.networkManagementClient.expressRouteCircuits.createOrUpdate(resourceGroupName, circuitName, parameters, _);
    } finally {
      progress.end();
    }
    self._showCircuit(circuit, resourceGroupName, circuitName);
  },

  setCircuit: function (resourceGroupName, circuitName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('A express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    circuit = self._parseCircuit(circuit, options, false);

    var progress = self.interaction.progress(util.format($('Updating express route circuit "%s"'), circuitName));
    try {
      circuit = self.networkManagementClient.expressRouteCircuits.createOrUpdate(resourceGroupName, circuitName, circuit, _);
    } finally {
      progress.end();
    }
    self._showCircuit(circuit, resourceGroupName, circuitName);
  },

  listCircuits: function (options, _) {
    var self = this;

    var progress = self.interaction.progress($('Looking up express route circuits'));
    var circuits = null;

    try {
      if (options.resourceGroup) {
        circuits = self.networkManagementClient.expressRouteCircuits.list(options.resourceGroup, _);
      } else {
        circuits = self.networkManagementClient.expressRouteCircuits.listAll(_);
      }
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(circuits, function (circuits) {
      if (circuits.length === 0) {
        self.output.warn($('No express route circuits found'));
      } else {
        self.output.table(circuits, function (row, circuit) {
          row.cell($('Name'), circuit.name);
          row.cell($('Location'), circuit.location);
          var resInfo = resourceUtils.getResourceInformation(circuit.id);
          row.cell($('Resource group'), resInfo.resourceGroup);
          row.cell($('Provisioning state'), circuit.provisioningState);
          row.cell($('Provider name'), circuit.serviceProviderProperties.serviceProviderName);
          row.cell($('Peering location'), circuit.serviceProviderProperties.peeringLocation);
          row.cell($('Bandwidth, Mbps'), circuit.serviceProviderProperties.bandwidthInMbps);
          row.cell($('Circuit state'), circuit.circuitProvisioningState);
          row.cell($('SKU'), circuit.sku.name);
        });
      }
    });
  },

  showCircuit: function (resourceGroupName, circuitName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    self._showCircuit(circuit, resourceGroupName, circuitName);
  },

  deleteCircuit: function (resourceGroupName, circuitName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete express route circuit "%s"? [y/n] '), circuitName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting express route circuit "%s"'), circuitName));
    try {
      self.networkManagementClient.expressRouteCircuits.deleteMethod(resourceGroupName, circuitName, _);
    } finally {
      progress.end();
    }
  },

  getCircuit: function (resourceGroupName, circuitName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the express route circuit "%s"'), circuitName));
    try {
      var circuit = self.networkManagementClient.expressRouteCircuits.get(resourceGroupName, circuitName, null, _);
      return circuit;
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
   * Service provider methods.
   */
  listProviders: function (options, _) {
    var self = this;

    var progress = self.interaction.progress($('Looking up express route service providers'));
    var providers = null;

    try {
      providers = self.networkManagementClient.expressRouteServiceProviders.list(_);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(providers, function (providers) {
      if (providers.length === 0) {
        self.output.warn($('No express route service providers found'));
      } else {
        self.output.table(providers, function (row, provider) {
          row.cell($('Name'), provider.name);
          var bandwidths = provider.properties.bandwidthsOffered.map(function (b) {
            return b.offerName;
          });
          row.cell($('Bandwidths offered'), bandwidths);
          row.cell($('Peering locations'), provider.properties.peeringLocations.join());
        });
      }
    });
  },

  /**
   * Circuit Authorization methods.
   */
  createAuthorization: function (resourceGroupName, circuitName, authName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var circuitAuth = self.getAuthorization(resourceGroupName, circuitName, authName, _);
    if (circuitAuth) {
      throw new Error(util.format($('An express route circuit authorization with name "%s" already exists in circuit "%s" in the resource group "%s"'), authName, circuitName, resourceGroupName));
    }

    circuitAuth = {
      name: authName
    };
    if (options.key) {
      circuitAuth.authorizationKey = options.key.toString('base64');
    }

    var progress = self.interaction.progress(util.format($('Creating express route circuit authorization "%s" in circuit "%s"'), authName, circuitName));
    var circuitAuthorization;
    try {
      circuitAuthorization = self.networkManagementClient.expressRouteCircuitAuthorizations.createOrUpdate(resourceGroupName, circuitName, authName, circuitAuth, _);
    } finally {
      progress.end();
    }
    self._showCircuitAuthorization(circuitAuthorization, resourceGroupName, circuitName);
  },

  setAuthorization: function (resourceGroupName, circuitName, authName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var circuitAuth = self.getAuthorization(resourceGroupName, circuitName, authName, _);
    if (!circuitAuth) {
      throw new Error(util.format($('An express route circuit authorization with name "%s" not found in circuit "%s" in the resource group "%s"'), authName, circuitName, resourceGroupName));
    }

    if (options.key) {
      circuitAuth.authorizationKey = options.key.toString('base64');
    }

    var progress = self.interaction.progress(util.format($('Setting express route circuit authorization "%s"in circuit "%s"'), authName, circuitName));
    var circuitAuthorization;
    try {
      circuitAuthorization = self.networkManagementClient.expressRouteCircuitAuthorizations.createOrUpdate(resourceGroupName, circuitName, authName, circuitAuth, _);
    } finally {
      progress.end();
    }

    self._showCircuitAuthorization(circuitAuthorization, resourceGroupName, circuitName);
  },

  showAuthorization: function (resourceGroupName, circuitName, authName, options, _) {
    var self = this;

    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var circuitAuth = self.getAuthorization(resourceGroupName, circuitName, authName, _);
    self._showCircuitAuthorization(circuitAuth, resourceGroupName, circuitName);
  },

  deleteAuthorization: function (resourceGroupName, circuitName, authName, options, _) {
    var self = this;
    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }
    var circuitAuth = self.getAuthorization(resourceGroupName, circuitName, authName, _);
    if (!circuitAuth) {
      throw new Error(util.format($('An express route circuit authorization with name "%s" not found in the circuit "%s" in resource group "%s"'), authName, circuitName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete express route circuit authorization "%s" in circuit "%s"? [y/n] '), authName, circuitName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting express route circuit authorization "%s" in circuit "%s"'), authName, circuitName));
    try {
      self.networkManagementClient.expressRouteCircuitAuthorizations.deleteMethod(resourceGroupName, circuitName, authName, null, _);
    } finally {
      progress.end();
    }
  },

  listAuthorization: function (resourceGroupName, circuitName, options, _) {
    var self = this;
    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }

    var progress = self.interaction.progress($('Getting the express route circuit authorizations'));
    var circuits = null;
    try {
      circuits = self.networkManagementClient.expressRouteCircuitAuthorizations.list(resourceGroupName, circuitName, _);
    } finally {
      progress.end();
    }
    self.interaction.formatOutput(circuits, function (circuits) {
      if (circuits.length === 0) {
        self.output.warn($('No express route circuit authorizations found'));
      } else {
        self.output.table(circuits, function (row, circuitAuth) {
          row.cell($('Name'), circuitAuth.name);
          row.cell($('Use status'), circuitAuth.authorizationUseStatus);
          row.cell($('Provisioning state'), circuitAuth.provisioningState);
        });
      }
    });
  },

  getAuthorization: function (resourceGroupName, circuitName, authName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the express route circuit authorization "%s" in circuit "%s"'), authName, circuitName));
    try {
      var circuit = self.networkManagementClient.expressRouteCircuitAuthorizations.get(resourceGroupName, circuitName, authName, null, _);
      return circuit;
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
   * Private methods
   */
  _parseCircuit: function (circuit, options, useDefaults) {
    var self = this;

    if (options.bandwidthInMbps) {
      if (isNaN(options.bandwidthInMbps)) {
        throw new Error($('--bandwidth-in-mbps parameter must be an integer'));
      }
      circuit.serviceProviderProperties.bandwidthInMbps = parseInt(options.bandwidthInMbps);
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
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(circuit, options);
      } else {
        circuit.tags = {};
      }
    }

    return circuit;
  },

  _showCircuit: function (circuit, resourceGroupName, circuitName) {
    var self = this;

    self.interaction.formatOutput(circuit, function (circuit) {
      if (circuit === null) {
        self.output.warn(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
        return;
      }

      self.output.nameValue($('Id'), circuit.id);
      self.output.nameValue($('Name'), circuit.name);
      self.output.nameValue($('Type'), circuit.type);
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
    });
  },

  _showCircuitAuthorization: function (circuitAuth, resourceGroupName, circuitName) {
    var self = this;

    self.interaction.formatOutput(circuitAuth, function (circuitAuth) {
      if (circuitAuth === null) {
        self.output.warn(util.format($('An express route circuit authorization with name "%s" not found in the circuit "%s" in resource group "%s"'), name, circuitName, resourceGroupName));
        return;
      }

      var resourceInfo = resourceUtils.getResourceInformation(circuitAuth.id);
      self.output.nameValue($('Id'), circuitAuth.id);
      self.output.nameValue($('Name'), circuitAuth.name);
      self.output.nameValue($('Type'), resourceInfo.resourceType);
      self.output.nameValue($('Use status'), circuitAuth.authorizationUseStatus);
      self.output.nameValue($('Authorization Key'), circuitAuth.authorizationKey);
      self.output.nameValue($('Provisioning state'), circuitAuth.provisioningState);
    });
  }
});

module.exports = ExpressRoute;