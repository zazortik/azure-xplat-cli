//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
var util = require('util');
var profile = require('../../util/profile');
var utils = require('../../util/utils');
var EndPointUtil = require('../../util/endpointUtil');

var $ = utils.getLocaleString;

exports.init = function(cli) {
  var lbSet = cli.category('service').category('load-balancer-set')
      .description($('Commands to manage load balancer set for your Cloud Service Deployment'));

  var log = cli.output;

  lbSet.command('list [serviceName]')
    .description($('List load balancer set for a cloud service deployment'))
    .usage('[options] <serviceName>')
    .option('-r, --service-name <service-name>', $('the cloud service name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(serviceName, options, _) {
      serviceName = cli.interaction.promptIfNotGiven($('Cloud Service name: '), serviceName, _);
      var computeClient = utils.createComputeClient(profile.current.getSubscription(options.subscription));
      var progress = cli.interaction.progress($('Getting cloud service deployment'));
      var deployment;
      try {
        deployment = computeClient.deployments.getBySlot(serviceName, 'Production', _);
      } finally {
        progress.end();
      }

      var endPointUtil = new EndPointUtil();
      var lbSets = endPointUtil.getAllLBSettings(deployment.roles);
      cli.interaction.formatOutput(lbSets, function(lbSets) {
        if (lbSets.length === 0) {
          log.info($('No load balancer sets defined'));
        } else {
          log.table(lbSets, function(row, item) {
            var lbSet = lbSets[item];
            row.cell($('Name'), lbSet.Name);
            row.cell($('Port'), getLBPort(lbSet));
            if (lbSet.ProbSettings) {
              row.cell($('Probe port'), lbSet.ProbSettings.port);
              row.cell($('Probe protocol'), lbSet.ProbSettings.protocol);
              row.cell($('Probe interval (sec)'), lbSet.ProbSettings.intervalInSeconds);
              row.cell($('Probe timeout (sec)'), lbSet.ProbSettings.timeoutInSeconds);
            }
          });
        }
      });
    });

  lbSet.command('show [service-name] [load-balanced-set-name]')
    .description($('List load balancer set for a cloud service deployment'))
    .usage('[options] <serviceName>')
    .option('-r, --service-name <service-name>', $('the cloud service name'))
    .option('-l, --lbset-name <lbset-name>', $('the load balancer set name'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(serviceName, lbsetName, options, _) {
      serviceName = cli.interaction.promptIfNotGiven($('Cloud Service name: '), serviceName, _);
        loadBalancedSetName = cli.interaction.promptIfNotGiven($('Load balancer set name: '), loadBalancedSetName, _);
      var computeClient = utils.createComputeClient(profile.current.getSubscription(options.subscription));
      var progress = cli.interaction.progress($('Getting cloud service deployment'));
      var deployment;
      try {
        deployment = computeClient.deployments.getBySlot(serviceName, 'Production', _);
      } finally {
        progress.end();
      }

      var endPointUtil = new EndPointUtil();
      var lbSets = endPointUtil.getAllLBSettings(deployment.roles);
      var lbSet = getLBSet(lbSets, loadBalancedSetName);
      var output = cli.output;
      if (lbSet) {
        cli.interaction.formatOutput(lbSet, function (lbSet) {
          output.nameValue($('Name'), lbSet.Name);
          output.nameValue($('Port'), getLBPort(lbSet));
          if (lbSet.ProbSettings) {
            output.header('Probe settings');
            output.nameValue($('Port'), lbSet.ProbSettings.port, 2);
            output.nameValue($('Protocol'), lbSet.ProbSettings.protocol, 2);
            output.nameValue($('Path'), lbSet.ProbSettings.path, 2);
            output.nameValue($('Interval (seconds)'), lbSet.ProbSettings.intervalInSeconds, 2);
            output.nameValue($('Timeout (seconds)'), lbSet.ProbSettings.timeoutInSeconds, 2);
          }

          if (lbSet.endPoints) {
            output.header('Load balanced set endpoints');
            for (var i = 0; i < lbSet.endPoints.length; i++) {
              output.header('Endpoint #' + (i + 1), 2);
              output.nameValue();
              var endPoint = lbSet.endPoints[i];
              output.nameValue($('Name'), endPoint.name, 4);
              output.nameValue($('VM name'), endPoint.vmName, 4);
              output.nameValue($('Local port'), endPoint.localPort, 4);
              output.nameValue($('Protcol'), endPoint.protocol, 4);
              output.nameValue($('Virtual IP Address'), endPoint.virtualIPAddress, 4);
              output.nameValue($('Direct server return'), endPoint.enableDirectServerReturn ? 'Enabled' : 'Disabled', 4);
              output.nameValue($('Connection timeout (minutes)'), endPoint.idleTimeoutInMinutes, 4);
            }
          }
        });
      } else {
        if (output.format().json) {
          output.json({});
        } else {
          output.warn(util.format($('A load balancer set with name "%s" not found in the service "%s"'), loadBalancedSetName, serviceName));
        }
      }
    });


  lbSet.command('set [service-name] [load-balanced-set-name]')
    .description($('List load balancer set for a cloud service deployment'))
    .usage('[options] <serviceName> <load-balancer-set-name>')
    .option('-r, --service-name <service-name>', $('the cloud service name'))
    .option('-l, --load-balanced-set-name <load-balanced-set-name>', $('the load balancer set name'))
    .option('-b, --public-port <public-port>', $('the load balanced endpoint public port'))
    .option('-c, --local-port <local-port>', $('the load balanced endpoint local port'))
    .option('-l, --load-balanced-set-name <load-balanced-set-name>', $('the load balancer set name'))
    .option('-o, --protocol <protocol>', $('the transport layer protocol for the load balanced set endpoint (tcp or udp)'))
    .option('-m, --idle-timeout <idle-timeout>', $('load balanced set endpoint connection timeout for tcp idle connection, specified in minutes'))
    .option('-t, --probe-port <probe-port>', $('the virtual machine port to use to inspect the availability status'))
    .option('-r, --probe-protocol <probe-protocol>', $('the protocol to use to inspect the availability status'))
    .option('-p, --probe-path <probe-path>', $('the relative path to inspect the availability status'))
    .option('-u, --direct-server-return <direct-server-return>', $('enable or disable direct server return on the load balanced set endpoint, valid values are [Enabled, Disabled] Disabled by default'))
    .option('-i, --internal-load-balancer-name <internal-load-balancer-name>', $('the internal load balancer name'))
    .option('-a, --load-balancer-distribution <load-balancer-distribution>', $('the load balancer distribution, valid values are [sourceIP, sourceIPProtocol, None]'))
    .option('-s, --subscription <id>', $('the subscription id'))
    .execute(function(serviceName, loadBalancedSetName, options, _) {
      serviceName = cli.interaction.promptIfNotGiven($('Cloud Service name: '), serviceName, _);
      loadBalancedSetName = cli.interaction.promptIfNotGiven($('Load balancer set name: '), loadBalancedSetName, _);
      var computeClient = utils.createComputeClient(profile.current.getSubscription(options.subscription));
      var progress = cli.interaction.progress($('Getting cloud service deployment'));
      var deployment;
      try {
        deployment = computeClient.deployments.getBySlot(serviceName, 'Production', _);
      } finally {
        progress.end();
      }

      var endPointUtil = new EndPointUtil();
      var lbSets = endPointUtil.getAllLBSettings(deployment.roles);
      var lbSet = getLBSet(lbSets, loadBalancedSetName);
      if (!lbSet) {
        throw new Error(util.format($('load balancer set with name "%s" not found in the cloud service'), loadBalancedSetName, serviceName));
      }

      // Take any endpoint belongs to this load balancer set
      var lbsetEndpoint = lbSet.endPoints[0];
      lbsetEndpoint = endPointUtil.setEndpointProperties(lbsetEndpoint, options);
      progress = cli.interaction.progress($('Updating load balanced set'));
      try {
        deployment = computeClient.virtualMachines.updateLoadBalancedEndpointSet(serviceName, deployment.name, { loadBalancedEndpoints: [lbsetEndpoint] }, _);
      } finally {
        progress.end();
      }
    });

  function getLBSet(lbSets, lbSetName) {
    return utils.findFirstCaseIgnore(lbSets, { Name: lbSetName });
  }

  function getLBPort(lbSet) {
    return lbSet && lbSet.endPoints && lbSet.endPoints.length > 0 ? lbSet.endPoints[0].port : undefined;
  }
};
