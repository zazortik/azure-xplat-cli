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
var validation = require('../../../util/validation');
var $ = utils.getLocaleString;
var constants = require('./constants');
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
var VNetUtil = require('../../../util/vnet.util');

function ExpressRoute(cli, networkManagementClient) {
  this.networkManagementClient = networkManagementClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
  this.vnetUtil = new VNetUtil();
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
          var bandwidths = provider.bandwidthsOffered.map(function (b) {
            return b.offerName;
          });
          row.cell($('Bandwidths offered'), bandwidths);
          row.cell($('Peering locations'), provider.peeringLocations.join());
        });
      }
    });
  },

  /**
   * Circuid peering methods
   */
  createPeering: function (resourceGroupName, circuitName, peeringName, options, _) {
    var self = this;
    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }
    var peering = self.getPeering(resourceGroupName, circuitName, peeringName, options, _);
    if (peering) {
      throw new Error(util.format($('An express route circuit peering with name "%s" already exists in circuit "%s" in the resource group "%s"'),
        peeringName, circuitName, resourceGroupName));
    }

    peering = {
      name: peeringName
    };
    peering = self._parseCircuitPeering(peering, options, true, circuit.sku.tier);

    var progress = self.interaction.progress(util.format($('Creating express route peering "%s" in circuit "%s"'), peeringName, circuitName));
    var createdPeering;
    try {
      createdPeering = self.networkManagementClient.expressRouteCircuitPeerings.createOrUpdate(resourceGroupName, circuitName,
        peeringName, peering, options, _);
    } finally {
      progress.end();
    }
    self._showPeering(createdPeering);
  },

  getPeering: function (resourceGroupName, circuitName, peeringName, options, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the express route circuit "%s" peering "%s"'), circuitName, peeringName));
    try {
      var peering = self.networkManagementClient.expressRouteCircuitPeerings.get(resourceGroupName, circuitName, peeringName, options, _);
      return peering;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  setPeering: function (resourceGroupName, circuitName, peeringName, options, _) {
    var self = this;
    var circuit = self.getCircuit(resourceGroupName, circuitName, _);
    if (!circuit) {
      throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
    }
    var peering = self.getPeering(resourceGroupName, circuitName, peeringName, options, _);
    if (!peering) {
      self.output.warn(util.format($('An express route circuit peering with name "%s" not found in circuit "%s" in the resource group "%s"'), peeringName, circuitName, resourceGroupName));
    }
    peering = self._parseCircuitPeering(peering, options, false);
    delete peering.state;
    var progress = self.interaction.progress(util.format($('Setting express route peering "%s" in circuit "%s"'), peeringName, circuitName));
    var updatedPeering;
    try {
      updatedPeering = self.networkManagementClient.expressRouteCircuitPeerings.createOrUpdate(resourceGroupName, circuitName, peeringName, peering, options, _);
    } finally {
      progress.end();
    }
    self._showPeering(updatedPeering);
  },

  showPeering: function (resourceGroupName, circuitName, peeringName, options, _) {
    var self = this;
    var peering = self.getPeering(resourceGroupName, circuitName, peeringName, options, _);
    if (!peering) {
      self.output.warn(util.format($('An express route circuit peering with name "%s" not found in the circuit "%s" in resource group "%s"'), peeringName, circuitName, resourceGroupName));
      return;
    }
    self._showPeering(peering);
  },

  listPeering: function (resourceGroupName, circuitName, options, _) {
    var self = this;
    var progress = self.interaction.progress($('Getting the express route circuit peerings'));
    var peerings;

    try {
      var circuit = self.getCircuit(resourceGroupName, circuitName, _);
      if (!circuit) {
        throw new Error(util.format($('An express route circuit with name "%s" not found in the resource group "%s"'), circuitName, resourceGroupName));
      }
      peerings = circuit.peerings;
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(peerings, function (peerings) {
      if (!peerings || peerings.length === 0) {
        self.output.warn($('No express route peerings found'));
      } else {
        self.output.table(peerings, function (row, peering) {
          row.cell($('Name'), peering.name);
          row.cell($('Provisioning State'), peering.provisioningState);
          row.cell($('Peering Type'), peering.peeringType);
          row.cell($('State'), peering.state);
          row.cell($('Vlan Id'), peering.vlanId);
        });
      }
    });
  },

  deletePeering: function (resourceGroupName, circuitName, peeringName, options, _) {
    var self = this;

    var peering = self.getPeering(resourceGroupName, circuitName, peeringName, options, _);
    if (!peering) {
      self.output.warn(util.format($('An express route circuit peering with name "%s" not found in the circuit "%s" in resource group "%s"'), peeringName, circuitName, resourceGroupName));
      return;
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete express route circuit peering "%s" from circuit "%s"? [y/n] '), peeringName, circuitName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting express route circuit peering "%s"'), peeringName));
    try {
      self.networkManagementClient.expressRouteCircuitPeerings.deleteMethod(resourceGroupName, circuitName, peeringName, _);
    } finally {
      progress.end();
    }
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
      circuit.serviceProviderProperties.bandwidthInMbps = validation.isInt(options.bandwidthInMbps, {}, '--bandwidth-in-mbps');
    } else if (useDefaults) {
      circuit.serviceProviderProperties.bandwidthInMbps = utils.takeDefault(self.output, constants.expressRoute.defBandwidthInMbps, '--bandwidth-in-mbps');
    }

    if (options.skuTier) {
      circuit.sku.tier = validation.isIn(options.skuTier, constants.expressRoute.tier, '--sku-tier');
    } else if (useDefaults) {
      circuit.sku.tier = utils.takeDefault(self.output, constants.expressRoute.tier[0], '--sku-tier');
    }

    if (options.skuFamily) {
      circuit.sku.family = validation.isIn( options.skuFamily, constants.expressRoute.family, '--sku-family');
    } else if (useDefaults) {
      circuit.sku.family = utils.takeDefault(self.output, constants.expressRoute.family[0], '--sku-family');
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

  _parseCircuitPeering: function (peering, options, useDefaults, skuTier) {
    var self = this;
    peering.properties = {};
    if (options.type) {
      peering.peeringType = utils.verifyParamExistsInCollection(constants.expressRoute.peering.type, options.type, '--type');
      if (peering.peeringType === constants.expressRoute.peering.premiumType && skuTier !== constants.expressRoute.tier[1]) {
        self.output.warn(util.format($('Express route circuit sku tier must be "%s" to add "%s"'),
          constants.expressRoute.tier[1] && constants.expressRoute.peering.premiumType));
      }
    } else {
      if (useDefaults) {
        peering.peeringType = constants.expressRoute.peering.type[0];
        self.output.warn(util.format($('Using default peering type: %s'), peering.peeringType));
      }
    }

    if (options.azureAsn) {
      peering.azureASN = parseInt(options.azureAsn);
    }

    if (options.peerAsn) {
      peering.peerASN = parseInt(options.peerAsn);
    }

    if (options.primaryAddressPrefix) {
      self._validateAddressPrefix(options.primaryAddressPrefix);
      peering.primaryPeerAddressPrefix = options.primaryAddressPrefix;
    }

    if (options.secondaryAddressPrefix) {
      self._validateAddressPrefix(options.secondaryAddressPrefix);
      peering.secondaryPeerAddressPrefix = options.secondaryAddressPrefix;
    }

    if (options.primaryAzurePort) {
      peering.primaryAzurePort = options.primaryAzurePort;
    }

    if (options.secondaryPeerAddressPrefix) {
      peering.secondaryPeerAddressPrefix = options.secondaryPeerAddressPrefix;
    }

    if (options.sharedKey) {
      peering.sharedKey = options.sharedKey;
    }

    if (options.vlanId) {
      peering.vlanId = parseInt(options.vlanId);
    }

    if (peering.peeringType.toLowerCase() !== 'microsoftpeering') {
      return peering;
    }

    if (useDefaults) {
      peering.microsoftPeeringConfig = {};
    }

    if (options.msAdvertisedPublicPrefixes) {
      var addressPrefixes = options.msAdvertisedPublicPrefixes.split(',');

      peering.microsoftPeeringConfig.advertisedPublicPrefixes = [];
      addressPrefixes.forEach(function (prefix) {
        prefix = prefix.trim();
        self._validateAddressPrefix(prefix);
        peering.microsoftPeeringConfig.advertisedPublicPrefixes.push(prefix);
      });
    }

    if (options.msAdvertisedPublicPrefixState) {
      peering.microsoftPeeringConfig.advertisedPublicPrefixesState = utils.verifyParamExistsInCollection(
        constants.expressRoute.peering.publicPrefixState, options.msAdvertisedPublicPrefixState, '--ms-advertised-public-prefix-state');
    } else {
      if (useDefaults) {
        peering.microsoftPeeringConfig.advertisedPublicPrefixesState = constants.expressRoute.peering.publicPrefixState[0];
        self.output.warn(util.format($('Using default peering config: %s'), peering.microsoftPeeringConfig.advertisedPublicPrefixesState));
      }
    }

    if (options.msCustomerAsn) {
      peering.microsoftPeeringConfig.customerASN = parseInt(options.msCustomerAsn);
    }

    if (options.msRoutingRegistryName) {
      peering.microsoftPeeringConfig.routingRegistryName = utils.verifyParamExistsInCollection(
        constants.expressRoute.peering.registryName, options.msRoutingRegistryName, '--ms-routing-registry-name');
    } else {
      if (useDefaults) {
        peering.microsoftPeeringConfig.routingRegistryName = constants.expressRoute.peering.registryName[0];
        self.output.warn(util.format($('Using default peering routing registry name: %s'), peering.microsoftPeeringConfig.routingRegistryName));
      }
    }
    return peering;
  },

  _validateAddressPrefix: function (addressPrefix) {
    var self = this;

    if (utils.stringIsNullOrEmpty(addressPrefix)) {
      throw new Error($('address prefix parameter must not be null or empty string'));
    }

    var ipValidationResult = self.vnetUtil.parseIPv4Cidr(addressPrefix);
    if (ipValidationResult.error) {
      throw new Error($(ipValidationResult.error));
    }
    if (ipValidationResult.cidr === null) {
      throw new Error($('The --address-prefix must be in cidr format (---.---.---.---/cidr)'));
    }
  },

  _showPeering: function (peering) {
    var self = this;
    self.interaction.formatOutput(peering, function (peering) {
      if (peering === null) {
        self.output.warn(util.format($('An express route circuit peering with name "%s" not found in the circuit "%s" in resource group "%s"'), peeringName, circuitName, resourceGroupName));
      } else {
        var resourceInfo = resourceUtils.getResourceInformation(peering.id);
        self.output.nameValue($('Name'), peering.name);
        self.output.nameValue($('Id'), peering.id);
        self.output.nameValue($('Type'), resourceInfo.resourceType);
        self.output.nameValue($('Etag'), peering.etag);

        var indent = 2;
        self.output.header($('Properties'));
        self.output.nameValue($('Provisioning State'), peering.provisioningState, indent);
        self.output.nameValue($('Peering Type'), peering.peeringType, indent);
        self.output.nameValue($('Peer ASN'), peering.peerASN, indent);
        self.output.nameValue($('Primary Peer Address Prefix'), peering.primaryPeerAddressPrefix, indent);
        self.output.nameValue($('Secondary Peer Address Prefix'), peering.secondaryPeerAddressPrefix, indent);
        self.output.nameValue($('Primary Azure Port'), peering.primaryAzurePort, indent);
        self.output.nameValue($('Secondary Azure Port'), peering.secondaryAzurePort, indent);
        self.output.nameValue($('State'), peering.state, indent);
        self.output.nameValue($('Azure ASN'), peering.azureASN, indent);
        self.output.nameValue($('Shared Key'), peering.sharedKey, indent);
        self.output.nameValue($('Vlan Id'), peering.vlanId, indent);

        if (peering.microsoftPeeringConfig) {
          self.output.header($('Microsoft Peering Config'), indent);
          indent += 2;
          self.output.header($('Advertised Public Prefixes'), indent);
          self.output.list(peering.microsoftPeeringConfig.advertisedPublicPrefixes, indent + 2);
          self.output.nameValue($('Advertised Public Prefix State'), peering.microsoftPeeringConfig.advertisedPublicPrefixesState, indent);
          self.output.nameValue($('Customer Asn'), peering.microsoftPeeringConfig.customerASN, indent);
          self.output.nameValue($('Routing Registry Name'), peering.microsoftPeeringConfig.routingRegistryName, indent);
        }
      }
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