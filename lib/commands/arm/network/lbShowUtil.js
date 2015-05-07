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
var resourceUtils = require('../resource/resourceUtils');
var tagUtils = require('../tag/tagUtils');
var utils = require('../../../util/utils');

var $ = utils.getLocaleString;

exports.show = function (lb, output) {
  var indent = 0;

  exports.showLoadBalancer(lb, output, indent);
  exports.showFrontEndIpConfigs(lb, output, indent);
  exports.showBackendAddressPools(lb, output, indent);
  exports.showLBRules(lb, output, indent);
  exports.showInboundRules(lb, output, indent);
  exports.showProbes(lb, output, indent);
};

exports.showLoadBalancer = function (lb, output, indent) {
  output.nameValue($('Id'), lb.id, true, indent);
  output.nameValue($('Name'), lb.name, true, indent);

  var resource = resourceUtils.getResourceInformation(lb.id);
  output.nameValue($('Type'), lb.type || resource.resourceType, true, indent);
  output.nameValue($('Location'), lb.location, true, indent);
  output.nameValue($('Provisioning State'), lb.provisioningState, true, indent);

  if (lb.tags) {
    output.nameValue($('Tags'), tagUtils.getTagsInfo(lb.tags), true, indent);
  }
};

exports.showFrontEndIpConfigs = function (lb, output, indent) {
  if (__.isEmpty(lb.frontendIpConfigurations)) {
    return;
  }
  output.header('Frontend IP configurations', false, indent);
  indent += 2;
  lb.frontendIpConfigurations.forEach(function (ipConfig) {
    _showFrontendIpDetails(ipConfig, output, indent);
  });
};

exports.showFrontendIpConfig = function (ipConfig, output) {
  var indent = 0;
  output.nameValue($('Id'), ipConfig.id, true, indent);

  var resource = resourceUtils.getResourceInformation(ipConfig.id);
  output.nameValue($('Type'), ipConfig.type || resource.resourceType, true, indent);
  _showFrontendIpDetails(ipConfig, output, indent);

  if (ipConfig.inboundNatRules && ipConfig.inboundNatRules.length > 0) {
    output.header($('Inbound NAT rules'), false, indent);
    indent += 2;
    ipConfig.inboundNatRules.forEach(function (rule) {
      output.listItem(rule.id, false, indent);
    });
    indent -= 2;
  }

  if (ipConfig.outboundNatRules && ipConfig.outboundNatRules.length > 0) {
    output.header($('Outbound NAT rules'), false, indent);
    indent += 2;
    ipConfig.outboundNatRules.forEach(function (rule) {
      output.listItem(rule.id, false, indent);
    });
    indent -= 2;
  }

  if (ipConfig.loadBalancingRules && ipConfig.loadBalancingRules.length > 0) {
    output.header($('Load balancing rules'), false, indent);
    indent += 2;
    ipConfig.loadBalancingRules.forEach(function (lbRule) {
      output.listItem(lbRule.id, false, indent);
    });
  }
};

exports.showBackendAddressPools = function (lb, output, indent) {
  if (__.isEmpty(lb.backendAddressPools)) {
    return;
  }
  output.header($('Backend address pools'), false, indent);
  indent += 2;

  lb.backendAddressPools.forEach(function (pool) {
    _showBackendAddressPoolDetails(pool, output, indent);
  });
};

exports.showBackendAddressPool = function (pool, output) {
  var indent = 0;
  output.nameValue($('Id'), pool.id, true, indent);

  var resource = resourceUtils.getResourceInformation(pool.id);
  output.nameValue($('Type'), pool.type || resource.resourceType, true, indent);
  _showBackendAddressPoolDetails(pool, output, indent);
  if (pool.loadBalancingRules && pool.loadBalancingRules.length > 0) {
    output.list($('Load balancing rules'), pool.loadBalancingRules, false, indent);
  }
};

exports.showLBRules = function (lb, output, indent) {
  if (__.isEmpty(lb.loadBalancingRules)) {
    return;
  }

  output.header($('Load balancing rules'), false, indent);
  indent += 2;
  lb.loadBalancingRules.forEach(function (rule) {
    _showLBRuleDetails(rule, output, indent);
  });
};

exports.showLBRule = function (rule, output) {
  var indent = 0;
  output.nameValue($('Id'), rule.id, true, indent);

  var resource = resourceUtils.getResourceInformation(rule.id);
  output.nameValue($('Type'), rule.type || resource.resourceType, true, indent);
  _showLBRuleDetails(rule, output, indent);
};

exports.showInboundRules = function (lb, output, indent) {
  if (__.isEmpty(lb.inboundNatRules)) {
    return;
  }
  output.header($('Inbound NAT rules'), false, indent);
  indent += 2;
  lb.inboundNatRules.forEach(function (inboundNatRule) {
    _showInboundRuleDetails(inboundNatRule, output, indent);
  });
};

exports.showInboundRule = function (rule, output) {
  var indent = 0;
  output.nameValue($('Id'), rule.id, true, indent);

  var resource = resourceUtils.getResourceInformation(rule.id);
  output.nameValue($('Type'), rule.type || resource.resourceType, true, indent);
  _showInboundRuleDetails(rule, output, indent);
};

