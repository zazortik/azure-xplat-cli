var __ = require('underscore');
var util = require('util');
var utils = require('../../../util/utils');
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
    var jsonOutput = output.format().json;

    if (lb) {
      if (jsonOutput) {
        output.json(lb.loadBalancer);
      } else {
        interaction.formatOutput(lb.loadBalancer, function () {
          utils.logLineFormat(lb.loadBalancer, output.data);
        });
      }
    } else {
      if (jsonOutput) {
        output.json({});
      } else {
        output.error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
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
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var probes = lb.loadBalancer.properties.probes;

    if (__.findWhere(probes, {name: probeName})) {
      output.error(util.format($('A probe settings with name "%s" already exist'), probeName));
    } else {
      var probeProfile = {
        name: probeName,
        properties: {
          protocol: params.protocol,
          port: params.port,
          requestPath: params.path,
          intervalInSeconds: params.interval,
          numberOfProbes: params.count
        }
      };
      lb.loadBalancer.properties.probes.push(probeProfile);
      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    }
  },

  listProbs: function (resourceGroupName, lbName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
    }

    var output = this.cli.output;
    var probes = lb.loadBalancer.properties.probes;

    this.cli.interaction.formatOutput(probes, function (outputData) {
      if (outputData.length === 0) {
        output.info($('No probes found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Protocol'), item.properties.protocol);
          row.cell($('Port'), item.properties.port);
          row.cell($('Path'), item.properties.requestPath);
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
    var probes = lb.loadBalancer.properties.probes;

    if (__.findWhere(probes, {name: probeName})) {
      if (!params.quiet && !this.cli.interaction.confirm(util.format($('Delete probe settings "%s?" [y/n] '), probeName), _)) {
        return;
      }

      lb.loadBalancer.properties.probes = __(probes).filter(function (item) {
        return item.name !== probeName;
      });

      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('A probe settings with name "%s" not found'), probeName));
    }
  },

  updateProbe: function (resourceGroupName, lbName, probeName, params, _) {
    var lb = this.get(resourceGroupName, lbName, _);
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), lbName, resourceGroupName));
    }

    var output = this.cli.output;
    var probes = lb.loadBalancer.properties.probes;

    if (__.findWhere(probes, {name: probeName})) {
      for (var i = 0; i < probes.length; i++) {
        if (probes[i].name == probeName) {
          if (params.newProbeName) probes[i].name = params.newProbeName;
          if (params.protocol) probes[i].properties.protocol = params.protocol;
          if (params.port) probes[i].properties.port = params.port;
          if (params.path) probes[i].properties.requestPath = params.port;
          if (params.interval) probes[i].properties.intervalInSeconds = params.interval;
          if (params.count) probes[i].properties.numberOfProbes = params.count;
        }
      }

      this.update(resourceGroupName, lbName, lb.loadBalancer, _);
    } else {
      output.error(util.format($('A probe settings with name "%s" not found'), probeName));
    }
  }
});

module.exports = LoadBalancerCRUD;
