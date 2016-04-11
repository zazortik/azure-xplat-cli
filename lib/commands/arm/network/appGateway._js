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
var constants = require('./constants');
var fs = require('fs');
var profile = require('../../../util/profile');
var PublicIp = require('./publicIp');
var resourceUtils = require('../resource/resourceUtils');
var Subnet = require('./subnet');
var tagUtils = require('../tag/tagUtils');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var $ = utils.getLocaleString;

function AppGateways(cli, networkManagementClient) {
  this.interaction = cli.interaction;
  this.networkManagementClient = networkManagementClient;
  this.output = cli.output;
  this.publicIpCrud = new PublicIp(cli, networkManagementClient);
  this.subnetCrud = new Subnet(cli, networkManagementClient);
  this.vnetUtil = new VNetUtil();
}

__.extend(AppGateways.prototype, {
  create: function (resourceGroup, appGatewayName, location, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (appGateway) {
      throw new Error(util.format($('Application gateway "%s" already exists in resource group "%s"'), appGatewayName, resourceGroup));
    }
    var subnetId;
    if (options.subnetId) {
      subnetId = options.subnetId;
    } else {
      var subnet = self.subnetCrud.get(resourceGroup, options.vnetName, options.subnetName, _);
      if (!subnet) {
        throw new Error(util.format($('Subnet "%s" not found in virtual network "%s"'), options.subnetName, options.vnetName));
      }
      subnetId = subnet.id;
    }

    var parameters = self._setDefaultAttributes(options);
    self.subscriptionId = self._getSubscriptionId(options);
    var frontendIpID = self._generateResourceId(resourceGroup, appGatewayName, 'frontendIPConfigurations', parameters.frontendIpName);
    var frontendPortID = self._generateResourceId(resourceGroup, appGatewayName, 'frontendPorts', parameters.frontendPortName);
    var poolID = self._generateResourceId(resourceGroup, appGatewayName, 'backendAddressPools', parameters.addressPoolName);
    var settingsID = self._generateResourceId(resourceGroup, appGatewayName, 'backendHttpSettingsCollection', parameters.httpSettingsName);
    var listenerID = self._generateResourceId(resourceGroup, appGatewayName, 'httpListeners', parameters.httpListenerName);

    appGateway = {
      name: appGatewayName,
      location: location,
      sku: {
        capacity: parameters.capacity
      },
      gatewayIPConfigurations: [{
        name: parameters.gatewayIpName,
        subnet: {id: subnetId}
      }],
      frontendPorts: [{
        name: parameters.frontendPortName,
        port: parameters.frontendPort
      }],
      backendAddressPools: [{
        name: parameters.addressPoolName,
        backendAddresses: self._parseDnsServers(options),
        backendIPConfiguration: []
      }],
      backendHttpSettingsCollection: [{
        name: parameters.httpSettingsName,
        protocol: parameters.httpSettingsProtocol,
        port: parameters.httpSettingsPort,
        cookieBasedAffinity: parameters.httpSettingsCookieBasedAffinity
      }],
      httpListeners: [{
        name: parameters.httpListenerName,
        frontendIPConfiguration: {id: frontendIpID},
        frontendPort: {id: frontendPortID},
        protocol: parameters.httpListenerProtocol
      }],
      requestRoutingRules: [{
        name: parameters.routingRuleName,
        ruleType: parameters.routingRuleType,
        backendAddressPool: {id: poolID},
        backendHttpSettings: {id: settingsID},
        httpListener: {id: listenerID}
      }]
    };
    if (parameters.skuName) {
      utils.verifyParamExistsInCollection(constants.appGateway.sku.name, parameters.skuName, '--sku-name');
      appGateway.sku.name = parameters.skuName;
    }
    if (options.skuTier) {
      utils.verifyParamExistsInCollection(constants.appGateway.sku.tier, parameters.skuTier, '--sku-tier');
      appGateway.sku.tier = parameters.skuTier;
    }

    appGateway.frontendIPConfigurations = [];
    appGateway.frontendIPConfigurations.push(self._parseFrontendIp(resourceGroup, appGatewayName, parameters.frontendIpName, parameters, _));

    if (parameters.certFile) {
      appGateway.sslCertificates = [];
      var data = fs.readFileSync(parameters.certFile);
      appGateway.sslCertificates.push({
        name: parameters.certName,
        password: parameters.certPassword,
        data: data.toString('base64')
      });
      var certID = self._generateResourceId(resourceGroup, appGatewayName, 'sslCertificates', parameters.certName);
      appGateway.httpListeners[0].sslCertificate = {
        id: certID
      };
    }

    if (utils.argHasValue(options.tags)) {
      tagUtils.appendTags(appGateway, options);
    } else {
      appGateway.tags = {};
    }

    var progress = self.interaction.progress(util.format($('Creating configuration for an application gateway "%s"'), appGatewayName));
    var createdAppGateway;
    try {
      createdAppGateway = self.networkManagementClient.applicationGateways.createOrUpdate(resourceGroup, appGatewayName, appGateway, _);
    } finally {
      progress.end();
    }
    self._showAppGateway(createdAppGateway);
  },

  set: function (resourceGroup, appGatewayName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    if (options.skuName) {
      utils.verifyParamExistsInCollection(constants.appGateway.sku.name, options.skuName, '--sku-name');
      appGateway.sku.name = options.skuName;
    }
    if (options.skuTier) {
      utils.verifyParamExistsInCollection(constants.appGateway.sku.tier, options.skuTier, '--sku-tier');
      appGateway.sku.tier = options.skuTier;
    }
    if (options.capacity) {
      var capacity = parseInt(options.capacity);
      if (capacity > constants.appGateway.sku.capacity[0] && capacity < constants.appGateway.sku.capacity[1]) {
        appGateway.sku.capacity = capacity;
      } else {
        throw new Error(util.format($('Given %s "%s" is invalid, supported values are: \[%s\]'), '--capacity', options.capacity, constants.appGateway.sku.capacity));
      }
    }
    if (utils.argHasValue(options.tags)) {
      tagUtils.appendTags(appGateway, options);
    }

    self.output.warn('Application gateway set command is a long-running process. It may take up to 15-20 minutes to complete.');
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  get: function (resourceGroup, appGatewayName, _) {
    var self = this;
    var appGateway;
    var progress = self.interaction.progress(util.format($('Looking up an application gateway "%s"'), appGatewayName));
    try {
      appGateway = self.networkManagementClient.applicationGateways.get(resourceGroup, appGatewayName, null, _);
    } catch (error) {
      if (error.statusCode === 404) {
        appGateway = null;
      }
    } finally {
      progress.end();
    }
    return appGateway;
  },

  list: function (options, _) {
    var self = this;
    var appGateways;
    var progress;
    try {
      if (options.resourceGroup) {
        progress = self.interaction.progress(util.format($('Looking up application gateways in resource group "%s"'), options.resourceGroup));
        appGateways = self.networkManagementClient.applicationGateways.list(options.resourceGroup, options, _);
      } else {
        progress = self.interaction.progress($('Looking up application gateways in all resource groups'));
        appGateways = self.networkManagementClient.applicationGateways.listAll(options, _);
      }
    } finally {
      progress.end();
    }
    if (!appGateways) {
      self.output.warn(util.format($('No application gateways found in resource group "%s"'), options.resourceGroup));
    }

    self.interaction.formatOutput(appGateways, function (data) {
      if (data.length === 0) {
        self.output.warn(util.format($('No application gateways found in resource group "%s"'), options.resourceGroup));
      } else {
        self.output.table(data, function (row, gateway) {
          row.cell($('Name'), gateway.name);
          row.cell($('Provisioning state'), gateway.provisioningState);
          row.cell($('Location'), gateway.location);
          var resource = resourceUtils.getResourceInformation(gateway.id);
          row.cell($('Resource group'), resource.resourceGroup);
        });
      }
    });
  },

  show: function (resourceGroup, appGatewayName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);

    if (appGateway) {
      self._showAppGateway(appGateway);
    } else {
      self.output.warn(util.format($('An application gateway with name "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }
  },

  delete: function (resourceGroup, appGatewayName, options, _) {
    var self = this;

    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      self.output.warn(util.format($('An application gateway with name "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
      return;
    }
    if (!options.quiet && !self.interaction.confirm(util.format($('Delete an application gateway "%s"? [y/n] '), appGatewayName), _)) {
      return;
    }

    var progress = self.interaction.progress(util.format($('Deleting an application gateway "%s"'), appGatewayName));
    try {
      self.networkManagementClient.applicationGateways.deleteMethod(resourceGroup, appGatewayName, _);
    } finally {
      progress.end();
    }
  },

  start: function (resourceGroup, appGatewayName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('An application gateway with name "%s" not found in resource group "%s"'),
        appGatewayName, resourceGroup));
    }

    self.output.warn('Application gateway start command is a long-running process. It may take up to 15-20 minutes to complete.');

    var progress = self.interaction.progress(util.format($('Starting an application gateway "%s"'), appGatewayName));
    try {
      self.networkManagementClient.applicationGateways.start(resourceGroup, appGatewayName, _);
    } finally {
      progress.end();
    }
  },

  stop: function (resourceGroup, appGatewayName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('An application gateway with name "%s" not found in resource group "%s"'),
        appGatewayName, resourceGroup));
    }

    var progress = self.interaction.progress(util.format($('Stopping an application gateway "%s"'), appGatewayName));
    try {
      self.networkManagementClient.applicationGateways.stop(resourceGroup, appGatewayName, _);
    } finally {
      progress.end();
    }
  },

  addSsl: function (resourceGroup, appGatewayName, certName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    if (utils.stringIsNullOrEmpty(options.certFile)) {
      throw new Error($('--cert-file parameter must not be empty'));
    }

    if (utils.stringIsNullOrEmpty(options.password)) {
      throw new Error($('--password parameter must not be empty'));
    }

    var certificateObject = {password: options.certPassword, name: certName};
    var data;
    try {
      data = fs.readFileSync(options.certFile);
    } catch (e) {
      if (e.code === 'ENONT') {
        throw new Error(util.format($('File "%s" not found'), options.certFile));
      }
    }
    certificateObject.data = data.toString('base64');
    appGateway.sslCertificates.push(certificateObject);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeSsl: function (resourceGroup, appGatewayName, certName, options, _) {
    var self = this;

    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.sslCertificates, {name: certName});
    if (index !== -1) {
      if (!options.quiet && !self.interaction.confirm(util.format($('Delete an ssl certificate "%s"? [y/n] '), certName), _)) {
        return;
      }
      appGateway.sslCertificates.splice(index, 1);
      self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
    } else {
      throw new Error(util.format($('SSL certificate with name "%s" not found for an application gateway "%s"'), certName, appGatewayName));
    }
  },

  addFrontendIp: function (resourceGroup, appGatewayName, frontendIpName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var frontendIp = utils.findFirstCaseIgnore(appGateway.frontendIPConfigurations, {name: frontendIpName});
    if (frontendIp) {
      throw new Error(util.format($('A frontend ip with name "%s" already exists for an application gateway "%s"'), frontendIpName, appGatewayName));
    }

    frontendIp = self._parseFrontendIp(resourceGroup, appGatewayName, frontendIpName, options, _);
    appGateway.frontendIPConfigurations.push(frontendIp);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeFrontendIp: function (resourceGroup, appGatewayName, frontendIpName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.frontendIPConfigurations, {name: frontendIpName});
    if (index === -1) {
      throw new Error(util.format($('A frontend ip with name "%s" not found for an application gateway "%s"'), frontendIpName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete a frontend ip "%s"? [y/n] '), frontendIpName), _)) {
      return;
    }
    appGateway.frontendIPConfigurations.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addFrontendPort: function (resourceGroup, appGatewayName, frontendPortName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var frontendPort = utils.findFirstCaseIgnore(appGateway.frontendPorts, {name: frontendPortName});
    if (frontendPort) {
      throw new Error(util.format($('A frontend port with name "%s" already exists for an application gateway "%s"'), frontendPortName, appGatewayName));
    }
    if (options.port < constants.appGateway.settings.port[0] || options.port > constants.appGateway.settings.port[1]) {
      throw new Error(util.format($('A frontend port value must be in range \[%s\]'), constants.appGateway.settings.port));
    }
    frontendPort = {
      name: frontendPortName,
      port: parseInt(options.port)
    };

    self.output.warn('Application gateway add new frontend port command is a long-running process. It may take up to 15-20 minutes to complete.');
    appGateway.frontendPorts.push(frontendPort);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeFrontendPort: function (resourceGroup, appGatewayName, frontendPortName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.frontendPorts, {name: frontendPortName});
    if (index === -1) {
      throw new Error(util.format($('Frontend port with name "%s" not found for an application gateway "%s"'), frontendPortName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete a frontend port "%s"? [y/n] '), frontendPortName), _)) {
      return;
    }

    self.output.warn('Application gateway remove frontend port command is a long-running process. It may take up to 15-20 minutes to complete.');
    appGateway.frontendPorts.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addBackendAddressPool: function (resourceGroup, appGatewayName, poolName, options, _) {
    var self = this;
    var dnsServers = self._parseDnsServers(options);
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var pool = utils.findFirstCaseIgnore(appGateway.backendAddressPools, {name: poolName});
    if (pool) {
      throw new Error(util.format($('A backend address pool with name "%s" already exists in application gateway "%s"'), poolName, appGatewayName));
    } else {
      var addressPool = {
        name: poolName,
        backendAddresses: dnsServers
      };
      appGateway.backendAddressPools.push(addressPool);

      self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
    }
  },

  removeBackendAddressPool: function (resourceGroup, appGatewayName, poolName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.backendAddressPools, {name: poolName});
    if (index !== -1) {
      if (!options.quiet && !self.interaction.confirm(util.format($('Delete a backend address pool "%s"? [y/n] '), poolName), _)) {
        return;
      }
      appGateway.backendAddressPools.splice(index, 1);
      self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
    } else {
      throw new Error(util.format($('A backend address pool with name "%s" not found for an application gateway "%s"'), poolName, appGatewayName));
    }
  },

  addHttpSettings: function (resourceGroup, appGatewayName, httpSettingsName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var httpSettings = self._parseHttpSettings(httpSettingsName, options, true);
    var settings = utils.findFirstCaseIgnore(appGateway.backendHttpSettingsCollection, {name: httpSettingsName});
    if (settings) {
      throw new Error(util.format($('A http settings with name "%s" already exists for an application gateway "%s"'), httpSettingsName, appGatewayName));
    } else {
      appGateway.backendHttpSettingsCollection.push(httpSettings);
      self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
    }
  },

  removeHttpSettings: function (resourceGroup, appGatewayName, httpSettingsName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.backendHttpSettingsCollection, {name: httpSettingsName});
    if (index !== -1) {
      if (!options.quiet && !self.interaction.confirm(util.format($('Delete an http settings "%s"? [y/n] '), httpSettingsName), _)) {
        return;
      }
      appGateway.backendHttpSettingsCollection.splice(index, 1);
      self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
    } else {
      throw new Error(util.format($('An http settings with name "%s" not found for an application gateway "%s"'), httpSettingsName, appGatewayName));
    }
  },

  addHttpListener: function (resourceGroup, appGatewayName, httpListenerName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    if (!appGateway.httpListeners || !appGateway.httpListeners.length) {
      appGateway.httpListeners = [];
    }

    if (utils.findFirstCaseIgnore(appGateway.httpListeners, {name: httpListenerName})) {
      throw new Error(util.format($('An http listener with name "%s" already exists for an application gateway "%s"'), httpListenerName, appGatewayName));
    }

    var httpListener = {
      name: httpListenerName,
      protocol: constants.appGateway.settings.protocol[0]
    };

    if (options.frontendIpName) {
      var frontendIp = utils.findFirstCaseIgnore(appGateway.frontendIPConfigurations, {name: options.frontendIpName});
      if (!frontendIp) {
        throw new Error(util.format($('Frontend ip with name "%s" not found for an application gateway "%s"'), options.frontendIpName, appGatewayName));
      }
      httpListener.frontendIPConfiguration = frontendIp;
    }

    if (options.frontendPortName) {
      var frontendPort = utils.findFirstCaseIgnore(appGateway.frontendPorts, {name: options.frontendPortName});
      if (!frontendPort) {
        throw new Error(util.format($('Frontend port with name "%s" not found for an application gateway "%s"'), options.frontendPortName, appGatewayName));
      }
      httpListener.frontendPort = frontendPort;
    }

    if (options.protocol) {
      var protocol = options.protocol.toLowerCase();
      if (protocol === 'https' && !options.sslCert) {
        throw new Error($('--ssl-cert parameter is required, when "--protocol Https" parameter is specified'));
      }
      if (protocol !== 'http' && protocol != 'https') {
        throw new Error(util.format($('"%s" protocol is not valid. Valid values are [%s]'), constants.appGateway.httpListener.protocol));
      }
      httpListener.protocol = utils.capitalizeFirstLetter(protocol);
    }

    if (options.sslCert) {
      var sslCert = utils.findFirstCaseIgnore(appGateway.sslCertificates, {name: options.sslCert});
      if (!sslCert) {
        throw new Error(util.format($('SSL certificate with name "%s" not found for an application gateway "%s"'), options.sslCert, appGatewayName));
      }
      httpListener.sslCertificate = sslCert;
    }

    self.output.warn('Application gateway add new http listener command is a long-running process. It may take up to 15-20 minutes to complete.');
    appGateway.httpListeners.push(httpListener);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeHttpListener: function (resourceGroup, appGatewayName, httpListenerName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found in resource group "%s"'), appGatewayName, resourceGroup));
    }

    var index = utils.indexOfCaseIgnore(appGateway.httpListeners, {name: httpListenerName});
    if (index === -1) {
      throw new Error(util.format($('Http listener with name "%s" not found for an application gateway "%s"'), httpListenerName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete http listener "%s"? [y/n] '), httpListenerName), _)) {
      return;
    }

    self.output.warn('Application gateway remove http listener command is a long-running process. It may take up to 15-20 minutes to complete.');
    appGateway.httpListeners.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addRequestRoutingRule: function (resourceGroup, appGatewayName, ruleName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    if (utils.findFirstCaseIgnore(appGateway.requestRoutingRules, {name: ruleName})) {
      throw new Error(util.format($('A request routing rule with name "%s" already exists in application gateway "%s"'), ruleName, appGatewayName));
    }

    var backendHttpSettings = utils.findFirstCaseIgnore(appGateway.backendHttpSettingsCollection, {name: options.httpSettingsName});
    if (!backendHttpSettings) {
      throw new Error(util.format($('A backend http settings with name "%s" not found in application gateway "%s"'), options.httpSettingsName, appGatewayName));
    }

    var httpListener = utils.findFirstCaseIgnore(appGateway.httpListeners, {name: options.httpListenerName});
    if (!httpListener) {
      throw new Error(util.format($('Http listener with name "%s" not found for an application gateway "%s"'), options.httpListenerName, appGatewayName));
    }

    var backendAddressPool = utils.findFirstCaseIgnore(appGateway.backendAddressPools, {name: options.addressPoolName});
    if (!backendAddressPool) {
      throw new Error(util.format($('Address pool with name "%s" not found for an application gateway "%s"'), options.addressPoolName, appGatewayName));
    }

    var rule = {
      name: ruleName,
      type: constants.appGateway.routingRule.type[0],
      backendHttpSettings: backendHttpSettings,
      httpListener: httpListener,
      backendAddressPool: backendAddressPool
    };

    if (options.type) {
      utils.verifyParamExistsInCollection(constants.appGateway.routingRule.type, options.type, '--type');
      rule.type = options.type;
    }

    appGateway.requestRoutingRules.push(rule);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeRequestRoutingRule: function (resourceGroup, appGatewayName, ruleName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(appGateway.requestRoutingRules, {name: ruleName});
    if (index === -1) {
      throw new Error(util.format($('An request routing rule with name "%s" not found in application gateway "%s"'), ruleName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete request routing rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }
    appGateway.requestRoutingRules.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addProbe: function (resourceGroup, appGatewayName, probeName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    if (utils.findFirstCaseIgnore(appGateway.probes, {name: probeName})) {
      throw new Error(util.format($('A probe with name "%s" already exists in application gateway "%s"'), probeName, appGatewayName));
    }

    var probe = self._parseProbe(resourceGroup, appGatewayName, probeName, options);
    appGateway.probes.push(probe);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeProbe: function (resourceGroup, appGatewayName, probeName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(appGateway.probes, {name: probeName});
    if (index === -1) {
      throw new Error(util.format($('A probe with name "%s" not found in application gateway "%s"'), probeName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete probe "%s"? [y/n] '), probeName), _)) {
      return;
    }
    appGateway.probes.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addUrlPathMap: function (resourceGroup, appGatewayName, urlPathMapName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    if (utils.findFirstCaseIgnore(appGateway.urlPathMaps, {name: urlPathMapName})) {
      throw new Error(util.format($('An url path map with name "%s" already exists in application gateway "%s"'), urlPathMapName, appGatewayName));
    }

    var backendHttpSettings = utils.findFirstCaseIgnore(appGateway.backendHttpSettingsCollection, {name: options.httpSettingsName});
    if (!backendHttpSettings) {
      throw new Error(util.format($('A backend http settings with name "%s" not found in application gateway "%s"'), options.httpSettingsName, appGatewayName));
    }

    var backendAddressPool = utils.findFirstCaseIgnore(appGateway.backendAddressPools, {name: options.addressPoolName});
    if (!backendAddressPool) {
      throw new Error(util.format($('Address pool with name "%s" not found for an application gateway "%s"'), options.addressPoolName, appGatewayName));
    }

    var urlPathMap = {
      name: urlPathMapName,
      defaultBackendAddressPool: {
        id: backendAddressPool.id
      },
      defaultBackendHttpSettings: {
        id: backendHttpSettings.id
      },
      pathRules: [{
        name: options.ruleName,
        paths: [options.path],
        backendAddressPool: {id: backendAddressPool.id},
        backendHttpSettings: {id: backendHttpSettings.id}
      }]
    };

    appGateway.urlPathMaps.push(urlPathMap);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeUrlPathMap: function (resourceGroup, appGatewayName, urlPathMapName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(appGateway.urlPathMaps, {name: urlPathMapName});
    if (index === -1) {
      throw new Error(util.format($('An url path map with name "%s" not found in application gateway "%s"'), urlPathMapName, appGatewayName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete url path map "%s"? [y/n] '), urlPathMapName), _)) {
      return;
    }
    appGateway.urlPathMaps.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  addMapRule: function (resourceGroup, appGatewayName, ruleName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var urlPathMap = utils.findFirstCaseIgnore(appGateway.urlPathMaps, {name: options.urlPathMapName});
    if (!urlPathMap) {
      throw new Error(util.format($('An url path map with name "%s" not found in application gateway "%s"'), options.urlPathMapName, appGatewayName));
    }

    if (utils.findFirstCaseIgnore(urlPathMap.pathRules, {name: ruleName})) {
      throw new Error(util.format($('A rule with name "%s" already exists in url path map "%s"'), ruleName, options.urlPathMapName));
    }

    var backendHttpSettings = utils.findFirstCaseIgnore(appGateway.backendHttpSettingsCollection, {name: options.httpSettingsName});
    if (!backendHttpSettings) {
      throw new Error(util.format($('A backend http settings with name "%s" not found in application gateway "%s"'), options.httpSettingsName, appGatewayName));
    }

    var backendAddressPool = utils.findFirstCaseIgnore(appGateway.backendAddressPools, {name: options.addressPoolName});
    if (!backendAddressPool) {
      throw new Error(util.format($('Address pool with name "%s" not found for an application gateway "%s"'), options.addressPoolName, appGatewayName));
    }

    var rule = {
      name: ruleName,
      paths: [options.path],
      backendAddressPool: {id: backendAddressPool.id},
      backendHttpSettings: {id: backendHttpSettings.id}
    };
    urlPathMap.pathRules.push(rule);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  removeMapRule: function (resourceGroup, appGatewayName, ruleName, options, _) {
    var self = this;
    var appGateway = self.get(resourceGroup, appGatewayName, _);
    if (!appGateway) {
      throw new Error(util.format($('Application gateway "%s" not found'), appGatewayName));
    }

    var urlPathMap = utils.findFirstCaseIgnore(appGateway.urlPathMaps, {name: options.urlPathMapName});
    if (!urlPathMap) {
      throw new Error(util.format($('An url path map with name "%s" not found in application gateway "%s"'), options.urlPathMapName, appGatewayName));
    }

    var index = utils.indexOfCaseIgnore(urlPathMap.pathRules, {name: ruleName});
    if (index === -1) {
      throw new Error(util.format($('A rule with name "%s" not found in url path map "%s"'), ruleName, options.urlPathMapName));
    }

    if (!options.quiet && !self.interaction.confirm(util.format($('Delete url path map rule "%s"? [y/n] '), ruleName), _)) {
      return;
    }
    urlPathMap.pathRules.splice(index, 1);
    self._setAppGateway(resourceGroup, appGatewayName, appGateway, _);
  },

  _generateResourceId: function (resourceGroup, appGatewayName, resourceType, resourceName) {
    var id = '';
    id += '/subscriptions/';
    id += encodeURIComponent(this.subscriptionId);
    id += '/resourceGroups/';
    id += encodeURIComponent(resourceGroup);
    id += '/providers/';
    id += 'Microsoft.Network';
    id += '/applicationGateways/';
    id += encodeURIComponent(appGatewayName);
    id += util.format($('/%s'), resourceType);
    id += util.format($('/%s'), resourceName);
    return id;
  },

  _getAttributeNames: function (list) {
    var namesString = '[';
    var counter = 0;
    list.forEach(function (item) {
      if (counter > 0) {
        namesString += ', ';
      }
      namesString += item.name;
      counter++;
    });
    namesString += ']';
    return namesString;
  },

  _getSubscriptionId: function (options) {
    var subscription = profile.current.getSubscription(options.subscription);
    var client = utils.createResourceClient(subscription);
    return client.credentials.subscriptionId;
  },

  _parseDnsServers: function (options) {
    var self = this;

    var ipAddresses = options.servers.split(',');
    var dnsServers = [];

    ipAddresses.forEach(function (address) {
      var ipValidationResult = self.vnetUtil.parseIPv4(address);
      if (ipValidationResult.error) {
        var dnsValidationResult = self.vnetUtil.isValidDns(address);
        if (dnsValidationResult === false) {
          throw new Error(util.format($('Address "%s" is not valid IPv4 or DNS name'), address));
        }
      }
      var dns = {ipAddress: address};
      dnsServers.push(dns);
    });

    return dnsServers;
  },

  _parseFrontendIp: function (resourceGroup, appGatewayName, frontendIpName, options, _) {
    var self = this;
    var frontendIp = {
      id: self._generateResourceId(resourceGroup, appGatewayName, 'frontendIPConfigurations', frontendIpName),
      name: frontendIpName,
      privateIPAllocationMethod: constants.appGateway.frontendIp.privateIPAllocationMethod[0]
    };

    if (options.staticIpAddress) {
      var ipValidationResult = self.vnetUtil.parseIPv4(options.staticIpAddress);
      if (ipValidationResult.error) {
        throw new Error(util.format($('IPv4 %s static ip address is not valid'), options.staticIpAddress));
      }
      frontendIp.privateIPAddress = options.staticIpAddress;
    }

    if (options.publicIpId) {
      frontendIp.publicIPAddress = options.publicIpId;
      return frontendIp;
    }

    if (options.publicIpName) {
      var publicIp = self.publicIpCrud.get(resourceGroup, options.publicIpName, _);
      if (!publicIp) {
        throw new Error(util.format($('Public IP "%s" not found in resource group "%s"'), options.publicIpName, resourceGroup));
      }
      frontendIp.publicIPAddress = {id: publicIp.id};
      return frontendIp;
    }

    if (options.vnetName && options.subnetName) {
      var subnet = self.subnetCrud.get(resourceGroup, options.vnetName, options.subnetName, _);
      if (!subnet) {
        throw new Error(util.format($('Subnet "%s" not found in virtual network "%s" resource group "%s"'), options.subnetName, options.vnetName, resourceGroup));
      }
      frontendIp.subnet = {id: subnet.id};
      return frontendIp;
    }

    if (options.subnetId) {
      frontendIp.subnet = {id: options.subnetId};
    }

    return frontendIp;
  },

  _parseHttpSettings: function (httpSettingsName, options, useDefaults) {
    var self = this;

    var httpSettings = {
      name: httpSettingsName
    };

    if (options.protocol) {
      var protocol = utils.verifyParamExistsInCollection(constants.appGateway.settings.protocol,
        options.protocol, '--protocol');
      httpSettings.protocol = utils.capitalizeFirstLetter(protocol);
    } else if (useDefaults) {
      self.output.warn(util.format($('Using default protocol: %s'), constants.appGateway.settings.protocol[0]));
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
        options.cookieBasedAffinity, '--cookie-based-affinity');
      httpSettings.cookieBasedAffinity = utils.capitalizeFirstLetter(cookieBasedAffinity);
    } else if (useDefaults) {
      self.output.warn(util.format($('Using default cookie based affinity: %s'), constants.appGateway.settings.affinity[0]));
      httpSettings.cookieBasedAffinity = constants.appGateway.settings.affinity[0];
    }

    return httpSettings;
  },

  _parseProbe: function (resourceGroup, appGatewayName, probeName, options) {
    var self = this;
    var probe = {
      name: probeName
    };
    if (options.protocol) {
      var protocol = utils.verifyParamExistsInCollection(constants.appGateway.settings.protocol,
        options.protocol, '--protocol');
      probe.protocol = utils.capitalizeFirstLetter(protocol);
    }
    if (options.port) {
      if (options.port < constants.appGateway.settings.port[0] || options.port > constants.appGateway.settings.port[1]) {
        throw new Error(util.format($('A frontend port value must be in range \[%s\]'), constants.appGateway.settings.port));
      }
      probe.port = options.port;
    }
    if (options.hostName && options.path) {
      probe.host = options.hostName;
      probe.path = options.path;
    } else {
      self.output.warn(util.format($('Using default probe URL: %s%s'), constants.appGateway.probe.host, constants.appGateway.probe.path));
      probe.host = constants.appGateway.probe.host;
      probe.path = constants.appGateway.probe.path;
    }
    if (options.interval) {
      probe.interval = parseInt(options.interval);
      if (isNaN(probe.interval)) {
        throw new Error($('Parameter --interval must be a number'));
      }
    } else {
      self.output.warn(util.format($('Using default interval: %s'), constants.appGateway.probe.interval));
      probe.interval = constants.appGateway.probe.interval;
    }
    if (options.timeout) {
      probe.timeout = parseInt(options.timeout);
      if (isNaN(probe.timeout)) {
        throw new Error($('Parameter --timeout must be a number'));
      }
    } else {
      self.output.warn(util.format($('Using default timeout: %s'), constants.appGateway.probe.timeout));
      probe.timeout = constants.appGateway.probe.timeout;
    }
    if (options.unhealthyThreshold) {
      probe.unhealthyThreshold = parseInt(options.unhealthyThreshold);
      if (isNaN(probe.unhealthyThreshold)) {
        throw new Error($('Parameter --unhealthy-threshold must be a number'));
      }
    } else {
      self.output.warn(util.format($('Using default unhealthy threshold: %s'), constants.appGateway.probe.unhealthyThreshold));
      probe.unhealthyThreshold = constants.appGateway.probe.unhealthyThreshold;
    }
    return probe;
  },

  _setAppGateway: function (resourceGroup, appGatewayName, appGateway, _) {
    var self = this;

    var progress = self.interaction.progress(util.format($('Setting configuration for an application gateway "%s"'), appGatewayName));
    var updatedAppGateway;
    try {
      updatedAppGateway = self.networkManagementClient.applicationGateways.createOrUpdate(resourceGroup, appGatewayName, appGateway, null, _);
    } finally {
      progress.end();
    }
    self._showAppGateway(updatedAppGateway);
  },

  _setDefaultAttributes: function (options) {
    var self = this;
    if (options.certFile) {
      if (options.httpListenerProtocol) {

        // If certificate was attached - http listener protocol must be Https.
        if (options.httpListenerProtocol.toLowerCase() !== constants.appGateway.httpListener.protocol[1]) {
          throw new Error($('--http-listener-protocol parameter must be Https'));
        }
      } else {
        options.httpListenerProtocol = constants.appGateway.httpListener.protocol[1];
        self.output.warn(util.format($('Using default http listener protocol: %s'), options.httpListenerProtocol));
      }
      options.certName = 'cert01';
      if (utils.stringIsNullOrEmpty(options.certFile)) {
        throw new Error($('--cert-file parameter must not be empty'));
      }
      if (utils.stringIsNullOrEmpty(options.certPassword)) {
        throw new Error($('--password parameter must not be empty'));
      }
    }
    if (!options.gatewayIpName) {
      options.gatewayIpName = 'ipConfig01';
      self.output.warn(util.format($('Using default gateway ip name: %s'), options.gatewayIpName));
    }
    if (!options.skuName) {
      options.skuName = constants.appGateway.sku.name[0];
      self.output.warn(util.format($('Using default sku name: %s'), options.skuName));
    }
    if (!options.skuTier) {
      options.skuTier = constants.appGateway.sku.tier[0];
      self.output.warn(util.format($('Using default sku tier: %s'), options.skuTier));
    }
    if (!options.capacity) {
      options.capacity = constants.appGateway.sku.capacity[0];
      self.output.warn(util.format($('Using default sku capacity: %s'), options.capacity));
    } else {
      if (options.capacity < constants.appGateway.sku.capacity[0] || options.capacity > constants.appGateway.sku.capacity[1]) {
        throw new Error(util.format($('Application gateway instance count must be in range "[%s]"'), constants.appGateway.sku.capacity));
      }
    }
    if (!options.frontendIpName) {
      options.frontendIpName = 'frontendIp01';
      self.output.warn(util.format($('Using default frontend ip name: %s'), options.frontendIpName));
    }
    if (!options.frontendPortName) {
      options.frontendPortName = 'frontendPort01';
      self.output.warn(util.format($('Using default frontend port name: %s'), options.frontendPortName));
    }
    if (!options.frontendPort) {
      options.frontendPort = options.certFile ? constants.appGateway.settings.defHttpsPort : constants.appGateway.settings.defHttpPort;
      self.output.warn(util.format($('Using default frontend port: %s'), options.frontendPort));
    }
    if (!options.addressPoolName) {
      options.addressPoolName = constants.appGateway.pool.name;
      self.output.warn(util.format($('Using default address pool name: %s'), options.addressPoolName));
    }
    if (!options.httpSettingsName) {
      options.httpSettingsName = constants.appGateway.settings.name;
      self.output.warn(util.format($('Using default http settings name: %s'), options.httpSettingsName));
    }
    if (!options.httpSettingsProtocol) {
      options.httpSettingsProtocol = constants.appGateway.settings.protocol[0];
      self.output.warn(util.format($('Using default http settings protocol: %s'), options.httpSettingsProtocol));
    }
    if (!options.httpSettingsPort) {
      options.httpSettingsPort = constants.appGateway.settings.defHttpPort;
      self.output.warn(util.format($('Using default http settings port: %s'), options.httpSettingsPort));
    }
    if (!options.httpSettingsCookieBasedAffinity) {
      options.httpSettingsCookieBasedAffinity = constants.appGateway.settings.affinity[0];
      self.output.warn(util.format($('Using default http settings cookie based affinity: %s'), options.httpSettingsCookieBasedAffinity));
    }
    if (!options.httpListenerName) {
      options.httpListenerName = 'listener01';
      self.output.warn(util.format($('Using default http listener name: %s'), options.httpListenerName));
    }
    if (!options.routingRuleName) {
      options.routingRuleName = 'rule01';
      self.output.warn(util.format($('Using default request routing rule name: %s'), options.routingRuleName));
    }
    if (!options.routingRuleType) {
      options.routingRuleType = constants.appGateway.routingRule.type[0];
      self.output.warn(util.format($('Using default request routing rule type: %s'), options.routingRuleType));
    }
    return options;
  },

  _showAppGateway: function (appGateway) {
    var self = this;
    self.interaction.formatOutput(appGateway, function (appGateway) {
      self.output.nameValue($('Id'), appGateway.id);
      self.output.nameValue($('Name'), appGateway.name);
      self.output.nameValue($('Location'), appGateway.location);
      self.output.nameValue($('Provisioning state'), appGateway.provisioningState);
      self.output.nameValue($('Sku'), appGateway.sku.name);

      var resource = resourceUtils.getResourceInformation(appGateway.id);
      self.output.nameValue($('Resource Group'), resource.resourceGroup);
      self.output.nameValue($('Tags'), tagUtils.getTagsInfo(appGateway.tags));
      self.output.nameValue($('Gateway IP configations'), self._getAttributeNames(appGateway.gatewayIPConfigurations));
      self.output.nameValue($('SSL cerificates'), self._getAttributeNames(appGateway.sslCertificates));
      self.output.nameValue($('Frontend ip configurations'), self._getAttributeNames(appGateway.frontendIPConfigurations));
      self.output.nameValue($('Frontend ports'), self._getAttributeNames(appGateway.frontendPorts));
      self.output.nameValue($('Backend address pools'), self._getAttributeNames(appGateway.backendAddressPools));
      self.output.nameValue($('Backend http settings'), self._getAttributeNames(appGateway.backendHttpSettingsCollection));
      self.output.nameValue($('Http listeners'), self._getAttributeNames(appGateway.httpListeners));
      self.output.nameValue($('Request routing rules'), self._getAttributeNames(appGateway.requestRoutingRules));
      self.output.nameValue($('Probes'), self._getAttributeNames(appGateway.probes));
      self.output.nameValue($('Url Path Maps'), self._getAttributeNames(appGateway.urlPathMaps));

      self.output.nameValue($('GatewayIpConfigurationText'), JSON.stringify(appGateway.gatewayIPConfigurations, null, 4));
      self.output.nameValue($('SslCertificateText'), JSON.stringify(appGateway.sslCertificates, null, 4));
      self.output.nameValue($('FrontendIpConfigurationText'), JSON.stringify(appGateway.frontendIPConfigurations, null, 4));
      self.output.nameValue($('FrontendPortText'), JSON.stringify(appGateway.frontendPorts, null, 4));
      self.output.nameValue($('BackendAddressPoolText'), JSON.stringify(appGateway.backendAddressPools, null, 4));
      self.output.nameValue($('BackendHttpSettingsText'), JSON.stringify(appGateway.backendHttpSettingsCollection, null, 4));
      self.output.nameValue($('HttpListenersText'), JSON.stringify(appGateway.httpListeners, null, 4));
      self.output.nameValue($('RequestRoutingRulesText'), JSON.stringify(appGateway.requestRoutingRules, null, 4));
      self.output.nameValue($('SkuText'), JSON.stringify(appGateway.sku, null, 4));
      self.output.nameValue($('ProbesText'), JSON.stringify(appGateway.probes, null, 4));
      self.output.nameValue($('UrlPathMapsText'), JSON.stringify(appGateway.urlPathMaps, null, 4));
    });
  }
});

module.exports = AppGateways;
