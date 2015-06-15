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
var path = require('path');
var fs = require('fs');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var constants = require('./constants');
var $ = utils.getLocaleString;

function AppGateway(cli, networkManagementClient) {
  this.cli = cli;
  this.networkManagementClient = networkManagementClient;
}

__.extend(AppGateway.prototype, {
  create: function (appGatewayName, vnetName, subnetNames, options, _) {
    options.subnetNames = subnetNames;
    var appGateway = this.get(appGatewayName, _);
    if (appGateway) {
      throw new Error(util.format($('Application gateway "%s" already exists'), appGatewayName));
    }

    var appGatewayConfig = {};

    this._validateAppGatewayOptions(appGatewayName, vnetName, appGatewayConfig, options, true);

    var progress = this.cli.interaction.progress(util.format($('Creating an application gateway "%s" for virtual network "%s"'), appGatewayName, vnetName));
    try {
      this.networkManagementClient.applicationGateways.create(appGatewayConfig, _);
    } finally {
      progress.end();
    }
  },

  set: function (appGatewayName, vnetName, options, _) {
    var appGateway = this.get(appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
    this._validateAppGatewayOptions(appGatewayName, vnetName, appGateway, options, false);

    var progress = this.cli.interaction.progress(util.format($('Updating an application gateway "%s" for virtual network "%s"'), appGatewayName, vnetName));
    try {
      this.networkManagementClient.applicationGateways.update(appGatewayName, appGateway, _);
    } finally {
      progress.end();
    }
  },

  get: function (appGatewayName, _) {
    var appGateway;
    var progress = this.cli.interaction.progress(util.format($('Looking up an application gateway "%s"'), appGatewayName));
    try {
      appGateway = this.networkManagementClient.applicationGateways.get(appGatewayName, _);
    } catch (error) {
      if (error.code === 'ResourceNotFound' || error.code === 'NotFound') {
        appGateway = null;
      } else {
        throw error;
      }
    } finally {
      progress.end();
    }

    return appGateway;
  },

  show: function (appGatewayName, options, _) {
    var appGateway = this.get(appGatewayName, _);

    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (appGateway) {
      interaction.formatOutput(appGateway, function (appGateway) {
        output.nameValue($('Name'), appGateway.name);
        output.nameValue($('State'), appGateway.state);
        output.nameValue($('Description'), appGateway.description);
        output.nameValue($('Virtual network name'), appGateway.vnetName);
        output.nameValue($('Instance count'), appGateway.instanceCount);
        output.nameValue($('Gateway size'), appGateway.gatewaySize);
        output.header($('Subnets'));
        appGateway.subnets.forEach(function (subnet) {
          output.nameValue($('Name'), subnet, 2);
        });
        if (appGateway.virtualIPs.length > 0) {
          output.header($('Virtual IP\'s'));
          appGateway.virtualIPs.forEach(function (ip) {
            output.nameValue($('Name'), ip, 2);
          });
        }
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('An application gateway with name "%s" not found'), appGatewayName));
      }
    }
  },

  list: function (options, _) {
    var progress = this.cli.interaction.progress($('Looking up application gateways'));
    var appGateways;
    try {
      appGateways = this.networkManagementClient.applicationGateways.list(_);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(appGateways.applicationGateways, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No application gateways found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('State'), item.state);
          row.cell($('Virtual network name'), item.vnetName);
          row.cell($('Gateway size'), item.gatewaySize);
          row.cell($('Instance count'), item.instanceCount);
          row.cell($('Virtual IP\'s count'), item.virtualIPs.length);
          row.cell($('Subnets count'), item.subnets.length);
        });
      }
    });
  },

  delete: function (appGatewayName, options, _) {
    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete application gateway "%s"? [y/n] '), appGatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.deleteMethod(appGatewayName, _);
    } finally {
      progress.end();
    }
  },

  start: function (appGatewayName, options, _) {
    options.operationType = 'start';
    var progress = this.cli.interaction.progress(util.format($('Starting an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.executeOperation(appGatewayName, options, _);
    } finally {
      progress.end();
    }
  },

  stop: function (appGatewayName, options, _) {
    options.operationType = 'stop';
    var progress = this.cli.interaction.progress(util.format($('Stopping an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.executeOperation(appGatewayName, options, _);
    } finally {
      progress.end();
    }
  },

  showConfig: function (appGatewayName, options, _) {
    var output = this.cli.output;
    var interaction = this.cli.interaction;
    var config = this.getConfig(appGatewayName, _);

    if (config) {
      interaction.formatOutput(config, function (config) {
        output.header($('Frontend IP configurations'));
        config.frontendIPConfigurations.forEach(function (fip) {
          output.nameValue($('Name'), fip.name, 2);
          output.nameValue($('Type'), fip.type, 2);
          output.nameValue($('Static IP address'), fip.staticIPAddress, 2);
          output.data('');
        });

        output.header($('Backend address pools'));
        config.backendAddressPools.forEach(function (pool) {
          output.nameValue($('Name'), pool.name, 2);
          output.header($('Backend servers'), 2);
          pool.backendServers.forEach(function (server) {
            output.nameValue($('IP address'), server.iPAddress, 4);
          });
          output.data('');
        });

        output.header($('Http settings'));
        config.backendHttpSettingsList.forEach(function (settings) {
          output.nameValue($('Name'), settings.name, 2);
          output.nameValue($('Port'), settings.port, 2);
          output.nameValue($('Protocol'), settings.protocol, 2);
          output.nameValue($('Cookie based affinity'), settings.cookieBasedAffinity, 2);
          output.data('');
        });

        output.header($('Frontend ports'));
        config.frontendPorts.forEach(function (frontendPort) {
          output.nameValue($('Name'), frontendPort.name, 2);
          output.nameValue($('Port'), frontendPort.port, 2);
          output.data('');
        });

        output.header($('Http listeners'));
        config.httpListeners.forEach(function (listener) {
          output.nameValue($('Name'), listener.name, 2);
          output.nameValue($('Frontend port'), listener.frontendPort, 2);
          output.nameValue($('Protocol'), listener.protocol, 2);
          output.data('');
        });

        output.header($('Load balancing rules'));
        config.httpLoadBalancingRules.forEach(function (rule) {
          output.nameValue($('Name'), rule.name, 2);
          output.nameValue($('Type'), rule.type, 2);
          output.nameValue($('Http settings'), rule.backendHttpSettings, 2);
          output.nameValue($('Listener'), rule.listener, 2);
          output.nameValue($('Backend address pool'), rule.backendAddressPool, 2);
          output.data('');
        });
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('Application gateway "%s" not found'), appGatewayName));
      }
    }
  },

  exportConfig: function (appGatewayName, filePath, options, _) {
    var gateway = this.get(appGatewayName, _);
    if (!gateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var config = this.getConfig(appGatewayName, _);
    if (config) {
      fs.writeFileSync(filePath, JSON.stringify(config));
      this.cli.output.verbose(util.format($('Application gateway configuration exported to %s'), filePath));
    }
  },

  importConfig: function (appGatewayName, filePath, options, _) {
    var appGateway = this.get(appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    this.cli.output.verbose(util.format($('Loading application gateway configuration file: %s'), filePath));
    var configAsString = fs.readFileSync(filePath, 'utf8');
    var config = JSON.parse(configAsString);

    this.setConfig(appGatewayName, config, _);
  },

  getConfig: function (appGatewayName, _) {
    var progress = this.cli.interaction.progress(util.format($('Getting configuration for an application gateway "%s"'), appGatewayName));
    var config;
    try {
      config = this.networkManagementClient.applicationGateways.getConfig(appGatewayName, _);
      delete config.statusCode;
      delete config.requestId;
    } catch (error) {
      if (error.code === 'ResourceNotFound' || error.code === 'NotFound') {
        config = null;
      }
    } finally {
      progress.end();
    }
    return config;
  },

  setConfig: function (appGatewayName, config, _) {
    var progress = this.cli.interaction.progress(util.format($('Setting configuration for an application gateway "%s"'), appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.setConfig(appGatewayName, config, _);
    }
    finally {
      progress.end();
    }
  },

  addBackendAddressPool: function (appGatewayName, poolName, options, _) {
    var dnsServers = this._parseDnsServers(options);
    var config = this.getConfig(appGatewayName, _);
    if (config) {
      var pool = utils.findFirstCaseIgnore(config.backendAddressPools, {name: poolName});
      if (pool) {
        throw new Error(util.format($('A backend address pool with name "%s" already exists for an application gateway "%s"'), poolName, appGatewayName));
      } else {
        var addressPool = {
          name: poolName,
          backendServers: dnsServers
        };
        config.backendAddressPools.push(addressPool);

        this.setConfig(appGatewayName, config, _);
      }
    } else {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
  },

  removeBackendAddressPool: function (appGatewayName, poolName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (config) {
      var index = utils.indexOfCaseIgnore(config.backendAddressPools, {name: poolName});
      if (index !== null) {
        if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete a backend address pool "%s?" [y/n] '), poolName), _)) {
          return;
        }
        config.backendAddressPools.splice(index, 1);
        this.setConfig(appGatewayName, config, _);
      } else {
        throw new Error(util.format($('A backend address pool with name "%s" not found for an application gateway "%s"'), poolName, appGatewayName));
      }
    } else {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
  },

  addHttpSettings: function (appGatewayName, httpSettingsName, options, _) {
    var httpSettings = this._parseHttpSettings(httpSettingsName, options, true);
    var config = this.getConfig(appGatewayName, _);
    if (config) {
      var settings = utils.findFirstCaseIgnore(config.backendHttpSettingsList, {name: httpSettingsName});
      if (settings) {
        throw new Error(util.format($('A http settings with name "%s" already exists for an application gateway "%s"'), httpSettingsName, appGatewayName));
      } else {
        config.backendHttpSettingsList.push(httpSettings);
        this.setConfig(appGatewayName, config, _);
      }
    } else {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
  },

  removeHttpSettings: function (appGatewayName, httpSettingsName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (config) {
      var index = utils.indexOfCaseIgnore(config.backendHttpSettingsList, {name: httpSettingsName});
      if (index !== null) {
        if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete a http settings "%s?" [y/n] '), httpSettingsName), _)) {
          return;
        }
        config.backendHttpSettingsList.splice(index, 1);
        this.setConfig(appGatewayName, config, _);
      } else {
        throw new Error(util.format($('A http settings with name "%s" not found for an application gateway "%s'), httpSettingsName, appGatewayName));
      }
    } else {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
  },

  addFrontendIp: function (appGatewayName, frontendIpName, options, _) {
    var frontendIp = this._parseFrontendIp(frontendIpName, options);
    var config = this.getConfig(appGatewayName, _);
    if (config) {
      var ip = utils.findFirstCaseIgnore(config.frontendIPConfigurations, {name: frontendIpName});
      if (ip) {
        throw new Error(util.format($('A frontend ip with name "%s" already exists for an application gateway "%s"'), frontendIpName, appGatewayName));
      } else {
        config.frontendIPConfigurations.push(frontendIp);
        this.setConfig(appGatewayName, config, _);
      }
    } else {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
  },

  removeFrontendIp: function (appGatewayName, frontendIpName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(config.frontendIPConfigurations, {name: frontendIpName});
    if (index === null) {
      throw new Error(util.format($('A frontend ip with name "%s" not found for an application gateway "%s'), frontendIpName, appGatewayName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete a frontend ip "%s?" [y/n] '), frontendIpName), _)) {
      return;
    }

    config.backendHttpSettingsList.splice(index, 1);
    this.setConfig(appGatewayName, config, _);
  },

  addFrontendPort: function (appGatewayName, frontendPortName, port, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }
    var frontendPort = utils.findFirstCaseIgnore(config.frontendPorts, {name: frontendPortName});
    if (frontendPort) {
      throw new Error(util.format($('A frontend port with name "%s" already exists for an application gateway "%s"'), frontendPortName, appGatewayName));
    }
    frontendPort = {
      name: frontendPortName,
      port: port
    };

    config.frontendPorts.push(frontendPort);
    this.setConfig(appGatewayName, config, _);
    this.show(appGatewayName, options, _);
  },

  removeFrontendPort: function (appGatewayName, frontendPortName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(config.frontendPorts, {name: frontendPortName});
    if (index === null) {
      throw new Error(util.format($('Frontend port with name "%s" not found for an application gateway "%s'), frontendPortName, appGatewayName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete a frontend port "%s?" [y/n] '), frontendPortName), _)) {
      return;
    }

    config.frontendPorts.splice(index, 1);
    this.setConfig(appGatewayName, config, _);
  },

  addHttpListener: function (appGatewayName, httpListenerName, frontendPortName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    if (!config.httpListeners || !config.httpListeners.length) {
      config.httpListeners = [];
    }

    if (utils.findFirstCaseIgnore(config.httpListeners, {name: httpListenerName})) {
      throw new Error(util.format($('An http listener with name "%s" already exists for an application gateway "%s"'), httpListenerName, appGatewayName));
    }

    if (!utils.findFirstCaseIgnore(config.frontendPorts, {name: frontendPortName})) {
      throw new Error(util.format($('Frontend port with name "%s" not found for an application gateway "%s'), frontendPortName, appGatewayName));
    }

    var httpListener = {
      name: httpListenerName,
      protocol: 'Http',
      frontendPort: frontendPortName
    };

    if (options.frontendIpName) {
      if (!utils.findFirstCaseIgnore(config.frontendIPConfigurations, {name: options.frontendIpName})) {
        throw new Error(util.format($('Frontend ip with name "%s" not found for an application gateway "%s'), options.frontendIpName, appGatewayName));
      }
      httpListener.frontendIP = options.frontendIpName;
    }

    if (options.protocol) {
      if (options.protocol.toLowerCase() === 'https' && !options.sslCert) {
        throw new Error($('--ssl-cert parameter is required when "--protocol Https" parameter is specified'));
      }
      var protocol = options.protocol.toLowerCase();
      httpListener.protocol = utils.capitalizeFirstLetter(protocol);
    }

    if (options.sslCert) {
      httpListener.sslCert = options.sslCert;
    }

    config.httpListeners.push(httpListener);
    this.setConfig(appGatewayName, config, _);
    this.show(appGatewayName, options, _);
  },

  removeHttpListener: function (appGatewayName, httpListenerName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(config.httpListeners, {name: httpListenerName});
    if (index === null) {
      throw new Error(util.format($('Http listener with name "%s" not found for an application gateway "%s'), httpListenerName, appGatewayName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete http listener "%s?" [y/n] '), httpListenerName), _)) {
      return;
    }

    config.httpListeners.splice(index, 1);
    this.setConfig(appGatewayName, config, _);
  },

  addLoadBalancingRule: function (appGatewayName, ruleName, httpSettingsName, httpListenerName, addressPoolName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    if (!config.httpLoadBalancingRules || !config.httpLoadBalancingRules.length) {
      config.httpLoadBalancingRules = [];
    }

    if (utils.findFirstCaseIgnore(config.httpLoadBalancingRules, {name: ruleName})) {
      throw new Error(util.format($('An http load balancing rule with name "%s" already exists for an application gateway "%s"'), ruleName, appGatewayName));
    }

    if (!utils.findFirstCaseIgnore(config.backendHttpSettingsList, {name: httpSettingsName})) {
      throw new Error(util.format($('Http settings with name "%s" not found for an application gateway "%s'), httpSettingsName, appGatewayName));
    }

    if (!utils.findFirstCaseIgnore(config.httpListeners, {name: httpListenerName})) {
      throw new Error(util.format($('Http listener with name "%s" not found for an application gateway "%s'), httpListenerName, appGatewayName));
    }

    if (!utils.findFirstCaseIgnore(config.backendAddressPools, {name: addressPoolName})) {
      throw new Error(util.format($('Address pool with name "%s" not found for an application gateway "%s'), addressPoolName, appGatewayName));
    }

    var lbRule = {
      name: ruleName,
      type: 'Basic',
      backendHttpSettings: httpSettingsName,
      listener: httpListenerName,
      backendAddressPool: addressPoolName
    };

    if (options.type) {
      lbRule.type = options.type;
    }

    config.httpLoadBalancingRules.push(lbRule);
    this.setConfig(appGatewayName, config, _);
    this.show(appGatewayName, options, _);
  },

  removeLoadBalancingRule: function (appGatewayName, ruleName, options, _) {
    var config = this.getConfig(appGatewayName, _);
    if (!config) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(config.httpLoadBalancingRules, {name: ruleName});
    if (index === null) {
      throw new Error(util.format($('An http load balancing rule with name "%s" not found for an application gateway "%s'), ruleName, appGatewayName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete http listener "%s?" [y/n] '), ruleName), _)) {
      return;
    }

    config.httpLoadBalancingRules.splice(index, 1);
    this.setConfig(appGatewayName, config, _);
  },

  addSsl: function (appGatewayName, certName, options, _) {
    if (utils.stringIsNullOrEmpty(options.certFile)) {
      throw new Error($('--cert-file parameter must not be empty'));
    }

    if (utils.stringIsNullOrEmpty(options.password)) {
      throw new Error($('--password parameter must not be empty'));
    }

    var certificateObject = {password: options.password};

    var certFormat = path.extname(options.certFile).split('.')[1];
    certificateObject.certificateFormat = certFormat;

    var data = fs.readFileSync(options.certFile);
    certificateObject.data = data.toString('base64');

    var progress = this.cli.interaction.progress(util.format($('Adding SSL certificate "%s" to application gateway "%s"'), certName, appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.addCertificate(appGatewayName, certName, certificateObject, options, _);
    } finally {
      progress.end();
    }
  },

  removeSsl: function (appGatewayName, certName, options, _) {
    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Remove certificate "%s" from application gateway "%s"? [y/n] '), certName, appGatewayName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Removing SSL certificate "%s" to application gateway "%s"'), certName, appGatewayName));
    try {
      this.networkManagementClient.applicationGateways.deleteCertificate(appGatewayName, certName, _);
    } finally {
      progress.end();
    }
  },

  _validateAppGatewayOptions: function (appGatewayName, vnetName, appGatewayConfig, options, useDefaults) {
    var output = this.cli.output;

    appGatewayConfig.name = appGatewayName;
    appGatewayConfig.vnetName = vnetName;

    if (options.subnetNames) {
      appGatewayConfig.subnets = this._parseSubnets(options.subnetNames);
    } else if (useDefaults) {
      throw new Error($('--subnet-names parameter must be set'));
    }

    if (options.instanceCount) {
      var instanceCount = utils.parseInt(options.instanceCount);

      if (isNaN(instanceCount) || (instanceCount < 0)) {
        throw new Error($('--instance-count value must be positive integer'));
      }

      appGatewayConfig.instanceCount = instanceCount;
    } else if (useDefaults) {
      output.warn('--instance-count parameter is not specified, using default - ' + constants.appGateway.defaultInstanceCount);
      appGatewayConfig.instanceCount = constants.appGateway.defaultInstanceCount;
    }

    if (options.gatewaySize) {
      this._validateGatewaySize(options.gatewaySize);
      appGatewayConfig.gatewaySize = options.gatewaySize;
    } else if (useDefaults) {
      output.warn('--gateway-size parameter is not specified, using default - ' + constants.appGateway.sizes[0]);
      appGatewayConfig.gatewaySize = constants.appGateway.sizes[0];
    }
  },

  _validateGatewaySize: function (gatewaySize) {
    if (!__.contains(constants.appGateway.sizes, gatewaySize)) {
      throw new Error(util.format($('--gateway-size must be one of the followings [%s]'), constants.appGateway.sizes));
    }
  },

  _parseSubnets: function (subnets) {
    var subnetsArray = subnets.split(',');
    for (var i = 0; i < subnetsArray.length; i++) {
      subnetsArray[i] = subnetsArray[i].trim();
    }

    return subnetsArray;
  },

  _parseDnsServers: function (options) {
    var ipAddresses = options.servers.split(',');
    var vnetUtil = new VNetUtil();
    var dnsServers = [];

    ipAddresses.forEach(function (address) {
      var ipValidationResult = vnetUtil.parseIPv4(address);
      if (ipValidationResult.error) {
        var dnsValidationResult = vnetUtil.isValidDns(address);
        if (dnsValidationResult === false) {
          throw new Error(util.format($('Address "%s" is not valid IPv4 or DNS name'), address));
        }
      }
      var dns = {iPAddress: address};
      dnsServers.push(dns);
    });

    return dnsServers;
  },

  _parseHttpSettings: function (httpSettingsName, options, useDefaults) {
    var httpSettings = {
      name: httpSettingsName
    };

    if (options.protocol) {
      var protocol = utils.verifyParamExistsInCollection(constants.appGateway.settings.protocol,
        options.protocol, 'protocol');
      httpSettings.protocol = utils.capitalizeFirstLetter(protocol);
    } else if (useDefaults) {
      this.cli.output.warn(util.format($('Using default protocol: %s'), constants.appGateway.settings.protocol[0]));
      httpSettings.protocol = constants.appGateway.settings.protocol[0];
    }

    if (options.port) {
      var portAsInt = utils.parseInt(options.port);
      if (isNaN(portAsInt) || portAsInt < constants.appGateway.settings.port[0] || portAsInt > constants.appGateway.settings.port[1]) {
        throw new Error(util.format($('port parameter must be an integer in range %s'),
          utils.toRange(constants.appGateway.settings.port)));
      }
      httpSettings.port = portAsInt;
    }

    if (options.cookieBasedAffinity) {
      var cookieBasedAffinity = utils.verifyParamExistsInCollection(constants.appGateway.settings.affinity,
        options.cookieBasedAffinity, 'cookie based affinity');
      httpSettings.cookieBasedAffinity = utils.capitalizeFirstLetter(cookieBasedAffinity);
    } else if (useDefaults) {
      this.cli.output.warn(util.format($('Using default cookie based affinity: %s'), constants.appGateway.settings.affinity[0]));
      httpSettings.cookieBasedAffinity = constants.appGateway.settings.affinity[0];
    }

    return httpSettings;
  },

  _parseFrontendIp: function (frontendIpName, options, useDefaults) {
    var frontendIp = {
      name: frontendIpName
    };

    if (options.type) {
      var type = utils.verifyParamExistsInCollection(constants.appGateway.ip.type,
        options.type, 'type');
      frontendIp.type = utils.capitalizeFirstLetter(type);
    } else if (useDefaults) {
      this.cli.output.warn(util.format($('Using default type: %s'), constants.appGateway.ip.type[0]));
      frontendIp.type = constants.appGateway.ip.type[0];
    }

    if (options.staticIpAddress) {
      var vnetUtil = new VNetUtil();
      var ipValidationResult = vnetUtil.parseIPv4(options.staticIpAddress);
      if (ipValidationResult.error) {
        throw new Error(util.format($('IPv4 %s static ip address is not valid'), options.staticIpAddress));
      }
      frontendIp.staticIPAddress = options.staticIpAddress;
    }

    return frontendIp;
  }
});

module.exports = AppGateway;