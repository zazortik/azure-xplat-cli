var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
var EndPointUtil = require('../../asm/vm/endpointUtil');
var fs = require('fs');
var $ = utils.getLocaleString;

function LoadBalancerCRUD(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(LoadBalancerCRUD.prototype, {
  list: function (resourceGroupName, params, _) {
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
        output.info($('No load balancers found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
        });
      }
    });
  },

  show: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.name, _);
    var output = this.cli.output;
    var interaction = this.cli.interaction;

    if (lb) {
      interaction.formatOutput(lb.loadBalancer, function () {
        utils.logLineFormat(lb.loadBalancer, output.data);
      });
    } else {
      if (output.format().json) {
        output.json({});
      } else {
        output.warn(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
      }
    }
  },

  get: function (resourceGroupName, name, _) {
    var progress = this.cli.interaction.progress(util.format($('Looking up the load balancer "%s"'), name));
    try {
      var lb = this.networkResourceProviderClient.loadBalancers.get(resourceGroupName, name, _);
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

  delete: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.name, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s'), params.name, resourceGroupName));
    }

    if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete load balancer "%s"? [y/n] '), params.name), _)) {
      return;
    }

    var progress = this.cli.interaction.progress(util.format($('Deleting load balancer "%s"'), params.name));
    try {
      this.networkResourceProviderClient.loadBalancers.deleteMethod(resourceGroupName, params.name, _);
    } finally {
      progress.end();
    }
  },

  export: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.name, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
    }

    var lbConfiguration = JSON.stringify(lb.loadBalancer);
    var progress = this.cli.interaction.progress(util.format($('Exporting load balancer "%s"'), params.name));

    try {
      fs.writeFileSync(params.filepath, lbConfiguration);
    } finally {
      progress.end();
    }
  },

  import: function (resourceGroupName, params, _) {
    var json = fs.readFileSync(params.filepath, 'utf8');
    var lbConfiguration = JSON.parse(json);

    var progress = this.cli.interaction.progress(util.format($('Importing load balancer "%s"'), params.name));
    try {
      this.networkResourceProviderClient.loadBalancers.createOrUpdate(resourceGroupName, params.name, lbConfiguration, _);
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
    var probe = utils.findFirstCaseIgnore(lb.loadBalancer.properties.probes, {name: probeName});

    if (probe) {
      output.error(util.format($('A probe settings with name "%s" already exist'), probeName));
    } else {
      lb.loadBalancer.properties.probes.push(probeProfile);
      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    }
  },

  listProbes: function (resourceGroupName, lbName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
    }

    var output = this.cli.output;
    var probes = lb.loadBalancer.properties.probes;

    this.cli.interaction.formatOutput(probes, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No probes found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Protocol'), item.properties.protocol);
          row.cell($('Port'), item.properties.port);
          row.cell($('Path'), item.properties.requestPath || '');
          row.cell($('Interval'), item.properties.intervalInSeconds);
          row.cell($('Count'), item.properties.numberOfProbes);
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
    var index = utils.indexOfCaseIgnore(lb.loadBalancer.properties.probes, {name: probeName});

    if (index !== null) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete probe settings "%s?" [y/n] '), probeName), _)) {
        return;
      }

      lb.loadBalancer.properties.probes.splice(index, 1);
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
    var probe = utils.findFirstCaseIgnore(lb.loadBalancer.properties.probes, {name: probeName});
    var endpointUtil = new EndPointUtil();

    if (probe) {
      if (params.newProbeName) probe.name = probeProfile.name;
      if (params.protocol) {
        probe.properties.protocol = probeProfile.properties.protocol;
        if (params.protocol.toLowerCase() === endpointUtil.protocols.TCP) {
          delete probe.properties.requestPath;
        }
      }
      if (params.port) probe.properties.port = probeProfile.properties.port;
      if (params.path) probe.properties.requestPath = probeProfile.properties.requestPath;
      if (params.interval) probe.properties.intervalInSeconds = probeProfile.properties.intervalInSeconds;
      if (params.count) probe.properties.numberOfProbes = probeProfile.properties.numberOfProbes;

      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('A probe settings with name "%s" not found'), probeName));
    }
  },

  createInboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    if (!params.inboundRuleName || !params.protocol || !params.frontendPort || !params.backendPort) {
      throw new Error(util.format('Some of required parameters is empty'));
    }

    var inboundRule = this._parseInboundRuleParams(params);
    var output = this.cli.output;

    var inboundRules = lb.loadBalancer.properties.inboundNatRules;
    if (!inboundRules) {
      lb.loadBalancer.properties.inboundNatRules = [];
    }

    if (utils.findFirstCaseIgnore(inboundRules, {name: params.inboundRuleName})) {
      output.error(util.format($('An inbound rule with name "%s" already exist'), params.inboundRuleName));
    }

    lb.loadBalancer.properties.inboundNatRules.push(inboundRule);
    this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
  },

  updateInboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    if (!params.newInboundRuleName && !params.protocol && !params.frontendPort && !params.backendPort) {
      throw new Error(util.format('All options are empty'));
    }

    var inboundRuleProfile = this._parseInboundRuleParams(params);

    var output = this.cli.output;
    var inboundRules = lb.loadBalancer.properties.inboundNatRules;
    var rule = utils.findFirstCaseIgnore(inboundRules, {name: params.inboundRuleName});
    if (rule) {
      if (params.newInboundRuleName) {
        rule.name = params.newInboundRuleName;
      }
      if (params.protocol) {
        rule.properties.protocol = inboundRuleProfile.properties.protocol;
      }
      if (params.frontendPort) {
        rule.properties.frontendPort = inboundRuleProfile.properties.frontendPort;
      }
      if (params.backendPort) {
        rule.properties.backendPort = inboundRuleProfile.properties.backendPort;
      }

      this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('An inbound rule with name "%s" does not exist'), params.inboundRuleName));
    }
  },

  deleteInboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var inboundRules = lb.loadBalancer.properties.inboundNatRules;
    if (!inboundRules) {
      throw new Error(util.format($('A load balancer with name "%s" does not contain any inbound rules'), params.lbName));
    }

    var index = utils.indexOfCaseIgnore(inboundRules, {name: params.inboundRuleName});
    if (index !== null) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete probe settings "%s?" [y/n] '), params.inboundRuleName), _)) {
        return;
      }
      lb.loadBalancer.properties.inboundNatRules.splice(index, 1);
      this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('An inbound rule with name "%s" does not exist'), params.inboundRuleName));
    }
  },

  createOutboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    var endPointUtil = new EndPointUtil();
    endPointUtil.validateProtocol(params.protocol, 'outbound rule protocol');
    if (endPointUtil.error) {
      throw new Error(endPointUtil.error);
    }

    var output = this.cli.output;
    var outboundRules = lb.loadBalancer.properties.outboundNatRules;
    if (!outboundRules) {
      lb.loadBalancer.properties.outboundNatRules = [];
      console.log('created empty array in outbound rules');
    }

    if (utils.findFirstCaseIgnore(outboundRules, {name: params.outboundRuleName})) {
      output.error(util.format($('An outbound rule with name "%s" already exist'), params.outboundRuleName));
    } else {
      var outboundRuleName = {
        name: params.outboundRuleName,
        properties: {
          protocol: params.protocol
        }
      };
      lb.loadBalancer.properties.outboundNatRules.push(outboundRuleName);
      this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
    }

    var lbUpdated = this.get(resourceGroupName, params.lbName, _);
    var updatedOutBoundRules = lbUpdated.loadBalancer.properties.outboundNatRules;
    if (!utils.findFirstCaseIgnore(updatedOutBoundRules, {name: params.outboundRuleName})) {
      output.error(util.format($('Error creating outbound rule with name "%s" in load balancer "%s"'), params.outboundRuleName, params.lbName));
    }
  },

  updateOutboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    var endPointUtil = new EndPointUtil();
    endPointUtil.validateProtocol(params.protocol, 'outbound rule protocol');
    if (endPointUtil.error) {
      throw new Error(endPointUtil.error);
    }

    var output = this.cli.output;
    var outboundRules = lb.loadBalancer.properties.outboundNatRules;
    if (!outboundRules) {
      throw new Error(util.format($('A load balancer with name "%s" does not contain any outbound rules'), params.lbName));
    }

    var outboundRule = utils.findFirstCaseIgnore(outboundRules, {name: params.outboundRuleName});
    if (outboundRule) {
      outboundRule.properties.protocol = params.protocol;
      this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
    }
    else {
      output.error(util.format($('An outbound rule with name "%s" does not exist'), params.outboundRuleName));
    }
  },

  deleteOutboundRule: function (resourceGroupName, params, _) {
    var lb = this.get(resourceGroupName, params.lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var outboundRules = lb.loadBalancer.properties.outboundNatRules;
    if (!outboundRules) {
      throw new Error(util.format($('A load balancer with name "%s" does not contain any outbound rules'), params.lbName));
    }

    var index = utils.indexOfCaseIgnore(outboundRules, {name: params.outboundRuleName});
    if (index !== null) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete probe settings "%s?" [y/n] '), params.outboundRuleName), _)) {
        return;
      }
      lb.loadBalancer.properties.outboundNatRules.splice(index, 1);
      this.update(resourceGroupName, params.lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('An outbound rule with name "%s" does not exist'), params.outboundRuleName));
    }
  },

  _parseAndValidateProbe: function (probeName, params) {
    if (!params.port && !params.protocol && !params.path && !params.count && !params.interval && !params.newProbeName) {
      throw new Error($('A probe port, protocol, path, interval or count must be specified'));
    }

    var endpointUtil = new EndPointUtil();
    var output = this.cli.output;
    var probeProfile = {
      name: probeName,
      properties: {}
    };

    if (params.port) {
      var portValidation = endpointUtil.validatePort(params.port, 'Port');
      if (portValidation.error) throw new Error(portValidation.error);
      probeProfile.properties.port = portValidation.port;
    }

    if (params.interval) {
      var intervalValidation = endpointUtil.validateProbInterval(params.interval, 'Interval');
      if (intervalValidation.error) throw new Error(intervalValidation.error);
      probeProfile.properties.intervalInSeconds = intervalValidation.interval;
    }

    if (params.count) {
      var countAsInt = utils.parseInt(params.count);
      if (isNaN(countAsInt)) {
        throw new Error(util.format($('Count parameter must be an integer'), countAsInt));
      }
      probeProfile.properties.numberOfProbes = countAsInt;
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

      probeProfile.properties.protocol = protocolValidation.protocol;
    }

    if (params.path) {
      if (utils.stringIsNullOrEmpty(params.path)) {
        throw new Error($('Path parameter must not be null or empty string'));
      }
      probeProfile.properties.requestPath = params.path;
    }

    if (params.newProbeName) {
      if (utils.stringIsNullOrEmpty(params.newProbeName)) {
        throw new Error($('Name parameter must not be null or empty string'));
      }
      probeProfile.name = params.newProbeName;
    }

    return probeProfile;
  },

  _parseInboundRuleParams: function (params) {
    var enableFloatingip = 'false';
    if (params.enableFloatingip) {
      if (enableFloatingip == 'false' || enableFloatingip == 'true') {
        enableFloatingip = params.enableFloatingip;
      }
    }
    var inboundRule = {
      name: params.inboundRuleName,
      properties: {
        enableFloatingIP: enableFloatingip
      }
    };

    var endPointUtil = new EndPointUtil();
    if (params.protocol) {
      var protocolValidation = endPointUtil.validateProtocol(params.protocol, 'Inbound rule protocol');
      if (protocolValidation.error) {
        throw new Error(protocolValidation.error);
      }
      inboundRule.properties.protocol = params.protocol;
    }

    if (params.frontendPort) {
      var fePortValidation = endPointUtil.validatePort(params.frontendPort, 'Front end port');
      if (fePortValidation.error) {
        throw new Error(fePortValidation.error);
      }
      inboundRule.properties.frontendPort = fePortValidation.port;
    }

    if (params.backendPort) {
      var bePortValidation = endPointUtil.validatePort(params.backendPort, 'Back end port');
      if (bePortValidation.error) {
        throw new Error(bePortValidation.error);
      }
      inboundRule.properties.backendPort = bePortValidation.port;
    }

    return inboundRule;
  }
});

module.exports = LoadBalancerCRUD;
