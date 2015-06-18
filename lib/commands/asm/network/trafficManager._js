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
var EndPointUtil = require('../../../util/endpointUtil');
var $ = utils.getLocaleString;

function TrafficManager(cli, trafficManagerManagementClient) {
  this.cli = cli;
  this.trafficManagerManagementClient = trafficManagerManagementClient;
}

__.extend(TrafficManager.prototype, {
  create: function (profileName, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      var profileProgress = this.cli.interaction.progress(util.format($('Creating traffic manager profile "%s"'), profileName));
      try {
        this.trafficManagerManagementClient.profiles.create(profileName, options.domainName, _);
      } finally {
        profileProgress.end();
      }
      tmProfile = this.getProfile(profileName, _);
    }

    if (tmProfile.profile.definitions.length > 0) {
      throw new Error(util.format($('Traffic manager profile "%s" already exists'), profileName));
    }

    var tmDefConfig = this._prepareDefinition(options);

    var definitionProgress = this.cli.interaction.progress(util.format($('Creating traffic manager definition for profile "%s"'), profileName));
    try {
      this.trafficManagerManagementClient.definitions.create(profileName, tmDefConfig, _);
    } finally {
      definitionProgress.end();
    }

    var tmDefinition = this.getDefinition(profileName, _);
    this._showTrafficManager(profileName, tmProfile, tmDefinition);
  },

  set: function (profileName, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format($('Traffic manager "%s" not found'), profileName));
    }

    var tmDefinition = this.getDefinition(profileName, _);
    if (!tmDefinition) {
      tmDefinition = this._prepareDefinition(options);
    } else {
      tmDefinition = tmDefinition.definition;
      this._validateDefinitionOptions(options, false);
      if (options.ttl) tmDefinition.dnsOptions.timeToLiveInSeconds = options.ttl;
      if (options.monitorRelativePath) tmDefinition.monitors[0].httpOptions.relativePath = options.monitorRelativePath;
      if (options.monitorPort) tmDefinition.monitors[0].port = options.monitorPort;
      if (options.monitorProtocol) tmDefinition.monitors[0].protocol = options.monitorProtocol;
      if (options.loadBalancingMethod) tmDefinition.policy.loadBalancingMethod = options.loadBalancingMethod;
    }

    var definitionProgress = this.cli.interaction.progress(util.format($('Updating traffic manager "%s"'), profileName));
    try {
      this.trafficManagerManagementClient.definitions.create(profileName, tmDefinition, _);
    } finally {
      definitionProgress.end();
    }

    tmDefinition = this.getDefinition(profileName, _);
    this._showTrafficManager(profileName, tmProfile, tmDefinition);
  },

  show: function (profileName, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    var tmDefinition = this.getDefinition(profileName, _);
    this._showTrafficManager(profileName, tmProfile, tmDefinition);
  },

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
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete traffic manager profile "%s"? [y/n] '), profileName), _)) {
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
    var output = this.cli.output;
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      if (output.format().json) {
        output.json({});
      } else {
        throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
      }
    } else {
      var definitionVersionNumber = tmProfile.profile.definitions[0].version;
      this.update(profileName, 'Enabled', definitionVersionNumber, _);
      this.show(profileName, options, _);
    }
  },

  disable: function (profileName, options, _) {
    var output = this.cli.output;
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      if (output.format().json) {
        output.json({});
      } else {
        throw new Error(util.format('Traffic manager profile with name "%s" not found', profileName));
      }
    } else {
      var definitionVersionNumber = tmProfile.profile.definitions[0].version;
      this.update(profileName, 'Disabled', definitionVersionNumber, _);
      this.show(profileName, options, _);
    }
  },

  getDefinition: function (profileName, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the traffic manager definition "%s"'), profileName));
    try {
      var tmDefinition = this.trafficManagerManagementClient.definitions.get(profileName, _);
      return tmDefinition;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  getProfile: function (profileName, _) {
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
  },

  createEndpoint: function (profileName, domainName, endpointType, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format($('Traffic manager profile with name "%s" not found'), profileName));
    }

    var tmDefinition = this.getDefinition(profileName, _).definition;

    if (utils.findFirstCaseIgnore(tmDefinition.policy.endpoints, {domainName: domainName})) {
      throw new Error(util.format($('An endpoint with name "%s" already exists for traffic manager profile "%s"'), domainName, profileName));
    }

    var endpoint = {
      domainName: domainName,
      status: constants.trafficManager.endpoints.statuses[0],
      type: utils.verifyParamExistsInCollection(constants.trafficManager.endpoints.types,
        endpointType, 'endpoint type')
    };

    if (options.endpointLocation) {
      endpoint.endpointLocation = options.endpointLocation;
    }
    if (options.endpointStatus) {
      endpoint.endpointStatus = utils.verifyParamExistsInCollection(constants.trafficManager.endpoints.statuses,
        options.endpointStatus, 'endpoint status');
    }
    if (options.weight) {
      endpoint.weight = options.weight;
    }
    if (options.minChildEndpoint) {
      if (endpoint.type === constants.trafficManager.endpoints.types[0]) {
        endpoint.minChildEndpoint = options.minChildEndpoint;
      } else {
        this.cli.output.warn(util.format($('--min-child-endpoint will be ignored for %s endpoint type'), options.type));
      }
    }

    tmDefinition.policy.endpoints.push(endpoint);

    var progress = this.cli.interaction.progress(util.format($('Creating endpoint %s for traffic manager profile "%s"'), domainName, profileName));
    try {
      this.trafficManagerManagementClient.definitions.create(profileName, tmDefinition, _);
    } finally {
      progress.end();
    }

    this.show(profileName, options, _);
  },

  updateEndpoint: function (profileName, domainName, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format($('Traffic manager profile with name "%s" not found'), profileName));
    }

    var tmDefinition = this.getDefinition(profileName, _).definition;

    var endpoint = utils.findFirstCaseIgnore(tmDefinition.policy.endpoints, {domainName: domainName});
    if (!endpoint) {
      throw new Error(util.format($('An endpoint with name "%s" not found for traffic manager profile "%s"'), domainName, profileName));
    }

    if (options.endpointLocation) {
      endpoint.endpointLocation = options.endpointLocation;
    }
    if (options.endpointStatus) {
      endpoint.endpointStatus = utils.verifyParamExistsInCollection(constants.trafficManager.endpoints.statuses,
        options.endpointStatus, 'endpoint status');
    }
    if (options.weight) {
      endpoint.weight = options.weight;
    }
    if (options.type) {
      endpoint.type = utils.verifyParamExistsInCollection(constants.trafficManager.endpoints.types,
        options.type, 'endpoint type');
    }
    if (options.minChildEndpoint) {
      if (endpoint.type === constants.trafficManager.endpoints.types[0]) {
        endpoint.minChildEndpoint = options.minChildEndpoint;
      } else {
        this.cli.output.warn(util.format($('--min-child-endpoint will be ignored for %s endpoint type'), options.type));
      }
    }

    var progress = this.cli.interaction.progress(util.format($('Updating endpoint "%s" for traffic manager profile "%s"'), domainName, profileName));
    try {
      this.trafficManagerManagementClient.definitions.create(profileName, tmDefinition, _);
    } finally {
      progress.end();
    }

    this.show(profileName, options, _);
  },

  deleteEndpoint: function (profileName, domainName, options, _) {
    var tmProfile = this.getProfile(profileName, _);
    if (!tmProfile) {
      throw new Error(util.format($('Traffic manager profile with name "%s" not found'), profileName));
    }

    var tmDefinition = this.getDefinition(profileName, _).definition;

    var index = utils.indexOfCaseIgnore(tmDefinition.policy.endpoints, {domainName: domainName});
    if (index !== null) {
      if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete endpoint %s for traffic manager profile "%s"? [y/n] '), domainName, profileName), _)) {
        return;
      }
      tmDefinition.policy.endpoints.splice(index, 1);
    } else {
      throw new Error(util.format($('An endpoint with name "%s" not found for traffic manager profile "%s'), domainName, profileName));
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting endpoint %s for traffic manager profile "%s"'), domainName, profileName));
    try {
      this.trafficManagerManagementClient.definitions.create(profileName, tmDefinition, _);
    } finally {
      progress.end();
    }
  },

  _showTrafficManager: function (profileName, tmProfile, tmDefinition) {
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    var tm = {
      profile: tmProfile.profile,
      definition: tmDefinition.definition
    };

    if (tmProfile) {
      interaction.formatOutput(tm, function (tm) {
        output.nameValue($('Name'), tm.profile.name);
        output.nameValue($('Domain name'), tm.profile.domainName);
        output.nameValue($('Status'), tm.profile.status);
        if (tm.definition) {
          output.nameValue($('TTL'), tm.definition.dnsOptions.timeToLiveInSeconds);
          output.nameValue($('Load balancing method'), tm.definition.policy.loadBalancingMethod);
          output.nameValue($('Monitor status'), tm.definition.policy.monitorStatus);
          if (tm.definition.monitors && tm.definition.monitors.length > 0) {
            output.header($('Monitors'));
            tm.definition.monitors.forEach(function (monitor) {
              output.nameValue($('Interval in seconds'), monitor.intervalInSeconds, 2);
              output.nameValue($('Timeout in seconds'), monitor.timeoutInSeconds, 2);
              output.nameValue($('Tolerated number of failures'), monitor.toleratedNumberOfFailures, 2);
              output.nameValue($('Protocol'), monitor.protocol, 2);
              output.nameValue($('Port'), monitor.port, 2);
              output.nameValue($('Verb'), monitor.httpOptions.verb, 2);
              output.nameValue($('Relative path'), monitor.httpOptions.relativePath, 2);
              output.nameValue($('Expected status code'), monitor.httpOptions.expectedStatusCode, 2);
            });
          }
          if (tm.definition.endpoints && tm.definition.endpoints.length > 0) {
            output.header($('Endpoints'));
            tm.definition.endpoints.forEach(function (endpoint) {
              output.nameValue($('Domain name'), endpoint.domainName, 2);
              output.nameValue($('Status'), endpoint.status, 2);
              output.nameValue($('Type'), endpoint.type, 2);
              output.nameValue($('Location'), endpoint.location, 2);
              output.nameValue($('Minimum child endpoints'), endpoint.minChildEndpoints, 2);
              output.nameValue($('Weight'), endpoint.weight, 2);
            });
          }
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A traffic manager profile with name "%s" not found'), profileName));
      }
    }
  },

  _validateDefinitionOptions: function (options, useDefaults) {
    var endPointUtil = new EndPointUtil();

    if (!options.monitorRelativePath && useDefaults) {
      throw new Error($('--monitor-relative-path parameter must be set'));
    }

    if (options.ttl) {
      var validatedTtl = endPointUtil.validateTtl(options.ttl, '--ttl');
      if (validatedTtl.error) {
        throw new Error(validatedTtl.error);
      }
    } else if (useDefaults) {
      this.cli.output.warn('--ttl parameter is not set. Using default TTL - ' + constants.trafficManager.ttl);
      options.ttl = constants.trafficManager.ttl;
    }

    if (options.monitorPort) {
      var validatedPort = endPointUtil.validatePort(options.monitorPort, '--monitor-port');
      if (validatedPort.error) {
        throw new Error(validatedPort.error);
      }
    } else if (useDefaults) {
      this.cli.output.warn('--monitor-port parameter is not set. Using default port - ' + constants.trafficManager.port);
      options.monitorPort = constants.trafficManager.ttl;
    }

    if (options.monitorProtocol) {
      this._validateProtocol(options.monitorProtocol);
    } else if (useDefaults) {
      this.cli.output.warn('--monitor-protocol parameter is not set. Using default protocol - ' + constants.trafficManager.protocol);
      options.monitorProtocol = constants.trafficManager.protocol;
    }

    if (options.loadBalancingMethod) {
      this._validateLoadBalancingMethod(options.loadBalancingMethod);
    } else if (useDefaults) {
      this.cli.output.warn('--load-balancing-method parameter is not set. Using default load balancing method - ' + constants.trafficManager.loadBalancingMethod);
      options.loadBalancingMethod = constants.trafficManager.loadBalancingMethod;
    }
  },

  _prepareDefinition: function (options) {
    this._validateDefinitionOptions(options, true);

    return {
      dnsOptions: {
        timeToLiveInSeconds: options.ttl
      },
      monitors: [
        {
          httpOptions: {
            relativePath: options.monitorRelativePath,
            verb: constants.trafficManager.verb,
            expectedStatusCode: constants.trafficManager.statusCode
          },
          intervalInSeconds: constants.trafficManager.interval,
          port: options.monitorPort,
          protocol: options.monitorProtocol,
          timeoutInSeconds: constants.trafficManager.timeout,
          toleratedNumberOfFailures: constants.trafficManager.numberOfFailures
        }
      ],
      policy: {
        endpoints: [],
        loadBalancingMethod: options.loadBalancingMethod
      }
    };
  },

  _validateProtocol: function (protocol) {
    protocol = protocol.toLowerCase();
    if (!__.contains(constants.trafficManager.protocols, protocol)) {
      throw new Error(util.format($('--monitor-protocol is invalid. Valid values are [%s].'), constants.trafficManager.protocols));
    }
  },

  _validateLoadBalancingMethod: function (loadBalancingMethod) {
    loadBalancingMethod = loadBalancingMethod.toLowerCase();
    if (!__.contains(constants.trafficManager.loadBalancingMethods, loadBalancingMethod)) {
      throw new Error(util.format($('--load-balancing-method is invalid. Valid values are [%s].'), constants.trafficManager.loadBalancingMethods));
    }
  }
});

module.exports = TrafficManager;