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
    if (!lb) {
      throw new Error(util.format($('A load balancer with name "%s" not found in the resource group "%s"'), params.name, resourceGroupName));
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(lb.loadBalancer, function () {
      utils.logLineFormat(lb.loadBalancer, output.data);
    });
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
  }
});

module.exports = LoadBalancerCRUD;