exports.showProbes = function (lb, output, indent) {
  if (__.isEmpty(lb.probes)) {
    return;
  }
  output.header($('Probes'), false, indent);
  indent += 2;

  lb.probes.forEach(function (probe) {
    output.nameValue($('Name'), probe.name, true, indent);
    output.nameValue($('Provisioning state'), probe.provisioningState, true, indent);
    output.nameValue($('Protocol'), probe.protocol, true, indent);
    output.nameValue($('Port'), probe.port, true, indent);
    output.nameValue($('Interval in seconds'), probe.intervalInSeconds, true, indent);
    output.nameValue($('Number of probes'), probe.numberOfProbes, true, indent);
    if (!__.isEmpty(probe.loadBalancingRules)) {
      output.header($('Load balancing rules'), false, indent);
      indent += 2;
      probe.loadBalancingRules.forEach(function (probeRule) {
        output.listItem(probeRule.id, false, indent);
      });
      indent -= 2;
    }
    output.data('');
  });
};

_showFrontendIpDetails = function (ipConfig, output, indent) {
  output.nameValue('Name', ipConfig.name, true, indent);
  output.nameValue('Provisioning state', ipConfig.provisioningState, true, indent);
  if (ipConfig.subnet) {
    output.nameValue('Private IP allocation method', ipConfig.privateIpAllocationMethod, true, indent);
  }
  if (ipConfig.publicIpAddress) {
    output.nameValue('Public IP address id', ipConfig.publicIpAddress.id, true, indent);
    output.nameValue('Public IP allocation method', ipConfig.publicIpAddress.publicIpAllocationMethod, true, indent);
    if (ipConfig.publicIpAddress.actualPublicIpAddress) {
      output.nameValue($('Public IP address'), ipConfig.publicIpAddress.actualPublicIpAddress, true, indent);
    }
    if (ipConfig.publicIpAddress.fqdn) {
      output.nameValue($('FQDN'), ipConfig.publicIpAddress.fqdn);
    }
  }

  if (ipConfig.privateIpAddress) {
    output.nameValue($('Private IP address'), ipConfig.privateIpAddress, true, indent);
  }
  if (ipConfig.subnet) {
    output.nameValue($('Subnet'), ipConfig.subnet.id, true, indent);
  }
  output.data('');

};

_showBackendAddressPoolDetails = function (pool, output, indent) {
  output.nameValue($('Name'), pool.name, true, indent);
  output.nameValue($('Provisioning state'), pool.provisioningState, true, indent);
  if (!__.isEmpty(pool.backendIpConfigurations)) {
    output.header($('Backend IP configurations'), false, indent);
    indent += 2;
    pool.backendIpConfigurations.forEach(function (backendIpConfig) {
      output.listItem(backendIpConfig.id, false, indent);
    });
    indent -= 2;
  }
  output.data('');
};

_showLBRuleDetails = function (rule, output, indent) {
  output.nameValue($('Name'), rule.name, true, indent);
  output.nameValue($('Provisioning state'), rule.provisioningState, true, indent);
  output.nameValue($('Protocol'), rule.protocol, true, indent);
  output.nameValue($('Frontend port'), rule.frontendPort, true, indent);
  output.nameValue($('Backend port'), rule.backendPort, true, indent);
  output.nameValue($('Enable floating IP'), rule.enableFloatingIP.toString(), true, indent);
  output.nameValue($('Idle timeout in minutes'), rule.idleTimeoutInMinutes, true, indent);
  if (rule.frontendIPConfiguration) {
    output.nameValue($('Frontend IP configuration'), rule.frontendIPConfiguration.id, true, indent);
  }
  if (rule.backendAddressPool) {
    output.nameValue($('Backend address pool'), rule.backendAddressPool.id, true, indent);
  }
  if (rule.probe) {
    output.nameValue($('Probe'), rule.probe.id, true, indent);
  }
  output.data('');
};

_showInboundRuleDetails = function (inboundNatRule, output, indent) {
  output.nameValue($('Name'), inboundNatRule.name, true, indent);
  output.nameValue($('Provisioning state'), inboundNatRule.provisioningState, true, indent);
  output.nameValue($('Protocol'), inboundNatRule.protocol, true, indent);
  output.nameValue($('Frontend port'), inboundNatRule.frontendPort, true, indent);
  output.nameValue($('Backend port'), inboundNatRule.backendPort, true, indent);
  output.nameValue($('Enable floating IP'), inboundNatRule.enableFloatingIP.toString(), true, indent);
  output.nameValue($('Idle timeout in minutes'), inboundNatRule.idleTimeoutInMinutes, true, indent);
  if (inboundNatRule.frontendIPConfiguration) {
    output.nameValue($('Frontend IP configuration'), inboundNatRule.frontendIPConfiguration.id, true, indent);
  }
  if (inboundNatRule.backendIPConfiguration) {
    output.nameValue($('Backend IP Configuration:  '), inboundNatRule.backendIPConfiguration.id, true, indent);
  }
  output.data('');
};