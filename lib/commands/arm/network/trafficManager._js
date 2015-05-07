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
var constants = require('./constants');
var tagUtils = require('../tag/tagUtils');
var $ = utils.getLocaleString;

function Traffic(cli, trafficManagerProviderClient) {
  this.cli = cli;
  this.log = cli.output;
  this.trafficManagerProviderClient = trafficManagerProviderClient;
}

__.extend(Traffic.prototype, {
  create: function (resourceGroupName, name, options, _) {
    var tmProfile = this.get(resourceGroupName, name, _);

    if (tmProfile) {
      throw new Error(util.format($('A traffic manager profile with name "%s" already exists in resource group "%s"'), name, resourceGroupName));
    }

    var progress = this.cli.interaction.progress(util.format($('Creating traffic manager profile "%s"'), name));
    var parameters = {
      profile: this._parseProfile(options, true)
    };

    try {
      this.trafficManagerProviderClient.profiles.createOrUpdate(resourceGroupName, name, parameters, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, name, options, _);
  },

  set: function (resourceGroupName, name, options, _) {
    var tmProfile = this.get(resourceGroupName, name, _);

    if (tmProfile) {
      var profile = this._parseProfile(options, false);
      if (options.profileStatus) tmProfile.profile.properties.profileStatus = profile.properties.profileStatus;
      if (options.trafficRoutingMethod) tmProfile.profile.properties.trafficRoutingMethod = profile.properties.trafficRoutingMethod;
      if (options.ttl) tmProfile.profile.properties.dnsConfig.ttl = profile.properties.dnsConfig.ttl;
      if (options.monitorProtocol) tmProfile.profile.properties.monitorConfig.protocol = profile.properties.monitorConfig.protocol;
      if (options.monitorPort) tmProfile.profile.properties.monitorConfig.port = profile.properties.monitorConfig.port;
      if (options.monitorPath) tmProfile.profile.properties.monitorConfig.path = profile.properties.monitorConfig.path;
      if (options.tags) tagUtils.appendTags(tmProfile.profile, profile.tags);
      if (options.tags === false) tmProfile.profile.tags = {};

      this.update(resourceGroupName, name, tmProfile, _);
      this.show(resourceGroupName, name, options, _);
    } else {
      throw new Error(util.format($('A traffic manager profile with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
    }
  },

  list: function (resourceGroupName, options, _) {
    var progress = this.cli.interaction.progress($('Getting traffic manager profiles'));
    var tmProfiles = null;
    try {
      tmProfiles = this.trafficManagerProviderClient.profiles.listAllInResourceGroup(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(tmProfiles.profiles, function (outputData) {
      if (outputData.length === 0) {
        output.warn(util.format($('No traffic manager profiles found in resource group "%s"'), resourceGroupName));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
          row.cell($('DNS name'), item.properties.dnsConfig.relativeName);
          row.cell($('Status'), item.properties.profileStatus);
          row.cell($('Routing method'), item.properties.trafficRoutingMethod);
          row.cell($('Monitoring protocol'), item.properties.monitorConfig.protocol);
          row.cell($('Monitoring path'), item.properties.monitorConfig.path);
          row.cell($('Monitoring port'), item.properties.monitorConfig.port);
          row.cell($('Number of endpoints'), item.properties.endpoints.length || 0);
        });
      }
    });
  },

  show: function (resourceGroupName, name, options, _) {
    var tmProfile = this.get(resourceGroupName, name, _);

    var output = this.cli.output;
    if (!tmProfile) {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A traffic manager profile with name "%s" not found in the resource group "%s"'), name, resourceGroupName));
      }
      return;
    }
    this._showProfile(tmProfile.profile);
  },

  get: function (resourceGroupName, name, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the traffic manager profile "%s"'), name));
    try {
      var tmProfile = this.trafficManagerProviderClient.profiles.get(resourceGroupName, name, _);
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

  delete: function (resourceGroupName, name, options, _) {
    var tmProfile = this.get(resourceGroupName, name, _);
    if (!tmProfile) {
      throw new Error(util.format('Traffic manager profile with name "%s" not found in the resource group "%s"', name, resourceGroupName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete traffic manager profile %s? [y/n] '), name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting traffic manager profile "%s"'), name));
    try {
      this.trafficManagerProviderClient.profiles.deleteMethod(resourceGroupName, name, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  checkDnsAvailability: function (resourceGroupName, relativeDnsName, options, _) {
    var progress = this.cli.interaction.progress($('Getting traffic manager profiles'));
    var profiles = null;
    try {
      profiles = this.trafficManagerProviderClient.profiles.listAllInResourceGroup(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var tmProfile;
    for (var i = 0; i < profiles.profiles.length; i++) {
      var item = profiles.profiles[i];
      if (item.properties.dnsConfig && item.properties.dnsConfig.relativeName === relativeDnsName.toLowerCase()) {
        tmProfile = item;
        break;
      }
    }

    if (this.log.format().json) {
      this.log.json({
        isAvailable: tmProfile ? false : true
      });
      return;
    }

    if (tmProfile) {
      this.log.warn(util.format($('The DNS name "%s" is already reserved by "%s" traffic manager profile'), relativeDnsName, tmProfile.name));
    } else {
      this.log.info(util.format($('The DNS name "%s" is available in resource group "%s"'), relativeDnsName, resourceGroupName));
    }
  },

  createEndpoint: function (resourceGroupName, profileName, endpointName, params, _) {
    var endpoint = this._parseEndpoint(endpointName, params, true);
    var trafficManager = this.get(resourceGroupName, profileName, _);
    if (!trafficManager) {
      throw new Error(util.format($('A traffic manager with name "%s" not found in the resource group "%s"'), profileName, resourceGroupName));
    }

    var output = this.cli.output;
    var ep = utils.findFirstCaseIgnore(trafficManager.profile.properties.endpoints, {name: endpointName});

    if (ep) {
      output.error(util.format($('An endpoint with name "%s" already exist in traffic manager "%s"'), endpointName, profileName));
    } else {
      trafficManager.profile.properties.endpoints.push(endpoint);
      this.update(resourceGroupName, profileName, trafficManager, _);
      this.show(resourceGroupName, profileName, params, _);
    }
  },

  setEndpoint: function (resourceGroupName, profileName, endpointName, params, _) {
    var endpoint = this._parseEndpoint(endpointName, params, false);
    var trafficManager = this.get(resourceGroupName, profileName, _);
    if (!trafficManager) {
      throw new Error(util.format($('A traffic manager with name "%s" not found in the resource group "%s"'), profileName, resourceGroupName));
    }

    var output = this.cli.output;
    var ep = utils.findFirstCaseIgnore(trafficManager.profile.properties.endpoints, {name: endpointName});

    if (ep) {
      if (params.type) ep.type = endpoint.type;
      if (params.target) ep.properties.target = endpoint.properties.target;
      if (params.endpointStatus) ep.properties.endpointStatus = endpoint.properties.endpointStatus;
      if (params.weight) ep.properties.weight = endpoint.properties.weight;
      if (params.priority) ep.properties.priority = endpoint.properties.priority;
      this.update(resourceGroupName, profileName, trafficManager, _);
      this.show(resourceGroupName, profileName, params, _);
    } else {
      output.error(util.format($('An endpoint with name "%s" not found in the traffic manager "%s"'), endpointName, profileName));
    }
  },

  deleteEndpoint: function (resourceGroupName, profileName, endpointName, params, _) {
    var trafficManager = this.get(resourceGroupName, profileName, _);
    if (!trafficManager) {
      throw new Error(util.format($('A traffic manager with name "%s" not found in the resource group "%s"'), profileName, resourceGroupName));
    }

    var output = this.cli.output;
    var index = utils.indexOfCaseIgnore(trafficManager.profile.properties.endpoints, {name: endpointName});

    if (index !== null) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete an endpoint "%s?" [y/n] '), endpointName), _)) {
        return;
      }

      trafficManager.profile.properties.endpoints.splice(index, 1);
      this.update(resourceGroupName, profileName, trafficManager, _);
    } else {
      output.error(util.format($('An endpoint with name "%s" not found in the traffic manager "%s"'), endpointName, profileName));
    }
  },

  update: function (resourceGroupName, profileName, trafficManager, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating traffic manager "%s"'), profileName));
    try {
      this.trafficManagerProviderClient.profiles.createOrUpdate(resourceGroupName, profileName, trafficManager, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  _parseEndpoint: function (endpointName, params, useDefaults) {
    var self = this;
    var output = self.cli.output;

    var endpoint = {
      name: endpointName,
      properties: {}
    };

    if (params.type) {
      endpoint.type = utils.verifyParamExistsInCollection(constants.TM_VALID_ENDPOINT_TYPES,
        params.type, 'endpoint type');

      if (endpoint.type == constants.TM_VALID_ENDPOINT_TYPES[0]) {
        endpoint.type = 'Microsoft.Network/trafficmanagerprofiles/ExternalEndpoints';
      }
    } else if (useDefaults) {
      endpoint.type = 'Microsoft.Network/trafficmanagerprofiles/ExternalEndpoints';
    }

    if (params.target) {
      if (utils.stringIsNullOrEmpty(params.target)) {
        throw new Error($('Target parameter must not be null or empty string'));
      }
      endpoint.properties.target = utils.trimTrailingChar(params.target, '.');
    }

    if (params.endpointStatus) {
      endpoint.properties.endpointStatus = utils.verifyParamExistsInCollection(constants.TM_VALID_ENDPOINT_STATUSES,
        params.endpointStatus, 'endpoint status');
    } else if (useDefaults) {
      output.warn(util.format($('Using default endpoint status: %s'), constants.TM_VALID_ENDPOINT_STATUSES[0]));
      endpoint.properties.endpointStatus = constants.TM_VALID_ENDPOINT_STATUSES[0];
    }

    if (params.weight) {
      var weightAsInt = utils.parseInt(params.weight);
      if (weightAsInt != params.weight) {
        throw new Error($('Weight parameter must be an integer'));
      }
      endpoint.properties.weight = params.weight;
    }

    if (params.priority) {
      var priorityAsInt = utils.parseInt(params.priority);
      if (priorityAsInt != params.priority) {
        throw new Error($('Priority parameter must be an integer'));
      }
      endpoint.properties.priority = params.priority;
    }

    if (params.endpointLocation) {
      endpoint.properties.endpointLocation = params.endpointLocation;
    }

    return endpoint;
  },

  _parseProfile: function (options, useDefaults) {
    var parameters = {};

    if (options.location) {
      parameters.location = options;
    } else {
      if (useDefaults) {
        parameters.location = constants.TM_DEFAULT_LOCATION;
      }
    }
    parameters.properties = {
      dnsConfig: {
        relativeName: options.relativeDnsName
      },
      endpoints: []
    };

    if (options.profileStatus) {
      utils.verifyParamExistsInCollection(constants.statuses, options.profileStatus, 'profile-status');
      parameters.properties.profileStatus = options.profileStatus;
    } else {
      if (useDefaults) {
        parameters.properties.profileStatus = constants.TM_DEFAULT_PROFILE_STATUS;
      }
    }

    if (options.trafficRoutingMethod) {
      utils.verifyParamExistsInCollection(constants.trafficRoutingMethods, options.trafficRoutingMethod, 'traffic-routing-method');
      parameters.properties.trafficRoutingMethod = options.trafficRoutingMethod;
    } else {
      if (useDefaults) {
        parameters.properties.trafficRoutingMethod = constants.TM_DEFAULT_ROUTING_METHOD;
      }
    }

    if (options.ttl) {
      var ttl = parseInt(options.ttl);
      if (!ttl || ttl < 0) {
        throw new Error('time to live parameter must be a positive integer value');
      }
      parameters.properties.dnsConfig.ttl = options.ttl;
    } else {
      if (useDefaults) {
        parameters.properties.dnsConfig.ttl = constants.TM_DEFAULT_TIME_TO_LIVE;
      }
    }

    parameters.properties.monitorConfig = {};
    if (options.monitorProtocol) {
      utils.verifyParamExistsInCollection(constants.monitorProtocols, options.monitorProtocol, 'monitor-protocol');
      parameters.properties.monitorConfig.protocol = options.monitorProtocol;
    } else {
      if (useDefaults) {
        parameters.properties.monitorConfig.protocol = constants.TM_DEFAULT_MONITOR_PROTOCOL;
      }
    }

    if (options.monitorPort) {
      var monitorPort = parseInt(options.monitorPort);
      if (!monitorPort || monitorPort < 0) {
        throw new Error('monitor port parameter must be a positive integer value');
      }
      parameters.properties.monitorConfig.port = options.monitorPort;
    } else {
      if (useDefaults) {
        if (parameters.properties.monitorConfig.protocol === 'http') {
          parameters.properties.monitorConfig.port = constants.TM_DEFAULT_MONITOR_PORT.http;
        }
        if (parameters.properties.monitorConfig.protocol === 'https') {
          parameters.properties.monitorConfig.port = constants.TM_DEFAULT_MONITOR_PORT.https;
        }
      }
    }

    if (options.monitorPath) {
      parameters.properties.monitorConfig.path = options.monitorPath;
    }

    if (options.tags) {
      var tags = tagUtils.buildTagsParameter(null, options);
      parameters.tags = tags;
    } else {
      this.log.verbose($('No tags specified'));
    }

    return parameters;
  },

  _showProfile: function (tmProfile) {
    var output = this.cli.output;
    this.cli.interaction.formatOutput(tmProfile, function (tmProfile) {
      output.nameValue($('Id'), tmProfile.id);
      output.nameValue($('Name'), tmProfile.name);
      output.nameValue($('Type'), tmProfile.type);
      output.nameValue($('Location'), tmProfile.location);
      output.nameValue($('Status'),  tmProfile.properties.profileStatus);
      output.nameValue($('Routing method'), tmProfile.properties.trafficRoutingMethod);
      output.nameValue($('DNS name'), tmProfile.properties.dnsConfig.relativeName);
      output.nameValue($('Time to live'), tmProfile.properties.dnsConfig.ttl);
      output.nameValue($('Monitoring protoco'),  tmProfile.properties.monitorConfig.protocol);
      output.nameValue($('Monitoring path'), tmProfile.properties.monitorConfig.path);
      output.nameValue($('Monitoring port'), tmProfile.properties.monitorConfig.port);
      output.nameValue($('Tags'),  tagUtils.getTagsInfo(tmProfile.tags));

      var endpoints = tmProfile.properties.endpoints;
      if (endpoints.length !== 0) {
        output.header($('Endpoints'));
        output.table(endpoints, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.properties.endpointLocation || '');
          row.cell($('Target'), item.properties.target);
          row.cell($('Status'), item.properties.endpointStatus);
          row.cell($('Weight'), item.properties.weight);
          row.cell($('Priority'), item.properties.priority);
          row.cell($('Type'), item.type);
        });
      }
    });
  }
});

module.exports = Traffic;