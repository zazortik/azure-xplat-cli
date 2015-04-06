var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var VNetUtil = require('../../../util/vnet.util');
var EndPointUtil = require('../../asm/vm/endpointUtil');
var ResourceUtils = require('../resource/resourceUtils');
var TagUtils = require('../tag/tagUtils');
var PublicIP = require('./publicip');
var Subnet = require('./subnet');
var VMClient = require('./../vm/vmClient');
var NIC = require('./nic');

var $ = utils.getLocaleString;

function LoadBalancer(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
  this.log = this.cli.output;

  // constants
  this.DEFAULT_PROTOCOL = 'Tcp';
  this.DEFAULT_FRONTEND_PORT = 80;
  this.DEFAULT_BACKEND_PORT = 80;
  this.DEFAULT_FLOATING_IP = false;
  this.DEFAULT_IDLE_TIMEOUT = 4;
}

__.extend(LoadBalancer.prototype, {
  create: function (resourceGroupName, lbName, location, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (lb) {
      throw new Error(util.format($('A load balancer with name "%s" already exists in the resource group "%s"'), lbName, resourceGroupName));
    }

    var lbProfile = {
      frontendIpConfigurations: [
        {
          name: 'LB-Frontend',
          publicIpAddress: {
            id: params.publicIpId
          }
        }
      ],
      location: location
    };

    if (params.tags) {
      lbProfile.tags = TagUtils.buildTagsParameter(null, params);
    }

    var progress = this.cli.interaction.progress(util.format($('Creating load balancer "%s"'), lbName));
    try {
      this.networkResourceProviderClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, lbProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
    this.show(resourceGroupName, lbName, params, _);
  },

  list: function (resourceGroupName, _) {
    var progress = this.cli.interaction.progress($('Getting the load balancers'));
    var lbs = null;
    try {
      lbs = this.networkResourceProviderClient.loadBalancers.list(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(lbs.loadBalancers, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No load balancers found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
        });
      }
    });
  },

  show: function (resourceGroupName, lbName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    var output = this.log;
    var interaction = this.cli.interaction;

    if (lb) {
      var resourceInfo = ResourceUtils.getResourceInformation(lb.loadBalancer.id);
      interaction.formatOutput(lb.loadBalancer, function (lb) {
        output.data($('Id:                  '), lb.id);
        output.data($('Name:                '), lb.name);
        output.data($('Type:                '), resourceInfo.resourceType);
        output.data($('Location:            '), lb.location);
        output.data($('Provisioning state:  '), lb.provisioningState);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, lbName, _, message) {
    message = message || util.format($('Looking up the load balancer "%s"'), lbName);
    var progress = this.cli.interaction.progress(message);
    try {
      var lb = this.networkResourceProviderClient.loadBalancers.get(resourceGroupName, lbName, _);
      return lb;
    } catch (e) {
      if (e.code === 'ResourceNotFound') {
        return null;
      }
      throw e;
    } finally {
      progress.end();
    }
  },

  delete: function (resourceGroupName, lbName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), lbName, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete load balancer "%s"? [y/n] '), lbName), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting load balancer "%s"'), lbName));
    try {
      this.networkResourceProviderClient.loadBalancers.deleteMethod(resourceGroupName, lbName, _);
    } finally {
      progress.end();
    }
  },

  update: function (resourceGroupName, lbName, lbProfile, _) {
    var progress = this.cli.interaction.progress(util.format($('Updating load balancer "%s"'), lbName));
    try {
      this.networkResourceProviderClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, lbProfile, _);
    } catch (e) {
      throw e;
    } finally {
      progress.end();
    }
  },

  createProbe: function (resourceGroupName, lbName, probeName, params, _) {
    var probeProfile = this._parseAndValidateProbe(probeName, params);
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var probe = utils.findFirstCaseIgnore(lb.loadBalancer.probes, {name: probeName});

    if (probe) {
      output.error(util.format($('A probe settings with name "%s" already exist'), probeName));
    } else {
      lb.loadBalancer.probes.push(probeProfile);
      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    }
  },

  listProbes: function (resourceGroupName, lbName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
    }

    var output = this.cli.output;
    var probes = lb.loadBalancer.probes;

    this.cli.interaction.formatOutput(probes, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No probes found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Protocol'), item.protocol);
          row.cell($('Port'), item.port);
          row.cell($('Path'), item.requestPath || '');
          row.cell($('Interval'), item.intervalInSeconds);
          row.cell($('Count'), item.numberOfProbes);
        });
      }
    });
  },

  deleteProbe: function (resourceGroupName, lbName, probeName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var index = utils.indexOfCaseIgnore(lb.loadBalancer.probes, {name: probeName});

    if (index !== null) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete a probe settings "%s?" [y/n] '), probeName), _)) {
        return;
      }

      lb.loadBalancer.probes.splice(index, 1);
      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('A probe settings with name "%s" not found'), probeName));
    }
  },

  updateProbe: function (resourceGroupName, lbName, probeName, params, _) {
    var probeProfile = this._parseAndValidateProbe(probeName, params);
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var probe = utils.findFirstCaseIgnore(lb.loadBalancer.probes, {name: probeName});
    var endpointUtil = new EndPointUtil();

    if (probe) {
      if (params.newProbeName) probe.name = probeProfile.name;
      if (params.protocol) {
        probe.protocol = probeProfile.protocol;
        if (params.protocol.toLowerCase() === endpointUtil.protocols.TCP) {
          delete probe.requestPath;
        }
      }
      if (params.port) probe.port = probeProfile.port;
      if (params.path) probe.requestPath = probeProfile.requestPath;
      if (params.interval) probe.intervalInSeconds = probeProfile.intervalInSeconds;
      if (params.count) probe.numberOfProbes = probeProfile.numberOfProbes;

      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('A probe settings with name "%s" not found'), probeName));
    }
  },

  addLBRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = lb.loadBalancer;

    if (!lb.loadBalancingRules) {
      lb.loadBalancingRules = [];
    }

    // check if rule with same name already exists
    var lbRule = utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    if (lbRule) {
      throw new Error(util.format($('Rule with the same name already exists in load balancer "%s"'), lbName));
    }

    var rule = {name: ruleName};

    rule = this._parseLBRuleParameters(lb, rule, options, true);

    lb.loadBalancingRules.push(rule);
    this.update(resourceGroupName, lbName, lb, _);

    var newLb = this.get(resourceGroupName, lbName, _, 'Loading rule state');
    var newRule = utils.findFirstCaseIgnore(newLb.loadBalancer.loadBalancingRules, {name: ruleName});
    this._showLBRule(newRule);
  },

  updateLBRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = lb.loadBalancer;

    // check if rule exists
    var lbRule = utils.findFirstCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    if (!lbRule) {
      throw new Error(util.format($('Rule with the name "%s" not found in load balancer "%s"'), ruleName, lbName));
    }

    lbRule.name = options.newRuleName || ruleName;

    lbRule = this._parseLBRuleParameters(lb, lbRule, options, false);
    this.update(resourceGroupName, lbName, lb, _);

    var newLb = this.get(resourceGroupName, lbName, _, 'Loading rule state');
    var newRule = utils.findFirstCaseIgnore(newLb.loadBalancer.loadBalancingRules, {name: lbRule.name});
    this._showLBRule(newRule);
  },

  deleteLBRule: function (resourceGroupName, lbName, ruleName, options, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = lb.loadBalancer;

    // check if rule exists
    var ruleIndex = utils.indexOfCaseIgnore(lb.loadBalancingRules, {name: ruleName});
    if (!ruleIndex) {
      throw new Error(util.format($('A load balancing rule with name "%s" not found in the load balancer "%s"'), ruleName, lbName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete load balancing rule %s? [y/n] '), ruleName), _)) {
      return;
    }

    lb.loadBalancingRules.splice(ruleIndex, 1);
    this.update(resourceGroupName, lbName, lb, _);
  },

  createInboundRule: function (options, _) {
    var lb = this.get(options.resourceGroupName, options.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), options.lbName, options.resourceGroupName));
    }

    if (options.vmId && options.vmName) {
      throw new Error(util.format('--vm-id and --vm-name options are mutually exclusive'));
    }

    var inboundRule = {name: options.name};

    inboundRule = this._parseInboundRuleParams(lb.loadBalancer, inboundRule, options, true);
    var output = this.cli.output;

    var inboundRules = lb.loadBalancer.inboundNatRules;
    if (!inboundRules) {
      lb.loadBalancer.inboundNatRules = [];
    }

    if (utils.findFirstCaseIgnore(inboundRules, {name: options.name})) {
      output.error(util.format($('An inbound rule with name "%s" already exist'), options.name));
    }

    lb.loadBalancer.inboundNatRules.push(inboundRule);
    this.update(options.resourceGroupName, options.lbName, lb.loadBalancer, _);

    var newLb = this.get(options.resourceGroupName, options.lbName, _);
    var newRule = utils.findFirstCaseIgnore(newLb.loadBalancer.inboundNatRules, {name: options.name});
    this._showInboundRule(newRule);
  },

  updateInboundRule: function (options, _) {
    var lb = this.get(options.resourceGroupName, options.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), options.lbName, options.resourceGroupName));
    }

    var allInboundRules = lb.loadBalancer.inboundNatRules;
    var currentInboundRule = utils.findFirstCaseIgnore(allInboundRules, {name: options.name});
    if (!currentInboundRule) {
      throw new Error(util.format($('An inbound rule with name "%s" does not exist'), options.name));
    }

    var inboundRule = this._parseInboundRuleParams(lb, currentInboundRule, options, false);

    inboundRule.name = options.newName || options.name;

    this.update(options.resourceGroupName, options.lbName, lb.loadBalancer, _);

    var newLb = this.get(options.resourceGroupName, options.lbName, _);
    var updatedRule = utils.findFirstCaseIgnore(newLb.loadBalancer.inboundNatRules, {name: options.name});
    this._showInboundRule(updatedRule);
  },

  deleteInboundRule: function (options, _) {
    var lb = this.get(options.resourceGroupName, options.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), options.lbName, options.resourceGroupName));
    }

    var output = this.cli.output;
    var inboundRules = lb.loadBalancer.inboundNatRules;
    if (!inboundRules) {
      throw new Error(util.format($('A load balancer with name "%s" does not contain any inbound rules'), options.lbName));
    }

    var index = utils.indexOfCaseIgnore(inboundRules, {name: options.name});
    if (index !== null) {
      if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete inbound NAT rule "%s?" [y/n] '), options.name), _)) {
        return;
      }
      lb.loadBalancer.inboundNatRules.splice(index, 1);
      this.update(options.resourceGroupName, options.lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('An inbound rule with name "%s" does not exist'), options.name));
    }
  },

  addFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var ipConfigResult = this._loadFrontendIpConfiguration(resourceGroupName, lbName, ipConfigName, _);
    var ipConfig = ipConfigResult.object;
    if (ipConfig) {
      throw new Error(util.format($('Frontend IP configuration "%s" already exists in the load balancer "%s"'), ipConfigName, lbName));
    }

    var lb = ipConfigResult.loadBalancer;
    var frontendIPConfig = {name: ipConfigName};

    frontendIPConfig = this._handleVIP(resourceGroupName, frontendIPConfig, options, _);

    lb.frontendIpConfigurations.push(frontendIPConfig);

    var progress = this.cli.interaction.progress(util.format($('Creating frontend IP configuration "%s"'), ipConfigName));
    try {
      this.networkResourceProviderClient.loadBalancers.createOrUpdate(resourceGroupName, lbName, lb, _);
    } finally {
      progress.end();
    }

    var newVip = this._loadFrontendIpConfiguration(resourceGroupName, lbName, ipConfigName, _).object;
    this._showVIP(newVip);
  },

  updateFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var ipConfigResult = this._loadFrontendIpConfiguration(resourceGroupName, lbName, ipConfigName, _);
    var frontendIPConfig = ipConfigResult.object;
    if (!frontendIPConfig) {
      throw new Error(util.format($('Frontend IP configuration "%s" already exists in the load balancer "%s"'), ipConfigName, lbName));
    }

    var lb = ipConfigResult.loadBalancer;

    frontendIPConfig = this._handleVIP(resourceGroupName, frontendIPConfig, options, _);

    lb.frontendIpConfigurations[ipConfigResult.index] = frontendIPConfig;

    this.update(resourceGroupName, lbName, lb, _);
    var newVip = this._loadFrontendIpConfiguration(resourceGroupName, lbName, ipConfigName, _).object;
    this._showVIP(newVip);
  },

  deleteFrontEndIPConfig: function (resourceGroupName, lbName, ipConfigName, options, _) {
    var ipConfigResult = this._loadFrontendIpConfiguration(resourceGroupName, lbName, ipConfigName, _);
    var ipConfigIndex = ipConfigResult.index;

    if (ipConfigIndex) {
      throw new Error(util.format($('Frontend IP configuration "%s" nof found in the load balancer "%s"'), ipConfigName, lbName));
    }

    var lb = ipConfigResult.loadBalancer;
    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete frontend ip configuration "%s"? [y/n] '), ipConfigName), _)) {
      return;
    }

    lb.frontendIpConfigurations.splice(ipConfigIndex, 1);
    this.update(resourceGroupName, lbName, lb, _);
  },

  addBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var backendAddressPoolObj = this._loadBackendAddressPool(resourceGroupName, lbName, poolName, _);

    lb = backendAddressPoolObj.loadBalancer;

    var addressPool = backendAddressPoolObj.object;
    if (addressPool) {
      throw new Error(util.format($('A backend address pool with name "%s" already exists in the load balancer "%s"'), poolName, lbName));
    }

    var backendAddressPool = {name: poolName, properties: {}};

    backendAddressPool = this._handleAddressPool(resourceGroupName, lbName, backendAddressPool, options, _);

    lb.backendAddressPools.push(backendAddressPool);

    this.update(resourceGroupName, lbName, lb, _);
    var newBackendAddressPool = this._loadBackendAddressPool(resourceGroupName, lbName, poolName, _).object;
    this._showBackendAddressPool(newBackendAddressPool);
  },

  updateBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var backendAddressPoolObj = this._loadBackendAddressPool(resourceGroupName, lbName, poolName, _);

    lb = backendAddressPoolObj.loadBalancer;

    var addressPool = backendAddressPoolObj.object;
    if (!addressPool) {
      throw new Error(util.format($('Backend address pool "%s" not found in the load balancer "%s"'), poolName, lbName));
    }

    addressPool = this._handleAddressPool(resourceGroupName, lbName, addressPool, options, _);

    this.update(resourceGroupName, lbName, lb, _);
    var updatedBackendAddressPool = this._loadBackendAddressPool(resourceGroupName, lbName, poolName, _).object;
    this._showBackendAddressPool(updatedBackendAddressPool);
  },

  deleteBackendAddressPool: function (resourceGroupName, lbName, poolName, options, _) {
    var backendAddressPoolObj = this._loadBackendAddressPool(resourceGroupName, lbName, poolName, _);

    lb = backendAddressPoolObj.loadBalancer;

    var backendAddressPoolIndex = backendAddressPoolObj.index;
    if (!backendAddressPoolIndex) {
      throw new Error(util.format($('Backend address pool with name "%s" not found in the load balancer "%s"'), poolName, lbName));
    }

    if (!options.quiet && !this.cli.interaction.confirm(util.format($('Delete backend address pool "%s"? [y/n] '), poolName), _)) {
      return;
    }

    lb.backendAddressPools.splice(backendAddressPoolIndex, 1);
    this.update(resourceGroupName, lbName, lb, _);
  },

  _parseAndValidateProbe: function (probeName, params) {
    if (!params.port && !params.protocol && !params.path && !params.count && !params.interval && !params.newProbeName) {
      throw new Error($('A probe port, protocol, path, interval or count must be specified'));
    }

    var endpointUtil = new EndPointUtil();
    var output = this.cli.output;
    var probeProfile = {
      name: probeName
    };

    if (params.port) {
      var portValidation = endpointUtil.validatePort(params.port, 'Port');
      if (portValidation.error) throw new Error(portValidation.error);
      probeProfile.port = portValidation.port;
    }

    if (params.interval) {
      var intervalValidation = endpointUtil.validateProbInterval(params.interval, 'Interval');
      if (intervalValidation.error) throw new Error(intervalValidation.error);
      probeProfile.intervalInSeconds = intervalValidation.interval;
    }

    if (params.count) {
      var countAsInt = utils.parseInt(params.count);
      if (isNaN(countAsInt)) {
        throw new Error(util.format($('Count parameter must be an integer'), countAsInt));
      }
      probeProfile.numberOfProbes = countAsInt;
    }

    if (params.protocol) {
      var protocolValidation = endpointUtil.validateProbProtocol(params.protocol, 'Protocol');
      if (protocolValidation.error) {
        throw new Error(protocolValidation.error);
      }

      var protocol = protocolValidation.protocol.toLowerCase();
      if (protocol === endpointUtil.protocols.TCP && params.path) {
        output.warn($('Probe request path will be omitted when its protocol is Tcp'));
      }

      if (protocol === endpointUtil.protocols.HTTP && !params.path) {
        throw new Error($('Probe request path is required when its protocol is Http'));
      }

      probeProfile.protocol = protocolValidation.protocol;
    }

    if (params.path) {
      if (utils.stringIsNullOrEmpty(params.path)) {
        throw new Error($('Path parameter must not be null or empty string'));
      }
      probeProfile.requestPath = params.path;
    }

    if (params.newProbeName) {
      if (utils.stringIsNullOrEmpty(params.newProbeName)) {
        throw new Error($('Name parameter must not be null or empty string'));
      }
      probeProfile.name = params.newProbeName;
    }

    return probeProfile;
  },

  _parseInboundRuleParams: function (lb, inboundRule, options, useDefaults) {
    var endPointUtil = new EndPointUtil();

    if (options.protocol) {
      var protocolValidation = endPointUtil.validateProtocol(options.protocol, 'protocol');
      if (protocolValidation.error) {
        throw new Error(protocolValidation.error);
      }
      inboundRule.protocol = options.protocol;
    } else if (useDefaults) {
      options.protocol = this.DEFAULT_PROTOCOL;
      this.log.verbose(util.format($('Using default protocol: %s'), options.protocol));
      inboundRule.protocol = options.protocol;
    }

    if (options.frontendPort) {
      var frontendPortValidation = endPointUtil.validatePort(options.frontendPort, 'front end port');
      if (frontendPortValidation.error) {
        throw new Error(frontendPortValidation.error);
      }
      inboundRule.frontendPort = options.frontendPort;
    } else if (useDefaults) {
      options.frontendPort = this.DEFAULT_FRONTEND_PORT;
      this.log.verbose(util.format($('Using default frontend port: %s'), options.frontendPort));
      inboundRule.frontendPort = options.frontendPort;
    }

    if (options.backendPort) {
      var backendPortValidation = endPointUtil.validatePort(options.backendPort, 'back end port');
      if (backendPortValidation.error) {
        throw new Error(backendPortValidation.error);
      }
      inboundRule.backendPort = options.backendPort;
    } else if (useDefaults) {
      options.backendPort = this.DEFAULT_BACKEND_PORT;
      this.log.verbose(util.format($('Using default backend port: %s'), options.backendPort));
      inboundRule.backendPort = options.backendPort;
    }

    if (options.enableFloatingIp) {

      // Enable floating IP must be boolean.
      if (!utils.ignoreCaseEquals(options.enableFloatingIp, 'true') && !utils.ignoreCaseEquals(options.enableFloatingIp, 'false')) {
        throw new Error($('Enable floating IP parameter must be boolean'));
      }

      inboundRule.enableFloatingIP = options.enableFloatingIp;
    } else if (useDefaults) {
      options.enableFloatingIp = this.DEFAULT_FLOATING_IP;
      this.log.verbose(util.format($('Using default enable floating ip: %s'), options.enableFloatingIp));
      inboundRule.enableFloatingIP = options.enableFloatingIp;
    }

    if (options.vip) {
      inboundRule.frontendIPConfigurations = [];
      var vips = options.vip.split(',');
      for (var num in vips) {
        var vip = vips[num];
        vipFound = utils.findFirstCaseIgnore(lb.frontendIpConfigurations, {name: vip});
        if (!vipFound) {
          throw new Error(util.format($('Frontend IP config "%s" not found'), vip));
        }
        inboundRule.frontendIPConfigurations.push({id: vipFound.id});
      }
    } else if (useDefaults) {
      this.log.verbose($('Handling inbound rule without specified frontend IP configuration'));
    }

    var backendAddressPool = null;
    if (options.vmId) {
      backendAddressPool = utils.findFirstCaseIgnore(lb.backendAddressPools, {id: options.vmId});
      if (!backendAddressPool) {
        throw new Error(util.format($('Backend address pool "%s" not found'), options.vmId));
      }
      inboundRule.backendIPConfigurations = {id: backendAddressPool.backendIpConfigurations.id};
    } else if (options.vmName) {
      backendAddressPool = utils.findFirstCaseIgnore(lb.backendAddressPools, {name: options.vmName});
      if (!backendAddressPool) {
        throw new Error(util.format($('Backend address pool "%s" not found'), options.vmName));
      }
      inboundRule.backendIPConfigurations = {id: backendAddressPool.backendIpConfigurations.id};
    } else if (useDefaults) {
      this.log.verbose($('Handling inbound rule without specified backend address pool'));
    }

    return inboundRule;
  },

  _loadFrontendIpConfiguration: function (resourceGroupName, lbName, ipConfigName, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = lb.loadBalancer;

    var ipConfig = utils.findFirstCaseIgnore(lb.frontendIpConfigurations, {name: ipConfigName});
    var ipConfigIndex = utils.indexOfCaseIgnore(lb.frontendIpConfigurations, {name: ipConfigName});

    return {
      object: ipConfig,
      index: ipConfigIndex,
      loadBalancer: lb
    };
  },

  _loadBackendAddressPool: function (resourceGroupName, lbName, poolName, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    lb = lb.loadBalancer;

    var addressPool = utils.findFirstCaseIgnore(lb.backendAddressPools, {name: poolName});
    var addressPoolIndex = utils.indexOfCaseIgnore(lb.backendAddressPools, {name: poolName});

    return {
      object: addressPool,
      index: addressPoolIndex,
      loadBalancer: lb
    };
  },

  _handleAddressPool: function(resourceGroupName, lbName, backendAddressPool, options, _) {
    if (options.vmIds && options.vmNames) {
      throw new Error($('Both optional parameters --vm-ids and --vm-names cannot be specified together'));
    }

    backendAddressPool.backendIpConfigurations = [];

    if (options.vmIds) {
      var ids = options.vmIds.split(',');
      for (var idNum in ids) {
        var vmId = ids[idNum];
        options.vmId = vmId;
        var firstIpConfigById = this._getFirstIpConfigFromVMById(resourceGroupName, options, _);
        backendAddressPool.backendIpConfigurations.push({id: firstIpConfigById.id});
      }
    }

    if (options.vmNames) {
      var names = options.vmNames.split(',');
      for (var nameNum in names) {
        var vmName = names[nameNum];
        options.vmName = vmName;

        var firstIpConfigByName = this._getFirstIpConfigFromVMByName(resourceGroupName, options, _);
        backendAddressPool.backendIpConfigurations.push({id: firstIpConfigByName.id});
      }
    }

    return backendAddressPool;
  },

  _parseLBRuleParameters: function (lb, rule, options, useDefaults) {
    var endPointUtil = new EndPointUtil();

    if (options.protocol) {
      var protocolValidation = endPointUtil.validateProtocol(options.protocol, 'protocol');
      if (protocolValidation.error) {
        throw new Error(protocolValidation.error);
      }

      rule.protocol = options.protocol;
    } else if (useDefaults) {
      options.protocol = this.DEFAULT_PROTOCOL;
      this.log.verbose(util.format($('Using default protocol: %s'), options.protocol));
      rule.protocol = options.protocol;
    }

    if (options.frontendPort) {
      var frontendPortValidation = endPointUtil.validatePort(options.frontendPort, 'front end port');
      if (frontendPortValidation.error) {
        throw new Error(frontendPortValidation.error);
      }

      rule.frontendPort = options.frontendPort;
    } else if (useDefaults) {
      options.frontendPort = this.DEFAULT_FRONTEND_PORT;
      this.log.verbose(util.format($('Using default frontend port: %s'), options.frontendPort));
      rule.frontendPort = options.frontendPort;
    }

    if (options.backendPort) {
      var backendPortValidation = endPointUtil.validatePort(options.backendPort, 'back end port');
      if (backendPortValidation.error) {
        throw new Error(backendPortValidation.error);
      }

      rule.backendPort = options.backendPort;
    } else if (useDefaults) {
      options.backendPort = this.DEFAULT_BACKEND_PORT;
      this.log.verbose(util.format($('Using default backend port: %s'), options.backendPort));
      rule.backendPort = options.backendPort;
    }

    if (options.idleTimeout) {
      var parsed = utils.parseInt(options.idleTimeout);
      if (isNaN(parsed)) {
        throw new Error($('Idle timeout must be posivite integer'));
      }

      rule.idleTimeoutInMinutes = options.idleTimeout;
    } else if (useDefaults) {
      options.idleTimeout = this.DEFAULT_IDLE_TIMEOUT;
      this.log.verbose(util.format($('Using default idle timeout: %s'), options.idleTimeout));
      rule.idleTimeoutInMinutes = options.idleTimeout;
    }

    if (options.enableFloatingIp) {

      // Enable floating IP must be boolean.
      if (!utils.ignoreCaseEquals(options.enableFloatingIp, 'true') && !utils.ignoreCaseEquals(options.enableFloatingIp, 'false')) {
        throw new Error($('Enable floating IP parameter must be boolean'));
      }

      rule.enableFloatingIP = options.enableFloatingIp;
    } else if (useDefaults) {
      options.enableFloatingIp = this.DEFAULT_FLOATING_IP;
      this.log.verbose(util.format($('Using default enable floating ip: %s'), options.enableFloatingIp));
      rule.enableFloatingIP = options.enableFloatingIp;
    }

    var backendAddressPool = null;
    if (options.backendAddressPool) {
      backendAddressPool = utils.findFirstCaseIgnore(lb.backendAddressPools, {name: options.backendAddressPool});
      if (!backendAddressPool) {
        throw new Error(util.format($('Backend address pool "%s" not found'), options.backendAddressPool));
      }

      rule.backendAddressPool = {id: backendAddressPool.id};
    } else if (useDefaults) {
      if (!lb.backendAddressPools) {
        throw new Error($('You must specify existing backend address pool.'));
      }

      this.log.verbose(util.format($('Using first backend address pool: %s'), lb.backendAddressPools[0].name));
      backendAddressPool = lb.backendAddressPools[0];
      rule.backendAddressPool = {id: backendAddressPool.id};
    }

    if (options.vip) {
      rule.frontendIPConfigurations = [];
      var vips = options.vip.split(',');
      for (var num in vips) {
        var vip = vips[num];
        vipFound = utils.findFirstCaseIgnore(lb.frontendIPConfigurations, {name: vip});
        if (!vipFound) {
          throw new Error(util.format($('Frontend IP config "%s" not found'), vip));
        }

        rule.frontendIPConfigurations.push({id: vipFound.id});
      }
    } else if (useDefaults) {
      rule.frontendIPConfigurations = [];
      if (!lb.frontendIpConfigurations) {
        throw new Error($('You must specify existing frontend IP config.'));
      }

      this.log.verbose(util.format($('Using first frontend IP config: %s'), lb.frontendIpConfigurations[0].name));
      defaultVip = lb.frontendIpConfigurations[0];
      rule.frontendIPConfigurations.push({id: defaultVip.id});
    }

    if (options.probeName) {
      // probes must exist
      if (!lb.probes || lb.probes.length === 0) {
        throw new Error(util.format($('No probes found for the load balancer "%s"'), lb.name));
      }

      // probe with provided name must exist
      var probe = utils.findFirstCaseIgnore(lb.probes, {name: options.probeName});
      if (!probe) {
        throw new Error(util.format($('Probe "%s" not found in the load balancer "%s"'), options.probeName, lb.name));
      }

      rule.probe = {id: probe.id};
    }

    return rule;
  },

  _handleVIP: function (resourceGroupName, frontendIPConfig, options, _) {
    if (options.privateIpAddress && options.publicIpName) {
      throw new Error($('Both optional parameters --private-ip-address and --public-ip-name cannot be specified together'));
    }

    if (options.privateIpAddress && options.publicIpId) {
      throw new Error($('Both optional parameters --private-ip-address and --public-ip-id cannot be specified together'));
    }

    if (options.publicIpName && options.publicIpId) {
      throw new Error($('Both optional parameters --public-ip-name and --public-ip-id cannot be specified together'));
    }

    if (options.subnetName && options.subnetId) {
      throw new Error($('Both optional parameters --subnet-name and --subnet-id cannot be specified together'));
    }

    if ((options.subnetName || options.subnetId) && !options.subnetVnetName) {
      throw new Error($('You must specify subnet virtual network if subnet information is provided'));
    }

    if (options.privateIpAllocationMethod) {
      if (options.privateIpAllocationMethod !== 'Static' && options.privateIpAllocationMethod !== 'Dynamic') {
        throw new Error($('Private IP allocation method must be Static or Dynamic'));
      }
      if ((!options.subnetId && !options.subnetName) && utils.ignoreCaseEquals(options.privateIpAllocationMethod, 'Static')) {
        throw new Error($('Frontend Private IP Allocation Method must be set to Dynamic when Subnet is not specified'));
      }

      frontendIPConfig.privateIpAllocationMethod = options.privateIpAllocationMethod;
    }

    var allocationMethod = frontendIPConfig.privateIpAllocationMethod;

    var subnetCRUD = new Subnet(this.cli, this.networkResourceProviderClient);
    if (allocationMethod === 'Dynamic') {
      if (options.privateIpAddress) {
        this.cli.output.info('Using Dynamic private IP allocation method. --privateip-address parameter ignored.');
      }

      if (options.subnetName || options.subnetId) {
        frontendIPConfig.subnet = {};
        if (options.subnetName) {
          subnet = subnetCRUD.get(resourceGroupName, options.subnetVnetName, options.subnetName, _);
          frontendIPConfig.subnet.id = subnet.subnet.id;
        }

        if (options.subnetId) {
          frontendIPConfig.subnet.id = options.subnetId;
        }

        if (frontendIPConfig.publicIpAddress) {
          delete frontendIPConfig.publicIpAddress;
        }
      } else if (options.publicIpName || options.publicIpId) {
        frontendIPConfig.publicIpAddress = {};
        var publicip = null;

        if (options.publicIpName) {
          var publicIPcrud = new PublicIP(this.cli, this.networkResourceProviderClient);
          publicip = publicIPcrud.get(resourceGroupName, options.publicIpName, _);
          if (!publicip) {
            throw new Error(util.format($('Public IP "%s" not found'), options.publicIpName));
          }
        }

        if (publicip.publicIpAddress) {
          frontendIPConfig.publicIpAddress.id = publicip.publicIpAddress.id;
        }

        if (options.publicIpId) {
          frontendIPConfig.publicIpAddress.id = options.publicIpId;
        }

        if (frontendIPConfig.subnet) {
          delete frontendIPConfig.subnet;
        }
      }
    } else if (allocationMethod === 'Static') {
      if (options.privateIpAddress) {
        var vnetUtil = new VNetUtil();
        var parsed = vnetUtil.parseIPv4(options.privateIpAddress);
        if (parsed.error) {
          throw new Error(parsed.error);
        }

        frontendIPConfig.privateIpAddress = options.privateIpAddress;
      }

      if (options.subnetName || options.subnetId) {
        frontendIPConfig.subnet = {};
        if (options.subnetName) {
          subnet = subnetCRUD.get(resourceGroupName, options.subnetVnetName, options.subnetName, _);
          frontendIPConfig.subnet.id = subnet.subnet.id;
        }

        if (options.subnetId) {
          frontendIPConfig.subnet.id = options.subnetId;
        }

        if (frontendIPConfig.publicIpAddress) {
          delete frontendIPConfig.publicIpAddress;
        }
      }

      if (options.publicIpId || options.publicIpName) {
        this.cli.output.info('You cant set public IP when private IP allocation method is Static.');
      }
    }

    return frontendIPConfig;
  },

  _getFirstIpConfigFromVMById: function (resourceGroup, options, _) {
    var vmClient = new VMClient(this.cli, options.subscription);
    var vms = vmClient.getVMs(resourceGroup, options, _);
    var vm = utils.findFirstCaseIgnore(vms.virtualMachines, {id: options.vmId});
    if (!vm) {
      throw new Error(util.format($('Virtual machine with id "%s" not found'), options.vmId));
    }

    if (!vm.virtualMachineProperties.networkProfile || !vm.virtualMachineProperties.networkProfile.networkInterfaces || vm.virtualMachineProperties.networkProfile.networkInterfaces.length === 0) {
      throw new Error(util.format($('Virtual machine with id "%s" does not contain any network interface'), options.vmId));
    }

    var vmNicId = vm.virtualMachineProperties.networkProfile.networkInterfaces[0].referenceUri;

    if (!vmNicId) {
      throw new Error(util.format($('Virtual machine with id "%s" has no any network interface with reference uri'), options.vmId));
    }

    var nicCrud = new NIC(this.cli, this.networkResourceProviderClient);
    var nics = nicCrud.getAll(resourceGroup, _);
    if (!nics) {
      throw new Error(util.format($('No network intefraces found in the resource group "%s"'), resourceGroup));
    }

    var nic = utils.findFirstCaseIgnore(nics.networkInterfaces, {id: vmNicId});
    if (!nic) {
      throw new Error(util.format($('Network interface specified for virtual machine with id "%s" not found in the resource group "%s"'), options.vmId, resourceGroup));
    }

    if (!nic.ipConfigurations || nic.ipConfigurations.length === 0) {
      throw new Error(util.format($('Network interface specified for virtual machine with id "%s" does not contain any IP configuration'), options.vmId));
    }

    var firstIpConfig = nic.ipConfigurations[0];
    return firstIpConfig;
  },

  _getFirstIpConfigFromVMByName: function (resourceGroup, options, _) {
    var vmClient = new VMClient(this.cli, options.subscription);
    var vm = vmClient.getVM(resourceGroup, options.vmName, options, _);
    if (!vm) {
      throw new Error(util.format($('Virtual machine with name "%s" not found'), options.vmName));
    }

    if (!vm.virtualMachine.virtualMachineProperties.networkProfile || !vm.virtualMachine.virtualMachineProperties.networkProfile.networkInterfaces || vm.virtualMachine.virtualMachineProperties.networkProfile.networkInterfaces.length === 0) {
      throw new Error(util.format($('Virtual machine with name "%s" does not contain any network interface'), options.vmName));
    }

    var vmNicId = vm.virtualMachine.virtualMachineProperties.networkProfile.networkInterfaces[0].referenceUri;

    if (!vmNicId) {
      throw new Error(util.format($('Virtual machine "%s" has no any network interface with reference uri'), options.vmName));
    }

    var nicCrud = new NIC(this.cli, this.networkResourceProviderClient);
    var nics = nicCrud.getAll(resourceGroup, _);
    if (!nics) {
      throw new Error(util.format($('No network intefraces found in the resource group "%s"'), resourceGroup));
    }

    var nic = utils.findFirstCaseIgnore(nics.networkInterfaces, {id: vmNicId});
    if (!nic) {
      throw new Error(util.format($('Network interface specified for virtual machine "%s" not found in the resource group "%s"'), options.vmName, resourceGroup));
    }

    if (!nic.ipConfigurations || nic.ipConfigurations.length === 0) {
      throw new Error(util.format($('Network interface specified for virtual machine "%s" does not contain any IP configuration'), options.vmName));
    }

    var firstIpConfig = nic.ipConfigurations[0];

    return firstIpConfig;
  },

  _showLBRule: function (resource) {
    var resourceInformation = ResourceUtils.getResourceInformation(resource.id);
    var log = this.cli.output;
    this.cli.interaction.formatOutput(resource, function (resource) {
      log.data($('Id:                       '), resource.id);
      log.data($('Name:                     '), resourceInformation.resourceName || resource.name);
      log.data($('Type:                     '), resourceInformation.resourceType || resource.type);
      log.data($('Provisioning state:       '), resource.provisioningState);

      if (resource.frontendIPConfigurations && resource.frontendIPConfigurations.length > 0) {
        log.data($('Frontend IP configurations:'));
        for (var vipNum in resource.frontendIPConfigurations) {
          var vip = resource.frontendIPConfigurations[vipNum];
          log.data('', vip);
        }
      } else {
        log.data($('Frontend IP configurations:'), '');
      }

      log.data($('Backend address pool      '), resource.backendAddressPool);
      log.data($('Protocol                  '), resource.protocol);
      log.data($('Frontend port             '), resource.frontendPort);
      log.data($('Backend port              '), resource.backendPort);
      log.data($('Enable floating IP        '), resource.enableFloatingIP + '');
      log.data($('Idle timeout in minutes   '), resource.idleTimeoutInMinutes);

      if (resource.probes && resource.probes.length > 0) {
        log.data($('Probes:'));
        for (var probeNum in resource.probes) {
          var probe = resource.probes[probeNum];
          log.data('', probe);
        }
      } else {
        log.data($('Probes'), '');
      }

      log.data('');
    });
  },

  _showBackendAddressPool: function (resource) {
    var resourceInformation = ResourceUtils.getResourceInformation(resource.id);
    var log = this.cli.output;
    this.cli.interaction.formatOutput(resource, function (resource) {
      log.data($('Id:                       '), resource.id);
      log.data($('Name:                     '), resourceInformation.resourceName || resource.name);
      log.data($('Type:                     '), resourceInformation.resourceType || resource.type);
      log.data($('Provisioning state:       '), resource.provisioningState);

      if (resource.backendIpConfigurations && resource.backendIpConfigurations.length > 0) {
        log.data($('Backend IP configurations:'));
        for (var backendNum in resource.backendIpConfigurations) {
          var backendIp = resource.backendIpConfigurations[backendNum];
          log.data('', backendIp);
        }
      } else {
        log.data($('Backend IP configurations:'), '');
      }

      if (resource.loadBalancingRules && resource.loadBalancingRules.length > 0) {
        log.data($('Load balancing rules:'));
        for (var lbNum in resource.loadBalancingRules) {
          var lbRule = resource.loadBalancingRules[lbNum];
          log.data('', lbRule);
        }
      } else {
        log.data($('Load balancing rules:'), '');
      }

      log.data('');
    });
  },

  _showVIP: function (resource) {
    var resourceInformation = ResourceUtils.getResourceInformation(resource.id);
    var log = this.cli.output;
    this.cli.interaction.formatOutput(resource, function (resource) {
      log.data($('Id:                          '), resource.id);
      log.data($('Name:                        '), resourceInformation.resourceName || resource.name);
      log.data($('Type:                        '), resourceInformation.resourceType || resource.type);
      log.data($('Provisioning state:          '), resource.provisioningState);
      log.data($('Private IP allocation method:'), resource.privateIpAllocationMethod);
      log.data($('Private IP address:          '), resource.privateIpAddress);
      log.data($('Subnet:                      '), resource.subnet);
      log.data($('Public IP address:           '), resource.publicIpAddress);

      if (resource.inboundNatRules && resource.inboundNatRules.length > 0) {
        log.data($('Inbound NAT rules:'));
        for (var inNum in resource.inboundNatRules) {
          var inboundRule = resource.inboundNatRules[inNum];
          log.data('', inboundRule);
        }
      } else {
        log.data($('Inbound NAT rules'), '');
      }

      if (resource.outboundNatRules && resource.outboundNatRules.length > 0) {
        log.data($('Outbound NAT rules:'));
        for (var outNum in resource.outboundNatRules) {
          var outboundRule = resource.outboundNatRules[outNum];
          log.data('', outboundRule);
        }
      } else {
        log.data($('Outbound NAT rules'), '');
      }

      if (resource.loadBalancingRules && resource.loadBalancingRules.length > 0) {
        log.data($('Load balancing rules:'));
        for (var loadnum in resource.loadBalancingRules) {
          var loadRule = resource.loadBalancingRules[loadnum];
          log.data('', loadRule);
        }
      } else {
        log.data($('Load balancing rules'), '');
      }

      log.data('');
    });
  },

  _showInboundRule: function (rule) {
    var log = this.log;
    var resourceInfo = ResourceUtils.getResourceInformation(rule.id);

    this.cli.interaction.formatOutput(rule, function (rule) {
      log.data($('Id:                       '), rule.id);
      log.data($('Name:                     '), resourceInfo.resourceName || rule.name);
      log.data($('Type:                     '), resourceInfo.resourceType || rule.type);
      log.data($('Provisioning state:       '), rule.provisioningState);
      log.data($('Frontend IP Configurations'), rule.frontendIPConfigurations);
      log.data($('Backend address pool      '), rule.backendAddressPool);
      log.data($('Protocol                  '), rule.protocol);
      log.data($('Frontend port             '), rule.frontendPort);
      log.data($('Backend port              '), rule.backendPort);
      log.data($('Enable floating IP        '), rule.enableFloatingIP + '');
    });
  }
});

module.exports = LoadBalancer;
