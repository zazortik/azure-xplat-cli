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
var tagUtils = require('../tag/tagUtils');

function TrafficManager(cli, trafficManagerManagementClient) {
  this.trafficManagerManagementClient = trafficManagerManagementClient;
  this.output = cli.output;
  this.interaction = cli.interaction;
}

__.extend(TrafficManager.prototype, {
  /**
   * TrafficManager Profile methods
   */
  createProfile: function (resourceGroupName, profileName, options, _) {
    var self = this;

    var profile = self.getProfile(resourceGroupName, profileName, _);
    if (profile) {
      throw new Error(util.format($('A Traffic Manager profile with name "%s" already exists in resource group "%s"'), profileName, resourceGroupName));
    }

    profile = {
      location: constants.trafficManager.defLocation,
      properties: {
        dnsConfig: {
          relativeName: options.relativeDnsName
        },
        monitorConfig: {},
        endpoints: []
      }
    };

    var parameters = self._parseProfile(profile, options, true);
    var progress = self.interaction.progress(util.format($('Creating Traffic Manager profile "%s"'), profileName));
    try {
      profile = self.trafficManagerManagementClient.profiles.createOrUpdate(resourceGroupName, profileName, parameters, _);
    } finally {
      progress.end();
    }

    self._showProfile(resourceGroupName, profile.profile);
  },

  setProfile: function (resourceGroupName, profileName, options, _) {
    var self = this;

    var profile = self.getProfile(resourceGroupName, profileName, _);
    if (!profile) {
      throw new Error(util.format($('A Traffic Manager profile with name "%s" not found in resource group "%s"'), profileName, resourceGroupName));
    }

    var parameters = self._parseProfile(profile, options, false);
    var progress = self.interaction.progress(util.format($('Updating Traffic Manager profile "%s"'), profileName));
    try {
      profile = self.trafficManagerManagementClient.profiles.createOrUpdate(resourceGroupName, profileName, parameters, _);
    } finally {
      progress.end();
    }

    self._showProfile(resourceGroupName, profile.profile);
  },

  listProfiles: function (resourceGroupName, options, _) {
    var self = this;

    var progress = self.interaction.progress($('Getting Traffic Manager profiles'));
    var profiles = null;
    try {
      profiles = self.trafficManagerManagementClient.profiles.listAllInResourceGroup(resourceGroupName, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(profiles.profiles, function (profiles) {
      if (profiles.length === 0) {
        self.output.warn(util.format($('No Traffic Manager profiles found in resource group "%s"'), resourceGroupName));
      } else {
        self.output.table(profiles, function (row, profile) {
          row.cell($('Name'), profile.name);
          row.cell($('Status'), profile.properties.profileStatus);
          row.cell($('DNS name'), profile.properties.dnsConfig.relativeName);
          row.cell($('TTL'), profile.properties.dnsConfig.ttl);
          row.cell($('Routing method'), profile.properties.trafficRoutingMethod);
          row.cell($('Monitoring protocol'), profile.properties.monitorConfig.protocol);
          row.cell($('Monitoring path'), profile.properties.monitorConfig.path);
          row.cell($('Monitoring port'), profile.properties.monitorConfig.port);
          row.cell($('Number of endpoints'), profile.properties.endpoints.length || 0);
        });
      }
    });
  },

  showProfile: function (resourceGroupName, profileName, options, _) {
    var self = this;
    var profile = self.getProfile(resourceGroupName, profileName, _);

    self._showProfile(resourceGroupName, profile);
  },

  getProfile: function (resourceGroupName, profileName, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the Traffic Manager profile "%s"'), profileName));
    try {
      var profile = self.trafficManagerManagementClient.profiles.get(resourceGroupName, profileName, _);
      return profile.profile;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  deleteProfile: function (resourceGroupName, profileName, options, _) {
    var self = this;
    var profile = self.getProfile(resourceGroupName, profileName, _);

    if (!profile) {
      throw new Error(util.format('Traffic Manager profile with name "%s" not found in the resource group "%s"', profileName, resourceGroupName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete Traffic Manager profile "%s" ? [y/n] '), profileName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting Traffic Manager profile "%s"'), profileName));
    try {
      self.trafficManagerManagementClient.profiles.deleteMethod(resourceGroupName, profileName, _);
    } finally {
      progress.end();
    }
  },

  checkDnsAvailability: function (relativeDnsName, options, _) {
    var self = this;
    var parameters = {
      name: relativeDnsName,
      type: 'Microsoft.Network/trafficManagerProfiles'
    };

    var progress = self.interaction.progress($('Checking DNS name availability'));
    var result;
    try {
      result = self.trafficManagerManagementClient.profiles.checkTrafficManagerRelativeDnsNameAvailability(parameters, _);
    } finally {
      progress.end();
    }

    self.interaction.formatOutput(result, function (result) {
      if (result.nameAvailable === true) {
        self.output.info(util.format($('The DNS name "%s" is available'), result.name));
      } else {
        self.output.warn(result.message);
      }
    });
  },

  /**
   * TrafficManager Endpoints methods
   */
  createEndpoint: function (resourceGroupName, profileName, endpointName, options, _) {
    var self = this;
    utils.verifyParamExistsInCollection(constants.trafficManager.endpointType, options.type, '--type');

    if (utils.ignoreCaseEquals(options.type, constants.trafficManager.azureType)) {
      if (options.location) {
        throw new Error($('The --location should only be specified on endpoints of type \'ExternalEndpoints\' and \'NestedEndpoints\''));
      }
    } else {
      options.location = self.interaction.promptIfNotGiven($('Endpoint location: '), options.location, _);
    }

    var endpoint = self.getEndpoint(resourceGroupName, profileName, endpointName, options.type, _);
    if (endpoint) {
      throw new Error(util.format($('An endpoint with name "%s" already exists in Traffic Manager profile "%s"'), endpointName, profileName));
    }

    endpoint = {
      name: endpointName,
      properties: {}
    };

    var parameters = self._parseEndpoint(endpoint, options);
    var progress = self.interaction.progress(util.format($('Creating endpoint with name "%s" in Traffic Manager profile "%s"'), endpointName, profileName));
    try {
      endpoint = self.trafficManagerManagementClient.endpoints.createOrUpdate(resourceGroupName, profileName, options.type, endpointName, parameters, _);
    } finally {
      progress.end();
    }

    self._showEndpoint(profileName, endpointName, endpoint.endpoint);
  },

  setEndpoint: function (resourceGroupName, profileName, endpointName, options, _) {
    var self = this;

    var endpoint = self.getEndpoint(resourceGroupName, profileName, endpointName, options.type, _);
    if (!endpoint) {
      throw new Error(util.format($('An endpoint with name "%s" not found in Traffic Manager profile "%s"'), endpointName, profileName));
    }

    var parameters = self._parseEndpoint(endpoint, options);
    var progress = self.interaction.progress(util.format($('Updating endpoint "%s"'), endpointName));
    try {
      endpoint = self.trafficManagerManagementClient.endpoints.createOrUpdate(resourceGroupName, profileName, options.type, endpointName, parameters, _);
    } finally {
      progress.end();
    }

    self._showEndpoint(profileName, endpointName, endpoint.endpoint);
  },

  showEndpoint: function (resourceGroupName, profileName, endpointName, options, _) {
    var self = this;
    utils.verifyParamExistsInCollection(constants.trafficManager.endpointType, options.type, '--type');

    var endpoint = self.getEndpoint(resourceGroupName, profileName, endpointName, options.type, _);
    self._showEndpoint(profileName, endpointName, endpoint);
  },

  getEndpoint: function (resourceGroupName, profileName, endpointName, endpointType, _) {
    var self = this;
    var progress = self.interaction.progress(util.format($('Looking up the endpoint with name "%s" in Traffic Manager profile "%s"'), endpointName, profileName));
    try {
      var endpoint = self.trafficManagerManagementClient.endpoints.get(resourceGroupName, profileName, endpointType, endpointName, _);
      return endpoint.endpoint;
    } catch (e) {
      if (e.statusCode === 404) {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  deleteEndpoint: function (resourceGroupName, profileName, endpointName, options, _) {
    var self = this;
    utils.verifyParamExistsInCollection(constants.trafficManager.endpointType, options.type, '--type');

    var endpoint = self.getEndpoint(resourceGroupName, profileName, endpointName, options.type, _);
    if (!endpoint) {
      throw new Error(util.format('An endpoint with name "%s" not found in Traffic Manager profile "%s"', endpointName, profileName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete endpoint "%s" ? [y/n] '), endpointName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting endpoint "%s"'), endpointName));
    try {
      self.trafficManagerManagementClient.endpoints.deleteMethod(resourceGroupName, profileName, options.type, endpointName, _);
    } finally {
      progress.end();
    }
  },

  /**
   * Interntal methods
   */
  _parseProfile: function (profile, options, useDefaults) {
    var self = this;

    if (options.profileStatus) {
      profile.properties.profileStatus = utils.verifyParamExistsInCollection(constants.trafficManager.status, options.profileStatus, '--profile-status');
    }

    if (options.trafficRoutingMethod) {
      profile.properties.trafficRoutingMethod = utils.verifyParamExistsInCollection(constants.trafficManager.routingMethod, options.trafficRoutingMethod, '--traffic-routing-method');
    } else if (useDefaults) {
      var defRoutingMethod = constants.trafficManager.routingMethod[0];
      self.output.warn(util.format($('Using default routing method: %s'), defRoutingMethod));
      profile.properties.trafficRoutingMethod = defRoutingMethod;
    }

    if (options.ttl) {
      var ttl = parseInt(options.ttl);
      if (!ttl || ttl < 0) {
        throw new Error('time to live parameter must be a positive integer value');
      }
      profile.properties.dnsConfig.ttl = options.ttl;
    } else if (useDefaults) {
      var defTtl = constants.trafficManager.defTtl;
      self.output.warn(util.format($('Using default ttl: %s'), defTtl));
      profile.properties.dnsConfig.ttl = defTtl;
    }

    if (options.monitorProtocol) {
      profile.properties.monitorConfig.protocol = utils.verifyParamExistsInCollection(constants.trafficManager.protocols, options.monitorProtocol, '--monitor-protocol');
    } else if (useDefaults) {
      var defProtocol = constants.trafficManager.protocols[0];
      self.output.warn(util.format($('Using default monitor protocol: %s'), defProtocol));
      profile.properties.monitorConfig.protocol = defProtocol;
    }

    if (options.monitorPort) {
      var monitorPort = parseInt(options.monitorPort);
      if (!monitorPort || monitorPort < 0) {
        throw new Error('monitor port parameter must be a positive integer value');
      }
      profile.properties.monitorConfig.port = options.monitorPort;
    } else if (useDefaults) {
      var defPort;
      if (profile.properties.monitorConfig.protocol === 'http') {
        defPort = constants.trafficManager.unsecurePort;
      }
      if (profile.properties.monitorConfig.protocol === 'https') {
        defPort = constants.trafficManager.securePort;
      }
      self.output.warn(util.format($('Using default monitor port: %s'), defPort));
      profile.properties.monitorConfig.port = defPort;
    }

    if (options.monitorPath) {
      if (!utils.stringStartsWith(options.monitorPath, '/', true)) {
        self.output.warn(util.format($('The monitoring path "%s" must start with a forward slash, slash added'), options.monitorPath));
        options.monitorPath = '/' + options.monitorPath;
      }
      profile.properties.monitorConfig.path = options.monitorPath;
    } else if (useDefaults) {
      var defPath = constants.trafficManager.defMonitorPath;
      self.output.warn(util.format($('Using default monitor path: %s'), defPath));
      profile.properties.monitorConfig.path = defPath;
    }

    if (options.tags) {
      if (utils.argHasValue(options.tags)) {
        tagUtils.appendTags(profile, options);
      } else {
        profile.tags = {};
      }
    }

    var parameters = {
      profile: profile
    };

    return parameters;
  },

  _parseEndpoint: function (endpoint, options) {
    var self = this;
    var typePrefix = constants.trafficManager.typePrefix;

    if (options.type) {
      utils.verifyParamExistsInCollection(constants.trafficManager.endpointType, options.type, '--type');
      endpoint.type = typePrefix + options.type;
    }

    if (options.target && options.targetResourceId) {
      throw new Error($('--target and --target-resource-id parameters are mutually exclusive'));
    }

    if (options.target) {
      if (!utils.ignoreCaseEquals(endpoint.type, typePrefix + constants.trafficManager.externalType)) {
        throw new Error(util.format($('--target parameter is valid only for endpoint of type "%s"'), constants.trafficManager.externalType));
      }
      if (utils.stringEndsWith(options.target, '.', true)) {
        self.output.warn(util.format($('The domain name "%s" ends with a dot, dot removed'), options.target));
        options.target = utils.trimTrailingChar(options.target, '.');
      }
      endpoint.properties.target = options.target;
    }

    if (options.targetResourceId) {
      if (!utils.ignoreCaseEquals(endpoint.type, typePrefix + constants.trafficManager.azureType) && !utils.ignoreCaseEquals(endpoint.type, typePrefix + constants.trafficManager.nestedType)) {
        throw new Error(util.format($('--target-resource-id parameter is valid only for endpoint of type "%s" or "%s"'), constants.trafficManager.azureType, constants.trafficManager.nestedType));
      }
      endpoint.properties.targetResourceId = options.targetResourceId;
    }

    if (options.location) {
      endpoint.properties.endpointLocation = options.location;
    }

    if (options.status) {
      endpoint.properties.endpointStatus = utils.verifyParamExistsInCollection(constants.trafficManager.status, options.status, '--status');
    }

    if (options.weight) {
      var weight = utils.parseInt(options.weight);
      if (isNaN(weight) || weight < constants.trafficManager.weightMin || weight > constants.trafficManager.weightMax) {
        throw new Error(util.format($('--weight must be an integer between %s and %s'), constants.trafficManager.weightMin, constants.trafficManager.weightMax));
      }
      endpoint.properties.weight = weight;
    }

    if (options.priority) {
      var priority = utils.parseInt(options.priority);
      if (isNaN(priority) || priority < constants.trafficManager.priorityMin || priority > constants.trafficManager.priorityMax) {
        throw new Error(util.format($('--priority must be an integer between %s and %s'), constants.trafficManager.priorityMin, constants.trafficManager.priorityMax));
      }
      endpoint.properties.priority = priority;
    }

    var parameters = {
      endpoint: endpoint
    };

    return parameters;
  },

  _showProfile: function (resourceGroupName, profile) {
    var self = this;
    self.interaction.formatOutput(profile, function (profile) {
      if (profile === null) {
        self.output.warn(util.format($('A Traffic Manager profile with name "%s" not found in the resource group "%s"'), profile.name, resourceGroupName));
      } else {
        self.output.nameValue($('Id'), profile.id);
        self.output.nameValue($('Name'), profile.name);
        self.output.nameValue($('Type'), profile.type);
        self.output.nameValue($('Status'), profile.properties.profileStatus);
        self.output.nameValue($('Routing method'), profile.properties.trafficRoutingMethod);
        self.output.nameValue($('Tags'), tagUtils.getTagsInfo(profile.tags));
        self.output.header($('DNS config'));
        self.output.nameValue($('Relative name'), profile.properties.dnsConfig.relativeName, 2);
        self.output.nameValue($('FQDN'), profile.properties.dnsConfig.fqdn, 2);
        self.output.nameValue($('TTL'), profile.properties.dnsConfig.ttl, 2);
        self.output.header($('Monitor config'));
        self.output.nameValue($('Protocol'), profile.properties.monitorConfig.protocol, 2);
        self.output.nameValue($('Port'), profile.properties.monitorConfig.port, 2);
        self.output.nameValue($('Path'), profile.properties.monitorConfig.path, 2);

        var endpoints = profile.properties.endpoints;
        if (endpoints.length !== 0) {
          self.output.header($('Endpoints'));
          self.output.table(endpoints, function (row, ep) {
            row.cell($('Name'), ep.name);
            row.cell($('Target'), ep.properties.target);
            row.cell($('Status'), ep.properties.endpointStatus);
            row.cell($('Location'), ep.properties.endpointLocation || '');
            row.cell($('Weight'), ep.properties.weight);
            row.cell($('Priority'), ep.properties.priority);
            row.cell($('Type'), ep.type.replace(constants.trafficManager.typePrefix, ''));
          });
        }
      }
    });
  },

  _showEndpoint: function (profileName, endpointName, endpoint) {
    var self = this;
    self.interaction.formatOutput(endpoint, function (endpoint) {
      if (endpoint === null) {
        self.output.warn(util.format($('An endpoint with name "%s" not found in Traffic Manager profile "%s"'), endpointName, profileName));
      } else {
        self.output.nameValue($('Id'), endpoint.id);
        self.output.nameValue($('Name'), endpoint.name);
        self.output.nameValue($('Type'), endpoint.type);
        self.output.nameValue($('Location'), endpoint.properties.endpointLocation);
        self.output.nameValue($('Status'), endpoint.properties.endpointStatus);
        self.output.nameValue($('Target'), endpoint.properties.target);
        self.output.nameValue($('Target resource id'), endpoint.properties.targetResourceId);
        self.output.nameValue($('Weight'), endpoint.properties.weight);
        self.output.nameValue($('Priority'), endpoint.properties.priority);
      }
    });
  }
});

module.exports = TrafficManager;