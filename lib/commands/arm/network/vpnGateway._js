var __ = require('underscore');
var utils = require('../../../util/utils');
var $ = utils.getLocaleString;

function VpnGateway(cli, networkResourceProviderClient) {
  this.cli = cli;
  this.networkResourceProviderClient = networkResourceProviderClient;
}

__.extend(VpnGateway.prototype, {
  listVirtualNetworkGateways: function (resourceGroupName, params, _) {
    var progress = this.cli.interaction.progress($('Getting the virtual network gateways'));
    var gateways = null;
    try {
      gateways = this.networkResourceProviderClient.gateways.listVirtualNetworkGateways(resourceGroupName, _);
    } finally {
      progress.end();
    }

    var output = this.cli.output;
    this.cli.interaction.formatOutput(gateways.publicIpAddresses, function (outputData) {
      if (outputData.length === 0) {
        output.warn($('No gateways found'));
      } else {
        output.table(outputData, function (row, item) {
          row.cell($('Name'), item.name);
          row.cell($('Location'), item.location);
        });
      }
    });
  }
});

module.exports = VpnGateway;